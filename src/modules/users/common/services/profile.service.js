import bcrypt from "bcryptjs";
import { poolPromise } from "../../../../config/db.config.js";
import { UserModel } from "../models/user.model.js";

export const UserService = {
  /**
   * ================================================================
   * PERFIL: Obtener información completa del usuario
   * ================================================================
   */
  async getProfile(id_usuario) {
    const user = await UserModel.findById(id_usuario);
    if (!user) throw new Error("Usuario no encontrado.");
    return user;
  },

  /**
   * ================================================================
   * PERFIL: Actualizar datos personales
   * ================================================================
   */
  async updateProfile(id_usuario, data) {
    await UserModel.updateProfile(id_usuario, data);
    return { message: "✅ Perfil actualizado correctamente." };
  },

  /**
   * ================================================================
   * PERFIL: Cambiar contraseña del usuario
   * ================================================================
   */
  async changePassword(id_usuario, actual, nueva) {
    const pool = await poolPromise;

    // Obtener la contraseña actual desde la BD
    const [rows] = await pool.query(
      "SELECT contrasena FROM usuarios WHERE id_usuario = ?",
      [id_usuario]
    );

    if (!rows.length) throw new Error("Usuario no encontrado.");

    const hashActual = rows[0].contrasena;

    // Verificar contraseña actual
    const valid = await bcrypt.compare(actual, hashActual);
    if (!valid) throw new Error("La contraseña actual es incorrecta.");

    // Encriptar y actualizar la nueva contraseña
    const nuevaHash = await bcrypt.hash(nueva, 12);
    await UserModel.updatePassword(id_usuario, nuevaHash);

    return { message: "✅ Contraseña actualizada correctamente." };
  },
};
