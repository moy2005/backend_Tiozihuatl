import { poolPromise } from "../../../../config/db.config.js";
import { PrestamoModel } from "../../models/prestamo.model.js";

const validarHorario = () => {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();

  if (day === 0 || day === 6) throw new Error("Solo lunes a viernes");
  if (hour < 10 || hour >= 16) throw new Error("Horario permitido 10:00 a 16:00");
};

export const AdminPrestamoService = {

  listar: async () => {
    return await PrestamoModel.listarAdmin();
  },

  devolver: async (id_prestamo, admin_id, observaciones) => {
    validarHorario();
    const conn = await poolPromise.getConnection();
    try {
      await conn.beginTransaction();
      await PrestamoModel.devolverLibro(conn, id_prestamo, admin_id, observaciones);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  cancelar: async (id_prestamo, admin_id, observaciones) => {
    validarHorario();
    const conn = await poolPromise.getConnection();
    try {
      await conn.beginTransaction();
      await PrestamoModel.cancelarPrestamo(conn, id_prestamo, admin_id, observaciones);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  marcarVencido: async (id_prestamo, admin_id, observaciones) => {
    const conn = await poolPromise.getConnection();
    try {
      await conn.beginTransaction();
      await PrestamoModel.marcarVencido(conn, id_prestamo, admin_id, observaciones);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  registrarPrestamo: async (data) => {
    validarHorario();
    const conn = await poolPromise.getConnection();
    try {
      await conn.beginTransaction();

      // Validar límite del usuario
      const prestamosActivos = await PrestamoModel.contarPrestamosActivos(conn, data.id_usuario);
      if (prestamosActivos >= 3) {
        throw new Error("El usuario ya tiene 3 libros prestados");
      }

      await PrestamoModel.descontarStock(conn, data.libro_id);
      const id = await PrestamoModel.registrarPrestamo(conn, data);

      await conn.commit();
      return id;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  actualizarObservaciones: async (id_prestamo, observaciones) => {
    await PrestamoModel.actualizarObservaciones(id_prestamo, observaciones);
  }

};