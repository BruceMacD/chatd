function removeImages(content) {
  return content.replace(/!\[\[.*?\]\]/g, "");
}

function removeHyperlinks(content) {
  return content.replace(/\[(.*?)\]\((.*?)\)/g, "$1");
}

function removeCitations(content) {
  return content.replace(/\[\d+\]/g, "");
}

function splitText(text) {
  let cleanedText = text.replace(/\n/g, " "); // Replace newlines with spaces
  cleanedText = cleanedText.replace(/\s+/g, " "); // Replace multiple spaces with single space
  cleanedText = removeCitations(cleanedText); // Remove citation numbers like [85]
  cleanedText = removeHyperlinks(cleanedText); // Remove hyperlinks
  cleanedText = removeImages(cleanedText); // Remove images
  cleanedText = removeImages(cleanedText);
  cleanedText = removeHyperlinks(cleanedText);

  // This regex pattern attempts to split the text into sentences based on periods
  const sentenceRegex = /(?<!\w\.\w)(?<![A-Z][a-z]\.)(?<=[.!?])\s+(?=[A-Z])/g;
  return cleanedText.split(sentenceRegex);
}

module.exports = {
  removeImages,
  removeHyperlinks,
  removeCitations,
  splitText,
};
