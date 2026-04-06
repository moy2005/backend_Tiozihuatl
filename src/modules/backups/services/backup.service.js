import mysqldump from "mysqldump";
import { poolPromise } from "../../../config/db.config.js";
import cloudinary from "../../../config/cloudinary.js";
import JSZip from "jszip";

/* ===============================
   CONSTANTES
================================ */

const AUTOMATIC_BACKUP_FOLDER = "Respaldos_Base_de_Datos/Automaticos";
const CLOUDINARY_DELETE_BATCH_SIZE = 100;
const DEFAULT_AUTOMATIC_BACKUP_RETENTION_DAYS = 15;

const AUTOMATIC_BACKUP_RETENTION_DAYS = (() => {
  const parsed = Number.parseInt(
    process.env.BACKUP_AUTOMATIC_RETENTION_DAYS ?? "",
    10
  );
  return Number.isInteger(parsed) && parsed > 0
    ? parsed
    : DEFAULT_AUTOMATIC_BACKUP_RETENTION_DAYS;
})();

/**
 * Tablas excluidas de todos los respaldos.
 * Declaradas aquí para evitar duplicación entre buildFullSQL y getBackupTables.
 */
const EXCLUDED_TABLES = [
  "tokensrefresh",
  "tokens2fa",
  "sesionesjwt",
  "auditoriaeventos",
  "auditoria_compras",
  "recovery_links",
  "recovery_requests",
  "recuperacion",
  "backups_log",
  "maintenance_log",
  "carrito",
  "progreso_lectura",
  "tareas_programadas",
  "pre_registros",
];


/* ===============================
   HELPERS DE FECHA
================================ */

const getTimestamp = () => {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City" })
  );
  const fecha =
    now.getFullYear() +
    "-" +
    String(now.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(now.getDate()).padStart(2, "0");
  const hora =
    String(now.getHours()).padStart(2, "0") +
    "-" +
    String(now.getMinutes()).padStart(2, "0") +
    "-" +
    String(now.getSeconds()).padStart(2, "0");
  return `${fecha}_${hora}`;
};

const getMexicoDate = () =>
  new Date(new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City" }));

const formatDateTimeSql = (date) => {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
};

const getAutomaticBackupRetentionCutoff = () => {
  const cutoff = getMexicoDate();
  cutoff.setDate(cutoff.getDate() - AUTOMATIC_BACKUP_RETENTION_DAYS);
  return formatDateTimeSql(cutoff);
};


/* ===============================
   HELPERS GENERALES
================================ */

const chunkItems = (items, size) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const buildAutomaticBackupPublicId = (fileName) =>
  fileName ? `${AUTOMATIC_BACKUP_FOLDER}/${fileName}` : null;

const buildFileName = (scope, table = null, origen = "manual") => {
  if (scope === "database") return `${process.env.DB_NAME}_full_${origen}_${getTimestamp()}`;
  if (scope === "table")    return `${process.env.DB_NAME}_table_${table}_${origen}_${getTimestamp()}`;
};


/* ===============================
   HELPERS DE LIMPIEZA SQL
================================ */

/**
 * Elimina la cláusula DEFINER del SQL exportado.
 *
 * En Aiven, avdadmin no tiene SUPER ni SET ANY DEFINER.
 * Reimportar un dump con DEFINER de otro usuario lanza ERROR 1227.
 * Sin DEFINER, MySQL asigna el usuario que ejecuta el IMPORT como propietario.
 *
 * Afecta: CREATE PROCEDURE, FUNCTION, VIEW, TRIGGER, EVENT.
 */
const stripDefiner = (sql) =>
  sql.replace(/\bDEFINER\s*=\s*`[^`]*`\s*@\s*`[^`]*`\s*/gi, "");

/**
 * Convierte identificadores entre comillas dobles a backticks.
 *
 * PROBLEMA:
 *   Aiven activa ANSI_QUOTES globalmente en el servidor MySQL.
 *   Con ANSI_QUOTES activo, mysqldump genera:
 *     CREATE TABLE "about" ("id_about" int NOT NULL ...)
 *   En lugar del formato estándar:
 *     CREATE TABLE `about` (`id_about` int NOT NULL ...)
 *
 *   Al reimportar ese dump en un cliente sin ANSI_QUOTES, MySQL interpreta
 *   las comillas dobles como literales de string y lanza:
 *     ERROR 1064: ... near '"about" ("id_about" int ...'
 *
 * SOLUCIÓN:
 *   Convertir "identificador" a `identificador` en todo el SQL del dump.
 *   Solo se convierten cadenas sin espacios ni saltos de línea, que son
 *   los identificadores MySQL válidos (tabla, columna, índice, etc.).
 *   Los valores literales dentro de VALUES(...) que contengan espacios
 *   quedan intactos.
 */
const fixAnsiQuotes = (sql) =>
  sql.replace(/"([^"\\\n]+)"/g, (match, id) => {
    // Si contiene espacios es un valor literal — no tocar
    if (/\s/.test(id)) return match;
    return `\`${id}\``;
  });


