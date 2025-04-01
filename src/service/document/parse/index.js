const { parsePdf } = require("./pdf");
const { parseTxt } = require("./txt");
const { parseMd } = require("./md");
const { parseDocx } = require("./docx");
const { parseOdt } = require("./odt");
const { parseHtml } = require("./html");

module.exports = {
  parseMd,
  parseOdt,
  parsePdf,
  parseTxt,
  parseDocx,
  parseHtml
};
