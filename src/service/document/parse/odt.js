const odt2html = require('odt2html');
const { removeCitations, removeHyperlinks } = require("./clean");
const { extractSectionsAndContent } = require('./html');
const { error } = require("../../logger.js");

async function parseOdt(odtFilePath) {
  try {
    let html = await odt2html.toHTML({ path: odtFilePath });

    if (!html || !html.value) {
      return [];
    }

    html = removeCitations(html);
    html = removeHyperlinks(html);

    return extractSectionsAndContent(html);
  } catch (err) {
    error("Error parsing ODT file:", err);
    return [];
  }
}

module.exports = {
  parseOdt,
};
