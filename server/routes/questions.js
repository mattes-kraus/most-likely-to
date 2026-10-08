const express = require('express');
const db = require('../db');
const { webpush } = require('../pushUtils');
const router = express.Router({ mergeParams: true });

async function sendPushToGroupMembers(groupId, userIdExempt, payloadObj) {
    try {
        const payload = JSON.stringify(payloadObj);
        const subscriptions = db.prepare(`
          SELECT ps.subscription, ps.user_id 
          FROM push_subscriptions ps
          JOIN group_members gm ON ps.user_id = gm.user_id
          WHERE gm.group_id = ? AND ps.user_id != ?
        `).all(groupId, userIdExempt);
        
        const sendPromises = subscriptions.map(subRow => {
          const sub = JSON.parse(subRow.subscription);
          return webpush.sendNotification(sub, payload).catch(err => {
            if (err.statusCode === 410 || err.statusCode === 404) {
              db.prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND subscription = ?')
                .run(subRow.user_id, subRow.subscription);
            }
          });
        });
        
        await Promise.allSettled(sendPromises);
    } catch (err) {
        console.error('Error sending push notification:', err);
    }
}

async function sendPushToUser(userId, payloadObj) {
    try {
        const payload = JSON.stringify(payloadObj);
        const subscriptions = db.prepare('SELECT subscription FROM push_subscriptions WHERE user_id = ?').all(userId);
        await Promise.allSettled(subscriptions.map(subRow =>
            webpush.sendNotification(JSON.parse(subRow.subscription), payload).catch(err => {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    db.prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND subscription = ?')
                      .run(userId, subRow.subscription);
                }
            })
        ));
    } catch (err) {
        console.error('Error sending push notification:', err);
    }
}

async function sendGuessFeaturedPush(groupId, featuredMemberId) {
    const group = db.prepare('SELECT name FROM groups WHERE id = ?').get(groupId);
    await sendPushToUser(featuredMemberId, {
      title: group ? group.name : 'Most Likely To',
      body: 'Heute dreht sich alles um dich! Die anderen raten deine Antwort.',
      url: `/group/${groupId}`
    });
}

async function checkAndSendFirstAnswerPush(groupId, dailyQuestionId, userIdExempt) {
    try {
        // Check if this was the very first answer for this daily question
        const voteCount = db.prepare('SELECT COUNT(*) as count FROM votes WHERE daily_question_id = ?').get(dailyQuestionId).count;
        const answerCount = db.prepare('SELECT COUNT(*) as count FROM answers WHERE daily_question_id = ?').get(dailyQuestionId).count;
        
        if (voteCount + answerCount === 1) {
            const user = db.prepare('SELECT username FROM users WHERE id = ?').get(userIdExempt);
            if (!user) return;
            const group = db.prepare('SELECT name FROM groups WHERE id = ?').get(groupId);
            const groupName = group ? group.name : 'Most Likely To';
            
            await sendPushToGroupMembers(groupId, userIdExempt, {
              title: groupName,
              body: `${user.username} hat gerade gespielt!`,
              url: `/group/${groupId}`
            });
        }
    } catch (err) {
        console.error('Error sending push notification:', err);
    }
}

async function sendCommentPush(groupId, userIdExempt) {
    try {
        const user = db.prepare('SELECT username FROM users WHERE id = ?').get(userIdExempt);
        if (!user) return;
        const group = db.prepare('SELECT name FROM groups WHERE id = ?').get(groupId);
        const groupName = group ? group.name : 'Most Likely To';

        await sendPushToGroupMembers(groupId, userIdExempt, {
          title: groupName,
          body: `${user.username} hat einen Kommentar geschrieben.`,
          url: `/group/${groupId}`
        });
    } catch (err) {
        console.error('Error sending comment push notification:', err);
    }
}


