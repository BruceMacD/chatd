const mammoth = require("mammoth");
const { splitText } = require("./clean");

async function parseDocx(docx) {
  // TODO: can convert to html here to get a better idea of the structure
  const result = await mammoth.extractRawText({ buffer: docx });
  const text = result.value;

  if (!text) {
    return []
  }

  return  [
      {
        section: "",
        content: splitText(text),
      },
    ];
}

module.exports = {
  parseDocx,
};
