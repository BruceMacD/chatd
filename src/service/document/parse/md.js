const { splitText } = require("./clean");

function parseMd(markdownText) {
  const sections = [];
  const lines = markdownText.split("\n");

  // the header and text of each section
  let header = null;
  let text = "";

  lines.forEach((line) => {
    const isHeader = line.match(/^#+\s/);
    if (isHeader) {
      if (header !== null) {
        if (text === "") {
          // found a section with no text
          return;
        }
        sections.push({
          section: header,
          content: splitText(text),
        });
      }

      header = line.replace(/#/g, "").trim();
      text = ""; // begin searching for text
    } else {
      text += line + "\n";
    }
  });

  if (header !== null) {
    sections.push({
      section: header,
      content: splitText(text),
    });
  }

  return sections;
}

module.exports = {
  parseMd,
};
