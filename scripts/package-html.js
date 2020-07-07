const fs = require("fs");
const path = require("path");
const { minify } = require("html-minifier");
const { minifyHtmlOpts } = require("./process-options");

const files = fs.readdirSync(path.resolve("src"));
files
  .filter((file) => file.endsWith(".html"))
  .forEach((file) => {
    const contents = fs.readFileSync(path.resolve("src", file), "utf8");
    fs.writeFileSync(
      path.resolve("built", file),
      minify(contents, minifyHtmlOpts)
    );
  });
