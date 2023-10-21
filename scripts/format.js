const { execSync } = require("child_process");

// note that diff will not list untracked files, so we add intent
execSync("git add -N .");

const diffCommand = "git diff  --diff-filter=d --stat --name-only HEAD";
const changedFiles = execSync(diffCommand)
	.toString()
	.split("\n")
	.filter((filePath) => filePath.length > 0)
	.map((filePath) => `"${filePath}"`);

const formatCommand = `npx prettier --write --loglevel=warn ${changedFiles.join(
	" "
)}`;
console.log(formatCommand);
execSync(formatCommand);