// Points per member for correctly guessed answers in this group (without the member the question is about)
const getGuessLeaderboard = (groupId, featuredMemberId) => {
    return db.prepare(`
        SELECT u.id, u.username, u.avatar_url,
               COALESCE((
                 SELECT SUM(a.is_correct) FROM answers a
                 JOIN daily_questions dq ON a.daily_question_id = dq.id
                 WHERE dq.group_id = gm.group_id AND a.user_id = u.id
               ), 0) as points
        FROM users u
        JOIN group_members gm ON u.id = gm.user_id
        WHERE gm.group_id = ? AND u.id IS NOT ?
        ORDER BY points DESC, u.username ASC
    `).all(groupId, featuredMemberId);
};

// Helper: get today's date string in Europe/Berlin timezone (YYYY-MM-DD)
const getTodayBerlin = () => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
};

// Convert a UTC datetime string from SQLite to a Berlin date (YYYY-MM-DD)
const toBerlinDate = (utcDatetime) => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(utcDatetime.replace(' ', 'T') + 'Z'));
};

// Ensure there is a daily question for today. If the latest one is from a previous day, advance.
const ensureTodayQuestion = (groupId) => {
    const todayStr = getTodayBerlin();
    
    // Get the latest daily question for this group
    const latest = db.prepare(`
        SELECT dq.day_number, dq.created_at
        FROM daily_questions dq
        WHERE dq.group_id = ?
        ORDER BY dq.day_number DESC
        LIMIT 1
    `).get(groupId);

    if (!latest) {
        // No questions yet — keep current_day as is (will be created on /today)
        const tracker = db.prepare('SELECT current_day FROM group_day_tracker WHERE group_id = ?').get(groupId);
        return tracker ? tracker.current_day : null;
    }

    const latestDate = toBerlinDate(latest.created_at);

    if (latestDate === todayStr) {
        // Already have a question for today
        return latest.day_number;
    }

    // It's a new day — advance
    const nextDay = latest.day_number + 1;
    db.prepare('UPDATE group_day_tracker SET current_day = ? WHERE group_id = ?').run(nextDay, groupId);
    assignDailyQuestion(groupId, nextDay);
    return nextDay;
};

const requireAuth = (req, res, next) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  
  const groupId = req.params.id || req.body.groupId;
  if (groupId) {
      const isMember = db.prepare('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?')
        .get(groupId, req.session.userId);
      if (!isMember) return res.status(403).json({ error: 'Not a member' });
  }
  next();
};

router.use(requireAuth);

const requireAnsweredToday = (req, res, next) => {
    const groupId = req.params.id;
    const currentDay = ensureTodayQuestion(groupId);
    if (!currentDay) return res.status(404).json({ error: 'Group not found' });
    
    const dailyQuestion = db.prepare(`
        SELECT dq.id, q.type FROM daily_questions dq
        JOIN questions q ON dq.question_id = q.id
        WHERE dq.group_id = ? AND dq.day_number = ?
    `).get(groupId, currentDay);

    if (!dailyQuestion) return res.status(404).json({ error: 'No daily question' });

    let hasVoted = false;
    if (dailyQuestion.type === 'vote') {
        const vote = db.prepare('SELECT 1 FROM votes WHERE daily_question_id = ? AND voter_id = ?')
            .get(dailyQuestion.id, req.session.userId);
        hasVoted = !!vote;
    } else {
        const answer = db.prepare('SELECT 1 FROM answers WHERE daily_question_id = ? AND user_id = ?')
            .get(dailyQuestion.id, req.session.userId);
        hasVoted = !!answer;
    }

    if (!hasVoted) {
        return res.status(403).json({ error: "You must answer today's question first." });
    }
    
    next();
};


