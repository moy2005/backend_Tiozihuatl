import bcrypt from "bcryptjs";
import { poolPromise } from "../../../../config/db.config.js";
import { UserModel } from "../models/user.model.js";

export const UserService = {
  async getProfile(id_usuario) {
    const user = await UserModel.findById(id_usuario);
    if (!user) throw new Error("Usuario no encontrado.");
    return user;
  },

  async updateProfile(id_usuario, data) {
    await UserModel.updateProfile(id_usuario, data);
    return { message: "✅ Perfil actualizado correctamente." };
  },

  async changePassword(id_usuario, actual, nueva) {
    const pool = await poolPromise;
    const [rows] = await pool.query("SELECT contrasena FROM usuarios WHERE id_usuario = ?", [id_usuario]);
    if (!rows.length) throw new Error("Usuario no encontrado.");

    const valid = await bcrypt.compare(actual, rows[0].contrasena);
    if (!valid) throw new Error("La contraseña actual es incorrecta.");

    await UserModel.updatePassword(id_usuario, nueva);
    return { message: "✅ Contraseña actualizada correctamente." };
  },
};
