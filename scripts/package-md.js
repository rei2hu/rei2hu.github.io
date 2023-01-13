const fs = require("fs");
const path = require("path");
const util = require("util");
const exec = util.promisify(require("child_process").exec);

const showdown = require("showdown");
const { minify } = require("html-minifier");
const { minifyHtmlOpts } = require("./build-options");

const converter = new showdown.Converter({
  extensions: [
    // make imgs/iframess lazy load
    {
      type: "output",
      regex: /<(img|iframe)(.*?)>/g,
      replace: '<$1 loading="lazy"$2>',
    },
    {
      type: "output",
      // code blocks end up being
      // <pre><input /><code ...>
      // (code)
      // </pre></code>
      regex: /<pre><code(.*?)>((\n|.)*?)<\/code><\/pre>/g,
      replace: `<pre><input type="checkbox"/><span></span><code$1>$2</code></pre>`,
    },
    {
      type: "output",
      regex: /<script type="text\/tikz">((\n|.)*?)<\/script>/g,
      replace: `<noscript>$1</noscript><script type="text/tikz">$1</script>`,
    },
  ],
  strikethrough: true,
  ghCompatibleHeaderId: true,
  tables: true,
});

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
              const filePath = path.resolve("src", srcDir, mdFileName);
              const contents = await fs.promises.readFile(filePath, "utf8");
              return {
                id: parseInt(mdFileName.split(".")[0], 10),
                // slice to remove the space after the dot
                name: path.basename(mdFileName, ".md").split(".")[1].slice(1),
                contents: converter.makeHtml(contents),
                commits: (
                  await exec(
                    `git log --follow --date=short --pretty=format:"%ad - %H" "${filePath.replace(
                      /\$/g,
                      process.platform === "win32" ? `"$"` : `\\$`
                    )}"`
                  )
                ).stdout,
              };
            })
        );

        // generate html and save all as files
        const writeFilesPromise = Promise.all(
          fileObjs
            .sort((a, b) => a.id - b.id)
            .map(({ id, name, contents, commits }, i) => {
              const html = fillTemplate({
                contents: () => contents,
                commits: () =>
                  commits
                    .split("\n")
                    .map(
                      (commit) => `<span class="de-emphasized">${commit}</span>`
                    )
                    .join("<br />"),
                before: () =>
                  fileObjs[i - 1]
                    ? `<div style="width:50%"><a href="/${targetDir}/${
                        fileObjs[i - 1].id
                      }">&lt; ${fileObjs[i - 1].name}</a></div>`
                    : "",
                after: () =>
                  fileObjs[i + 1]
                    ? `<div><a href="/${targetDir}/${
                        fileObjs[i + 1].id
                      }">${fileObjs[i + 1].name} &gt;</a></div>`
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
        const maxLength =
          Math.floor(Math.log10(Math.max(...fileObjs.map((obj) => obj.id)))) +
          1;
        const html = fillTemplate({
          contents: () =>
            `${desc}<ul class="no-list-style"><li>${fileObjs
              .map(({ id, name, commits }) => {
                const commitList = commits.split("\n");
                return `${String(id).padStart(
                  maxLength,
                  // nbsp
                  "\u00A0"
                )}. <a href="/${targetDir}/${id}">${name}</a> <span class="de-emphasized">${
                  commitList[commitList.length - 1]
                    ? commitList[commitList.length - 1].split(" ")[0]
                    : ""
                }${commitList.length > 1 ? "*" : ""}</span>`;
              })
              .join("</li><li>")}</li></ul>`,
          title: targetDir,
        });
        const minified = minify(html, minifyHtmlOpts);

        const mainFilePromise = fs.promises.writeFile(
          path.resolve("built", targetDir, "index.html"),
          minified
        );

        await [writeFilesPromise, mainFilePromise];
      });
  },
};
