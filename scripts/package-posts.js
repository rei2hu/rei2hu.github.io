const fs = require("fs");
const path = require("path");
const showdown = require("showdown");
const { minify } = require("html-minifier");
const { minifyHtmlOpts } = require("./process-options");

const converter = new showdown.Converter({
  strikethrough: true,
  ghCompatibleHeaderId: true,
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
      .map((mdFileName) =>
        fs.promises
          .readFile(path.resolve("src", "posts", "md", mdFileName), "utf8")
          .then((contents) => ({
            id: parseInt(mdFileName.split(".")[0], 10),
            // slice to remove the space after the dot
            name: path.basename(mdFileName, ".md").split(".")[1].slice(1),
            contents: converter.makeHtml(contents),
          }))
      )
  ).then((nameBufObjs) => {
    // eslint-disable-next-line no-console
    console.log(`Creating html for ${nameBufObjs.length} posts`);
    Promise.all(
      nameBufObjs
        // extract the number
        .sort((a, b) => a.id - b.id)
        .map(({ id, name, contents }, i) =>
          fs.promises.writeFile(
            path.resolve("built", "posts", `${id}.html`),
            minify(
              template
                .replace("$((contents))", () => contents)
                // insert the before and after navigation links
                .replace("$((before))", () =>
                  nameBufObjs[i - 1]
                    ? `<a href="/posts/${
                        nameBufObjs[i - 1].id
                      }" style="float:left">&lt; ${nameBufObjs[i - 1].name}</a>`
                    : ""
                )
                .replace("$((after))", () =>
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
      // create main page
      fs.promises.writeFile(
        path.resolve("built", "posts", "index.html"),
        minify(
          template
            .replace(
              "$((contents))",
              () =>
                `<ul><li>${nameBufObjs
                  .map(
                    ({ id, name }) =>
                      `${id} <a href="/posts/${id}"}>${name}</a>`
                  )
                  .join("</li><li>")}</li></ul>`
            )
            .replace("$((title))", "posts")
            .replace("$((before))", "")
            .replace("$((after))", ""),
          minifyHtmlOpts
        )
      );
    });
  });
});
