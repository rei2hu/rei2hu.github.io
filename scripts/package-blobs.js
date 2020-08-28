const { ncp } = require("ncp");
const fs = require("fs");
const path = require("path");

fs.promises.mkdir("built/blobs", { recursive: true }).then(() => {
  ncp(path.resolve("src", "blobs"), path.resolve("built", "blobs"));
});
