const fs = require("node:fs");
const path = require("node:path");

function verifyPackage(packageDirectory) {
  const root = path.resolve(packageDirectory);
  const errors = [];
  const requiredFiles = [
    "resources/app/package.json",
    "resources/app/src/index.js",
    "resources/app/src/service/worker.js",
  ];

  for (const relativePath of requiredFiles) {
    if (!fs.existsSync(path.join(root, relativePath))) {
      errors.push(`missing ${relativePath}`);
    }
  }

  const localesDirectory = path.join(root, "locales");
  const locales = fs.existsSync(localesDirectory)
    ? fs.readdirSync(localesDirectory).filter((name) => name.endsWith(".pak"))
    : [];
  if (locales.length === 0) {
    errors.push("missing locale .pak files");
  }

  const nestedArchives = fs.existsSync(root)
    ? fs
        .readdirSync(root)
        .filter((name) => name.toLowerCase().endsWith(".zip"))
    : [];
  if (nestedArchives.length > 0) {
    errors.push(`unexpected nested archive: ${nestedArchives.join(", ")}`);
  }

  return errors;
}

if (require.main === module) {
  const packageDirectory = process.argv[2];
  if (!packageDirectory) {
    console.error("Usage: node scripts/verify-package.js <package-directory>");
    process.exit(2);
  }

  const errors = verifyPackage(packageDirectory);
  if (errors.length > 0) {
    console.error(`Package verification failed:\n- ${errors.join("\n- ")}`);
    process.exit(1);
  }

  console.log(`Package verification passed: ${path.resolve(packageDirectory)}`);
}

module.exports = { verifyPackage };
