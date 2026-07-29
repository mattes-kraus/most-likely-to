const db = require('./db');

const seedData = () => {
  const count = db.prepare('SELECT COUNT(*) as count FROM questions').get();
  
  if (count.count === 0) {
    const insertQuestion = db.prepare('INSERT INTO questions (text, type) VALUES (?, ?)');
    const transaction = db.transaction((questions) => {
      for (const q of questions) {
        insertQuestion.run(q.text, q.type);
      }
    });

    const questions = [
      // Vote-type examples
      { text: 'Wer landet am ehesten im Gefängnis?', type: 'vote' },
      { text: 'Wer wird am ehesten berühmt?', type: 'vote' },
      { text: 'Wer würde am längsten in einer Zombie-Apokalypse überleben?', type: 'vote' },
      { text: 'Wer wird am ehesten Millionär?', type: 'vote' },
      { text: 'Wer vergisst am ehesten seinen eigenen Geburtstag?', type: 'vote' },
      { text: 'Wer gewinnt am ehesten eine Reality-TV-Show?', type: 'vote' },
      { text: 'Wer ist der schlechteste Autofahrer?', type: 'vote' },
      { text: 'Wer weint am ehesten bei einem Film?', type: 'vote' },
      { text: 'Wer isst am ehesten etwas vom Boden?', type: 'vote' },
      { text: 'Wer schickt am ehesten versehentlich eine Nachricht an die falsche Person?', type: 'vote' },
      { text: 'Wer wird am ehesten Bundeskanzler/in?', type: 'vote' },
      { text: 'Wer verläuft sich am ehesten in seiner eigenen Stadt?', type: 'vote' },
      { text: 'Wer würde am längsten ohne Handy überleben?', type: 'vote' },
      { text: 'Wer gründet am ehesten ein eigenes Unternehmen?', type: 'vote' },
      { text: 'Wer kommt am ehesten zu spät zu seiner eigenen Hochzeit?', type: 'vote' },

      // Open-type examples
      { text: "[MEMBER] steht erstarrt vor dem Kühlschrank. Was ist passiert?", type: 'open' },
      { text: "[MEMBER] hat Hausverbot in einem Laden bekommen. Was haben sie getan?", type: 'open' },
      { text: "[MEMBER] trendet auf Twitter (X). Warum?", type: 'open' },
      { text: "[MEMBER] hat ein Buch geschrieben. Wie lautet der Titel?", type: 'open' },
      { text: "[MEMBER] hat einen YouTube-Kanal gestartet. Worum geht es?", type: 'open' },
      { text: "[MEMBER] wurde verhaftet. Was ist passiert?", type: 'open' },
      { text: "[MEMBER] hat gerade einen Preis gewonnen. Wofür?", type: 'open' },
      { text: "[MEMBER] ist in den Nachrichten. Was haben sie getan?", type: 'open' },
      { text: "[MEMBER] hat ein Restaurant eröffnet. Was steht auf der Speisekarte?", type: 'open' },
      { text: "[MEMBER] hat ein geheimes Talent. Welches?", type: 'open' },
      { text: "[MEMBER] ist ins Jahr 3000 gereist. Was tun sie zuerst?", type: 'open' },
      { text: "[MEMBER] ist aus Versehen berühmt geworden. Wie?", type: 'open' },
      { text: "[MEMBER] ist die Hauptfigur in einem Horrorfilm. Was ist ihr Schicksal?", type: 'open' },
      { text: "[MEMBER] hat eine Sekte gegründet. Was beten sie an?", type: 'open' },
      { text: "[MEMBER] ist ein Superheld. Was ist ihre Superkraft?", type: 'open' }
    ];

    transaction(questions);
    console.log('Database seeded with questions.');
  }
};

module.exports = seedData;
