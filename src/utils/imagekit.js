import imagekit from 'imagekit';
import fs from 'fs';

let imagekitInstence = new imagekit({
  publicKey: process.env.PUBLIC_KEY,
  privateKey: process.env.PRIVATE_KEY,
  urlEndpoint: process.env.URL_ENDPOINT
});

const uploadOnImageKit = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    const fileBuffer = fs.readFileSync(localFilePath);

    const result = await imagekitInstence.upload({
      file: fileBuffer,
      fileName: localFilePath.split("/").pop(),
      folder: "youtube-clone",
      useUniqueFileName: true,
    });

    fs.unlinkSync(localFilePath);

    return result;
  } catch (error) {
    console.log("ImageKit upload error:", error.message);
    return null;
  }
};

const deleteOnImageKit = async (fileId) => {
  try {
    const response = await imagekitInstence.deleteFile(fileId);
    return response;
  } catch (error) {
    console.error("ImageKit delete error:", error.message);
    return null;
  }
};


export { uploadOnImageKit, deleteOnImageKit };