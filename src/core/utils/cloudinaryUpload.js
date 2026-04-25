import cloudinary from "../../config/cloudinary.js";

export const uploadToCloudinary = (file, folder, options = {}) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
      },
      (error, result) => {
        if (error) reject(error);
        else if (options.returnMetadata) {
          resolve({
            url: result.secure_url,
            public_id: result.public_id,
            resource_type: result.resource_type,
          });
        } else {
          resolve(result.secure_url);
        }
      }
    ).end(file.buffer);
  });
};
