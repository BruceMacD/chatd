const odt2html = require('odt2html');
const { removeCitations, removeHyperlinks } = require("./clean");
const { extractSectionsAndContent } = require('./html');

async function parseOdt(odtFilePath) {
  try {
    let html = await odt2html.toHTML({ path: odtFilePath });

    if (!html || !html.value) {
      return [];
    }

    html = removeCitations(html);
    html = removeHyperlinks(html);

    return extractSectionsAndContent(html);
  } catch (error) {
    console.error("Error parsing ODT file:", error);
    return [];
  }
}

module.exports = {
  parseOdt,
};
