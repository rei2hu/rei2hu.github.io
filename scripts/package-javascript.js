// pass a folder of bmps and folder of js files to be packaged into runnable
// bmps takes all scripts in js folder, searches for one with same name in bmp
// folder and packs them together and stores result in target dir

const [, , images, scripts, target] = process.argv;

if (!images || !scripts || !target) {
  // eslint-disable-next-line no-console
  console.error("missing images, scripts, or target dir");
  process.exit(1);
}

const fs = require("fs").promises;
const { Buffer } = require("buffer");
const path = require("path");
const pack = require("js-bmp-packer");
const obfus = require("javascript-obfuscator");
const uglify = require("uglify-es");
const { obfusJsOpts } = require("./process-options");

fs.mkdir(target, { recursive: true }).then(() =>
  fs
    .readdir(path.resolve(scripts))
    .then((files) =>
      Promise.all(
        files
          .filter((file) => file.endsWith(".js"))
          .map((f) => {
            const name = `${path.basename(f, ".js")}.bmp`;
            return Promise.all([
              fs.readFile(path.resolve(images, name)),
              fs.readFile(path.resolve(scripts, f)),
            ])
              .then(([a, b]) => ({
                name,
                buffer: pack(
                  a,
                  Buffer.from(
                    uglify.minify(
                      obfus
                        .obfuscate(b.toString(), obfusJsOpts)
                        .getObfuscatedCode()
                    ).code
                  )
                ),
              }))
              .catch(() =>
                // if there isn't a related image then just dont pack
                // i.e. for the image loader
                fs.readFile(path.resolve(scripts, f)).then((script) => ({
                  name: `${name.slice(0, -4)}.js`,
                  buffer: Buffer.from(
                    uglify.minify(
                      obfus
                        .obfuscate(script.toString(), obfusJsOpts)
                        .getObfuscatedCode()
                    ).code
                  ),
                }))
              );
          })
      )
    )
    .then((nameBufObjs) => {
      // eslint-disable-next-line no-console
      console.log(
        `Creating scripts for ${nameBufObjs.map((obj) => obj.name).join(", ")}`
      );
      Promise.all(
        nameBufObjs.map(({ name, buffer }) =>
          fs.writeFile(path.resolve(target, name), buffer)
        )
      );
    })
);
