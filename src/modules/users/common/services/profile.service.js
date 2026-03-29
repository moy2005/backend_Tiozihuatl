import bcrypt from "bcryptjs";
import { poolPromise } from "../../../../config/db.config.js";
import { UserModel } from "../models/user.model.js";

const getFriendlyDatabaseError = (error) => {
  if (error?.code !== "ER_DUP_ENTRY") return null;

  const detail = String(error?.sqlMessage || error?.message || "");

  if (detail.includes("UQ_Usuarios_correo") || detail.includes("correo")) {
    return "El correo electronico ya esta registrado en otra cuenta.";
  }

  if (detail.includes("telefono")) {
    return "El numero de telefono ya esta registrado en otra cuenta.";
  }

  if (detail.includes("matricula")) {
    return "La matricula ya esta registrada en otra cuenta.";
  }

  return "Uno de los datos capturados ya esta registrado en otra cuenta.";
};

const normalizeRole = (role) => String(role || "").trim().toLowerCase();

const deleteByUserId = async (connection, tableName, id_usuario) => {
  await connection.query(`DELETE FROM ${tableName} WHERE id_usuario = ?`, [id_usuario]);
};

const deleteByPurchaseIds = async (connection, tableName, purchaseIds) => {
  if (!purchaseIds.length) return;
  await connection.query(`DELETE FROM ${tableName} WHERE id_compra IN (?)`, [purchaseIds]);
};

export const UserService = {
  async getProfile(id_usuario) {
    const user = await UserModel.findById(id_usuario);
    if (!user) throw new Error("Usuario no encontrado.");
    return user;
  },

  async updateProfile(id_usuario, data) {
    const palabraSecreta = typeof data?.palabra_secreta === "string"
      ? data.palabra_secreta.trim()
      : "";

    if (palabraSecreta && (palabraSecreta.length < 4 || palabraSecreta.length > 30)) {
      throw new Error("La palabra secreta debe tener entre 4 y 30 caracteres.");
    }

    try {
      await UserModel.updateProfile(id_usuario, data);
    } catch (error) {
      const friendlyMessage = getFriendlyDatabaseError(error);

      if (friendlyMessage) {
        const friendlyError = new Error(friendlyMessage);
        friendlyError.statusCode = 409;
        throw friendlyError;
      }

      throw error;
    }

    return { message: "Perfil actualizado correctamente." };
  },

  async changePassword(id_usuario, actual, nueva) {
    const pool = await poolPromise;
    const [rows] = await pool.query(
      "SELECT contrasena FROM usuarios WHERE id_usuario = ?",
      [id_usuario]
    );

    if (!rows.length) throw new Error("Usuario no encontrado.");

    const valid = await bcrypt.compare(actual, rows[0].contrasena);
    if (!valid) throw new Error("La contrasena actual es incorrecta.");

    await UserModel.updatePassword(id_usuario, nueva);
    return { message: "Contrasena actualizada correctamente." };
  },

  async deleteOwnAccount(id_usuario) {
    const pool = await poolPromise;
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [rows] = await connection.query(
        `
        SELECT
          U.id_usuario,
          U.correo,
          R.nombre_rol AS rol
        FROM usuarios U
        INNER JOIN roles R ON U.id_rol = R.id_rol
        WHERE U.id_usuario = ?
        LIMIT 1
        FOR UPDATE
        `,
        [id_usuario]
      );

      const user = rows[0];

      if (!user) {
        const error = new Error("Usuario no encontrado.");
        error.statusCode = 404;
        throw error;
      }

      if (normalizeRole(user.rol) !== "visitante") {
        const error = new Error(
          "Solo las cuentas de tipo Visitante pueden eliminarse desde el perfil."
        );
        error.statusCode = 403;
        throw error;
      }

      const [purchaseRows] = await connection.query(
        "SELECT id_compra FROM compras WHERE id_usuario = ?",
        [id_usuario]
      );

      const purchaseIds = purchaseRows.map((purchase) => purchase.id_compra);

      if (purchaseIds.length) {
        await connection.query(
          "DELETE FROM auditoria_compras WHERE id_usuario = ? OR id_compra IN (?)",
          [id_usuario, purchaseIds]
        );
        await deleteByPurchaseIds(connection, "pagos", purchaseIds);
        await deleteByPurchaseIds(connection, "detalle_compra", purchaseIds);
      } else {
        await connection.query("DELETE FROM auditoria_compras WHERE id_usuario = ?", [id_usuario]);
      }

      await deleteByUserId(connection, "carrito", id_usuario);
      await connection.query("DELETE FROM progreso_lectura WHERE id_usuario = ?", [id_usuario]);
      await connection.query("DELETE FROM recovery_links WHERE id_usuario = ?", [id_usuario]);

      if (user.correo) {
        await connection.query("DELETE FROM recovery_requests WHERE correo = ?", [user.correo]);
      }

      await deleteByUserId(connection, "recuperacion", id_usuario);
      await deleteByUserId(connection, "tokens2fa", id_usuario);
      await deleteByUserId(connection, "tokensrefresh", id_usuario);
      await deleteByUserId(connection, "sesionesjwt", id_usuario);
      await deleteByUserId(connection, "trayectoria_academica", id_usuario);
      await deleteByUserId(connection, "compras", id_usuario);

      await connection.query("DELETE FROM usuarios WHERE id_usuario = ?", [id_usuario]);

      await connection.commit();

      return {
        message: "Tu cuenta fue eliminada correctamente.",
      };
    } catch (error) {
      await connection.rollback();

      if (error?.code === "ER_ROW_IS_REFERENCED_2") {
        const friendlyError = new Error(
          "No fue posible eliminar la cuenta porque aun tiene datos relacionados protegidos."
        );
        friendlyError.statusCode = 409;
        throw friendlyError;
      }

      throw error;
    } finally {
      connection.release();
    }
  },
};
