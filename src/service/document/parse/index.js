const { parsePdf } = require("./pdf");
const { parseTxt } = require("./txt");
const { parseMd } = require("./md");

module.exports = {
  parseMd,
  parsePdf,
  parseTxt,
};
