var fs = require("fs");
var path = require("path");

var createPlaylist = (folderPath) => {
  !folderPath
    ? (() => {
        throw new Error("Folder name should be present");
      })()
    : undefined;

  var fileList = fs.readdirSync(folderPath).map((path) => `file '${path}'\n`);
  fs.writeFileSync(path.join(folderPath, "fileList.txt"), fileList.join(""));
  console.log("playlist created");
};

module.exports = { createPlaylist };
