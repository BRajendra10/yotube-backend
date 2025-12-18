import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


const uploadOnCloudinary = async (localFilePath, resourceType = "image") => {
  try {
    if (!localFilePath) return null;

    const result = await cloudinary.uploader.upload(localFilePath, {
      folder: "youtube-clone",
      resource_type: resourceType === "video" ? "video" : "image",
      chunk_size: 6000000, // safe
    });

    // delete local file
    fs.unlinkSync(localFilePath);

    return result;
  } catch (error) {
    console.log("Cloudinary upload error:", error);
    return null;
  }
};

const deleteOnCloudinary = async (id, type = "image") => {
  try {
    const response = await cloudinary.uploader.destroy(id, {
      resource_type: type,
    });

    return response;
  } catch (error) {
    console.error("Cloudinary Delete Error:", error);
    return null;
  }
};

export { uploadOnCloudinary, deleteOnCloudinary };
