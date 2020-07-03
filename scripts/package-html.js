const fs = require("fs");
const path = require("path");

const files = fs.readdirSync(path.resolve("src"));
const toMove = files.filter((file) => file.endsWith(".html"));
toMove.forEach((file) => {
  const contents = fs.readFileSync(path.resolve("src", file));
  fs.writeFileSync(path.resolve("built", file), contents);
});
