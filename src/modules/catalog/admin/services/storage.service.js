import cloudinary from '../../../../config/cloudinary.js';

const uploadPdf = async (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        format: 'pdf',
        folder: 'libros',
        timeout: 120000,
        //  Genera la portada inmediatamente al subir
        eager: [
          {
           page: 1,
            format: 'jpg',
            width: 400,
            crop: 'scale',
            quality: 80
          }
        ],
        eager_async: false  // espera a que se genere antes de responder
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

const deletePdf = async (publicId) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(
      publicId,
      { resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
  });
};

export default { 
  uploadPdf, 
  deletePdf
};
