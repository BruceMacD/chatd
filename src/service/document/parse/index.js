const { parsePdf } = require("./pdf");
const { parseTxt } = require("./txt");
const { parseMd } = require("./md");
const { parseDocx } = require("./docx");

module.exports = {
  parseMd,
  parsePdf,
  parseTxt,
  parseDocx
};
