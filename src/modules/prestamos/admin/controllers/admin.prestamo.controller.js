import { AdminPrestamoService } from "../services/admin.prestamo.service.js";

const ERRORES_NEGOCIO = [
  "Solo se permiten prestamos de lunes a viernes",
  "Horario permitido de 10:00 a 16:00",
  "Prestamo no encontrado",
  "Prestamo no valido",
  "No se puede cancelar",
  "No se puede vencer",
  "No se puede devolver",
  "No se puede editar",
  "No se puede activar",
  "No se puede eliminar",
  "No hay stock disponible",
  "ya tiene 3 prestamos pendientes",
  "Solo se pueden registrar prestamos para estudiantes",
  "El estudiante debe estar activo",
  "Libro fisico no encontrado",
  "El libro seleccionado esta inactivo",
  "Usuario no encontrado",
];

const esErrorNegocio = (msg = "") => ERRORES_NEGOCIO.some((error) => msg.includes(error));

const handleError = (res, error, context) => {
  console.error(`Error ${context}:`, error);
  const status = esErrorNegocio(error.message) ? 400 : 500;
  res.status(status).json({ success: false, message: error.message });
};

export const AdminPrestamoController = {
  listar: async (req, res) => {
    try {
      const data = await AdminPrestamoService.listar();
      res.json({ success: true, data });
    } catch (error) {
      handleError(res, error, "listar prestamos");
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
      handleError(res, error, "devolver prestamo");
    }
  },

  cancelar: async (req, res) => {
    try {
      const { id } = req.params;
      const admin_id = req.user.id;
      const { observaciones } = req.body;

      await AdminPrestamoService.cancelar(id, admin_id, observaciones);
      res.json({ success: true, message: "Prestamo cancelado correctamente" });
    } catch (error) {
      handleError(res, error, "cancelar prestamo");
    }
  },

  marcarVencido: async (req, res) => {
    try {
      const { id } = req.params;
      const admin_id = req.user.id;
      const { observaciones } = req.body;

      await AdminPrestamoService.marcarVencido(id, admin_id, observaciones);
      res.json({ success: true, message: "Prestamo marcado como vencido" });
    } catch (error) {
      handleError(res, error, "marcar vencido");
    }
  },

  activar: async (req, res) => {
    try {
      const { id } = req.params;
      const admin_id = req.user.id;
      const { observaciones } = req.body;

      await AdminPrestamoService.activar(id, admin_id, observaciones);
      res.json({ success: true, message: "Prestamo activado correctamente" });
    } catch (error) {
      handleError(res, error, "activar prestamo");
    }
  },

  eliminar: async (req, res) => {
    try {
      const { id } = req.params;

      await AdminPrestamoService.eliminar(id);
      res.json({ success: true, message: "Prestamo eliminado correctamente" });
    } catch (error) {
      handleError(res, error, "eliminar prestamo");
    }
  },

  registrar: async (req, res) => {
    try {
      const admin_id = req.user.id;
      const { id_usuario, libro_id, observaciones } = req.body;

      if (!id_usuario || !libro_id) {
        return res.status(400).json({
          success: false,
          message: "id_usuario y libro_id son requeridos",
        });
      }

      const id = await AdminPrestamoService.registrarPrestamo({
        id_usuario,
        libro_id,
        admin_id,
        observaciones,
      });

      res.status(201).json({ success: true, message: "Prestamo registrado", data: { id } });
    } catch (error) {
      handleError(res, error, "registrar prestamo");
    }
  },

  actualizar: async (req, res) => {
    try {
      const { id } = req.params;
      const admin_id = req.user.id;
      const { id_usuario, libro_id, observaciones } = req.body;

      if (!id_usuario || !libro_id) {
        return res.status(400).json({
          success: false,
          message: "id_usuario y libro_id son requeridos",
        });
      }

      await AdminPrestamoService.actualizarPrestamo(id, {
        id_usuario,
        libro_id,
        observaciones,
        admin_id,
      });

      res.json({ success: true, message: "Prestamo actualizado correctamente" });
    } catch (error) {
      handleError(res, error, "actualizar prestamo");
    }
  },

  actualizarObservaciones: async (req, res) => {
    try {
      const { id } = req.params;
      const { observaciones } = req.body;

      if (!observaciones) {
        return res.status(400).json({
          success: false,
          message: "Observaciones requeridas",
        });
      }

      await AdminPrestamoService.actualizarObservaciones(id, observaciones);
      res.json({ success: true, message: "Observaciones actualizadas" });
    } catch (error) {
      handleError(res, error, "actualizar observaciones");
    }
  },
};
