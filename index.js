var fs = require("fs");
var path = require("path");
var createPlaylist = require("./playlist").createPlaylist;

var playlistUrl =
  process.env.PLAYLIST ||
  "https://nhkworld-tv.akamaized.net/hls/live/2115640/nhkworld-tv/index_1M.m3u8";

var wait = (delay) => new Promise((res) => setTimeout(res, delay));

var fetchRetry = ({ url, fetchParams, maxRetries, retryDelay }) => {
  var _retries = maxRetries ?? 3;
  var _retryDelay = retryDelay ?? 1000;
  return fetch(url, fetchParams).catch((error) => {
    console.error("fetch error", { url, fetchParams, error });
    if (_retries <= 1) {
      throw error;
    }
    return wait(_retryDelay).then(() =>
      fetchRetry({
        url,
        fetchParams,
        maxRetries: _retries - 1,
        retryDelay: _retryDelay,
      })
    );
  });
};

var newPlaylist = (url) => {
  var baseUrl = url.match(/(^.+\/).*\.m3u8/)?.[1];
  !baseUrl
    ? (() => {
        throw new Error("baseUrl could not be find");
      })()
    : undefined;
  var folderName = `${Date.now()}`;
  console.log(
    "new playlist location: ",
    fs.mkdirSync(folderName, { recursive: true })
  );
  var fileList = [];
  var queue = new Set();
  var waitForEmptyQueue = () => {
    return new Promise((resolve) => {
      var int = setInterval(() => {
        return queue.size === 0
          ? (clearInterval(int), console.log("queue is empty!"), resolve())
          : console.log(`${queue.size} files left`);
      }, 250);
    });
  };

  return [
    () => {
      console.log("downloading playlist");
      fetchRetry({ url: playlistUrl })
        .then((res) =>
          res.ok
            ? res.text()
            : (() => {
                throw new Error("Playlist not fetched");
              })()
        )
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
                      queue.add(filepath),
                      fetchRetry({ url: fullPath })
                        .then((res) => (res.ok ? res.blob() : undefined))
                        .then((blob) => (blob ? blob.arrayBuffer() : undefined))
                        .then((arrayBuffer) => {
                          arrayBuffer
                            ? fs.writeFileSync(
                                path.join(folderName, fileNameTimestamp),
                                Buffer.from(arrayBuffer)
                              )
                            : undefined;
                        })).finally(() => queue.delete(filepath));
                });
                Promise.all(promiseArray);
                fileList = fileList.concat(currentFiles);
              })(playlist)
            : undefined;
        })
        .catch((err) => {
          console.error("something went wrong", err);
        });
    },
    folderName,
    waitForEmptyQueue,
  ];
};

var startTime = process.env.START_DATE
  ? new Date(process.env.START_DATE).getTime()
  : Date.now();
isNaN(startTime)
  ? (console.error("!!! start time not in date format !!!"),
    (startTime = Date.now()))
  : undefined;
console.log("start time: ", startTime);

var timeout = startTime - Date.now();
timeout < 0 && (timeout = 0);

var main = () => {
  var endDate = process.env.END_DATE
    ? new Date(process.env.END_DATE).getTime()
    : startTime + 86_400_000;
  endDate < new Date() || isNaN(endDate)
    ? (console.error(
        "!!! end time not in date format or is a date in the past !!!"
      ),
      (endDate = new Date(startTime + 86_400_000)))
    : undefined;
  var {
    0: downloadPlaylist,
    1: playlistFolder,
    2: waitForEmptyQueue,
  } = newPlaylist(playlistUrl);
  var intervalId = setInterval(() => {
    endDate > Date.now()
      ? downloadPlaylist()
      : (console.log("finished playlist downloading"),
        clearInterval(intervalId),
        waitForEmptyQueue().then(() => createPlaylist(playlistFolder)));
  }, 1000);
  downloadPlaylist();

  process.on("SIGINT", () =>
    waitForEmptyQueue().then(() => {
      createPlaylist(playlistFolder);
      console.error("!!! created playlist might not be complete !!!");
      process.exit(0);
    })
  );
};

var timeoutId = timeout
  ? setTimeout(() => (clearTimeout(timeoutId), main()), timeout)
  : main();
