import { PublicPrestamoService } from "../services/public.prestamo.service.js";

const ESTADOS_POR_FILTRO = {
  activos: ["Activo"],
  vencidos: ["Vencido"],
  historial: ["Devuelto", "Cancelado"],
};

export const PublicPrestamoController = {
  obtenerMisPrestamos: async (req, res) => {
    try {
      const usuario_id = req.user.id;
      const { filtro, pagina, limite } = req.query;
      if (filtro !== undefined || pagina !== undefined || limite !== undefined) {
        const estados = typeof filtro === "string" && Object.hasOwn(ESTADOS_POR_FILTRO, filtro)
          ? ESTADOS_POR_FILTRO[filtro]
          : null;
        const page = typeof pagina === "string" && /^\d{1,7}$/.test(pagina) ? Number(pagina) : 0;
        const limit = typeof limite === "string" && /^\d{1,2}$/.test(limite) ? Number(limite) : 0;
        if (!estados || page < 1 || limit < 1 || limit > 30) {
          return res.status(400).json({ success: false, message: "Paginación o filtro no válido." });
        }

        const result = await PublicPrestamoService.obtenerPagina(usuario_id, estados, page, limit);
        return res.json({ success: true, ...result });
      }
      const prestamos = await PublicPrestamoService.obtenerMisPrestamos(usuario_id);
      res.json({ success: true, data: prestamos });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  solicitar: async (req, res) => {
    try {
      const usuario_id = req.user.id;
      const { libro_id } = req.body;

      const id = await PublicPrestamoService.solicitarPrestamo(usuario_id, libro_id);

      res.json({ success: true, id });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },
};