const assignDailyQuestion = (groupId, dayNumber) => {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Berlin', month: 'numeric', day: 'numeric' }).formatToParts(new Date());
    const month = parseInt(parts.find(p => p.type === 'month').value, 10);
    const day = parseInt(parts.find(p => p.type === 'day').value, 10);
    const isJuly31 = month === 7 && day === 31;
    
    let specialQuestionId = null;

    if (isJuly31) {
      // Ensure the special question exists in the DB
      let specialQ = db.prepare('SELECT id FROM questions WHERE text = ?').get('Wer tanzt durch sein Leben?');
      if (!specialQ) {
        const info = db.prepare("INSERT INTO questions (text, type) VALUES (?, 'vote')").run('Wer tanzt durch sein Leben?');
        specialQuestionId = info.lastInsertRowid;
      } else {
        specialQuestionId = specialQ.id;
      }

      // Check if it hasn't been asked today yet
      const alreadyAsked = db.prepare('SELECT 1 FROM daily_questions WHERE group_id = ? AND question_id = ?').get(groupId, specialQuestionId);
      if (alreadyAsked) {
        specialQuestionId = null; // We already forced it, let it pick a normal random one if they skip it
      }
    }

    let unusedQuestion;
    
    if (specialQuestionId) {
      unusedQuestion = db.prepare('SELECT id, text, type FROM questions WHERE id = ?').get(specialQuestionId);
    } else {
      unusedQuestion = db.prepare(`
        SELECT id, text, type FROM questions 
        WHERE (group_id IS NULL OR group_id = ?)
        AND id NOT IN (
          SELECT dq.question_id FROM daily_questions dq 
          WHERE dq.group_id = ? AND (
            EXISTS (SELECT 1 FROM votes v WHERE v.daily_question_id = dq.id) OR
            EXISTS (SELECT 1 FROM answers a WHERE a.daily_question_id = dq.id)
          )
        )
        ORDER BY (group_id IS NULL) ASC, RANDOM() LIMIT 1
      `).get(groupId, groupId);
    }
  
    if (unusedQuestion) {
      // If the question uses [MEMBER], pick a random member now and lock it in
      let featuredMemberId = null;
      if (unusedQuestion.type === 'guess') {
        // Pick whoever has been in the spotlight the least, so everyone gets their turn
        const member = db.prepare(`
          SELECT u.id FROM users u
          JOIN group_members gm ON u.id = gm.user_id
          WHERE gm.group_id = ?
          ORDER BY (
            SELECT COUNT(*) FROM daily_questions dq
            JOIN questions q ON dq.question_id = q.id
            WHERE dq.group_id = gm.group_id AND q.type = 'guess' AND dq.featured_member_id = u.id
          ) ASC, RANDOM()
          LIMIT 1
        `).get(groupId);
        if (member) featuredMemberId = member.id;
      } else if (unusedQuestion.type === 'open' && unusedQuestion.text.includes('[MEMBER]')) {
        const members = db.prepare(`
          SELECT u.id FROM users u
          JOIN group_members gm ON u.id = gm.user_id
          WHERE gm.group_id = ?
          ORDER BY RANDOM() LIMIT 1
        `).all(groupId);
        if (members.length > 0) {
          featuredMemberId = members[0].id;
        }
      }

      const info = db.prepare('INSERT INTO daily_questions (group_id, question_id, day_number, featured_member_id) VALUES (?, ?, ?, ?)')
        .run(groupId, unusedQuestion.id, dayNumber, featuredMemberId);
      if (unusedQuestion.type === 'guess' && featuredMemberId) {
        sendGuessFeaturedPush(groupId, featuredMemberId);
      }
      return info.lastInsertRowid;
    }
    return null;
};

// ── Today's question ──────────────────────────────────────────

