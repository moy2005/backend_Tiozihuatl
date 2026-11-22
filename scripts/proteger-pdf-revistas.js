/**
 * Protege en Cloudinary los PDF de revistas que se subieron como públicos
 * (YenniferM098/tiozihuatl-mobile#197).
 *
 * Cambia cada PDF de `upload` (cualquiera lo abre con su dirección) a `authenticated`
 * (solo se abre con la firma que genera el backend). El identificador no cambia, así que
 * la base de datos no se modifica: solo se lee la tabla `revistas`.
 *
 * Uso, desde la raíz del backend y con el .env de producción:
 *   node scripts/proteger-pdf-revistas.js            # solo muestra qué haría
 *   node scripts/proteger-pdf-revistas.js --aplicar  # mueve los PDF
 *
 * Se puede repetir: los PDF que ya están protegidos se omiten.
 */
import cloudinary from '../src/config/cloudinary.js';
import { poolPromise } from '../src/config/db.config.js';

const aplicar = process.argv.includes('--aplicar');
const cleanId = (id) => String(id || '').trim().replace(/\.pdf$/i, '');

/** Tipo de entrega actual del archivo en Cloudinary, o null si no existe. */
async function tipoActual(publicId) {
  for (const type of ['authenticated', 'upload']) {
    try {
      await cloudinary.api.resource(publicId, { resource_type: 'image', type });
      return type;
    } catch (error) {
      const status = error?.error?.http_code ?? error?.http_code;
      if (status !== 404) throw error;
    }
  }
  return null;
}

const resumen = { protegidas: 0, yaProtegidas: 0, noEncontradas: 0, errores: 0 };

try {
  const [revistas] = await poolPromise.query(
    `SELECT id_revista, titulo, pdf_public_id
       FROM revistas
      WHERE pdf_public_id IS NOT NULL AND pdf_public_id <> ''
      ORDER BY id_revista`,
  );
  console.log(`${revistas.length} revistas con PDF. Modo: ${aplicar ? 'APLICAR' : 'solo revisar (usa --aplicar para mover)'}\n`);

  for (const revista of revistas) {
    const id = cleanId(revista.pdf_public_id);
    const nombre = `#${revista.id_revista} ${revista.titulo}`;
    try {
      const tipo = await tipoActual(id);
      if (tipo === 'authenticated') {
        resumen.yaProtegidas++;
        console.log(`= ${nombre}: ya protegida`);
      } else if (tipo === null) {
        resumen.noEncontradas++;
        console.log(`? ${nombre}: el PDF no existe en Cloudinary (${id})`);
      } else if (!aplicar) {
        resumen.protegidas++;
        console.log(`> ${nombre}: se protegería`);
      } else {
        // invalidate borra las copias en caché de la dirección pública anterior.
        await cloudinary.uploader.rename(id, id, {
          resource_type: 'image',
          type: 'upload',
          to_type: 'authenticated',
          invalidate: true,
        });
        resumen.protegidas++;
        console.log(`✓ ${nombre}: protegida`);
      }
    } catch (error) {
      resumen.errores++;
      console.error(`✗ ${nombre}: ${error?.error?.message ?? error?.message ?? error}`);
    }
  }

  console.log(`\n${aplicar ? 'Protegidas' : 'Por proteger'}: ${resumen.protegidas} | Ya protegidas: ${resumen.yaProtegidas} | No encontradas: ${resumen.noEncontradas} | Errores: ${resumen.errores}`);
  process.exitCode = resumen.errores ? 1 : 0;
} finally {
  await poolPromise.end();
}
