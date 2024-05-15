var fs = require("fs");
var path = require("path");
var folderPath = process.argv[2];
if (!folderPath) {
  throw new Error("Folder name should be present");
}

var fileList = fs.readdirSync(folderPath).map((path) => `file '${path}'\n`);

fs.writeFileSync(path.join(folderPath, "fileList.txt"), fileList.join(""));
