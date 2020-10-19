const fs = require("fs");
const path = require("path");

const { ncp } = require("ncp");

fs.promises
  .mkdir(path.resolve("built", "blots"), { recursive: true })
  .then(() => {
    ncp(path.resolve("src", "blobs"), path.resolve("built", "blobs"));
  });
