const fs = require("fs");
const { Buffer } = require("buffer");
const path = require("path");

const pack = require("js-bmp-packer");
const obfus = require("javascript-obfuscator");
const uglify = require("uglify-es");
const { obfusJsOpts } = require("./process-options");

fs.promises
  .mkdir(path.resolve("built", "scripts"), { recursive: true })
  .then(async () => {
    const scripts = (
      await fs.promises.readdir(path.resolve("src", "scripts"))
    ).filter(
      (file) =>
        file.endsWith(".js") || file.endsWith(".wasm") || file.endsWith(".gz")
    );

    const packedScripts = await Promise.all(
      scripts.map(async (script) => {
        const resultName = `${path.basename(script, ".js")}.bmp`;

        const scriptContents = await fs.promises.readFile(
          path.resolve("src", "scripts", script)
        );

        const resultScriptBuf = script.endsWith(".js")
          ? Buffer.from(
              uglify.minify(
                obfus
                  .obfuscate(scriptContents.toString(), obfusJsOpts)
                  .getObfuscatedCode()
              ).code
            )
          : scriptContents;

        try {
          const imageContents = await fs.promises.readFile(
            path.resolve("src", "images", resultName)
          );

          const obfusImageScript = pack(imageContents, resultScriptBuf);
          return {
            name: resultName,
            buffer: obfusImageScript,
          };
        } catch (e) {
          // if the image didn't exist
          // or minification failed for a non js file
          return {
            name: script,
            buffer: resultScriptBuf,
          };
        }
      })
    );

    // eslint-disable-next-line no-console
    console.log(`building ${packedScripts.length} scripts`);

    await Promise.all(
      packedScripts.map(({ name, buffer }) =>
        fs.promises.writeFile(path.resolve("built", "scripts", name), buffer)
      )
    );
  });
