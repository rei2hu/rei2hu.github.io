const fs = require("fs");
const path = require("path");
const showdown = require("showdown");
const { minify } = require("html-minifier");
const { minifyHtmlOpts } = require("./process-options");

const converter = new showdown.Converter();

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
          name: `${path.basename(mdFileName, ".md")}.html`,
          contents: converter.makeHtml(contents),
        }))
    )
  ).then((nameBufObjs) => {
    // eslint-disable-next-line no-console
    console.log(
      `Creating scripts for ${nameBufObjs.map((obj) => obj.name).join(", ")}`
    );
    Promise.all(
      nameBufObjs.map(({ name, contents }) =>
        fs.promises.writeFile(
          path.resolve("built", "posts", name),
          minify(template.replace("$((contents))", contents), minifyHtmlOpts)
        )
      )
    ).then(() => {
      // create main page
      fs.promises.writeFile(
        path.resolve("built", "posts", "index.html"),
        minify(
          template.replace(
            "$((contents))",
            nameBufObjs
              .map(
                ({ name }) =>
                  `<a href="/posts/${name}"}>${name.slice(0, -5)}</a>`
              )
              .join("\n")
          ),
          minifyHtmlOpts
        )
      );
    });
  });
});
