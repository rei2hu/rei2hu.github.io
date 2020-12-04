module.exports = {
  minifyHtmlOpts: {
    removeAttributeQuotes: true,
    collapseBooleanAttributes: true,
    collapseInlineTagWhitespace: true,
    collapseWhitespace: true,
    conservativeCollapse: true,
    minifyJS: true,
    minifyCSS: true,
    removeComments: true,
  },
  obfusJsOpts: {
    compact: true,
    // disableConsoleOutput: true,
    // identifierNamesGenerator: "hexadecimal",
    // stringArray: true,
    // stringArrayEncoding: "base64",
    // stringArrayThreshold: 0.75,
    // transformObjectKeys: true,
    // unicodeEscapeSequence: true,
  },
};
