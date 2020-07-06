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
    posts.map((mdFileName) =>
      fs.promises
        .readFile(path.resolve("src", "posts", "md", mdFileName), "utf8")
        .then((contents) => ({
          name: `${path.basename(mdFileName, ".md")}`,
          contents: converter.makeHtml(contents),
        }))
    )
  ).then((nameBufObjs) => {
    // eslint-disable-next-line no-console
    console.log(`Creating html for ${nameBufObjs.length} posts`);
    Promise.all(
      nameBufObjs
        // extract the number
        .sort((a, b) => a.name.split(".")[0] - b.name.split(".")[0])
        .map(({ name, contents }, i) =>
          fs.promises.writeFile(
            path.resolve("built", "posts", name),
            minify(
              template
                .replace("$((contents))", () => contents)
                // insert the before and after navigation links
                .replace("$((before))", () =>
                  nameBufObjs[i - 1]
                    ? `<a href="/posts/${
                        nameBufObjs[i - 1].name
                      }" style="float:left">${nameBufObjs[i - 1].name}</a>`
                    : ""
                )
                .replace("$((after))", () =>
                  nameBufObjs[i + 1]
                    ? `<a href="/posts/${
                        nameBufObjs[i + 1].name
                      }" style="float:right">${nameBufObjs[i + 1].name}</a>`
                    : ""
                ),
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
                  .map(({ name }) => `<a href="/posts/${name}"}>${name}</a>`)
                  .join("</li><li>")}</li></ul>`
            )
            .replace("$((before))", "")
            .replace("$((after))", ""),
          minifyHtmlOpts
        )
      );
    });
  });
});
