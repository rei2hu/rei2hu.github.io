const fs = require("fs");
const path = require("path");
const util = require("util");
const hljs = require("highlight.js");
const exec = util.promisify(require("child_process").exec);
const showdown = require("showdown");
const { minify } = require("html-minifier");
const { minifyHtmlOpts } = require("./build-options");

// formatting commits that i dont want to include
// (only want to include commits that change actual content)
const unwantedCommits = new Set([
	"fc6fd8ff18d2e4575360f43cbe0d3a998dba8c4e",
	"767a8af1be03806d93292d24a113c51dce3e181b",
	"54ca8fb41dd57792e73cd6c0ca5cceace847945e",
	"f190e1501d1675fa889817c431c79bf58ae6b276",
	"b90c38d9c34303ffe309172573129c6d57e1f956",
	"28e0abe584df7418bde1d954c6f7001533f36efd",
	"e226319c06c49c07f5f78f683f258241e3a67af7",
	"a82b73d92ec61205c59ffa4adb3d6ca351841a12",
	"13fc0e1f0c00d341f868ca56af90a4cff7653023",
	"6a42f3960f4774627c5c27cd975b93f8c3118013",
	"2897ef5a1f178cf8ec1290d7d93206d8996ea095",
	"edc2f81d62ba5573d2561075f6f6e4dd6c6247da",
	"9707f574c6169632d3c0a7b4d0520c87d0eb3f26",
	"715819fe25a082f1cf44592b65db6e8e7f7d0ced",
	"aa2d62d1d5c860cdf9792ccd47fde0e5c8e534f8",
	"41deec72f5510a5c5183d46df80459738de1d50a",
	"e2c6af3c4d2e3a56863dcdba8aa553c9b10bd492",
]);

const unescapeHtml = (escapedHtml) =>
	escapedHtml
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");

const jaxExtensions = () => {
	const inlineMathContent = [];
	const displayMathContent = [];

	return [
		// tikz tag handling
		// showdown replaces $ with ¨D
		{
			type: "lang",
			regex: /¨D¨D\n(\\begin{tikzpicture}(\n|.)+?\\end{tikzpicture})\n¨D¨D/g,
			replace: `<noscript><pre>$1</pre></noscript><script type="text/tikz">$1</script>`,
		},
		// try not to transform inline mathjax code by encoding it before
		// transformation then decoding it after
		{
			type: "lang",
			regex: /\s¨D(.+?)¨D/g,
			replace: (_str, g1) => {
				inlineMathContent.push(g1);
				return `MATHJAXINLINECONTENTPLACEHOLDER ${
					inlineMathContent.length - 1
				}`;
			},
		},
		{
			type: "output",
			regex: /MATHJAXINLINECONTENTPLACEHOLDER (\d+)/g,
			replace: (_str, contentNum) => {
				return ` $${inlineMathContent[contentNum]}$`;
			},
		},
		// and the same for display math
		{
			type: "lang",
			regex: /¨D¨D((\n|.)+?)¨D¨D/g,
			replace: (_str, g1) => {
				displayMathContent.push(g1);
				return `MATHJAXDISPLAYCONTENTPLACEHOLDER ${
					displayMathContent.length - 1
				}`;
			},
		},
		{
			type: "output",
			regex: /MATHJAXDISPLAYCONTENTPLACEHOLDER (\d+)/g,
			replace: (_str, contentNum) => {
				return `$$${displayMathContent[contentNum]}$$`;
			},
		},
	];
};

const codeBlockExtensions = (mdId) => {
	let codeBlockCounter = 1;
	return [
		// code block handling is applied last
		{
			type: "output",
			// code blocks end up being
			// <pre><input /><label /><code ...>
			// (code)
			// </code></pre>
			regex: /<pre><code class="(.*?)">((\n|.)*?)<\/code><\/pre>/g,
			replace: (_str, g1, g2) => {
				const id = `code-block-${mdId}-${codeBlockCounter++}`;
				// g1 is (lang) language-(lang)
				const lang = g1.split(" ")[0];
				// unescape certain html entities because hljs will re-escape
				const highlighted = hljs.highlight(unescapeHtml(g2), {
					language: lang,
				});
				if (highlighted.illegal) {
					console.warn(`Illegal code found in code block ${id}`);
				}
				const code = highlighted.value;
				return `<pre class="code-block"><input id="${id}" type="checkbox"/><label for="${id}"></label><code>${code}</code></pre>`;
			},
		},
	];
};
const converter = (extensions = []) => {
	return new showdown.Converter({
		extensions,
		strikethrough: true,
		ghCompatibleHeaderId: true,
		tables: true,
	});
};

const template = fs.readFileSync(
	path.resolve("src", "md", "template.html"),
	"utf8"
);

function fillTemplate({
	contents = () => "",
	commits = () => "",
	title = () => "",
	before = () => "",
	after = () => "",
} = {}) {
	return template
		.replace("$((contents))", contents)
		.replace("$((commits))", commits)
		.replace(/\$\(\(before\)\)/g, before)
		.replace(/\$\(\(after\)\)/g, after)
		.replace("$((title))", title);
}

