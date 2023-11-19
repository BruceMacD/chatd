const { splitText } = require("./clean");

function extractSectionsAndContent(html) {
    // Remove all content within tags except for <h1> to <h6> and <p>
    let cleanedHtml = html.replace(/<(?!\/?(h[1-6]|p)(?=>|\s.*>))\/?.*?>/gi, '');

    // Split into sections based on heading tags
    const sectionRegex = /<h[1-6][^>]*>(.*?)<\/h[1-6]>|<p[^>]*>(.*?)<\/p>/gi;
    let match;
    let currentSection = { section: '', content: '' };
    const extractedSections = [];

    while ((match = sectionRegex.exec(cleanedHtml)) !== null) {
        if (match[0].startsWith('<h')) {
            // If there's a current section with content, push it to the array
            if (currentSection.section !== '' || currentSection.content !== '') {
                currentSection.content = splitText(currentSection.content);
                extractedSections.push(currentSection);
                currentSection = { section: '', content: '' };
            }
            currentSection.section = match[1].trim(); // Set new section title
        } else if (match[0].startsWith('<p')) {
            currentSection.content += ' ' + match[2].trim(); // Accumulate paragraph content
        }
    }

    // Push the last section if it has content
    if (currentSection.section !== '' || currentSection.content !== '') {
        currentSection.content = splitText(currentSection.content);
        extractedSections.push(currentSection);
    }

    return extractedSections;
}

module.exports = {
    extractSectionsAndContent,
};
