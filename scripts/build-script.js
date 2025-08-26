/* eslint-disable global-require */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const util = require("./build-util");
const { minifyHtmlOpts, obfusJsOpts } = require("./build-options");
const { processThenCopyMd } = require("./package-md");

const opts = process.argv
	.slice(2)
	.filter((arg) => arg.startsWith("--"))
	.map((arg) => [arg.slice(2), true]);
const entries = Object.fromEntries(opts);
const all = opts.length === 0 ? true : entries.all;
const { blobs, assets, css, md, js, fmd } = entries;

// disable for now because bugged due to generating backwards/forwards links
// needing previous and after mds; also generating the list pages need them too.
// const fmd = false;

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
					imageData = await require("sharp")(imageData)
						.resize(640)
						.toBuffer();
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

// assets
if (all || assets) {
	console.log("Copying static assets (html, icon, robots)");
	util.processThenCopyFiles(
		"./",
		"./",
		(f) => f.endsWith(".html") || f === "favicon.svg" || f === "robots.txt",
		(content, f) =>
			f.endsWith(".html")
				? require("html-minifier").minify(
						String(content),
						minifyHtmlOpts
				  )
				: content
	);
}

// style
if (all || css) {
	console.log("Copying stylesheets and fonts");
	util.processThenCopyFiles(
		"./style",
		"./style",
		(f) => f.endsWith(".css") || f.endsWith(".ttf"),
		(content, file) => {
			if (file.endsWith(".ttf")) return content;

			const minified = new (require("clean-css"))({}).minify(
				String(content)
			);
			if (minified.warnings.length > 0) {
				console.warn(String(content), minified.warnings);
				return content;
			}
			return minified.styles;
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
				require("javascript-obfuscator")
					.obfuscate(scriptContents.toString(), obfusJsOpts)
					.getObfuscatedCode()
		  )
		: scriptContents;

	try {
		const imageContents = fs.readFileSync(
			path.resolve("src", "images", resultName)
		);

		const obfusImageScript = require("js-bmp-packer")(
			imageContents,
			resultScriptBuf
		);
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

if (all || md || fmd) {
	// fmd has precedence
	if (fmd) {
		console.log("Processing filtered markdown");
	} else {
		console.log("Processing markdown");
	}

	const diffCommand = "git diff --name-only HEAD";
	const changedFiles = (fmd
		? execSync(diffCommand)
				.toString()
				.split("\n")
				.filter((filePath) => filePath.length > 0)
		: []
	)
		// technically not correct because files from other dirs could share
		// names but it's not game breaking
		.map((pa) => path.basename(pa));

	processThenCopyMd("./md/posts", "./posts", {
		desc:
			"A blog of sorts. Thoughts may be unorganized and writing quality may be poor.",
		filter: changedFiles,
	});
	processThenCopyMd("./md/test", "./test", {
		desc: "Test file for style check",
		filter: changedFiles,
	});

	/*
	processThenCopyMd("./md/puzzles", "./puzzles", {
		desc:
			"Personal solutions or workthroughs of random puzzles. Should be decent quality. I do not guarantee the correctness of solutions or programs.",
		filter: changedFiles,
	});
	*/
}