/* ===============================
   HELPER: SQL → ZIP → Cloudinary
================================ */

const uploadToCloudinary = async (sql, baseName, origen) => {
  const zip = new JSZip();
  zip.file(`${baseName}.sql`, sql);

  const zipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const subcarpeta = origen === "automatico" ? "Automaticos" : "Manuales";
  console.log(
    `[Backup] uploadToCloudinary → origen: ${origen} | folder: Respaldos_Base_de_Datos/${subcarpeta}`
  );

  const upload = await cloudinary.uploader.upload(
    `data:application/zip;base64,${zipBuffer.toString("base64")}`,
    {
      resource_type:   "raw",
      format:          "zip",
      folder:          `Respaldos_Base_de_Datos/${subcarpeta}`,
      public_id:       `${baseName}.zip`,
      use_filename:    false,
      unique_filename: false,
    }
  );

  return upload.secure_url;
};


/* ===============================
   RETENCIÓN DE RESPALDOS AUTOMÁTICOS
================================ */

const enforceAutomaticBackupRetention = async () => {
  const cutoff = getAutomaticBackupRetentionCutoff();

  const [rows] = await poolPromise.execute(
    `SELECT id_backup, nombre_archivo
     FROM backups_log
     WHERE tipo = 'automatico'
       AND fecha < ?
     ORDER BY fecha ASC`,
    [cutoff]
  );

  const candidates = rows
    .map((row) => ({
      id_backup: row.id_backup,
      public_id: buildAutomaticBackupPublicId(row.nombre_archivo),
    }))
    .filter((row) => row.public_id);

  if (candidates.length === 0) {
    return {
      retentionDays: AUTOMATIC_BACKUP_RETENTION_DAYS,
      deletedAssets: 0,
      deletedLogs:   0,
    };
  }

  let deletedAssets = 0;
  let deletedLogs   = 0;

  for (const batch of chunkItems(candidates, CLOUDINARY_DELETE_BATCH_SIZE)) {
    const publicIds = batch.map((item) => item.public_id);

    const response = await cloudinary.api.delete_resources(publicIds, {
      resource_type: "raw",
      type:          "upload",
      invalidate:    true,
    });

    const deletedMap    = response?.deleted ?? {};
    const removableRows = batch.filter((item) => {
      const status = String(deletedMap[item.public_id] ?? "").toLowerCase();
      return status === "deleted" || status === "not_found";
    });

    if (removableRows.length === 0) continue;

    const removableIds = removableRows.map((item) => item.id_backup);
    const placeholders = removableIds.map(() => "?").join(", ");

    await poolPromise.execute(
      `DELETE FROM backups_log WHERE id_backup IN (${placeholders})`,
      removableIds
    );

    deletedAssets += removableRows.length;
    deletedLogs   += removableRows.length;
  }

  return {
    retentionDays: AUTOMATIC_BACKUP_RETENTION_DAYS,
    deletedAssets,
    deletedLogs,
  };
};


