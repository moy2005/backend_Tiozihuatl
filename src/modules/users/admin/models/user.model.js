import { poolPromise } from "../../../../config/db.config.js";

export const AdminUserModel = {
  /**
   * ================================================================
   * ADMIN: Obtener todos los usuarios con detalle completo
   * ================================================================
   */
  async findAllWithRoles() {
    const pool = await poolPromise;
    const [rows] = await pool.query(`
      SELECT 
        U.id_usuario,
        U.nombre,
        U.a_paterno,
        U.a_materno,
        U.correo,
        U.telefono,
        U.matricula,
        U.estado,
        R.nombre_rol AS rol,
        C.nombre_carrera AS carrera,
        S.nombre_semestre AS semestre
      FROM usuarios U
      LEFT JOIN roles R ON U.id_rol = R.id_rol
      LEFT JOIN carreras C ON U.id_carrera = C.id_carrera
      LEFT JOIN semestres S ON U.id_semestre = S.id_semestre
      ORDER BY U.fecha_registro DESC
    `);
    return rows;
  },

  /**
   * ================================================================
   * ADMIN: Crear usuario (para cualquier rol)
   * ================================================================
   */
  async createByAdmin(data) {
    const pool = await poolPromise;
    await pool.query(
      `
      INSERT INTO usuarios (
        id_rol,
        id_carrera,
        id_semestre,
        nombre,
        a_paterno,
        a_materno,
        correo,
        telefono,
        matricula,
        contrasena,
        estado,
        fecha_registro
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Activo', NOW())
      `,
      [
        data.id_rol,
        data.id_carrera || null,
        data.id_semestre || null,
        data.nombre,
        data.a_paterno,
        data.a_materno,
        data.correo,
        data.telefono,
        data.matricula || null,
        data.contrasena,
      ]
    );
  },

  /**
   * ================================================================
   * ADMIN: Actualizar usuario completo
   * ================================================================
   */
async updateByAdmin(id_usuario, data) {
  const pool = await poolPromise;

  // Verificar que el usuario exista
  const [exist] = await pool.query(`SELECT * FROM usuarios WHERE id_usuario = ?`, [id_usuario]);
  if (!exist.length) throw new Error(`Usuario con ID ${id_usuario} no encontrado.`);
  const usuarioActual = exist[0];

  // Campos que se pueden modificar
  const campos = [
    "id_rol", "id_carrera", "id_semestre",
    "nombre", "a_paterno", "a_materno",
    "correo", "telefono", "matricula", "estado"
  ];

  // Mantener el valor actual si el campo no viene en el body
  const camposActualizar = {};
  for (const campo of campos) {
    if (data[campo] !== undefined) {
      camposActualizar[campo] = data[campo];
    } else {
      camposActualizar[campo] = usuarioActual[campo];
    }
  }

  // Validar que el rol exista (solo si se intenta cambiar)
  if (data.id_rol !== undefined) {
    const [rol] = await pool.query(`SELECT id_rol FROM roles WHERE id_rol = ?`, [camposActualizar.id_rol]);
    if (!rol.length) throw new Error("El rol seleccionado no existe.");
  }

  // Construir SET dinámico
  const setClause = Object.keys(camposActualizar)
    .map((key) => `${key} = ?`)
    .join(", ");
  const values = Object.values(camposActualizar);
  values.push(id_usuario);

  // Ejecutar actualización
  await pool.query(`UPDATE usuarios SET ${setClause} WHERE id_usuario = ?`, values);

  return { message: "Usuario actualizado correctamente." };
},

  /**
   * ================================================================
   * ADMIN: Desactivar usuario
   * ================================================================
   */
  async deleteUser(id_usuario) {
    const pool = await poolPromise;
    await pool.query(
      `
      UPDATE usuarios
      SET estado = 'Inactivo'
      WHERE id_usuario = ?
      `,
      [id_usuario]
    );
  },

  /**
   * ================================================================
   * Obtener todas las carreras (filtra por estado si existe)
   * ================================================================
   */
  async findAllCarreras() {
    const pool = await poolPromise;
    const [rows] = await pool.query(`
      SELECT 
        id_carrera, 
        nombre_carrera, 
        descripcion, 
        duracion_semestres, 
        estado
      FROM carreras
      ${await this._hasEstadoColumn(pool, 'carreras') ? "WHERE estado = 'Activa'" : ""}
      ORDER BY nombre_carrera ASC
    `);
    return rows;
  },

  /**
   * ================================================================
   * Obtener todos los semestres
   * ================================================================
   */
  async findAllSemestres() {
    const pool = await poolPromise;
    const [rows] = await pool.query(`
      SELECT 
        id_semestre, 
        nombre_semestre
      FROM semestres
      ORDER BY id_semestre ASC
    `);
    return rows;
  },

  /**
   * 🔎 Verifica si la tabla tiene columna "estado"
   */
  async _hasEstadoColumn(pool, tableName) {
    const [cols] = await pool.query(`SHOW COLUMNS FROM ${tableName} LIKE 'estado'`);
    return cols.length > 0;
  },
};
