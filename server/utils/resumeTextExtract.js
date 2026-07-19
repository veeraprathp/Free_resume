const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const TEXT_MIMETYPES = new Set(['text/plain', 'text/markdown']);

async function extractText(buffer, mimetype) {
  if (mimetype === 'application/pdf') {
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }

  if (TEXT_MIMETYPES.has(mimetype) || !mimetype) {
    return buffer.toString('utf8');
  }

  throw new Error(`Unsupported resume file type: ${mimetype}`);
}

module.exports = { extractText };
