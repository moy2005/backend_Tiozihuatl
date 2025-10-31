import { poolPromise } from "../../../../config/db.config.js";

export const RoleModel = {
  /**
   * Obtiene todos los roles activos del sistema.
   */
  async findAll() {
    const [rows] = await poolPromise.query(
      `SELECT id_rol, nombre_rol, descripcion, estado
       FROM roles
       WHERE estado = 'Activo'
       ORDER BY id_rol ASC`
    );
    return rows;
  },
};
