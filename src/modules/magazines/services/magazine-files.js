import cloudinary from '../../../config/cloudinary.js';

/**
 * PDF de revistas protegidos en Cloudinary (YenniferM098/tiozihuatl-mobile#197).
 *
 * Los PDF se guardan como `authenticated`: Cloudinary solo los entrega con una firma que
 * calcula el backend con su secreto. Así, conocer el identificador del archivo ya no basta
 * para descargar una revista sin comprarla.
 */
export const PDF_STORAGE = Object.freeze({
  resource_type: 'image',
  type: 'authenticated',
  folder: 'magazines/revistas',
});

const cleanId = (publicId) => String(publicId || '').trim().replace(/\.pdf$/i, '');

/** Dirección firmada del PDF completo; solo se entrega a quien compró la revista. */
export const signedPdfUrl = (publicId) =>
  cloudinary.url(cleanId(publicId), {
    resource_type: 'image',
    type: 'authenticated',
    sign_url: true,
    secure: true,
    format: 'pdf',
  });

/** Portada firmada: solo la primera página como imagen, nunca el PDF. */
export const signedCoverUrl = (publicId) => {
  const id = cleanId(publicId);
  if (!id) return null;
  return cloudinary.url(id, {
    resource_type: 'image',
    type: 'authenticated',
    sign_url: true,
    secure: true,
    format: 'jpg',
    transformation: [{ page: 1, width: 300, height: 400, crop: 'fill' }],
  });
};

/**
 * Revista para respuestas públicas o de usuario: con la portada firmada y sin el
 * identificador del PDF. Sin PDF, se conserva la portada guardada (si la hay).
 */
export const toPublicMagazine = (row) => {
  if (!row) return row;
  const { pdf_public_id, ...magazine } = row;
  return { ...magazine, portada_url: signedCoverUrl(pdf_public_id) || row.portada_url || null };
};
