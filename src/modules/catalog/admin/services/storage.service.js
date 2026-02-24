import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET
});

const uploadPdf = async (filePath) => {
  const result = await cloudinary.uploader.upload(filePath, {
    resource_type: 'auto',
    folder: 'libros'
  });

  return {
    public_id: result.public_id,
    secure_url: result.secure_url
  };
};

export default { uploadPdf };