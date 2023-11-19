const mammoth = require("mammoth");
const { removeCitations, removeHyperlinks } = require("./clean");
const { extractSectionsAndContent } = require('./html');

async function parseDocx(docx) {
  let doc = await mammoth.convertToHtml({ buffer: docx });

  if (!doc.value) {
    return []
  }

  let html = removeCitations(doc.value);
  html = removeHyperlinks(html);

  return extractSectionsAndContent(html);
}

module.exports = {
  parseDocx,
};
