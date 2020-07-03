const fs = require("fs");
const path = require("path");
const CleanCss = require("clean-css");

const files = fs.readdirSync(path.resolve("src", "style"));
const toMove = files.filter((file) => file.endsWith(".css"));

const cleaner = new CleanCss({});

fs.promises.mkdir("built/style", { recursive: true }).then(() => {
  toMove.forEach((file) => {
    const contents = fs.readFileSync(path.resolve("src", "style", file));
    const minified = cleaner.minify(contents);
    fs.writeFileSync(path.resolve("built", "style", file), minified.styles);
  });
});
