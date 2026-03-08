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

const verPdf = async (req, res) => {
  try {
    const { id } = req.params;

    const libro = await libroModel.getLibroDigitalById(id);

    if (!libro || libro.activo !== 1 || !libro.pdf_url) {
      return res.status(404).json({ message: 'Libro no disponible' });
    }

    const pdfUrl = `https://res.cloudinary.com/dxq0apa5a/image/upload/v1/${libro.pdf_url}.pdf`;

    return res.redirect(pdfUrl);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener PDF' });
  }
};

const preview = async (req, res) => {
  try {
    const { id } = req.params;

    const libro = await libroModel.getLibroDigitalById(id);

    if (!libro || !libro.pdf_url) {
      return res.status(404).json({ message: 'No tiene versión digital' });
    }

    const previewUrl = cloudinary.url(libro.pdf_url, {
      resource_type: 'image',
      format: 'jpg',
      page: 1
    });

    res.json({ previewUrl });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al generar preview' });
  }
};

export default {
  getCatalog,
  getMaterias,
  verPdf,
  preview
};
