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

  if (cleanedText.includes(".")) {
    // This regex pattern attempts to split the text into sentences based on periods
    const sentenceRegex = /(?<!\w\.\w)(?<![A-Z][a-z]\.)(?<=[.!?])\s+(?=[A-Z])/g;
    return cleanedText.split(sentenceRegex);
  }
  
  // there are no periods, so just split by chunks of 100 characters
  const chunkSize = 100;
  const chunks = [];
  for (let i = 0; i < cleanedText.length; i += chunkSize) {
    chunks.push(cleanedText.substring(i, i + chunkSize));
  }
  return chunks;
}

module.exports = {
  removeImages,
  removeHyperlinks,
  removeCitations,
  splitText,
};
