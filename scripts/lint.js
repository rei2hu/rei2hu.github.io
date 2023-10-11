const { execSync } = require("child_process");

// note that diff will not list untracked files, so we add intent
execSync("git add -N .");

const diffCommand = "git diff --name-only HEAD";
console.log(diffCommand);
const changedFiles = execSync(diffCommand)
	.toString()
	.split("\n")
	.filter((filePath) => filePath.length > 0)
	// passing file directly would cause a warning if the file is ignored
	.filter((filePath) => filePath.endsWith(".js") || filePath.endsWith(".md"))
	.map((filePath) => `"${filePath}"`);

const lintCommand = `npx eslint --fix ${changedFiles.join(" ")}`;
console.log(lintCommand);
try {
	execSync(lintCommand, { stdio: [0, 1, 2] });
} catch (e) {
	console.log("Lint failed");
}
