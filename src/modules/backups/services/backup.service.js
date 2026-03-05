import mysqldump from "mysqldump";
import { poolAdmin } from "../../../config/dbPools/poolAdmin.config.js";
import cloudinary from "../../../config/cloudinary.js";

const getTimestamp = () => {

  const now = new Date();

  const fecha =
    now.getFullYear() + "-" +
    String(now.getMonth() + 1).padStart(2,"0") + "-" +
    String(now.getDate()).padStart(2,"0");

  const hora =
    String(now.getHours()).padStart(2,"0") + "-" +
    String(now.getMinutes()).padStart(2,"0") + "-" +
    String(now.getSeconds()).padStart(2,"0");

  return `${fecha}_${hora}`;

};


const buildFileName = (scope, table = null, origen = "manual") => {

  if(scope === "database"){

    return `${process.env.DB_NAME}_full_${origen}_${getTimestamp()}.sql`;

  }

  if(scope === "table"){

    return `${process.env.DB_NAME}_table_${table}_${origen}_${getTimestamp()}.sql`;

  }

};


const backupDatabase = async (origen = "manual") => {

  const dump = await mysqldump({

    connection: {
      host: process.env.DB_HOST,
      user: process.env.DB_USER_BACKUP,
      password: process.env.DB_PASS_BACKUP,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    }

  });

  const sql =
    dump.dump.schema +
    "\n" +
    dump.dump.data;

  const fileName =
    buildFileName("database", null, origen);

  return { sql, fileName };

};


const backupTable = async (table, origen = "manual") => {

  const dump = await mysqldump({

    connection: {
      host: process.env.DB_HOST,
      user: process.env.DB_USER_BACKUP,
      password: process.env.DB_PASS_BACKUP,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    },

    dump: {
      tables: [table]
    }

  });

  const sql =
    dump.dump.schema +
    "\n" +
    dump.dump.data;

  const fileName =
    buildFileName("table", table, origen);

  return { sql, fileName };

};


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
    `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = ?
    `,
    [process.env.DB_NAME]
  );

  const tables = rows
    .map(r => r.TABLE_NAME)
    .filter(t => !excludedTables.includes(t));

  return tables;

};


/* ===============================
   BACKUP AUTOMÁTICO (CLOUDINARY)
================================ */

const backupDatabaseAutomatic = async () => {
  const { sql, fileName } = await backupDatabase("automatico");

  let url = null;

  try {
    const upload = await cloudinary.uploader.upload(
      `data:text/plain;base64,${Buffer.from(sql).toString("base64")}`,
      {
        resource_type: "raw",
        public_id: `backups/${fileName}`,
        use_filename: true,
        unique_filename: false,
      }
    );
    url = upload.secure_url;
  } catch (cloudinaryError) {
    console.error("❌ Error subiendo a Cloudinary:", cloudinaryError.message);
    throw cloudinaryError; // propagar para que automation.service lo registre
  }

  return { fileName, url };
};


export default {
  backupDatabase,
  backupTable,
  getBackupTables,
  backupDatabaseAutomatic
};