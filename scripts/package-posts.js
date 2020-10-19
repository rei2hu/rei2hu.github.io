const fs = require("fs");
const path = require("path");
const util = require("util");
const exec = util.promisify(require("child_process").exec);

const showdown = require("showdown");
const { minify } = require("html-minifier");
const { minifyHtmlOpts } = require("./process-options");

const converter = new showdown.Converter({
  extensions: [
    // make imgs lazy load
    {
      type: "output",
      regex: /<img(.*?)>/g,
      replace: '<img loading="lazy"$1>',
    },
  ],
  strikethrough: true,
  ghCompatibleHeaderId: true,
  tables: true,
});

const template = fs.readFileSync(
  path.resolve("src", "posts", "template.html"),
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

fs.promises
  .mkdir(path.resolve("built", "posts"), { recursive: true })
  .then(async () => {
    const posts = fs.readdirSync(path.resolve("src", "posts", "md"));

    // generate data for html
    const fileObjs = await Promise.all(
      posts
        .filter((name) => name.endsWith(".md"))
        .map(async (mdFileName) => {
          const filePath = path.resolve("src", "posts", "md", mdFileName);
          const contents = await fs.promises.readFile(filePath, "utf8");
          return {
            id: parseInt(mdFileName.split(".")[0], 10),
            // slice to remove the space after the dot
            name: path.basename(mdFileName, ".md").split(".")[1].slice(1),
            contents: converter.makeHtml(contents),
            commits: (
              await exec(
                `git log --date=short --pretty=format:"%ad - %H" "${filePath}"`
              )
            ).stdout,
          };
        })
    );

    // eslint-disable-next-line no-console
    console.log(`Creating html and main page for ${fileObjs.length} posts`);

    // generate html and save all as files
    const writeFilesPromise = Promise.all(
      fileObjs
        .sort((a, b) => a.id - b.id)
        .map(({ id, name, contents, commits }, i) => {
          const html = fillTemplate({
            contents: () => contents,
            commits: () => commits.split("\n").join("<br />"),
            before: () =>
              fileObjs[i - 1]
                ? `<a href="/posts/${
                    fileObjs[i - 1].id
                  }" style="float:left">&lt; ${fileObjs[i - 1].name}</a>`
                : "",
            after: () =>
              fileObjs[i + 1]
                ? `<a href="/posts/${fileObjs[i + 1].id}" style="float:right">${
                    fileObjs[i + 1].name
                  } &gt;</a>`
                : "",
            title: name,
          });
          const minified = minify(html, minifyHtmlOpts);

          return fs.promises.writeFile(
            path.resolve("built", "posts", `${id}.html`),
            minified
          );
        })
    );

    // create main page
    const maxLength =
      Math.floor(Math.log10(Math.max(...fileObjs.map((obj) => obj.id)))) + 1;
    const html = fillTemplate({
      contents: () =>
        `<ul class="no-list-style"><li>${fileObjs
          .map(
            ({ id, name }) =>
              `${String(id).padStart(
                maxLength,
                // nbsp
                "\u00A0"
              )}. <a href="/posts/${id}">${name}</a>`
          )
          .join("</li><li>")}</li></ul>`,
      title: "posts",
    });
    const minified = minify(html, minifyHtmlOpts);

    const mainFilePromise = fs.promises.writeFile(
      path.resolve("built", "posts", "index.html"),
      minified
    );

    await [writeFilesPromise, mainFilePromise];

    // eslint-disable-next-line no-console
    console.log("finished generating html and main page");
  });
