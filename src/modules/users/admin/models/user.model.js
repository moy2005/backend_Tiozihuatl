import { poolPromise } from "../../../../config/db.config.js";

const normalizeText = (value) => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
};

const isStudentRole = (roleName) => roleName === "Estudiante";

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
        U.id_rol,
        U.id_carrera,
        COALESCE(TA.id_semestre, U.id_semestre) AS id_semestre,
        TA.id_periodo,
        U.nombre,
        U.a_paterno,
        U.a_materno,
        U.correo,
        U.telefono,
        U.matricula,
        COALESCE(TA.grupo, U.grupo) AS grupo,
        U.estado,
        R.nombre_rol AS rol,
        C.nombre_carrera AS carrera,
        S.nombre_semestre AS semestre
      FROM usuarios U
      LEFT JOIN roles R ON U.id_rol = R.id_rol
      LEFT JOIN carreras C ON U.id_carrera = C.id_carrera
      LEFT JOIN (
        SELECT
          TA1.id_usuario,
          TA1.id_periodo,
          TA1.id_semestre,
          TA1.grupo
        FROM trayectoria_academica TA1
        INNER JOIN (
          SELECT id_usuario, MAX(id) AS max_id
          FROM trayectoria_academica
          GROUP BY id_usuario
        ) ULT ON ULT.max_id = TA1.id
      ) TA ON TA.id_usuario = U.id_usuario
      LEFT JOIN semestres S ON S.id_semestre = COALESCE(TA.id_semestre, U.id_semestre)
      ORDER BY U.a_paterno ASC
    `);
    return rows;
  },

  /**
   * ================================================================
   * ADMIN: Crear usuario (para cualquier rol)
   * ================================================================
   */
  async createByAdmin(data, executor = null) {
    const pool = await poolPromise;
    const db = executor || pool;

    const [rol] = await db.query(
      `SELECT nombre_rol FROM roles WHERE id_rol = ?`,
      [data.id_rol]
    );

    if (!rol.length) {
      throw new Error("El rol seleccionado no existe.");
    }

    const nombreRol = rol[0].nombre_rol;
    const esEstudiante = isStudentRole(nombreRol);

    data.nombre = normalizeText(data.nombre);
    data.a_paterno = normalizeText(data.a_paterno);
    data.a_materno = normalizeText(data.a_materno);
    data.correo = normalizeText(data.correo);
    data.telefono = normalizeText(data.telefono);
    data.matricula = normalizeText(data.matricula);
    data.grupo = normalizeText(data.grupo);

    if (esEstudiante) {
      if (!data.matricula) {
        throw new Error("Estudiante requiere matrÃ­cula.");
      }
      if (!data.id_carrera || !data.id_semestre) {
        throw new Error("Estudiante requiere carrera y semestre.");
      }
      if (!data.grupo || !["A", "B"].includes(data.grupo)) {
        throw new Error("Estudiante requiere grupo vÃ¡lido (A o B).");
      }
      if (!data.id_periodo) {
        throw new Error("Estudiante requiere periodo.");
      }
    } else {
      if (!data.correo) {
        throw new Error(`${nombreRol} requiere correo electrÃ³nico.`);
      }
      data.id_carrera = null;
      data.id_semestre = null;
      data.matricula = null;
      data.grupo = null;
    }

    const [result] = await db.query(
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
        grupo,
        contrasena,
        estado,
        token_verificacion,
        token_expira,
        fecha_registro
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
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
        data.matricula,
        data.grupo,
        data.contrasena || null,
        data.estado || 'Activo',
        data.token_verificacion || null,
        data.token_expira || null,
      ]
    );

    return { insertId: result.insertId };
  },

  /**
   * ================================================================
   * ADMIN: Actualizar usuario completo
   * ================================================================
   */
  async updateByAdmin(id_usuario, data, executor = null) {
    const pool = await poolPromise;
    const db = executor || pool;

    const [exist] = await db.query(
      `SELECT * FROM usuarios WHERE id_usuario = ?`,
      [id_usuario]
    );

    if (!exist.length) {
      throw new Error(`Usuario con ID ${id_usuario} no encontrado.`);
    }

    const usuarioActual = exist[0];

    let nombreRol = null;

    if (data.id_rol) {
      const [rol] = await db.query(
        `SELECT nombre_rol FROM roles WHERE id_rol = ?`,
        [data.id_rol]
      );
      if (!rol.length) throw new Error("El rol seleccionado no existe.");
      nombreRol = rol[0].nombre_rol;
    } else {
      const [rolActual] = await db.query(
        `SELECT R.nombre_rol
         FROM usuarios U
         INNER JOIN roles R ON U.id_rol = R.id_rol
         WHERE U.id_usuario = ?`,
        [id_usuario]
      );
      nombreRol = rolActual[0]?.nombre_rol || "";
    }

    const esEstudiante = isStudentRole(nombreRol);

    const camposActualizar = {};
    const camposMantener = [
      "id_rol",
      "id_carrera",
      "id_semestre",
      "grupo",
      "nombre",
      "a_paterno",
      "a_materno",
      "correo",
      "telefono",
      "matricula",
      "estado",
    ];

    for (const campo of camposMantener) {
      if (Object.prototype.hasOwnProperty.call(data, campo) && data[campo] !== undefined) {
        camposActualizar[campo] = data[campo];
      } else {
        camposActualizar[campo] = usuarioActual[campo];
      }
    }

    camposActualizar.nombre = normalizeText(camposActualizar.nombre);
    camposActualizar.a_paterno = normalizeText(camposActualizar.a_paterno);
    camposActualizar.a_materno = normalizeText(camposActualizar.a_materno);
    camposActualizar.correo = normalizeText(camposActualizar.correo);
    camposActualizar.telefono = normalizeText(camposActualizar.telefono);
    camposActualizar.matricula = normalizeText(camposActualizar.matricula);
    camposActualizar.grupo = normalizeText(camposActualizar.grupo);

    if (esEstudiante) {
      if (!camposActualizar.matricula) {
        throw new Error("Estudiante requiere matrÃ­cula.");
      }
      if (!camposActualizar.id_carrera || !camposActualizar.id_semestre) {
        throw new Error("Estudiante requiere carrera y semestre.");
      }
      if (!camposActualizar.grupo || !["A", "B"].includes(camposActualizar.grupo)) {
        throw new Error("Estudiante requiere grupo vÃ¡lido (A o B).");
      }
    } else {
      if (!camposActualizar.correo) {
        throw new Error(`${nombreRol} requiere correo electrÃ³nico.`);
      }
      camposActualizar.id_carrera = null;
      camposActualizar.id_semestre = null;
      camposActualizar.matricula = null;
      camposActualizar.grupo = null;
    }

    if (
      Object.prototype.hasOwnProperty.call(data, "contrasena") &&
      data.contrasena !== undefined &&
      data.contrasena !== null
    ) {
      camposActualizar.contrasena = data.contrasena;
    }

    const setClause = Object.keys(camposActualizar)
      .map((key) => `${key} = ?`)
      .join(", ");

    const values = Object.values(camposActualizar);
    values.push(id_usuario);

    await db.query(`UPDATE usuarios SET ${setClause} WHERE id_usuario = ?`, values);

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
      ${await this._hasEstadoColumn(pool, "carreras") ? "WHERE estado = 'Activa'" : ""}
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
   * Verifica si la tabla tiene columna "estado"
   */
  async _hasEstadoColumn(pool, tableName) {
    const [cols] = await pool.query(`SHOW COLUMNS FROM ${tableName} LIKE 'estado'`);
    return cols.length > 0;
  },

  async findWithAdvancedFilters(filters) {
    const pool = await poolPromise;

    let query;
    const params = [];

    if (filters.id_periodo) {
      query = `
        SELECT
          U.id_usuario,
          U.id_rol,
          U.id_carrera,
          TA.id_semestre AS id_semestre,
          TA.id_periodo AS id_periodo,
          U.nombre,
          U.a_paterno,
          U.a_materno,
          U.correo,
          U.telefono,
          U.matricula,
          U.estado,
          R.nombre_rol AS rol,
          C.nombre_carrera AS carrera,
          S.nombre_semestre AS semestre,
          TA.grupo
        FROM usuarios U
        LEFT JOIN roles R ON U.id_rol = R.id_rol
        LEFT JOIN carreras C ON U.id_carrera = C.id_carrera
        INNER JOIN (
          SELECT id_usuario, MAX(id) AS max_id
          FROM trayectoria_academica
          WHERE id_periodo = ?
          GROUP BY id_usuario
        ) ultimos ON ultimos.id_usuario = U.id_usuario
        INNER JOIN trayectoria_academica TA ON TA.id = ultimos.max_id
        LEFT JOIN semestres S ON TA.id_semestre = S.id_semestre
        WHERE TA.estado = 'Activo'
      `;
      params.push(filters.id_periodo);

      if (filters.rol) {
        query += " AND R.nombre_rol = ?";
        params.push(filters.rol);
      }

      if (filters.id_carrera) {
        query += " AND U.id_carrera = ?";
        params.push(filters.id_carrera);
      }

      if (filters.id_semestre) {
        query += " AND TA.id_semestre = ?";
        params.push(filters.id_semestre);
      }

      if (filters.grupo) {
        query += " AND TA.grupo = ?";
        params.push(filters.grupo);
      }
    } else {
      query = `
        SELECT
          U.id_usuario,
          U.id_rol,
          U.id_carrera,
          COALESCE(TA.id_semestre, U.id_semestre) AS id_semestre,
          TA.id_periodo,
          U.nombre,
          U.a_paterno,
          U.a_materno,
          U.correo,
          U.telefono,
          U.matricula,
          U.estado,
          R.nombre_rol AS rol,
          C.nombre_carrera AS carrera,
          S.nombre_semestre AS semestre,
          COALESCE(TA.grupo, U.grupo) AS grupo
        FROM usuarios U
        LEFT JOIN roles R ON U.id_rol = R.id_rol
        LEFT JOIN carreras C ON U.id_carrera = C.id_carrera
        LEFT JOIN (
          SELECT
            TA1.id_usuario,
            TA1.id_periodo,
            TA1.id_semestre,
            TA1.grupo
          FROM trayectoria_academica TA1
          INNER JOIN (
            SELECT id_usuario, MAX(id) AS max_id
            FROM trayectoria_academica
            GROUP BY id_usuario
          ) ULT ON ULT.max_id = TA1.id
        ) TA ON TA.id_usuario = U.id_usuario
        LEFT JOIN semestres S ON S.id_semestre = COALESCE(TA.id_semestre, U.id_semestre)
        WHERE 1 = 1
      `;

      if (filters.rol) {
        query += " AND R.nombre_rol = ?";
        params.push(filters.rol);
      }

      if (filters.id_carrera) {
        query += " AND U.id_carrera = ?";
        params.push(filters.id_carrera);
      }

      if (filters.id_semestre) {
        query += " AND COALESCE(TA.id_semestre, U.id_semestre) = ?";
        params.push(filters.id_semestre);
      }

      if (filters.grupo) {
        query += " AND COALESCE(TA.grupo, U.grupo) = ?";
        params.push(filters.grupo);
      }
    }

    query += " ORDER BY U.a_paterno ASC";

    const [rows] = await pool.query(query, params);
    return rows;
  },
};
