// get playlist
// use regexp to get chunks urls
// save timestamp
// fetch chunks from web
// join in one chunk
// PROFIT!!!1!

var fs = require("fs");
var path = require("path");

var url =
  "https://nhkwlive-ojp.akamaized.net/hls/live/2003459/nhkwlive-ojp-en/index_1M.m3u8";
var baseUrl = url.match(/(^.+\/).*\.m3u8/)?.[1];
if (!baseUrl) {
  throw new Error("baseUrl could not be find");
}
var folderName = `${Date.now()}`;
fs.mkdirSync(folderName);
var fileList = [];

setInterval(() => {
  console.log("downloading playlist");
  fetch(url)
    // .then((res) => (res.ok ? res.text() : console.error(res)))
    .then((res) => (res.ok ? res.text() : undefined))
    .then((playlist) => {
      playlist
        ? ((text) => {
            var currentFiles = [];
            var timestampArray = text.match(
              /(?<=^#EXT-X-PROGRAM-DATE-TIME:).*$/gm
            );
            var urlArray = text.match(/^.+\.ts$/gm);
            // checks for null & same length?
            var promiseArray = urlArray.map((filepath, i) => {
              var fullPath = baseUrl + filepath;
              var fileNameTimestamp = `${new Date(
                timestampArray[i]
              ).getTime()}.ts`;
              return fileList.includes(fileNameTimestamp)
                ? console.log("already present")
                : (currentFiles.push(filepath),
                  fetch(fullPath)
                    .then((res) => (res.ok ? res.blob() : undefined))
                    .then((blob) => (blob ? blob.arrayBuffer() : undefined))
                    .then((arrayBuffer) => {
                      arrayBuffer
                        ? fs.writeFileSync(
                            path.join(folderName, fileNameTimestamp),
                            Buffer.from(arrayBuffer)
                          )
                        : undefined;
                    }));
            });
            Promise.all(promiseArray);
            fileList = fileList.concat(currentFiles);
          })(playlist)
        : undefined;
    });
}, 10_000);