module.exports = {
	processThenCopyMd(srcDir, targetDir, { desc = "", filter = [] } = {}) {
		fs.promises
			.mkdir(path.resolve("built", targetDir), { recursive: true })
			.then(async () => {
				const posts = fs.readdirSync(path.resolve("src", srcDir));

				// generate data for html
				const fileObjs = await Promise.all(
					posts
						.filter((name) => name.endsWith(".md"))
						.map((mdFileName) => {
							const filePath = path.resolve(
								"src",
								srcDir,
								mdFileName
							);
							return { mdFileName, filePath };
						})
						.filter(({ filePath }) => {
							// if filter is empty then allow all, else only
							// allow things in filter
							return (
								filter.length === 0 ||
								filter.some((filterPath) =>
									filePath.endsWith(filterPath)
								)
							);
						})
						.map(async ({ mdFileName, filePath }) => {
							const contents = await fs.promises.readFile(
								filePath,
								"utf8"
							);

							// extract from git log -p -U0
							// process %ad - %H - %s format
							const extractDHM = (content) =>
								content.split("\n")[0].split(" - ");
							const extractHash = (content) =>
								extractDHM(content)[1];

							// there are index, file, and similarity lines here
							// so try to skip those
							const extractDiff = (content) =>
								content
									.split("\n")
									// not the best filter for file lines but
									// it'll do what it does
									.filter(
										(row) =>
											["--- ", "+++ "].every(
												(chars) =>
													!row.startsWith(chars)
											) &&
											["@", "+", "-", " "].some((char) =>
												row.startsWith(char)
											)
									)
									.join("\n");

							const commitsAndDiffs = (
								await exec(
									`git log --follow --date=short --pretty=format:"%ad - %H - %s" -p -U1 "${filePath.replace(
										/\$/g,
										process.platform === "win32"
											? `"$"`
											: `\\$`
									)}"`
								)
							).stdout
								.split("\n\n")
								.filter(
									(output) =>
										!unwantedCommits.has(
											extractHash(output)
										)
								)
								.map((output) => {
									const [date, hash, message] = extractDHM(
										output
									);
									return {
										date,
										commit: hash,
										message,
										diff: extractDiff(output),
									};
								});

							// extract # from #. title.md
							const id = parseInt(mdFileName.split(".")[0], 10);

							return {
								id,
								// extract "title" from #. title.md
								name: path
									.basename(mdFileName, ".md")
									.split(".")[1]
									.slice(1),
								contents: converter([
									...jaxExtensions(),
									...codeBlockExtensions(id),
								]).makeHtml(contents),
								changes: commitsAndDiffs,
							};
						})
				);

				console.log(`Processing ${fileObjs.length} markdown files`);

				// generate html and save all as files
				const writeFilesPromise = Promise.all(
					fileObjs
						.sort((a, b) => a.id - b.id)
						.map(({ id, name, contents, changes }) => {
							const html = fillTemplate({
								contents: () => contents,
								commits: () => {
									const history = changes
										.map(
											({
												commit,
												date,
												message,
												diff,
											}) => {
												// dont want to escape mathjax
												// things in here
												const htmlGen = converter(
													codeBlockExtensions(commit)
												);
												// remove 1 for the blank at
												// beginning
												const individualChanges = diff
													.split(/^@@ /m)
													.slice(1)
													.map((change) =>
														htmlGen.makeHtml(
															`\`\`\`diff\n@@ ${change}\n\`\`\``
														)
													);

												return `
												<details>
													<summary>${date} - ${message}</summary>
													${individualChanges.join("\n")}
												</details>`;
											}
										)
										.join("");
									// span for centering indiviual element
									return `<span>History:</span>${history}`;
								},
								// position of element is id - 1
								before: () =>
									id > 1
										? `<div style="flex:0 0 50%"><a href="/${targetDir}/${
												id - 1
										  }">&lt; ${
												fileObjs[id - 1 - 1].name
										  }</a></div>`
										: `<div style="flex:0 0 50%"></div>`,
								after: () =>
									id < fileObjs.length
										? `<div style="text-align:end"><a href="/${targetDir}/${
												id + 1
										  }">${
												fileObjs[id].name
										  } &gt;</a></div>`
										: "",
								title: name,
							});
							const minified = minify(html, minifyHtmlOpts);

							return fs.promises.writeFile(
								path.resolve("built", targetDir, `${id}.html`),
								minified
							);
						})
				);

				// create main page
				const html = fillTemplate({
					contents: () =>
						`<p>${desc}</p>
							<input type="checkbox" id="list-ordering" checked />
							<label for="list-ordering"> List Order</label>
							<ol><li>${fileObjs
								.map(({ id, name, changes }) => {
									return `<span class="de-emphasized">${
										changes[changes.length - 1].date
									}</span>
												<a href="/${targetDir}/${id}">${name}</a>
									${
										changes.length > 1
											? `<span class="de-emphasized"><span class="superscript"> - ${
													changes.length - 1
											  } edit${
													changes.length - 1 === 1
														? ""
														: "s"
											  }</span></span>`
											: ""
									}`;
								})
								.join("</li><li>")}
					</li></ol>`,
					title: () => targetDir.slice(1),
				})
					// remove link from page that user is on
					.replace(
						new RegExp(`<a href="${targetDir.slice(1)}">(.*?)</a>`),
						"$1"
					);
				const minified = minify(html, minifyHtmlOpts);

				const mainFilePromise = fs.promises.writeFile(
					path.resolve("built", targetDir, "index.html"),
					minified
				);

				await Promise.all([writeFilesPromise, mainFilePromise]);
			});
	},
};