router.get('/today', (req, res) => {
  const groupId = req.params.id;
  const currentDay = ensureTodayQuestion(groupId);
  if (!currentDay) return res.status(404).json({ error: 'Group not found' });

  let dailyQuestion = db.prepare(`
    SELECT dq.id, dq.day_number, dq.created_at, q.text, q.type, dq.featured_member_id
    FROM daily_questions dq
    JOIN questions q ON dq.question_id = q.id
    WHERE dq.group_id = ? AND dq.day_number = ?
  `).get(groupId, currentDay);

  if (!dailyQuestion) {
    const newId = assignDailyQuestion(groupId, currentDay);
    if (newId) {
        dailyQuestion = db.prepare(`
            SELECT dq.id, dq.day_number, dq.created_at, q.text, q.type, dq.featured_member_id
            FROM daily_questions dq
            JOIN questions q ON dq.question_id = q.id
            WHERE dq.id = ?
        `).get(newId);
    } else {
        return res.status(404).json({ error: 'No more questions available' });
    }
  }

  const members = db.prepare(`
    SELECT u.id, u.username, u.avatar_url
    FROM users u
    JOIN group_members gm ON u.id = gm.user_id
    WHERE gm.group_id = ?
  `).all(groupId);

  if (dailyQuestion.type !== 'vote' && dailyQuestion.text.includes('[MEMBER]')) {
      // Use stored featured_member_id if available, otherwise fall back to calculation
      let featuredMember;
      if (dailyQuestion.featured_member_id) {
        const stored = db.prepare('SELECT username FROM users WHERE id = ?').get(dailyQuestion.featured_member_id);
        featuredMember = stored ? stored.username : members[0]?.username || 'Someone';
      } else {
        const memberIndex = dailyQuestion.day_number % members.length;
        featuredMember = members[memberIndex]?.username || 'Someone';
      }
      const capitalizedMember = featuredMember.charAt(0).toUpperCase() + featuredMember.slice(1);
      dailyQuestion.text = dailyQuestion.text.replace(/\[MEMBER\]/g, capitalizedMember);
  }

  let hasVoted = false;
  let results = null;

  if (dailyQuestion.type === 'vote') {
    const vote = db.prepare('SELECT 1 FROM votes WHERE daily_question_id = ? AND voter_id = ?')
        .get(dailyQuestion.id, req.session.userId);
    hasVoted = !!vote;
    if (hasVoted) {
        results = db.prepare(`
            SELECT v.voted_for_id, COUNT(*) as count, u.username, u.avatar_url
            FROM votes v
            JOIN users u ON v.voted_for_id = u.id
            WHERE v.daily_question_id = ?
            GROUP BY v.voted_for_id
            ORDER BY count DESC
        `).all(dailyQuestion.id);
    }
  } else {
    const answer = db.prepare('SELECT 1 FROM answers WHERE daily_question_id = ? AND user_id = ?')
        .get(dailyQuestion.id, req.session.userId);
    hasVoted = !!answer;
    if (hasVoted) {
        results = db.prepare(`
            SELECT a.id, a.user_id, a.answer_text, a.is_correct, u.username, u.avatar_url
            FROM answers a
            JOIN users u ON a.user_id = u.id
            WHERE a.daily_question_id = ?
        `).all(dailyQuestion.id);
    }
  }

  res.json({
      dailyQuestion,
      hasVoted,
      results,
      members: dailyQuestion.type === 'vote' ? members : undefined,
      featuredMember: dailyQuestion.type === 'guess'
        ? members.find(m => m.id === dailyQuestion.featured_member_id)
        : undefined,
      leaderboard: dailyQuestion.type === 'guess' && hasVoted ? getGuessLeaderboard(groupId, dailyQuestion.featured_member_id) : undefined
  });
});

// ── Vote ──────────────────────────────────────────────────────

router.post('/vote', (req, res) => {
    const groupId = req.params.id;
    const { votedForId } = req.body;
    if (!votedForId) return res.status(400).json({ error: 'Missing votedForId' });

    const currentDay = ensureTodayQuestion(groupId);
    if (!currentDay) return res.status(404).json({ error: 'Group not found' });
    
    const dailyQuestion = db.prepare(`
        SELECT dq.id, q.type FROM daily_questions dq
        JOIN questions q ON dq.question_id = q.id
        WHERE dq.group_id = ? AND dq.day_number = ?
    `).get(groupId, currentDay);

    if (!dailyQuestion || dailyQuestion.type !== 'vote') return res.status(400).json({ error: 'Invalid question' });

    try {
        db.prepare('INSERT INTO votes (daily_question_id, voter_id, voted_for_id) VALUES (?, ?, ?)')
            .run(dailyQuestion.id, req.session.userId, votedForId);
            
        // Trigger push notification asynchronously
        checkAndSendFirstAnswerPush(groupId, dailyQuestion.id, req.session.userId);

        res.json({ success: true });
    } catch (err) {
        if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Already voted' });
        res.status(500).json({ error: 'Server error' });
    }
});

