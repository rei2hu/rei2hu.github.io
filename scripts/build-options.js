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
		simplify: true,
		compact: true,
		stringArray: false,
		identifierNamesGenerator: "mangled", // makes variable naming consistent
		// disableConsoleOutput: true,
		// stringArrayEncoding: "base64",
		// stringArrayThreshold: 0.75,
		// transformObjectKeys: true,
		// unicodeEscapeSequence: true,
	},
};
