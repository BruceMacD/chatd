const { parsePdf } = require("./pdf");
const { parseTxt } = require("./txt");
const { parseMd } = require("./md");
const { parseDocx } = require("./docx");
const { parseOdt } = require("./odt");

module.exports = {
  parseMd,
  parseOdt,
  parsePdf,
  parseTxt,
  parseDocx
};
