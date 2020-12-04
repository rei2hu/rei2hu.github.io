// for copying files between a src directory under src and a target directory
// under built
const fs = require("fs");
const path = require("path");
const { ncp } = require("ncp");
const { Buffer } = require("buffer");

// process file content in one place then copy to target, only one level deep
function processThenCopyFiles(srcDir, targetDir, filter, process) {
  return fs.promises
    .mkdir(path.resolve("built", targetDir), { recursive: true })
    .then(() => {
      const files = fs.readdirSync(path.resolve("src", srcDir));
      const passingFiles = files.filter(filter);
      for (const file of passingFiles) {
        const content = fs.readFileSync(path.resolve("src", srcDir, file));
        const updatedStuff = process(content, file);

        if (
          typeof updatedStuff === "object" &&
          !Buffer.isBuffer(updatedStuff)
        ) {
          fs.writeFileSync(
            path.resolve("built", targetDir, updatedStuff.file),
            updatedStuff.content
          );
        } else {
          fs.writeFileSync(
            path.resolve("built", targetDir, file),
            updatedStuff
          );
        }
      }
    });
}

// copy files from one place to another, recursively
function copyFiles(srcDir, targetDir, filter) {
  return fs.promises
    .mkdir(path.resolve("built", targetDir), { recursive: true })
    .then(
      () =>
        new Promise((resolve, reject) =>
          ncp(
            path.resolve("src", srcDir),
            path.resolve("built", targetDir),
            {
              filter,
            },
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          )
        )
    );
}

module.exports = {
  copyFiles,
  processThenCopyFiles,
};
