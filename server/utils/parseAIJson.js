// Models sometimes emit raw control characters (literal newlines/tabs) inside
// JSON string values, which strict JSON.parse rejects ("Unterminated string").
// Walk the text tracking quote state and escape them only inside strings.
function escapeControlCharsInStrings(text) {
  let out = '';
  let inString = false;
  let escaped = false;
  for (const ch of text) {
    if (inString) {
      if (escaped) { out += ch; escaped = false; continue; }
      if (ch === '\\') { out += ch; escaped = true; continue; }
      if (ch === '"') { inString = false; out += ch; continue; }
      if (ch === '\n') { out += '\\n'; continue; }
      if (ch === '\r') { out += '\\r'; continue; }
      if (ch === '\t') { out += '\\t'; continue; }
      out += ch;
    } else {
      if (ch === '"') inString = true;
      out += ch;
    }
  }
  return out;
}

function parseAIJson(raw) {
  let cleaned = raw.trim();
  if (cleaned.includes('```json')) cleaned = cleaned.split('```json')[1].split('```')[0].trim();
  else if (cleaned.includes('```')) cleaned = cleaned.split('```')[1].split('```')[0].trim();

  try {
    return JSON.parse(cleaned);
  } catch (firstError) {
    // Fallback 1: models sometimes wrap the JSON in conversational text —
    // extract the outermost {...} object.
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) throw firstError;
    const sliced = cleaned.slice(start, end + 1);
    try {
      return JSON.parse(sliced);
    } catch (secondError) {
      // Fallback 2: repair raw control characters inside string values.
      return JSON.parse(escapeControlCharsInStrings(sliced));
    }
  }
}

module.exports = { parseAIJson };