/* ===============================
   VISTAS Y EVENTOS (helpers opcionales)
================================ */

const getViews = async () => {
  const [views] = await poolPromise.execute(
    `SELECT TABLE_NAME FROM information_schema.views WHERE table_schema = ?`,
    [process.env.DB_NAME]
  );
  let sql = "";
  for (const view of views) {
    const [rows] = await poolPromise.execute(
      `SHOW CREATE VIEW \`${process.env.DB_NAME}\`.\`${view.TABLE_NAME}\``
    );
    const def = rows[0]["Create View"] ?? rows[0].Create_View;
    if (def) sql += `\n${stripDefiner(def)};\n`;
  }
  return sql;
};

const getEvents = async () => {
  const [events] = await poolPromise.execute(
    `SELECT EVENT_NAME FROM information_schema.events WHERE event_schema = ?`,
    [process.env.DB_NAME]
  );
  let sql = "";
  for (const ev of events) {
    const [rows] = await poolPromise.execute(
      `SHOW CREATE EVENT \`${process.env.DB_NAME}\`.\`${ev.EVENT_NAME}\``
    );
    const def = rows[0]["Create Event"] ?? rows[0].Create_Event;
    if (def) sql += `\n${stripDefiner(def)};\n`;
  }
  return sql;
};


/* ===============================
   FALLBACK: Exportar SPs manualmente
   Se activa cuando mysqldump no puede exportarlos
   por restricciones de DEFINER en Aiven.
================================ */

const getStoredProceduresFallback = async () => {
  // Forzar sesión sin ANSI_QUOTES para que SHOW CREATE PROCEDURE
  // emita backticks en lugar de comillas dobles
  await poolPromise.execute(
    `SET SESSION sql_mode = REPLACE(@@sql_mode, 'ANSI_QUOTES', '')`
  );

  const [procedures] = await poolPromise.execute(
    `SELECT ROUTINE_NAME
     FROM information_schema.routines
     WHERE routine_schema = ?
       AND routine_type   = 'PROCEDURE'`,
    [process.env.DB_NAME]
  );

  if (procedures.length === 0) {
    console.log("[Backup] No se encontraron Stored Procedures en information_schema.");
    return "";
  }

  console.log(`[Backup] Exportando ${procedures.length} SP(s) manualmente (fallback)…`);

  let sql =
    "\n-- =============================================\n" +
    "-- Stored Procedures (extracción manual fallback)\n" +
    "-- =============================================\n";

  for (const proc of procedures) {
    try {
      const [rows] = await poolPromise.execute(
        `SHOW CREATE PROCEDURE \`${process.env.DB_NAME}\`.\`${proc.ROUTINE_NAME}\``
      );

      const raw = rows[0]?.["Create Procedure"] ?? rows[0]?.Create_Procedure ?? null;

      if (!raw) {
        console.warn(`[Backup] SP sin definición legible: ${proc.ROUTINE_NAME}`);
        continue;
      }

      // Limpiar DEFINER y normalizar comillas por si la sesión aún las emite
      const clean = fixAnsiQuotes(stripDefiner(raw));

      sql += `\nDROP PROCEDURE IF EXISTS \`${proc.ROUTINE_NAME}\`;\n`;
      sql += `DELIMITER $$\n${clean}$$\nDELIMITER ;\n`;

    } catch (err) {
      // No interrumpir el backup completo por un SP individual problemático
      console.error(
        `[Backup] Error exportando SP '${proc.ROUTINE_NAME}': ${err.message}`
      );
    }
  }

  return sql;
};


/* ===============================
   FILTRADO DE TABLAS EXCLUIDAS
================================ */

