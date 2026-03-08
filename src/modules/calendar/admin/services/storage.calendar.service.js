import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_CLOUD_API_KEY,
  api_secret: process.env.CLOUDINARY_CLOUD_API_SECRET
});

const uploadCalendar = async (fileBuffer, tipo_calendario) => {

  return new Promise((resolve, reject) => {

    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        folder: `calendarios/${tipo_calendario}`,
        timeout: 120000
      },
      (error, result) => {
        if (error) return reject(error);

        resolve({
          public_id: result.public_id,
          secure_url: result.secure_url
        });
      }
    );

    stream.end(fileBuffer);
  });

};

export default { uploadCalendar };