import { poolPromise } from "../../../../config/db.config.js";
import { PrestamoModel } from "../../models/prestamo.model.js";
import {
  assertLoanWindowOpen,
  getCurrentLoanDateTimes,
  MAX_PENDING_LOANS,
} from "../../utils/prestamo.datetime.js";

const ensureStudentEligible = async (conn, id_usuario) => {
  const usuario = await PrestamoModel.validarUsuarioPrestamo(conn, id_usuario);

  if (!usuario) {
    throw new Error("Usuario no encontrado");
  }

  if (usuario.nombre_rol !== "Estudiante") {
    throw new Error("Solo se pueden registrar prestamos para estudiantes");
  }

  if (usuario.estado !== "Activo") {
    throw new Error("El estudiante debe estar activo");
  }

  return usuario;
};

const ensureBookEligible = async (conn, libro_id) => {
  const libro = await PrestamoModel.validarLibroPrestamo(conn, libro_id);

  if (!libro) {
    throw new Error("Libro fisico no encontrado");
  }

  if (Number(libro.activo) !== 1) {
    throw new Error("El libro seleccionado esta inactivo");
  }

  return libro;
};

const ensureLoanLimit = async (conn, id_usuario, excludePrestamoId = null) => {
  const pendientes = await PrestamoModel.contarPrestamosPendientes(
    conn,
    id_usuario,
    excludePrestamoId
  );

  if (pendientes >= MAX_PENDING_LOANS) {
    throw new Error("El estudiante ya tiene 3 prestamos pendientes");
  }
};

const normalizeObservaciones = (observaciones) => {
  if (observaciones === undefined) {
    return undefined;
  }

  const normalized = String(observaciones ?? "").trim();
  return normalized === "" ? null : normalized;
};

