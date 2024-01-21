const { generate } = require('./ollama/ollama.js');

// extract generates additional information about a document using JSON output from an LLM
async function extract(model, doc) {
    fromTitleAndSections(model, doc);
}

// fromTitleAndSections generates additional information about a document using the title and sections
async function fromTitleAndSections(model, doc) {
    const docOverview = getOverview(doc);
    await generateSummary(model, docOverview);
}

function getOverview(doc) {
    // destructure the original doc to get fileName and sections
    const { fileName, data } = doc;
    const sections = data.map(item => item.section);
    const docOverview = {
        fileName: fileName,
        sections: sections
    };

    return JSON.stringify(docOverview, null, 2); // the null and 2 arguments format the JSON for pretty printing
}

async function generateSummary(model, overview) {
    const prompt = `Based on the following document overview attempt to generate a summary of the document. Respond in json with two fields: \`success\` and \`content\`. \`success\` should be true if it seems possible to generate an accurate summary and false otherwise. \`content\` should be the summary if success is true and an empty string otherwise.
\`\`\`
    ${overview}
\`\`\``;
    await generate(model, prompt, (json) => {
        // TODO: handle the json response
        process.stdout.write(json.response);
    });
}

module.exports = {
    extract,
};
  