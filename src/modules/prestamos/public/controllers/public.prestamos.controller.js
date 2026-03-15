import { PublicPrestamoService } from "../services/public.prestamo.service.js";

export const PublicPrestamoController = {

  obtenerMisPrestamos: async (req, res) => {
    try {
      const usuario_id = req.user.id;
      const prestamos = await PublicPrestamoService.obtenerMisPrestamos(usuario_id);
      res.json({ success: true, data: prestamos });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  solicitar: async (req, res) => {
    try {
      console.log('👤 req.user:', req.user); 
      const usuario_id = req.user.id;
      const { libro_id } = req.body;

      const id = await PublicPrestamoService.solicitarPrestamo(
        usuario_id,
        libro_id
      );

      res.json({ success: true, id });

    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

};