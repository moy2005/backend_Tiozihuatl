import { poolPromise } from "../../../config/db.config.js";

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id_suscripcion INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NULL,
    endpoint VARCHAR(700) NOT NULL,
    p256dh VARCHAR(255) NOT NULL,
    auth VARCHAR(255) NOT NULL,
    user_agent VARCHAR(255) NULL,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_push_endpoint (endpoint(255)),
    KEY idx_push_usuario (id_usuario)
  )
`;

// Bandeja dentro de la web. Un aviso masivo se guarda una sola vez (destino_tipo = todos | rol)
// y las lecturas se registran por usuario, para no duplicar filas por cada destinatario.
const CREATE_INBOX_SQL = `
  CREATE TABLE IF NOT EXISTS notificaciones (
    id_notificacion INT AUTO_INCREMENT PRIMARY KEY,
    destino_tipo ENUM('todos','rol','usuario') NOT NULL,
    destino_valor VARCHAR(50) NULL,
    categoria VARCHAR(30) NOT NULL DEFAULT 'aviso',
    titulo VARCHAR(120) NOT NULL,
    mensaje VARCHAR(300) NOT NULL,
    url VARCHAR(255) NULL,
    fecha_creacion DATETIME NOT NULL,
    KEY idx_notif_destino (destino_tipo, destino_valor),
    KEY idx_notif_fecha (fecha_creacion)
  )
`;

const CREATE_READS_SQL = `
  CREATE TABLE IF NOT EXISTS notificaciones_leidas (
    id_notificacion INT NOT NULL,
    id_usuario INT NOT NULL,
    fecha_lectura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_notificacion, id_usuario),
    KEY idx_leidas_usuario (id_usuario)
  )
`;

const INBOX_DAYS = 60;

const inboxWhere = `
  (n.destino_tipo = 'todos'
    OR (n.destino_tipo = 'rol' AND n.destino_valor = ?)
    OR (n.destino_tipo = 'usuario' AND n.destino_valor = ?))
  AND n.fecha_creacion >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ${INBOX_DAYS} DAY)
  AND n.categoria <> 'prueba'
