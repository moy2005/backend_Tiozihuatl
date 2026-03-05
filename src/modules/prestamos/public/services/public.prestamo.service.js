import { poolPromise } from "../../../../config/db.config.js";
import { PrestamoModel } from "../../models/prestamo.model.js";

const validarHorario = () => {
  const now = new Date();
  const day = now.getDay(); // 0 domingo

  const hour = now.getHours();

  if (day === 0 || day === 6) {
    throw new Error("Solo se puede prestar de lunes a viernes");
  }

  if (hour < 10 || hour >= 16) {
    throw new Error("Horario permitido de 10:00 a 16:00");
  }
};

export const PublicPrestamoService = {

   solicitarPrestamo: async (usuario_id, libro_id) => {

    validarHorario();

    const conn = await poolPromise.getConnection();

    try {
      await conn.beginTransaction();

      // ✅ Validar límite de préstamos activos
      const prestamosActivos = await PrestamoModel.contarPrestamosActivos(conn, usuario_id);
      if (prestamosActivos >= 3) {
        throw new Error("Has alcanzado el límite de 3 libros prestados simultáneamente");
      }

      await PrestamoModel.descontarStock(conn, libro_id);

      const fecha_vencimiento = new Date();
      fecha_vencimiento.setHours(16, 0, 0, 0);

      const id = await PrestamoModel.crearPrestamo(conn, {
        id_usuario: usuario_id,
        libro_id,
        fecha_vencimiento
      });

      await conn.commit();
      return id;

    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

};