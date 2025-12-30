import { execFile } from "node:child_process";
import ffprobe from "@ffprobe-installer/ffprobe";

export const getVideoDuration = (filePath) =>
  new Promise((resolve, reject) => {
    execFile(
      ffprobe.path,
      ["-v", "error", "-show_entries", "format=duration", "-of", "json", filePath],
      (err, out) => {
        if (err) return reject(err);
        resolve(+JSON.parse(out).format.duration);
      }
    );
  });
