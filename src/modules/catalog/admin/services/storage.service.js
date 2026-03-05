import cloudinary from '../../../../config/cloudinary.js';

const uploadPdf = async (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        folder: 'libros',
        format: 'pdf' // Opcional: forzar formato PDF
      },
      (error, result) => {
        if (error) return reject(error);

        resolve({
          public_id: result.public_id,
          secure_url: result.secure_url,
          format: result.format,
          bytes: result.bytes,
          created_at: result.created_at
        });
      }
    );

    stream.end(fileBuffer);
  });
};

// Función adicional para subir imágenes si la necesitas
const uploadImage = async (fileBuffer, folder = 'imagenes') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          public_id: result.public_id,
          secure_url: result.secure_url,
          format: result.format,
          bytes: result.bytes
        });
      }
    );
    stream.end(fileBuffer);
  });
};

export default { 
  uploadPdf,
  uploadImage 
};