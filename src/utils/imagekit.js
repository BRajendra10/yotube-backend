import ImageKit from "imagekit";
import fs from "fs";
import path from "path";
import { convertToMp4 } from "./convertToMp4.js";

const imagekitInstance = new ImageKit({
    publicKey: process.env.PUBLIC_KEY,
    privateKey: process.env.PRIVATE_KEY,
    urlEndpoint: process.env.URL_ENDPOINT,
});

const uploadOnImageKit = async (localFilePath) => {
    let fileToUpload = localFilePath;
    let isConverted = false;

    try {
        if (!localFilePath || !fs.existsSync(localFilePath)) {
            return null;
        }

        const fileExtension = path.extname(localFilePath).toLowerCase();
        
        // Define videos that need conversion to MP4 for web compatibility
        const needsConversion = [".mkv", ".mov", ".avi", ".wmv", ".flv"];

        if (needsConversion.includes(fileExtension)) {
            fileToUpload = await convertToMp4(localFilePath);
            isConverted = true;
        }

        // Read file into buffer
        const fileBuffer = fs.readFileSync(fileToUpload);

        // Upload to ImageKit
        const result = await imagekitInstance.upload({
            file: fileBuffer,
            fileName: path.basename(fileToUpload),
            folder: "youtube-clone",
            useUniqueFileName: true,
        });

        return result;

    } catch (error) {
        return null;
    } finally {
        // CLEANUP: Always delete local files to prevent disk filling up
        if (localFilePath && fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        // If we created a temporary mp4, delete that too
        if (isConverted && fileToUpload && fs.existsSync(fileToUpload)) {
            fs.unlinkSync(fileToUpload);
        }
    }
};

const deleteOnImageKit = async (fileId) => {
    try {
        if (!fileId) return null;
        return await imagekitInstance.deleteFile(fileId);
    } catch (error) {
        return null;
    }
};

export { uploadOnImageKit, deleteOnImageKit };