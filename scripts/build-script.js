const obfus = require("javascript-obfuscator");
const { minify } = require("html-minifier");
const CleanCss = require("clean-css");
const fs = require("fs");
const path = require("path");
const pack = require("js-bmp-packer");
const sharp = require("sharp");
const util = require("./build-util");
const { minifyHtmlOpts, obfusJsOpts } = require("./build-options");
const { processThenCopyMd } = require("./package-md");

const opts = process.argv
	.slice(2)
	.filter((arg) => arg.startsWith("--"))
	.map((arg) => [arg.slice(2), true]);
const { blobs, html, css, md, js, all } = Object.fromEntries(opts);

// blobs
if (all || blobs) {
	console.log("Copying blobs");

	/* eslint-disable no-await-in-loop */
	(async () => {
		await util.copyFiles("blobs", "blobs");

		// technically conflict between different types of mds
		const numberDirs = await fs.promises.readdir(path.join("src", "blobs"));
		for (const dir of numberDirs) {
			const files = await fs.promises.readdir(
				path.join("src", "blobs", dir)
			);
			const imgFiles = files.filter(
				(file) => file.endsWith("png") || file.endsWith("jpg")
			);

			for (const file of imgFiles) {
				let imageData = await fs.promises.readFile(
					path.join("src", "blobs", dir, file)
				);

				if (imageData.buffer.byteLength >= 1024 * 1024) {
					imageData = await sharp(imageData).resize(640).toBuffer();
				}

				// can we work util.copyFiles into this somehow without
				// gitignoring a temp directory
				await fs.promises.mkdir(path.join("built", "blobs", dir), {
					recursive: true,
				});
				await fs.promises.writeFile(
					path.join("built", "blobs", dir, file),
					imageData
				);
			}
		}
	})();
	/* eslint-enable no-await-in-loop */
}

// html
if (all || html) {
	console.log("Copying root html");
	util.processThenCopyFiles(
		"./",
		"./",
		(f) => f.endsWith(".html"),
		(content) => minify(String(content), minifyHtmlOpts)
	);
}

// style
if (all || css) {
	console.log("Copying stylesheets and fonts");
	util.processThenCopyFiles(
		"./style",
		"./style",
		(f) => f.endsWith(".css") || f.endsWith(".ttf"),
		(content) => {
			const minified = new CleanCss({}).minify(String(content));
			return minified.warnings.length ? content : minified.styles;
		}
	);

	util.processThenCopyFiles(
		"./style",
		"scripts/output/chtml/fonts/woff-v2/",
		(f) => f.endsWith(".woff"),
		(content) => content
	);
}

function p(scriptContents, file) {
	const resultName = `${path.basename(file, ".js")}.bmp`;

	const resultScriptBuf = file.endsWith(".js")
		? Buffer.from(
				obfus
					.obfuscate(scriptContents.toString(), obfusJsOpts)
					.getObfuscatedCode()
		  )
		: scriptContents;

	try {
		const imageContents = fs.readFileSync(
			path.resolve("src", "images", resultName)
		);

		const obfusImageScript = pack(imageContents, resultScriptBuf);
		return {
			file: resultName,
			content: obfusImageScript,
		};
	} catch (e) {
		return resultScriptBuf;
	}
}

if (all || js) {
	console.log("Processing javascript");
	util.processThenCopyFiles(
		"./scripts",
		"./scripts",
		(f) => f.endsWith(".js") || f.endsWith(".wasm") || f.endsWith(".gz"),
		p
	);
}

if (all || md) {
	console.log("Processing markdown");
	processThenCopyMd(
		"./md/posts",
		"./posts",
		"A blog of sorts. Thoughts may be unorganized and writing quality may be poor."
	);
	processThenCopyMd(
		"./md/puzzles",
		"./puzzles",
		"Personal solutions or workthroughs of random puzzles. Should be decent quality. I do not guarantee the correctness of solutions or programs."
	);
}