export const AdminPrestamoService = {
  listar: async () => {
    await PrestamoModel.sincronizarVencidos();
    return await PrestamoModel.listarAdmin();
  },

  devolver: async (id_prestamo, admin_id, observaciones) => {
    const conn = await poolPromise.getConnection();

    try {
      await conn.beginTransaction();

      await PrestamoModel.sincronizarVencidos(conn);

      const prestamo = await PrestamoModel.obtenerPrestamoPorId(conn, id_prestamo);
      if (!prestamo) {
        throw new Error("Prestamo no encontrado");
      }

      if (!["Activo", "Vencido"].includes(prestamo.estado)) {
        throw new Error(`No se puede devolver un prestamo en estado '${prestamo.estado}'`);
      }

      const { fechaPrestamo } = getCurrentLoanDateTimes();

      await PrestamoModel.devolverLibro(
        conn,
        id_prestamo,
        admin_id,
        normalizeObservaciones(observaciones),
        fechaPrestamo
      );
      await PrestamoModel.incrementarStock(conn, prestamo.libro_id);

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  cancelar: async (id_prestamo, admin_id, observaciones) => {
    const conn = await poolPromise.getConnection();

    try {
      await conn.beginTransaction();

      await PrestamoModel.sincronizarVencidos(conn);

      const prestamo = await PrestamoModel.obtenerPrestamoPorId(conn, id_prestamo);
      if (!prestamo) {
        throw new Error("Prestamo no encontrado");
      }

      if (prestamo.estado !== "Activo") {
        throw new Error(`No se puede cancelar un prestamo en estado '${prestamo.estado}'`);
      }

      await PrestamoModel.cancelarPrestamo(
        conn,
        id_prestamo,
        admin_id,
        normalizeObservaciones(observaciones)
      );
      await PrestamoModel.incrementarStock(conn, prestamo.libro_id);

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

      await PrestamoModel.sincronizarVencidos(conn);

      const prestamo = await PrestamoModel.obtenerPrestamoPorId(conn, id_prestamo);
      if (!prestamo) {
        throw new Error("Prestamo no encontrado");
      }

      if (prestamo.estado !== "Activo") {
        throw new Error(`No se puede vencer un prestamo en estado '${prestamo.estado}'`);
      }

      await PrestamoModel.marcarVencido(
        conn,
        id_prestamo,
        admin_id,
        normalizeObservaciones(observaciones)
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  registrarPrestamo: async (data) => {
    assertLoanWindowOpen();
    const conn = await poolPromise.getConnection();

    try {
      await conn.beginTransaction();

      await PrestamoModel.sincronizarVencidos(conn);
      await ensureStudentEligible(conn, data.id_usuario);
      await ensureBookEligible(conn, data.libro_id);
      await ensureLoanLimit(conn, data.id_usuario);

      await PrestamoModel.descontarStock(conn, data.libro_id);

      const { fechaPrestamo, fechaVencimiento } = getCurrentLoanDateTimes();

      const id = await PrestamoModel.crearPrestamo(conn, {
        id_usuario: data.id_usuario,
        libro_id: data.libro_id,
        fecha_prestamo: fechaPrestamo,
        fecha_vencimiento: fechaVencimiento,
        admin_id: data.admin_id,
        observaciones: normalizeObservaciones(data.observaciones),
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

  actualizarPrestamo: async (id_prestamo, data) => {
    const conn = await poolPromise.getConnection();

    try {
      await conn.beginTransaction();

      await PrestamoModel.sincronizarVencidos(conn);

      const prestamo = await PrestamoModel.obtenerPrestamoPorId(conn, id_prestamo);
      if (!prestamo) {
        throw new Error("Prestamo no encontrado");
      }

      if (prestamo.estado === "Devuelto") {
        throw new Error("No se puede editar un prestamo devuelto");
      }

      const nextUserId = Number(data.id_usuario || prestamo.id_usuario);
      const nextLibroId = Number(data.libro_id || prestamo.libro_id);

      await ensureStudentEligible(conn, nextUserId);
      await ensureBookEligible(conn, nextLibroId);

      if (["Activo", "Vencido"].includes(prestamo.estado) && nextUserId !== Number(prestamo.id_usuario)) {
        await ensureLoanLimit(conn, nextUserId, id_prestamo);
      }

      if (["Activo", "Vencido"].includes(prestamo.estado) && nextLibroId !== Number(prestamo.libro_id)) {
        await PrestamoModel.incrementarStock(conn, prestamo.libro_id);
        await PrestamoModel.descontarStock(conn, nextLibroId);
      }

      await PrestamoModel.actualizarPrestamo(conn, id_prestamo, {
        id_usuario: nextUserId,
        libro_id: nextLibroId,
        observaciones:
          data.observaciones === undefined
            ? prestamo.observaciones
            : normalizeObservaciones(data.observaciones),
        admin_id: data.admin_id,
      });

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  activar: async (id_prestamo, admin_id, observaciones) => {
    assertLoanWindowOpen();
    const conn = await poolPromise.getConnection();

    try {
      await conn.beginTransaction();

      await PrestamoModel.sincronizarVencidos(conn);

      const prestamo = await PrestamoModel.obtenerPrestamoPorId(conn, id_prestamo);
      if (!prestamo) {
        throw new Error("Prestamo no encontrado");
      }

      if (!["Cancelado", "Vencido"].includes(prestamo.estado)) {
        throw new Error(`No se puede activar un prestamo en estado '${prestamo.estado}'`);
      }

      await ensureStudentEligible(conn, prestamo.id_usuario);
      await ensureBookEligible(conn, prestamo.libro_id);
      await ensureLoanLimit(conn, prestamo.id_usuario, id_prestamo);

      if (prestamo.estado === "Cancelado") {
        await PrestamoModel.descontarStock(conn, prestamo.libro_id);
      }

      const { fechaPrestamo, fechaVencimiento } = getCurrentLoanDateTimes();

      await PrestamoModel.activarPrestamo(conn, id_prestamo, {
        fecha_prestamo: fechaPrestamo,
        fecha_vencimiento: fechaVencimiento,
        admin_id,
        observaciones:
          observaciones === undefined
            ? prestamo.observaciones
            : normalizeObservaciones(observaciones),
      });

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  eliminar: async (id_prestamo) => {
    const conn = await poolPromise.getConnection();

    try {
      await conn.beginTransaction();

      await PrestamoModel.sincronizarVencidos(conn);

      const prestamo = await PrestamoModel.obtenerPrestamoPorId(conn, id_prestamo);
      if (!prestamo) {
        throw new Error("Prestamo no encontrado");
      }

      if (["Activo", "Vencido"].includes(prestamo.estado)) {
        await PrestamoModel.incrementarStock(conn, prestamo.libro_id);
      }

      await PrestamoModel.eliminarPrestamo(conn, id_prestamo);

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  actualizarObservaciones: async (id_prestamo, observaciones) => {
    await PrestamoModel.actualizarObservaciones(id_prestamo, observaciones);
  },
};
