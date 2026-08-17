const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { verifyPackage } = require("../scripts/verify-package.js");

function fixture() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "chatd-package-"));
}

function write(root, relativePath) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, "");
}

test("accepts a complete Electron package", (t) => {
  const root = fixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  write(root, "resources/app/package.json");
  write(root, "resources/app/src/index.js");
  write(root, "resources/app/src/service/worker.js");
  write(root, "locales/en-US.pak");

  assert.deepEqual(verifyPackage(root), []);
});

test("rejects the incomplete v1.1.2 release shape", (t) => {
  const root = fixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  fs.mkdirSync(path.join(root, "resources"), { recursive: true });
  fs.mkdirSync(path.join(root, "locales"), { recursive: true });
  write(root, "LICENSE.zip");

  assert.deepEqual(verifyPackage(root), [
    "missing resources/app/package.json",
    "missing resources/app/src/index.js",
    "missing resources/app/src/service/worker.js",
    "missing locale .pak files",
    "unexpected nested archive: LICENSE.zip",
  ]);
});
