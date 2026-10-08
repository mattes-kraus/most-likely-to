const db = require('./db');

const seedData = () => {
  // Insert any global (backup) question that doesn't exist yet, so new ones get added on restart
  const exists = db.prepare('SELECT 1 FROM questions WHERE text = ? AND group_id IS NULL');
  const insertQuestion = db.prepare('INSERT INTO questions (text, type) VALUES (?, ?)');
  const transaction = db.transaction((questions) => {
    let added = 0;
    for (const q of questions) {
      if (!exists.get(q.text)) {
        insertQuestion.run(q.text, q.type);
        added++;
      }
    }
    return added;
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
    { text: "[MEMBER] ist ein Superheld. Was ist ihre Superkraft?", type: 'open' },

    // Family pack – vote
    { text: "Wer ruft am ehesten bei Mama an, um zu fragen, wie lange Nudeln kochen müssen?", type: 'vote' },
    { text: "Wer ist bei Familienfeiern als Letztes noch wach?", type: 'vote' },
    { text: "Wer schläft beim gemeinsamen Filmabend als Erstes ein?", type: 'vote' },
    { text: "Wer schummelt am ehesten bei Gesellschaftsspielen?", type: 'vote' },
    { text: "Wer ist der schlechteste Verlierer beim Spieleabend?", type: 'vote' },
    { text: "Wer hat als Kind am meisten Ärger gemacht?", type: 'vote' },
    { text: "Wer war früher das Lieblingskind (und gibt es nicht zu)?", type: 'vote' },
    { text: "Wer erzählt dieselbe Geschichte am häufigsten?", type: 'vote' },
    { text: "Wer lacht am lautesten über die eigenen Witze?", type: 'vote' },
    { text: "Wer findet am ehesten noch ein Geschenk an Heiligabend um 15 Uhr?", type: 'vote' },
    { text: "Wer packt für ein Wochenende einen ganzen Koffer?", type: 'vote' },
    { text: "Wer verlegt am häufigsten Schlüssel, Brille oder Handy?", type: 'vote' },
    { text: "Wer würde ein Familiengeheimnis am schnellsten ausplaudern?", type: 'vote' },
    { text: "Wer ist der heimliche Chef der Familie?", type: 'vote' },
    { text: "Wer hat den Familien-Gruppenchat am meisten auf stumm?", type: 'vote' },
    { text: "Wer schickt die meisten Sprachnachrichten?", type: 'vote' },
    { text: "Wer antwortet am langsamsten auf Nachrichten?", type: 'vote' },
    { text: "Wer isst heimlich die letzten Süßigkeiten auf?", type: 'vote' },
    { text: "Wer würde am ehesten bei einer Quizshow gewinnen?", type: 'vote' },
    { text: "Wer würde in einem Escape Room als Erstes in Panik geraten?", type: 'vote' },
    { text: "Wer überlebt am längsten allein auf einer einsamen Insel?", type: 'vote' },
    { text: "Wer würde am ehesten ein Haustier gegen den Willen der anderen anschaffen?", type: 'vote' },
    { text: "Wer ist am ehesten mit dem Nachbarn befreundet?", type: 'vote' },
    { text: "Wer diskutiert am liebsten über Politik beim Essen?", type: 'vote' },
    { text: "Wer hat den seltsamsten Musikgeschmack?", type: 'vote' },
    { text: "Wer singt am lautesten unter der Dusche?", type: 'vote' },
    { text: "Wer würde am ehesten an einer Castingshow teilnehmen?", type: 'vote' },
    { text: "Wer ist der beste Gastgeber?", type: 'vote' },
    { text: "Wer kommt am ehesten zu spät zum Familienessen?", type: 'vote' },
    { text: "Wer ist am ehesten schon eine Stunde zu früh am Bahnhof?", type: 'vote' },
    { text: "Wer verbrennt am ehesten etwas beim Kochen?", type: 'vote' },
    { text: "Wer verliert sich am ehesten stundenlang in einem Baumarkt?", type: 'vote' },
    { text: "Wer kauft am ehesten etwas völlig Unnötiges im Internet?", type: 'vote' },
    { text: "Wer würde am ehesten auswandern?", type: 'vote' },
    { text: "Wer wird am ehesten Oma oder Opa des Jahres?", type: 'vote' },
    { text: "Wer kann am besten ein Geheimnis für sich behalten?", type: 'vote' },
    { text: "Wer hält am längsten einen Neujahrsvorsatz durch?", type: 'vote' },
    { text: "Wer gibt am ehesten zu, dass er/sie Unrecht hatte?", type: 'vote' },
    { text: "Wer hat das beste Gedächtnis für Familiengeschichten?", type: 'vote' },
    { text: "Wer ist am ehesten der Grund, warum es eine neue Familienregel gibt?", type: 'vote' },
    { text: "Wer würde in einem Krimi der Täter sein?", type: 'vote' },
    { text: "Wer würde in einem Krimi den Fall lösen?", type: 'vote' },
    { text: "Wer startet am ehesten einen Streit über die Spülmaschine?", type: 'vote' },
    { text: "Wer räumt die Spülmaschine am seltsamsten ein?", type: 'vote' },
    { text: "Wer ist morgens am schlechtesten gelaunt?", type: 'vote' },
    { text: "Wer macht die besten Urlaubsfotos?", type: 'vote' },
    { text: "Wer plant den Familienurlaub bis ins letzte Detail?", type: 'vote' },
    { text: "Wer würde am ehesten einen Marathon laufen?", type: 'vote' },
    { text: "Wer schaut am ehesten eine komplette Serie an einem Wochenende?", type: 'vote' },
    { text: "Wer ist der größte Sparfuchs?", type: 'vote' },
    { text: "Wer gibt am meisten Geld für Essen aus?", type: 'vote' },
    { text: "Wer würde am ehesten ein Tattoo bereuen?", type: 'vote' },
    { text: "Wer adoptiert am ehesten fünf Katzen?", type: 'vote' },
    { text: "Wer ist der beste Tröster, wenn es jemandem schlecht geht?", type: 'vote' },
    { text: "Wer wäre im Mittelalter am besten zurechtgekommen?", type: 'vote' },
    { text: "Wer würde am ehesten bei einem Flashmob mitmachen?", type: 'vote' },

    // Family pack – open
    { text: "[MEMBER] schreibt die Familien-Chronik. Wie heißt das Kapitel über dich?", type: 'open' },
    { text: "[MEMBER] darf eine neue Familientradition einführen. Welche?", type: 'open' },
    { text: "[MEMBER] organisiert das nächste Familienfest. Was ist das Motto?", type: 'open' },
    { text: "Was ist die peinlichste Geschichte, die man über [MEMBER] erzählen kann?", type: 'open' },
    { text: "Welches Emoji beschreibt [MEMBER] am besten?", type: 'open' },
    { text: "[MEMBER] bekommt eine eigene Kochshow. Wie heißt sie?", type: 'open' },
    { text: "Welches Tier wäre [MEMBER] und warum?", type: 'open' },
    { text: "[MEMBER] hat im Lotto gewonnen. Was ist der erste Kauf?", type: 'open' },
    { text: "Was war das beste Geschenk, das ihr je von [MEMBER] bekommen habt?", type: 'open' },
    { text: "[MEMBER] ist zehn Jahre älter. Was hat sich verändert?", type: 'open' },
    { text: "Welcher Satz fällt bei [MEMBER] garantiert jeden Tag?", type: 'open' },
    { text: "[MEMBER] wird als Film verfilmt. Welcher Schauspieler/welche Schauspielerin spielt die Hauptrolle?", type: 'open' },
    { text: "[MEMBER] hat eine Woche lang das Sagen in der Familie. Welche Regeln gelten?", type: 'open' },
    { text: "Was wäre [MEMBER]s Henkersmahlzeit?", type: 'open' },
    { text: "[MEMBER] öffnet einen kleinen Laden. Was wird verkauft?", type: 'open' },
    { text: "Was ist eure schönste Erinnerung mit [MEMBER]?", type: 'open' },
    { text: "[MEMBER] schreibt eine Kontaktanzeige. Wie lautet der erste Satz?", type: 'open' },
    { text: "Welcher Song ist der Soundtrack von [MEMBER]s Leben?", type: 'open' },
    { text: "[MEMBER] tritt bei Wer wird Millionär an. Bei welcher Frage scheitert er/sie?", type: 'open' },
    { text: "Was würde [MEMBER] auf eine einsame Insel mitnehmen?", type: 'open' },
    { text: "[MEMBER] hinterlässt einen Zettel am Kühlschrank. Was steht drauf?", type: 'open' },
    { text: "Welche Familienanekdote über [MEMBER] wird nie alt?", type: 'open' },
    { text: "[MEMBER] wird Influencer/in. Worüber postet er/sie?", type: 'open' },
    { text: "Was ist [MEMBER]s heimliche Superkraft im Alltag?", type: 'open' },
    { text: "Was ist das beste Familienessen aller Zeiten?", type: 'open' },
    { text: "Welcher Familienurlaub war der chaotischste und warum?", type: 'open' },
    { text: "Welches Familienrezept muss unbedingt weitergegeben werden?", type: 'open' },
    { text: "Was ist euer Lieblingsspiel für einen Familienabend?", type: 'open' },
    { text: "Wenn unsere Familie eine Band wäre: Wie würde sie heißen?", type: 'open' },
    { text: "Welche Serie beschreibt unsere Familie am besten?", type: 'open' }
  ];

  const added = transaction(questions);
  if (added > 0) console.log(`Seeded ${added} new questions.`);
};

module.exports = seedData;
