const fs = require("fs");
const path = require("path");
const util = require("util");
const hljs = require("highlight.js");
const exec = util.promisify(require("child_process").exec);
const showdown = require("showdown");
const { minify } = require("html-minifier");
const { minifyHtmlOpts } = require("./build-options");

// large formatting commits that i dont want to include
const unwantedCommits = new Set([
	"fc6fd8ff18d2e4575360f43cbe0d3a998dba8c4e",
	"767a8af1be03806d93292d24a113c51dce3e181b",
	"54ca8fb41dd57792e73cd6c0ca5cceace847945e",
	"f190e1501d1675fa889817c431c79bf58ae6b276",
	"b90c38d9c34303ffe309172573129c6d57e1f956",
	"28e0abe584df7418bde1d954c6f7001533f36efd",
	"e226319c06c49c07f5f78f683f258241e3a67af7",
]);

const escapeHtml = (html) =>
	// this doens't need to escape single apostrophes for now
	html
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");

const unescapeHtml = (escapedHtml) =>
	escapedHtml
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");

const converter = (mdId) => {
	let codeBlockCounter = 1;
	return new showdown.Converter({
		extensions: [
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
			{
				type: "output",
				regex: /<script type="text\/tikz">((\n|.)*?)<\/script>/g,
				replace: `<noscript><pre>$1</pre></noscript><script type="text/tikz">$1</script>`,
			},
		],
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
							// process %ad - %H format
							const extractHash = (content) =>
								content.split("\n")[0].split(" - ")[1];
							const extractDate = (content) =>
								content.split("\n")[0].split(" - ")[0];

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
											["@", "+", "-"].some((char) =>
												row.startsWith(char)
											)
									)
									.join("\n");

							const commitsAndDiffs = (
								await exec(
									`git log --follow --date=short --pretty=format:"%ad - %H" -p -U0 "${filePath.replace(
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
									return {
										date: extractDate(output),
										commit: extractHash(output),
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
								contents: converter(id).makeHtml(contents),
								dates: commitsAndDiffs.map((row) => row.date),
								commits: commitsAndDiffs.map(
									(row) => row.commit
								),
								diffs: commitsAndDiffs.map((row) => row.diff),
							};
						})
				);

				console.log(`Processing ${fileObjs.length} markdown files`);

				// generate html and save all as files
				const writeFilesPromise = Promise.all(
					fileObjs
						.sort((a, b) => a.id - b.id)
						.map(
							({ id, name, contents, commits, diffs, dates }) => {
								const html = fillTemplate({
									contents: () => contents,
									commits: () =>
										`<span class="de-emphasized">History:</span>${commits
											.map(
												(commit, j) =>
													`<details>
													<summary><span class="de-emphasized">${dates[j]} - ${commit}</span></summary>
													${converter(commit).makeHtml(`\`\`\`diff\n${escapeHtml(diffs[j])}\n\`\`\``)}
												</details>`
											)
											.join("")}`,
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
									path.resolve(
										"built",
										targetDir,
										`${id}.html`
									),
									minified
								);
							}
						)
				);

				// create main page
				const html = fillTemplate({
					contents: () =>
						`<p>${desc}</p>
							<input type="checkbox" id="list-ordering" checked />
							<label for="list-ordering"> List Order</label>
							<ol><li>${fileObjs
								.map(({ id, name, dates }) => {
									return `<span class="de-emphasized">${
										dates[dates.length - 1]
									}</span>
												<a href="/${targetDir}/${id}">${name}</a>
									${
										dates.length > 1
											? `<span class="de-emphasized"><span class="superscript"> - ${
													dates.length - 1
											  } edit(s)</span></span>`
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
