import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import path from "path";

ffmpeg.setFfmpegPath(ffmpegPath);

export const convertToMp4 = (inputPath) => {
  return new Promise((resolve, reject) => {
    // Create output path (e.g., video_123.mkv -> video_123_converted.mp4)
    const dir = path.dirname(inputPath);
    const fileName = path.basename(inputPath, path.extname(inputPath));
    const outputPath = path.join(dir, `${ fileName }_${ Date.now() }.mp4`);

    ffmpeg(inputPath)
      .outputOptions([
        "-c:v libx264",     // Video codec
        "-preset fast",     // Conversion speed
        "-crf 23",          // Quality (18-28 is good range)
        "-c:a aac",         // Audio codec
        "-movflags +faststart", // Better for web streaming
      ])
      .save(outputPath)
      // .on("start", (cmd) => console.log("Ffmpeg process started"))
      .on("end", () => {
        resolve(outputPath);
      })
      .on("error", (err) => {
        console.error("Ffmpeg error:", err.message);
        reject(err);
      });
  });
};