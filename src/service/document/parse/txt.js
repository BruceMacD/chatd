function parseTxt(data) {
  // chunk the data based on new line characters
  let lines = data.split("\n");
  // further chunk the data based on patterns which indicate a new sentence
  let chunks = [];
  lines.forEach((line) => {
    // Split the content by periods that are followed by a space and a capital letter,
    // a question mark or exclamation mark followed by a space and a capital letter,
    // or the end of the content.
    // This regular expression tries to account for periods used in abbreviations,
    // decimal numbers, etc., by not splitting in those cases.
    const sentenceEndings =
      /(?<!\b(?:Mr|Mrs|Ms|Dr|Sr|Sra|Jr)\.)(?<!\b[A-Za-z]\.)(?<!\w\.\w.)(?<=\.|\?|!)(?=\s+[A-Z]|\s*$)/g;
    chunks = chunks.concat(line.split(sentenceEndings));
  });

  // Filter out any empty strings resulting from the split.
  const content = chunks.filter((chunk) => chunk !== "");
  // TODO: add metadata and info here too as keys in map (see md.js)
  return [
    {
      section: "",
      content: content,
    },
  ];
}

module.exports = {
  parseTxt,
};