// ── Answer ────────────────────────────────────────────────────

router.post('/answer', (req, res) => {
    const groupId = req.params.id;
    const { answerText } = req.body;
    if (!answerText) return res.status(400).json({ error: 'Missing answerText' });

    const currentDay = ensureTodayQuestion(groupId);
    if (!currentDay) return res.status(404).json({ error: 'Group not found' });
    
    const dailyQuestion = db.prepare(`
        SELECT dq.id, q.type FROM daily_questions dq
        JOIN questions q ON dq.question_id = q.id
        WHERE dq.group_id = ? AND dq.day_number = ?
    `).get(groupId, currentDay);

    if (!dailyQuestion || dailyQuestion.type === 'vote') return res.status(400).json({ error: 'Invalid question' });

    try {
        db.prepare('INSERT INTO answers (daily_question_id, user_id, answer_text) VALUES (?, ?, ?)')
            .run(dailyQuestion.id, req.session.userId, answerText);
            
        // Trigger push notification asynchronously
        checkAndSendFirstAnswerPush(groupId, dailyQuestion.id, req.session.userId);

        res.json({ success: true });
    } catch (err) {
        if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Already answered' });
        res.status(500).json({ error: 'Server error' });
    }
});

// ── Guess: mark answers correct ───────────────────────────────

router.post('/answers/:answerId/correct', (req, res) => {
    const groupId = req.params.id;
    const { isCorrect } = req.body;

    const answer = db.prepare(`
        SELECT a.id, a.user_id, dq.featured_member_id, q.type
        FROM answers a
        JOIN daily_questions dq ON a.daily_question_id = dq.id
        JOIN questions q ON dq.question_id = q.id
        WHERE a.id = ? AND dq.group_id = ?
    `).get(req.params.answerId, groupId);

    if (!answer || answer.type !== 'guess') return res.status(404).json({ error: 'Answer not found' });
    if (answer.featured_member_id !== req.session.userId) {
        return res.status(403).json({ error: 'Only the person this question is about can mark guesses' });
    }
    if (answer.user_id === req.session.userId) return res.status(400).json({ error: 'Cannot mark your own answer' });

    db.prepare('UPDATE answers SET is_correct = ? WHERE id = ?').run(isCorrect ? 1 : 0, answer.id);
    res.json({ success: true });
});

// ── Skip day ──────────────────────────────────────────────────