`;

export const PushModel = {
  ensureTable: async () => {
    await poolPromise.query(CREATE_TABLE_SQL);
    await poolPromise.query(CREATE_INBOX_SQL);
    await poolPromise.query(CREATE_READS_SQL);
  },

  crearNotificacion: async ({ destino_tipo, destino_valor = null, categoria = "aviso", titulo, mensaje, url = null }) => {
    const [result] = await poolPromise.query(
      `
        INSERT INTO notificaciones (destino_tipo, destino_valor, categoria, titulo, mensaje, url, fecha_creacion)
        VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())
      `,
      [destino_tipo, destino_valor == null ? null : String(destino_valor), categoria, titulo.slice(0, 120), mensaje.slice(0, 300), url]
    );
    return result.insertId;
  },

  listarBandeja: async (id_usuario, rol, limit = 20) => {
    const [rows] = await poolPromise.query(
      `
        SELECT n.id_notificacion, n.categoria, n.titulo, n.mensaje, n.url,
               DATE_FORMAT(n.fecha_creacion, '%Y-%m-%dT%H:%i:%sZ') AS fecha,
               (nl.id_usuario IS NOT NULL) AS leida
        FROM notificaciones n
        LEFT JOIN notificaciones_leidas nl
          ON nl.id_notificacion = n.id_notificacion AND nl.id_usuario = ?
        WHERE ${inboxWhere}
        ORDER BY n.fecha_creacion DESC, n.id_notificacion DESC
        LIMIT ?
      `,
      [id_usuario, rol, String(id_usuario), limit]
    );
    return rows.map((row) => ({ ...row, leida: Boolean(row.leida) }));
  },

  contarNoLeidas: async (id_usuario, rol) => {
    const [rows] = await poolPromise.query(
      `
        SELECT COUNT(*) AS total
        FROM notificaciones n
        LEFT JOIN notificaciones_leidas nl
          ON nl.id_notificacion = n.id_notificacion AND nl.id_usuario = ?
        WHERE ${inboxWhere} AND nl.id_usuario IS NULL
      `,
      [id_usuario, rol, String(id_usuario)]
    );
    return Number(rows[0]?.total || 0);
  },

  marcarLeida: async (id_notificacion, id_usuario, rol) => {
    // Solo se marca si la notificación realmente pertenece a la bandeja del usuario.
    await poolPromise.query(
      `
        INSERT IGNORE INTO notificaciones_leidas (id_notificacion, id_usuario)
        SELECT n.id_notificacion, ? FROM notificaciones n
        WHERE n.id_notificacion = ? AND ${inboxWhere}
      `,
      [id_usuario, id_notificacion, rol, String(id_usuario)]
    );
  },

  marcarTodasLeidas: async (id_usuario, rol) => {
    await poolPromise.query(
      `
        INSERT IGNORE INTO notificaciones_leidas (id_notificacion, id_usuario)
        SELECT n.id_notificacion, ? FROM notificaciones n
        WHERE ${inboxWhere}
      `,
      [id_usuario, rol, String(id_usuario)]
    );
  },

  guardar: async ({ id_usuario, endpoint, p256dh, auth, user_agent }) => {
    await poolPromise.query(
      `
        INSERT INTO push_subscriptions (id_usuario, endpoint, p256dh, auth, user_agent)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          id_usuario = VALUES(id_usuario),
          p256dh = VALUES(p256dh),
          auth = VALUES(auth),
          user_agent = VALUES(user_agent)
      `,
      [id_usuario, endpoint, p256dh, auth, user_agent]
    );
  },

  eliminarPorEndpoint: async (endpoint) => {
    await poolPromise.query("DELETE FROM push_subscriptions WHERE endpoint = ?", [endpoint]);
  },

  obtenerPorUsuario: async (id_usuario) => {
    const [rows] = await poolPromise.query(
      "SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE id_usuario = ?",
      [id_usuario]
    );
    return rows;
  },

  obtenerPorRol: async (nombre_rol) => {
    const [rows] = await poolPromise.query(
      `
        SELECT ps.endpoint, ps.p256dh, ps.auth
        FROM push_subscriptions ps
        INNER JOIN usuarios u ON u.id_usuario = ps.id_usuario
        INNER JOIN roles r ON r.id_rol = u.id_rol
        WHERE r.nombre_rol = ?
      `,
      [nombre_rol]
    );
    return rows;
  },

  obtenerTodas: async () => {
    const [rows] = await poolPromise.query("SELECT endpoint, p256dh, auth FROM push_subscriptions");
    return rows;
  },

  estadisticas: async () => {
    const [rows] = await poolPromise.query(
      `
        SELECT
          COUNT(*) AS total,
          COUNT(DISTINCT ps.id_usuario) AS usuarios,
          SUM(r.nombre_rol = 'Estudiante') AS estudiantes,
          SUM(r.nombre_rol = 'Docente') AS docentes,
          SUM(r.nombre_rol = 'Administrador') AS administradores
        FROM push_subscriptions ps
        LEFT JOIN usuarios u ON u.id_usuario = ps.id_usuario
        LEFT JOIN roles r ON r.id_rol = u.id_rol
      `
    );
    const row = rows[0] || {};
    return {
      total: Number(row.total || 0),
      usuarios: Number(row.usuarios || 0),
      estudiantes: Number(row.estudiantes || 0),
      docentes: Number(row.docentes || 0),
      administradores: Number(row.administradores || 0),
    };
  },

  prestamosPorVencer: async () => {
    // Préstamos activos cuyo vencimiento cae dentro de las próximas 24 horas (hora local).
    const [rows] = await poolPromise.query(
      `
        SELECT p.id_prestamo, p.id_usuario, l.titulo,
               DATE_FORMAT(p.fecha_vencimiento, '%d/%m/%Y %H:%i') AS vence
        FROM prestamos p
        INNER JOIN libros l ON l.id = p.libro_id
        WHERE p.estado = 'Activo'
          AND p.fecha_vencimiento > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 HOUR)
          AND p.fecha_vencimiento <= DATE_ADD(DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 HOUR), INTERVAL 1 DAY)
      `
    );
    return rows;
  },

  obtenerPrestamo: async (id_prestamo) => {
    const [rows] = await poolPromise.query(
      `
        SELECT p.id_prestamo, p.id_usuario, p.estado, l.titulo,
               DATE_FORMAT(p.fecha_vencimiento, '%d/%m/%Y %H:%i') AS vence
        FROM prestamos p
        INNER JOIN libros l ON l.id = p.libro_id
        WHERE p.id_prestamo = ?
      `,
      [id_prestamo]
    );
    return rows[0] || null;
  },
};
