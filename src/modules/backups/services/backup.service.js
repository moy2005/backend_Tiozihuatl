import mysqldump from "mysqldump";
import { poolAdmin } from "../../../config/dbPools/poolAdmin.config.js";
import { poolBackup } from "../../../config/dbPools/poolBackup.config.js";
import cloudinary from "../../../config/cloudinary.js";
import JSZip from "jszip";

const getTimestamp = () => {
  // Usar hora UTC-6 (México Centro) para el nombre del archivo
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
  const fecha =
    now.getFullYear() + "-" +
    String(now.getMonth() + 1).padStart(2, "0") + "-" +
    String(now.getDate()).padStart(2, "0");
  const hora =
    String(now.getHours()).padStart(2, "0") + "-" +
    String(now.getMinutes()).padStart(2, "0") + "-" +
    String(now.getSeconds()).padStart(2, "0");
  return `${fecha}_${hora}`;
};


const buildFileName = (scope, table = null, origen = "manual") => {
  if (scope === "database") {
    return `${process.env.DB_NAME}_full_${origen}_${getTimestamp()}`;
  }
  if (scope === "table") {
    return `${process.env.DB_NAME}_table_${table}_${origen}_${getTimestamp()}`;
  }
};


/* ===============================
   HELPER: SQL → ZIP → Cloudinary
================================ */

