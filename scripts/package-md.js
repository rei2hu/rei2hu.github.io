const fs = require("fs");
const path = require("path");
const util = require("util");
const hljs = require("highlight.js");
const exec = util.promisify(require("child_process").exec);
const showdown = require("showdown");
const { minify } = require("html-minifier");
const { minifyHtmlOpts } = require("./build-options");

const unwantedCommits = new Set([
	"0357f5d017c8f3485ea8a4bbb91c3efa6bf1d3e5",
	"889ccd4aa4d88f2289b91c6bbcce085a8d9ed52c",
	"44029f6eb6320986aca317cf17cc017d72329d41",
	"60beb54f70b4a02c0a5495c68e9961d83eb5b714",
	"a7f1bdfd7536ae35b2fcce00410ca1c7665002d2",
	"204bc51955ef1ed4bcf4cd74e4eabed44ea07a6b",
	"079b7d171821be546234f78da358ce858ab0401c",
	"28187e0280d94ca964b53ce36977c56664a63efd",
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
	processThenCopyMd(srcDir, targetDir, desc = "") {
		fs.promises
			.mkdir(path.resolve("built", targetDir), { recursive: true })
			.then(async () => {
				const posts = fs.readdirSync(path.resolve("src", srcDir));

				// generate data for html
				const fileObjs = await Promise.all(
					posts
						.filter((name) => name.endsWith(".md"))
						.map(async (mdFileName) => {
							const filePath = path.resolve(
								"src",
								srcDir,
								mdFileName
							);
							const contents = await fs.promises.readFile(
								filePath,
								"utf8"
							);
							const id = parseInt(mdFileName.split(".")[0], 10);

							const extractHash = (content) =>
								content.split("\n")[0].split("- ")[1];

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
										commit: output.split("\n")[0],
										diff: extractDiff(output),
									};
								});

							return {
								id,
								// slice to remove the space after the dot
								name: path
									.basename(mdFileName, ".md")
									.split(".")[1]
									.slice(1),
								contents: converter(id).makeHtml(contents),
								commits: commitsAndDiffs.map(
									(row) => row.commit
								),
								diffs: commitsAndDiffs.map((row) => row.diff),
							};
						})
				);

				// generate html and save all as files
				const writeFilesPromise = Promise.all(
					fileObjs
						.sort((a, b) => a.id - b.id)
						.map(({ id, name, contents, commits, diffs }, i) => {
							const html = fillTemplate({
								contents: () => contents,
								commits: () =>
									`<span class="de-emphasized">History:</span>${commits
										.map(
											(commit, j) =>
												`<details>
													<summary><span class="de-emphasized">${commit}</span></summary>
													${converter(commit).makeHtml(`\`\`\`diff\n${escapeHtml(diffs[j])}\n\`\`\``)}
												</details>`
										)
										.join("")}`,
								before: () =>
									fileObjs[i - 1]
										? `<div style="flex:0 0 50%"><a href="/${targetDir}/${
												fileObjs[i - 1].id
										  }">&lt; ${
												fileObjs[i - 1].name
										  }</a></div>`
										: `<div style="flex:0 0 50%"></div>`,
								after: () =>
									fileObjs[i + 1]
										? `<div style="text-align:end"><a href="/${targetDir}/${
												fileObjs[i + 1].id
										  }">${
												fileObjs[i + 1].name
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
								.map(({ id, name, commits }) => {
									const commitList = commits;
									return `<a href="/${targetDir}/${id}">${name}</a> <span class="de-emphasized">${
										commitList[commitList.length - 1]
											? commitList[
													commitList.length - 1
											  ].split(" ")[0]
											: ""
									}${
										commitList.length > 1 ? "*" : ""
									}</span>`;
								})
								.join("</li><li>")}</li></ol>`,
					title: () => targetDir,
				});
				const minified = minify(html, minifyHtmlOpts);

				const mainFilePromise = fs.promises.writeFile(
					path.resolve("built", targetDir, "index.html"),
					minified
				);

				await Promise.all([writeFilesPromise, mainFilePromise]);
			});
	},
};
