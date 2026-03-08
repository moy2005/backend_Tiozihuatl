import { AdminPrestamoService } from "../services/admin.prestamo.service.js";

const ERRORES_NEGOCIO = [
  "Solo lunes a viernes",
  "Horario permitido 10:00 a 16:00",
  "Préstamo no válido",
  "Préstamo no encontrado",
  "No se puede cancelar",
  "No se puede vencer",
  "No hay stock disponible",
  "ya tiene 3 libros prestados"
];

const esErrorNegocio = (msg) =>
  ERRORES_NEGOCIO.some(e => msg.includes(e));

const handleError = (res, error, context) => {
  console.error(`❌ Error ${context}:`, error);
  const status = esErrorNegocio(error.message) ? 400 : 500;
  res.status(status).json({ success: false, message: error.message });
};

export const AdminPrestamoController = {

  listar: async (req, res) => {
    try {
      const data = await AdminPrestamoService.listar();
      res.json({ success: true, data });
    } catch (error) {
      handleError(res, error, "listar préstamos");
    }
  },

  devolver: async (req, res) => {
    try {
      const { id } = req.params;
      const admin_id = req.user.id;
      const { observaciones } = req.body;

      await AdminPrestamoService.devolver(id, admin_id, observaciones);
      res.json({ success: true, message: "Libro devuelto correctamente" });
    } catch (error) {
      handleError(res, error, "devolver préstamo");
    }
  },

  cancelar: async (req, res) => {
    try {
      const { id } = req.params;
      const admin_id = req.user.id;
      const { observaciones } = req.body;

      await AdminPrestamoService.cancelar(id, admin_id, observaciones);
      res.json({ success: true, message: "Préstamo cancelado correctamente" });
    } catch (error) {
      handleError(res, error, "cancelar préstamo");
    }
  },

  marcarVencido: async (req, res) => {
    try {
      const { id } = req.params;
      const admin_id = req.user.id;
      const { observaciones } = req.body;

      await AdminPrestamoService.marcarVencido(id, admin_id, observaciones);
      res.json({ success: true, message: "Préstamo marcado como vencido" });
    } catch (error) {
      handleError(res, error, "marcar vencido");
    }
  },

  registrar: async (req, res) => {
    try {
      const admin_id = req.user.id;
      const { id_usuario, libro_id, dias, observaciones } = req.body;

      if (!id_usuario || !libro_id) {
        return res.status(400).json({ 
          success: false, 
          message: "id_usuario y libro_id son requeridos" 
        });
      }

      const id = await AdminPrestamoService.registrarPrestamo({
        id_usuario, libro_id, dias, admin_id, observaciones
      });

      res.status(201).json({ success: true, message: "Préstamo registrado", data: { id } });
    } catch (error) {
      handleError(res, error, "registrar préstamo");
    }
  },

  actualizarObservaciones: async (req, res) => {
    try {
      const { id } = req.params;
      const { observaciones } = req.body;

      if (!observaciones) {
        return res.status(400).json({ 
          success: false, 
          message: "Observaciones requeridas" 
        });
      }

      await AdminPrestamoService.actualizarObservaciones(id, observaciones);
      res.json({ success: true, message: "Observaciones actualizadas" });
    } catch (error) {
      handleError(res, error, "actualizar observaciones");
    }
  }

};