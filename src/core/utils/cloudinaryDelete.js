import cloudinary from "../../config/cloudinary.js";

export const deleteFromCloudinary = async (publicId, options = {}) => {
  if (!publicId) return null;

  return cloudinary.uploader.destroy(publicId, {
    invalidate: true,
    resource_type: options.resource_type || "image",
  });
};
