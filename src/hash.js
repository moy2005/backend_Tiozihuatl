// hash.js (ESM)
import bcrypt from 'bcrypt';

const password = 'admin123';   // <- tu contraseña en claro
const saltRounds = 10;         // recomendado: 10-12

(async () => {
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('HASH:', hash);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
