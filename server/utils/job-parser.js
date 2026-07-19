// Broad, dependency-free keyword extraction — filters stop words rather than
// matching against a fixed tech-buzzword whitelist, so it actually returns
// something for domain-specific or non-English postings (e.g. German-market
// roles: "Automatisierung", "AI-Agents", "n8n" aren't in any curated tech
// list, but they ARE the keywords that matter for this JD).
const STOP_WORDS = new Set([
  'a', 'an', 'the',
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves',
  'you', 'your', 'yours', 'yourself', 'yourselves',
  'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself',
  'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
  'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing',
  'will', 'would', 'could', 'should', 'might', 'must', 'shall', 'can',
  'need', 'dare', 'ought', 'used',
  'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while',
  'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between',
  'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under',
  'again', 'further', 'then', 'once',
  'nor', 'so', 'yet', 'both', 'either', 'neither', 'not', 'only',
  'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'every',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'own', 'same',
  'than', 'too', 'very', 'just', 'also', 'now', 'etc', 'within',
  // Job-posting boilerplate that isn't a meaningful keyword
  'role', 'position', 'job', 'work', 'working', 'team', 'company',
  'looking', 'seeking', 'required', 'requirements', 'responsibilities',
  'qualifications', 'preferred', 'experience', 'years', 'year', 'ability',
  'skills', 'knowledge', 'strong', 'excellent', 'good', 'great', 'well',
  'include', 'including', 'includes', 'may', 'like', 'e.g', 'i.e', 'via',
  // German function words — many postings in this market are in German
  'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einer', 'eines',
  'einem', 'einen', 'und', 'oder', 'aber', 'wenn', 'dass', 'wie', 'als',
  'auch', 'nur', 'noch', 'schon', 'sehr', 'mehr', 'sowie', 'sowohl',
  'ist', 'sind', 'war', 'waren', 'wird', 'werden', 'wurde', 'hat', 'haben',
  'kann', 'können', 'muss', 'müssen', 'soll', 'sollen', 'wollen',
  'wir', 'sie', 'ihr', 'ihre', 'ihrem', 'ihren', 'ihrer', 'uns', 'unser',
  'unsere', 'unserem', 'unseren', 'du', 'dich', 'dir', 'euch',
  'wer', 'was', 'wo', 'wann', 'warum', 'welche', 'welcher', 'welches',
  'bei', 'mit', 'von', 'vom', 'zu', 'zur', 'zum', 'auf', 'aus', 'für',
  'im', 'nach', 'über', 'unter', 'durch', 'bis', 'seit', 'ohne',
  'nicht', 'kein', 'keine', 'sich', 'man', 'alle', 'alles',
  'diese', 'dieser', 'dieses', 'jede', 'jeder', 'jedes',
  'unternehmen', 'mitarbeiter', 'mitarbeiterin', 'stelle', 'aufgaben',
  'profil', 'erfahrung', 'kenntnisse', 'bereich', 'zusammen',
  'gerne', 'idealerweise', 'wünschenswert', 'gute', 'guten', 'guter',
  'suchen', 'suchst', 'jemanden', 'jemand', 'arbeitest', 'arbeiten',
  'arbeitet', 'eng', 'sowie', 'bereits', 'bringst', 'bringen',
]);

const MIN_WORD_LENGTH = 3;
// Includes German umlauts/ß so words like "Wärmepumpen" or "unabhängig"
// aren't shredded into fragments.
const WORD_CHAR_PATTERN = /[^a-z0-9\-äöüß]+/;

function extractKeywords(text) {
  const keywords = new Set();
  const words = text.toLowerCase().split(WORD_CHAR_PATTERN);

  for (const word of words) {
    if (word.length >= MIN_WORD_LENGTH && !STOP_WORDS.has(word) && !/^\d+$/.test(word)) {
      keywords.add(word);
    }
  }

  return keywords;
}

function parseJobDescription(text) {
  if (!text || typeof text !== 'string') {
    return { rawText: '', keywords: [], requirements: [] };
  }

  const keywords = extractKeywords(text);

  const requirements = [];
  const reqPatterns = [
    /(\d+\+?\s*years?\s+(?:of\s+)?experience)/gi,
    /(bachelor'?s?|master'?s?|ph\.?d\.?|mba)\s+(?:degree\s+)?(?:in\s+[\w\s]+)?/gi,
    /(strong\s+(?:knowledge|experience|understanding)\s+(?:of|in|with)\s+[\w\s,]+)/gi,
    /(proficien(?:t|cy)\s+(?:in|with)\s+[\w\s,]+)/gi,
    /(experience\s+(?:with|in|using)\s+[\w\s,]+)/gi
  ];

  reqPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const req = match[1].trim();
      if (req.length > 10 && req.length < 200) requirements.push(req);
    }
  });

  return {
    rawText: text,
    keywords: [...keywords],
    requirements: [...new Set(requirements)]
  };
}

module.exports = { parseJobDescription };