router.post('/skip-day', requireAnsweredToday, (req, res) => {
    const groupId = req.params.id;
    
    // Only the group creator (admin) can skip
    const group = db.prepare('SELECT created_by FROM groups WHERE id = ?').get(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (group.created_by !== req.session.userId) {
        return res.status(403).json({ error: 'Only the group admin can skip questions' });
    }

    try {
        const tracker = db.prepare('SELECT current_day FROM group_day_tracker WHERE group_id = ?').get(groupId);
        if (!tracker) return res.status(404).json({ error: 'Group not found' });
        
        const nextDay = tracker.current_day + 1;
        db.prepare('UPDATE group_day_tracker SET current_day = ? WHERE group_id = ?').run(nextDay, groupId);
        
        assignDailyQuestion(groupId, nextDay);
        res.json({ success: true, day: nextDay });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ── History ───────────────────────────────────────────────────

router.get('/history', requireAnsweredToday, (req, res) => {
    const groupId = req.params.id;
    const currentDay = ensureTodayQuestion(groupId);
    if (!currentDay) return res.status(404).json({ error: 'Group not found' });

    const pastQuestions = db.prepare(`
        SELECT dq.id, dq.day_number, dq.created_at, q.text, q.type, dq.featured_member_id
        FROM daily_questions dq
        JOIN questions q ON dq.question_id = q.id
        WHERE dq.group_id = ? AND dq.day_number < ?
        ORDER BY dq.day_number DESC
    `).all(groupId, currentDay);

    const members = db.prepare(`
        SELECT u.id, u.username, u.avatar_url
        FROM users u
        JOIN group_members gm ON u.id = gm.user_id
        WHERE gm.group_id = ?
    `).all(groupId);

    const history = pastQuestions.map(dq => {
        let questionText = dq.text;
        if (dq.type !== 'vote' && questionText.includes('[MEMBER]')) {
            let featuredMember;
            if (dq.featured_member_id) {
              const stored = db.prepare('SELECT username FROM users WHERE id = ?').get(dq.featured_member_id);
              featuredMember = stored ? stored.username : members[0]?.username || 'Someone';
            } else {
              const memberIndex = dq.day_number % members.length;
              featuredMember = members[memberIndex]?.username || 'Someone';
            }
            const capitalizedMember = featuredMember.charAt(0).toUpperCase() + featuredMember.slice(1);
            questionText = questionText.replace(/\[MEMBER\]/g, capitalizedMember);
        }

        let results = null;
        if (dq.type === 'vote') {
            results = db.prepare(`
                SELECT v.voted_for_id, COUNT(*) as count, u.username, u.avatar_url
                FROM votes v
                JOIN users u ON v.voted_for_id = u.id
                WHERE v.daily_question_id = ?
                GROUP BY v.voted_for_id
                ORDER BY count DESC
            `).all(dq.id);
        } else {
            results = db.prepare(`
                SELECT a.id, a.user_id, a.answer_text, a.is_correct, u.username, u.avatar_url
                FROM answers a
                JOIN users u ON a.user_id = u.id
                WHERE a.daily_question_id = ?
            `).all(dq.id);
        }

        return {
            id: dq.id,
            day_number: dq.day_number,
            created_at: dq.created_at,
            text: questionText,
            type: dq.type,
            featured_member_id: dq.featured_member_id,
            results
        };
    });

    res.json(history);
});

// ── Custom Questions CRUD ─────────────────────────────────────

// List custom questions for this group (only the ones created by current user)
router.get('/custom-questions', requireAnsweredToday, (req, res) => {
    const groupId = req.params.id;
    const questions = db.prepare(`
        SELECT q.id, q.text, q.type, q.created_by, u.username as created_by_name,
               EXISTS(
                 SELECT 1 FROM daily_questions dq 
                 LEFT JOIN votes v ON dq.id = v.daily_question_id 
                 LEFT JOIN answers a ON dq.id = a.daily_question_id 
                 WHERE dq.question_id = q.id AND (v.id IS NOT NULL OR a.id IS NOT NULL)
               ) as is_used
        FROM questions q
        JOIN users u ON q.created_by = u.id
        WHERE q.group_id = ?
        ORDER BY q.id DESC
    `).all(groupId);
    
    res.json(questions.map(q => ({
        ...q,
        isOwn: q.created_by === req.session.userId,
        isUsed: !!q.is_used
    })));
});

// Create a custom question
router.post('/custom-questions', requireAnsweredToday, (req, res) => {
    const groupId = req.params.id;
    const { text, type } = req.body;
    
    if (!text || !text.trim()) return res.status(400).json({ error: 'Question text is required' });
    if (!type || !['vote', 'open', 'guess'].includes(type)) return res.status(400).json({ error: 'Type must be "vote", "open" or "guess"' });
    if (type === 'guess' && !text.includes('[MEMBER]')) return res.status(400).json({ error: 'Guess questions must contain [MEMBER]' });

    try {
        const result = db.prepare('INSERT INTO questions (text, type, group_id, created_by) VALUES (?, ?, ?, ?)')
            .run(text.trim(), type, groupId, req.session.userId);
        
        const question = db.prepare('SELECT id, text, type, group_id, created_by FROM questions WHERE id = ?')
            .get(result.lastInsertRowid);
        
        res.json({ ...question, isOwn: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create question' });
    }
});

// Edit a custom question (only owner)
router.put('/custom-questions/:qid', requireAnsweredToday, (req, res) => {
    const { qid } = req.params;
    const groupId = req.params.id;
    const { text, type } = req.body;

    const question = db.prepare('SELECT * FROM questions WHERE id = ? AND group_id = ?').get(qid, groupId);
    if (!question) return res.status(404).json({ error: 'Question not found' });
    if (question.created_by !== req.session.userId) return res.status(403).json({ error: 'You can only edit your own questions' });

    // Don't allow editing if already answered
    const used = db.prepare(`
      SELECT 1 FROM daily_questions dq 
      LEFT JOIN votes v ON dq.id = v.daily_question_id 
      LEFT JOIN answers a ON dq.id = a.daily_question_id 
      WHERE dq.question_id = ? AND (v.id IS NOT NULL OR a.id IS NOT NULL)
    `).get(qid);
    if (used) return res.status(400).json({ error: 'Cannot edit a question that has already been answered' });

    if (!text || !text.trim()) return res.status(400).json({ error: 'Question text is required' });
    if (type && !['vote', 'open', 'guess'].includes(type)) return res.status(400).json({ error: 'Type must be "vote", "open" or "guess"' });
    if ((type || question.type) === 'guess' && !text.includes('[MEMBER]')) return res.status(400).json({ error: 'Guess questions must contain [MEMBER]' });

    try {
        db.prepare('UPDATE questions SET text = ?, type = ? WHERE id = ?')
            .run(text.trim(), type || question.type, qid);
        
        const updated = db.prepare('SELECT id, text, type, group_id, created_by FROM questions WHERE id = ?').get(qid);
        res.json({ ...updated, isOwn: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update question' });
    }
});

// Delete a custom question (only owner)
router.delete('/custom-questions/:qid', requireAnsweredToday, (req, res) => {
    const { qid } = req.params;
    const groupId = req.params.id;

    const question = db.prepare('SELECT * FROM questions WHERE id = ? AND group_id = ?').get(qid, groupId);
    if (!question) return res.status(404).json({ error: 'Question not found' });
    if (question.created_by !== req.session.userId) return res.status(403).json({ error: 'You can only delete your own questions' });

    // Don't allow deleting if already answered
    const used = db.prepare(`
      SELECT 1 FROM daily_questions dq 
      LEFT JOIN votes v ON dq.id = v.daily_question_id 
      LEFT JOIN answers a ON dq.id = a.daily_question_id 
      WHERE dq.question_id = ? AND (v.id IS NOT NULL OR a.id IS NOT NULL)
    `).get(qid);
    if (used) return res.status(400).json({ error: 'Cannot delete a question that has already been answered' });

    try {
        db.prepare('DELETE FROM daily_questions WHERE question_id = ?').run(qid);
        db.prepare('DELETE FROM questions WHERE id = ?').run(qid);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete question' });
    }
});

// ── Comments ──────────────────────────────────────────────────

router.get('/comments/:dqid', requireAnsweredToday, (req, res) => {
    const { dqid } = req.params;
    
    // Ensure the daily question belongs to the group
    const dq = db.prepare('SELECT id FROM daily_questions WHERE id = ? AND group_id = ?').get(dqid, req.params.id);
    if (!dq) return res.status(404).json({ error: 'Daily question not found' });

    const comments = db.prepare(`
        SELECT c.id, c.text, c.created_at, u.id as user_id, u.username, u.avatar_url
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.daily_question_id = ?
        ORDER BY c.created_at ASC
    `).all(dqid);

    res.json(comments);
});

router.post('/comments/:dqid', requireAnsweredToday, (req, res) => {
    const { dqid } = req.params;
    const { text } = req.body;
    
    if (!text || !text.trim()) return res.status(400).json({ error: 'Comment text is required' });

    const dq = db.prepare('SELECT id FROM daily_questions WHERE id = ? AND group_id = ?').get(dqid, req.params.id);
    if (!dq) return res.status(404).json({ error: 'Daily question not found' });

    try {
        const result = db.prepare('INSERT INTO comments (daily_question_id, user_id, text) VALUES (?, ?, ?)')
            .run(dqid, req.session.userId, text.trim());
            
        const comment = db.prepare(`
            SELECT c.id, c.text, c.created_at, u.id as user_id, u.username, u.avatar_url
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.id = ?
        `).get(result.lastInsertRowid);
        
        // Trigger push notification asynchronously
        sendCommentPush(req.params.id, req.session.userId);

        res.json(comment);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