const filterSQL = (sql, excludedTables) => {
  const lines = sql.split("\n");
  let skip         = false;
  let currentTable = null;

  return lines
    .filter((line) => {
      // Detectar inicio de bloque de tabla — soporta backticks y comillas dobles
      const tableMatch = line.match(/-- Table structure for table [`"](.+?)[`"]/);
      if (tableMatch) {
        currentTable = tableMatch[1];
        skip = excludedTables.includes(currentTable);
      }

      // Detectar INSERT INTO — soporta backticks y comillas dobles
      const insertMatch = line.match(/INSERT INTO [`"](.+?)[`"]/);
      if (insertMatch) {
        currentTable = insertMatch[1];
        skip = excludedTables.includes(currentTable);
      }

      return !skip;
    })
    .join("\n");
};


/* ===============================
   GENERAR SQL COMPLETO
================================ */

const buildFullSQL = async () => {
  // ─── 1. Dump principal con mysqldump ───────────────────────────────────────
  const dump = await mysqldump({
    connection: {
      host:     process.env.DB_HOST,
      user:     process.env.DB_USER_BACKUP,
      password: process.env.DB_PASS_BACKUP,
      database: process.env.DB_NAME,
      port:     process.env.DB_PORT,
    },
    dump: {
      trigger:  true,  // exportar triggers
      routines: true,  // exportar SPs y funciones (puede quedar vacío en Aiven por permisos)
    },
  });

  // ─── 2. Normalizar ANSI_QUOTES ────────────────────────────────────────────
  // Aiven activa ANSI_QUOTES globalmente: el dump llega con "tabla"/"columna"
  // en lugar de `tabla`/`columna`. fixAnsiQuotes convierte a backticks para
  // que el dump sea reimportable en cualquier entorno MySQL estándar.
  const schemaNorm   = fixAnsiQuotes(dump.dump.schema   ?? "");
  const dataNorm     = fixAnsiQuotes(dump.dump.data     ?? "");
  const routinesNorm = fixAnsiQuotes(dump.dump.routines ?? "");
  const triggersNorm = fixAnsiQuotes(dump.dump.trigger  ?? "");

  // ─── 3. Filtrar tablas excluidas ───────────────────────────────────────────
  const schemaFiltered = filterSQL(schemaNorm, EXCLUDED_TABLES);
  const dataFiltered   = filterSQL(dataNorm,   EXCLUDED_TABLES);

  // ─── 4. Limpiar DEFINER para compatibilidad con Aiven ─────────────────────
const routinesClean = fixAnsiQuotes(stripDefiner(routinesNorm));
const triggersClean = fixAnsiQuotes(stripDefiner(triggersNorm));

  // ─── 5. Verificar SPs; activar fallback manual si mysqldump no los capturó ─
  const spCount = (routinesClean.match(/CREATE\s+PROCEDURE/gi) ?? []).length;
  const fnCount = (routinesClean.match(/CREATE\s+FUNCTION/gi)  ?? []).length;
  console.log(`[Backup] Elementos en dump principal — SPs: ${spCount} | Funciones: ${fnCount}`);

  let extraRoutinesSQL = "";
  if (spCount === 0) {
    console.warn(
      "[Backup] ⚠ mysqldump no capturó SPs — activando extracción manual (fallback)"
    );
    extraRoutinesSQL = await getStoredProceduresFallback();
  }

const wrapWithDelimiter = (sql) => {
  if (!sql || !sql.trim()) return "";
  return `DELIMITER $$\n${sql}\n$$\nDELIMITER ;`;
};

  // ─── 6. Ensamblar SQL final ────────────────────────────────────────────────
  // El encabezado desactiva ANSI_QUOTES durante la importación para que los
  // backticks del dump funcionen correctamente en cualquier servidor MySQL.
  const finalSQL = [
    "-- =============================================",
    `-- Respaldo: ${process.env.DB_NAME}`,
    `-- Generado: ${formatDateTimeSql(getMexicoDate())} (hora México)`,
    "-- =============================================",
    "",
    "SET @OLD_SQL_MODE = @@SQL_MODE;",
    "SET SQL_MODE = REPLACE(REPLACE(@@SQL_MODE, 'ANSI_QUOTES', ''), ',,', ',');",
    "SET FOREIGN_KEY_CHECKS = 0;",
    "",
    "-- Estructura de tablas",
    schemaFiltered,
    "",
    "-- Datos",
    dataFiltered,
    "",
    "-- Triggers",
    wrapWithDelimiter(triggersClean),
    "",
    "-- Rutinas (funciones y procedimientos almacenados)",
    routinesClean,
    extraRoutinesSQL,
    "",
    "SET FOREIGN_KEY_CHECKS = 1;",
    "SET SQL_MODE = @OLD_SQL_MODE;",
  ].join("\n");

  // ─── 7. Log de validación post-build ──────────────────────────────────────
  const stats = {
    tablas:     (finalSQL.match(/CREATE\s+TABLE/gi)     ?? []).length,
    vistas:     (finalSQL.match(/CREATE\s+VIEW/gi)      ?? []).length,
    procedures: (finalSQL.match(/CREATE\s+PROCEDURE/gi) ?? []).length,
    functions:  (finalSQL.match(/CREATE\s+FUNCTION/gi)  ?? []).length,
    triggers:   (finalSQL.match(/CREATE\s+TRIGGER/gi)   ?? []).length,
  };

  console.log("[Backup] Elementos incluidos en el dump:", stats);

  if (stats.procedures === 0) {
    console.error(
      "[Backup] ⚠ ALERTA: No se exportaron Stored Procedures. " +
      "Verifica el permiso SHOW_ROUTINE para el usuario de backup en Aiven."
    );
  }

  return stripDefiner(finalSQL);
};


/* ===============================
   BACKUP COMPLETO → CLOUDINARY
================================ */

const backupDatabase = async (origen = "manual") => {
  const sql      = await buildFullSQL();
  const baseName = buildFileName("database", null, origen);
  const url      = await uploadToCloudinary(sql, baseName, origen);
  const fileName = `${baseName}.zip`;
  return { fileName, url };
};


/* ===============================
   BACKUP DE TABLA → CLOUDINARY
================================ */

const backupTable = async (table, origen = "manual") => {
  const dump = await mysqldump({
    connection: {
      host:     process.env.DB_HOST,
      user:     process.env.DB_USER_BACKUP,
      password: process.env.DB_PASS_BACKUP,
      database: process.env.DB_NAME,
      port:     process.env.DB_PORT,
    },
    dump: { tables: [table] },
  });

  // Aplicar corrección de ANSI_QUOTES también en backups de tabla individual
  const sql =
    fixAnsiQuotes(dump.dump.schema ?? "") +
    "\n" +
    fixAnsiQuotes(dump.dump.data ?? "");

  const baseName = buildFileName("table", table, origen);
  const url      = await uploadToCloudinary(sql, baseName, origen);
  const fileName = `${baseName}.zip`;
  return { fileName, url };
};


/* ===============================
   TABLAS DISPONIBLES PARA RESPALDO
================================ */

const getBackupTables = async () => {
  const [rows] = await poolPromise.execute(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = ?`,
    [process.env.DB_NAME]
  );

  return rows
    .map((r) => r.TABLE_NAME ?? r.table_name)
    .filter((t) => !EXCLUDED_TABLES.includes(t));
};


/* ===============================
   BACKUP AUTOMÁTICO
================================ */

const backupDatabaseAutomatic = async () => backupDatabase("automatico");


/* ===============================
   EXPORTS
================================ */

export default {
  backupDatabase,
  backupTable,
  getBackupTables,
  backupDatabaseAutomatic,
  enforceAutomaticBackupRetention,
};