const uploadToCloudinary = async (sql, baseName, origen) => {

  const zip = new JSZip();
  zip.file(`${baseName}.sql`, sql);
  const zipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });

  const subcarpeta = origen === "automatico" ? "Automaticos" : "Manuales";
  console.log("uploadToCloudinary → origen:", origen, "| subcarpeta:", subcarpeta, "| folder:", `Respaldos_Base_de_Datos/${subcarpeta}`);
  const base64     = zipBuffer.toString("base64");

  const upload = await cloudinary.uploader.upload(
    `data:application/zip;base64,${base64}`,
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
   RUTINAS, FUNCIONES, SPs, VISTAS, EVENTOS
   (sin cambios)
================================ */

const getRoutines = async () => {
  await poolBackup.execute(`SET SESSION sql_mode = REPLACE(@@sql_mode,'ANSI_QUOTES','')`);
  const [routines] = await poolBackup.execute(
    `SELECT ROUTINE_NAME, ROUTINE_TYPE FROM information_schema.routines WHERE routine_schema = ?`,
    [process.env.DB_NAME]
  );
  let sql = "";
  for (const routine of routines) {
    const type = routine.ROUTINE_TYPE;
    const [rows] = await poolBackup.execute(
      `SHOW CREATE ${type} \`${process.env.DB_NAME}\`.\`${routine.ROUTINE_NAME}\``
    );
    const definition = rows[0][`Create ${type}`] || rows[0][`Create_${type}`];
    if (!definition) continue;
    sql += `\nDELIMITER $$\n${definition}$$\nDELIMITER ;\n`;
  }
  return sql;
};

const getFunctions = async () => {
  await poolBackup.execute(`SET SESSION sql_mode = REPLACE(@@sql_mode,'ANSI_QUOTES','')`);
  const [functions] = await poolBackup.execute(
    `SELECT ROUTINE_NAME FROM information_schema.routines WHERE routine_schema = ? AND routine_type = 'FUNCTION'`,
    [process.env.DB_NAME]
  );
  let sql = "";
  for (const fn of functions) {
    const [rows] = await poolBackup.execute(
      `SHOW CREATE FUNCTION \`${process.env.DB_NAME}\`.\`${fn.ROUTINE_NAME}\``
    );
    const definition = rows[0]["Create Function"] || rows[0].Create_Function;
    if (!definition) continue;
    sql += `\nDELIMITER $$\n${definition}$$\nDELIMITER ;\n`;
  }
  return sql;
};

const getStoredProcedures = async () => {
  await poolBackup.execute(`SET SESSION sql_mode = REPLACE(@@sql_mode,'ANSI_QUOTES','')`);
  const [procedures] = await poolBackup.execute(
    `SELECT ROUTINE_NAME FROM information_schema.routines WHERE routine_schema = ? AND routine_type = 'PROCEDURE'`,
    [process.env.DB_NAME]
  );
  let sql = "";
  for (const proc of procedures) {
    const [rows] = await poolBackup.execute(
      `SHOW CREATE PROCEDURE \`${process.env.DB_NAME}\`.\`${proc.ROUTINE_NAME}\``
    );
    const definition = rows[0]["Create Procedure"] || rows[0].Create_Procedure;
    if (!definition) {
      console.warn("SP sin definición:", proc.ROUTINE_NAME);
      continue;
    }
    sql += `\nDELIMITER $$\n${definition}$$\nDELIMITER ;\n`;
  }
  return sql;
};

const getViews = async () => {
  const [views] = await poolBackup.execute(
    `SELECT TABLE_NAME FROM information_schema.views WHERE table_schema = ?`,
    [process.env.DB_NAME]
  );
  let sql = "";
  for (const view of views) {
    const [rows] = await poolBackup.execute(
      `SHOW CREATE VIEW \`${process.env.DB_NAME}\`.\`${view.TABLE_NAME}\``
    );
    const definition = rows[0]["Create View"] || rows[0].Create_View;
    sql += `\n${definition};\n`;
  }
  return sql;
};

const getEvents = async () => {
  const [events] = await poolBackup.execute(
    `SELECT EVENT_NAME FROM information_schema.events WHERE event_schema = ?`,
    [process.env.DB_NAME]
  );
  let sql = "";
  for (const event of events) {
    const [rows] = await poolBackup.execute(
      `SHOW CREATE EVENT \`${process.env.DB_NAME}\`.\`${event.EVENT_NAME}\``
    );
    const definition = rows[0]["Create Event"] || rows[0].Create_Event;
    sql += `\n${definition};\n`;
  }
  return sql;
};


/* ===============================
   GENERAR SQL COMPLETO (interno)
================================ */

const buildFullSQL = async () => {
  await poolBackup.execute(`SET SESSION sql_mode = REPLACE(@@sql_mode, 'ANSI_QUOTES', '')`);

  const dump = await mysqldump({
    connection: {
      host:     process.env.DB_HOST,
      user:     process.env.DB_USER_BACKUP,
      password: process.env.DB_PASS_BACKUP,
      database: process.env.DB_NAME,
      port:     process.env.DB_PORT
    },
    dump: { trigger: true }
  });

  const proceduresSQL = await getStoredProcedures();
  const functionsSQL  = await getFunctions();
  const viewsSQL      = await getViews();
  const eventsSQL     = await getEvents();

  return (
    (dump.dump.schema  ?? "") + "\n" +
    (dump.dump.data    ?? "") + "\n" +
    (dump.dump.trigger ?? "") + "\n" +
    proceduresSQL + "\n" +
    functionsSQL  + "\n" +
    viewsSQL      + "\n" +
    eventsSQL
  );
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
      port:     process.env.DB_PORT
    },
    dump: { tables: [table] }
  });

  const sql      = (dump.dump.schema ?? "") + "\n" + (dump.dump.data ?? "");
  const baseName = buildFileName("table", table, origen);
  const url      = await uploadToCloudinary(sql, baseName, origen);
  const fileName = `${baseName}.zip`;
  return { fileName, url };
};


/* ===============================
   TABLAS PERMITIDAS
================================ */

const getBackupTables = async () => {
  const excludedTables = [
    "tokensrefresh",
    "tokens2fa",
    "sesionesjwt",
    "auditoriaeventos",
    "auditoria_compras",
    "recovery_links",
    "recovery_requests"
  ];

  const [rows] = await poolAdmin.execute(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = ?`,
    [process.env.DB_NAME]
  );

  return rows
    .map(r => r.TABLE_NAME)
    .filter(t => !excludedTables.includes(t));
};


/* ===============================
   BACKUP AUTOMÁTICO (alias limpio)
================================ */

const backupDatabaseAutomatic = async () => {
  return backupDatabase("automatico");
};


export default {
  backupDatabase,
  backupTable,
  getBackupTables,
  backupDatabaseAutomatic,
};