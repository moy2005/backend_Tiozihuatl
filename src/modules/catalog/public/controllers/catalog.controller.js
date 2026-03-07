import catalogService from '../services/catalog.service.js';
import { v2 as cloudinary } from 'cloudinary';
import libroModel from '../../models/libro.model.js';
import axios from 'axios';

const getCatalog = async (req, res) => {
  try {
    const { search, materia, formato, ordenAutor } = req.query;

    const libros = await catalogService.getCatalog({
      search,
      materia,
      formato,
      ordenAutor
    });

    res.json(libros);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener catálogo' });
  }
};

const getMaterias = async (req, res) => {
  try {
    const materias = await catalogService.getMaterias();
    res.status(200).json(materias);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener materias' });
  }
};
const preview = async (req, res) => {
  try {
    const { id } = req.params;
    const libro = await libroModel.getLibroDigitalById(id);

    if (!libro || !libro.pdf_url) {
      return res.status(404).json({ message: 'No tiene versión digital' });
    }

    // ✅ Para archivos raw (PDF), se accede con resource_type 'raw'
    // pero la transformación a imagen se hace así:
    const cloudName = process.env.CLOUD_NAME;
    const publicId = libro.pdf_url; // ej: libros/z3oa1niq7ndjbuinsvla

    const previewUrl = `https://res.cloudinary.com/${cloudName}/image/upload/pg_1,w_400,f_jpg,q_auto/${publicId}.jpg`;

    res.json({ previewUrl });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al generar preview' });
  }
};

const getPdfUrl = async (req, res) => {
  try {
    const { id } = req.params;
    const libro = await libroModel.getLibroDigitalById(id);

    if (!libro || libro.activo !== 1 || !libro.pdf_url) {
      return res.status(404).json({ message: 'Libro no disponible' });
    }

    const cloudName = process.env.CLOUD_NAME;

    // ✅ URL firmada con expiración — funciona con archivos públicos
    const expiracion = Math.floor(Date.now() / 1000) + 300; // 5 minutos

    const pdfUrl = cloudinary.url(libro.pdf_url, {
      resource_type: 'image',
      sign_url: true,
      expires_at: expiracion,
      secure: true
    });

    res.json({ url: pdfUrl, titulo: libro.titulo });

  } catch (error) {
    console.error('❌ Error getPdfUrl:', error.message);
    res.status(500).json({ message: 'Error al obtener URL del PDF' });
  }
};
export default {
  getCatalog,
  getMaterias,
  getPdfUrl,
  preview
};
