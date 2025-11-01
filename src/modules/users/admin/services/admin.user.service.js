import bcrypt from "bcryptjs";
import { poolPromise } from "../../../../config/db.config.js";
import { AdminUserModel } from "../models/user.model.js"; // modelo del admin
import { RoleModel } from "../models/role.model.js"; // modelo de roles


export const AdminUserService = {
  /**
   * ================================================================
   * Obtener todos los usuarios con sus roles
   * ================================================================
   */
  async getAllUsers() {
    return await AdminUserModel.findAllWithRoles();
  },

  /**
   * ================================================================
   * Crear un nuevo usuario desde el panel del admin
   * ================================================================
   */
  async createUser(data) {
    const pool = await poolPromise;

    // Verificar si el correo ya existe
    const [existing] = await pool.query(
      "SELECT id_usuario FROM usuarios WHERE correo = ?",
      [data.correo]
    );

    if (existing.length > 0) {
      throw new Error("El correo ya está registrado.");
    }

    // Encriptar contraseña
    const hash = await bcrypt.hash(data.contrasena, 12);
    data.contrasena = hash;

    // Crear el usuario
    await AdminUserModel.createByAdmin(data);
    return { message: "✅ Usuario creado correctamente." };
  },

  /**
   * ================================================================
   * Actualizar datos de un usuario
   * ================================================================
   */
  async updateUser(id_usuario, data) {
    await AdminUserModel.updateByAdmin(id_usuario, data);
    return { message: "✅ Usuario actualizado correctamente." };
  },

  /**
   * ================================================================
   * Desactivar usuario (eliminación lógica)
   * ================================================================
   */
  async deleteUser(id_usuario) {
    await AdminUserModel.deleteUser(id_usuario);
    return { message: "✅ Usuario desactivado correctamente." };
  },

  /**
   * ================================================================
   * Obtener lista de roles activos
   * ================================================================
   */
  async getRoles() {
    const pool = await poolPromise;
    return await RoleModel.findAll(pool);
  },

    /**
   * ================================================================
   * Obtener lista de carreras activas
   * ================================================================
   */
  async getCarreras() {
    return await AdminUserModel.findAllCarreras();
  },

  /**
   * ================================================================
   * Obtener lista de semestres activos
   * ================================================================
   */
  async getSemestres() {
    return await AdminUserModel.findAllSemestres();
  },
};
