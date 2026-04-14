import { poolPromise } from "../../../../config/db.config.js";
import { PrestamoModel } from "../../models/prestamo.model.js";
import {
  assertLoanWindowOpen,
  getCurrentLoanDateTimes,
  MAX_PENDING_LOANS,
} from "../../utils/prestamo.datetime.js";

const ensureStudentEligible = async (conn, usuario_id) => {
  const usuario = await PrestamoModel.validarUsuarioPrestamo(conn, usuario_id);

  if (!usuario) {
    throw new Error("Usuario no encontrado");
  }

  if (usuario.nombre_rol !== "Estudiante") {
    throw new Error("Solo los estudiantes pueden solicitar prestamos");
  }

  if (usuario.estado !== "Activo") {
    throw new Error("Tu cuenta debe estar activa para solicitar prestamos");
  }

  return usuario;
};

export const PublicPrestamoService = {
  obtenerMisPrestamos: async (usuario_id) => {
    await PrestamoModel.sincronizarVencidos();
    return await PrestamoModel.obtenerPorUsuario(usuario_id);
  },

  solicitarPrestamo: async (usuario_id, libro_id) => {
    assertLoanWindowOpen();
    const conn = await poolPromise.getConnection();

    try {
      await conn.beginTransaction();

      await PrestamoModel.sincronizarVencidos(conn);
      await ensureStudentEligible(conn, usuario_id);

      const libro = await PrestamoModel.validarLibroPrestamo(conn, libro_id);
      if (!libro) {
        throw new Error("Libro fisico no encontrado");
      }

      if (Number(libro.activo) !== 1) {
        throw new Error("El libro seleccionado esta inactivo");
      }

      const prestamosPendientes = await PrestamoModel.contarPrestamosPendientes(conn, usuario_id);
      if (prestamosPendientes >= MAX_PENDING_LOANS) {
        throw new Error("Has alcanzado el limite de 3 prestamos pendientes");
      }

      await PrestamoModel.descontarStock(conn, libro_id);

      const { fechaPrestamo, fechaVencimiento } = getCurrentLoanDateTimes();

      const id = await PrestamoModel.crearPrestamo(conn, {
        id_usuario: usuario_id,
        libro_id,
        fecha_prestamo: fechaPrestamo,
        fecha_vencimiento: fechaVencimiento,
      });

      await conn.commit();
      return id;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },
};
