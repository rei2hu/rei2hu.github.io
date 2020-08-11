const fs = require("fs");
const path = require("path");
const showdown = require("showdown");
const { minify } = require("html-minifier");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const { minifyHtmlOpts } = require("./process-options");

const converter = new showdown.Converter({
  strikethrough: true,
  ghCompatibleHeaderId: true,
  tables: true,
});

const template = fs.readFileSync(
  path.resolve("src", "posts", "template.html"),
  "utf8"
);

fs.promises.mkdir("./built/posts", { recursive: true }).then(() => {
  const posts = fs.readdirSync(path.resolve("src", "posts", "md"));
  Promise.all(
    posts
      .filter((name) => name.endsWith(".md"))
      .map((mdFileName) => {
        const filePath = path.resolve("src", "posts", "md", mdFileName);
        return fs.promises
          .readFile(filePath, "utf8")
          .then(async (contents) => ({
            id: parseInt(mdFileName.split(".")[0], 10),
            // slice to remove the space after the dot
            name: path.basename(mdFileName, ".md").split(".")[1].slice(1),
            contents: converter.makeHtml(contents),
            commits: (
              await exec(
                `git log --date=short --pretty=format:"%ad - %H" "${filePath}"`
              )
            ).stdout,
          }));
      })
  ).then((nameBufObjs) => {
    // eslint-disable-next-line no-console
    console.log(`Creating html for ${nameBufObjs.length} posts`);
    Promise.all(
      nameBufObjs
        // extract the number
        .sort((a, b) => a.id - b.id)
        .map(({ id, name, contents, commits }, i) =>
          fs.promises.writeFile(
            path.resolve("built", "posts", `${id}.html`),
            minify(
              template
                .replace("$((contents))", () => contents)
                .replace("$((commits))", () =>
                  commits.split("\n").join("<br />")
                )
                // insert the before and after navigation links
                .replace(/\$\(\(before\)\)/g, () =>
                  nameBufObjs[i - 1]
                    ? `<a href="/posts/${
                        nameBufObjs[i - 1].id
                      }" style="float:left">&lt; ${nameBufObjs[i - 1].name}</a>`
                    : ""
                )
                .replace(/\$\(\(after\)\)/g, () =>
                  nameBufObjs[i + 1]
                    ? `<a href="/posts/${
                        nameBufObjs[i + 1].id
                      }" style="float:right">${
                        nameBufObjs[i + 1].name
                      } &gt;</a>`
                    : ""
                )
                .replace("$((title))", name),
              minifyHtmlOpts
            )
          )
        )
    ).then(() => {
      const maxLength =
        Math.floor(Math.log10(Math.max(...nameBufObjs.map((obj) => obj.id)))) +
        1;
      // create main page
      fs.promises.writeFile(
        path.resolve("built", "posts", "index.html"),
        minify(
          template
            .replace(
              "$((contents))",
              () =>
                `<ul class="no-list-style"><li>${nameBufObjs
                  .map(
                    ({ id, name }) =>
                      `${String(id).padStart(
                        maxLength,
                        // nbsp
                        "\u00A0"
                      )}. <a href="/posts/${id}">${name}</a>`
                  )
                  .join("</li><li>")}</li></ul>`
            )
            .replace("$((title))", "posts")
            .replace("$((commits))", "")
            .replace(/\$\(\(before\)\)/g, "")
            .replace(/\$\(\(after\)\)/g, ""),
          minifyHtmlOpts
        )
      );
    });
  });
});
