import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        // Log the file path to ensure it's correct
        console.log("Uploading file to Cloudinary: ", localFilePath);

        // Upload file to Cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",  // Automatically detect the file type (image, video, etc.)
        });

        //console.log("File uploaded to Cloudinary: ", response);
        fs.unlinkSync(localFilePath)
        return response;
        
    } catch (error) {
        console.error("Error uploading file to Cloudinary:", error);  // Log the error for debugging
        fs.unlinkSync(localFilePath);  // Clean up the file after failed upload
        return null;
    }
};

export { uploadOnCloudinary };
