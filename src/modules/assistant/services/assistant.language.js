/**
 * Procesamiento de lenguaje del asistente (español, sin dependencias externas).
 *
 * Convierte un mensaje libre en tokens comparables: quita acentos y signos,
 * reduce letras repetidas («holaaa»), expande abreviaturas y expresiones
 * informales («q», «xq», «info», «profe»), corrige erratas y palabras
 * recortadas contra un vocabulario conocido y obtiene la raíz de cada palabra
 * para que «préstamo», «prestamos» y «prestar» se reconozcan como lo mismo.
 */

// Palabras sin contenido para clasificar ni buscar.
export const STOPWORDS = new Set([
  "a", "al", "algo", "algun", "alguna", "alguno", "ante", "aqui", "asi", "cada", "como", "con",
  "cual", "cuales", "cuando", "de", "del", "desde", "donde", "el", "ella", "ellos", "en", "entre",
  "era", "es", "esa", "ese", "eso", "esta", "estan", "este", "esto", "estos", "fue", "ha", "hay",
  "la", "las", "le", "les", "lo", "los", "me", "mas", "mi", "mis", "muy", "nada", "ni", "no", "nos",
  "o", "otra", "otro", "para", "pero", "por", "porque", "que", "quien", "se", "ser", "si", "sin",
  "sobre", "son", "su", "sus", "tal", "tambien", "te", "ti", "tu", "tus", "un", "una", "unas",
  "uno", "unos", "y", "ya", "yo", "favor", "hola", "oye", "pues", "bueno", "entonces", "ahora",
]);

// Verbos de petición y relleno: no aportan el «qué» de una búsqueda.
export const REQUEST_WORDS = new Set([
  "ayuda", "ayudame", "ayudas", "busca", "buscame", "buscar", "busco", "consulta", "consultar",
  "dame", "decir", "dime", "encontrar", "encuentra", "encuentro", "explica", "explicame", "hablame",
  "informacion", "muestrame", "mostrar", "necesito", "puedes", "puedo", "quiero", "quisiera",
  "saber", "sabes", "tienen", "tienes", "ver", "ando", "buscando", "conseguir", "existe", "hay",
  "algun", "alguno", "alguna", "favor", "gracias", "porfa", "podrias", "seria", "recomiendas",
  "recomienda", "recomendar", "sugiere", "sugerir", "mira", "oye", "plis",
]);

// Abreviaturas y escritura informal habitual → forma completa.
const ABBREVIATIONS = new Map(Object.entries({
  q: "que", k: "que", ke: "que", qe: "que", xq: "porque", pq: "porque", pk: "porque", porq: "porque",
  xk: "porque", x: "por", tb: "tambien", tmb: "tambien", tmbn: "tambien", tambn: "tambien",
  d: "de", pa: "para", pra: "para", porfa: "favor", porfis: "favor", plis: "favor", pls: "favor",
  info: "informacion", inf: "informacion", profe: "profesor", prof: "profesor", mtro: "maestro",
  mtra: "maestra", biblio: "biblioteca", bibl: "biblioteca", cel: "telefono", tel: "telefono",
  msj: "mensaje", dnd: "donde", dnde: "donde", cm: "como", cmo: "como", komo: "como", kiero: "quiero",
  kero: "quiero", aki: "aqui", ola: "hola", holi: "hola", holis: "hola", grax: "gracias",
  grs: "gracias", grcs: "gracias", thx: "gracias", pass: "contrasena", psw: "contrasena",
  pwd: "contrasena", contra: "contrasena", mail: "correo", email: "correo", sem: "semestre",
  vdd: "verdad", ntp: "tranquilo", bn: "bien", tqm: "gracias", xfa: "favor", xfavor: "favor",
  wey: "", we: "", guey: "", wei: "", oie: "oye", nel: "no", simon: "si", sip: "si", sep: "si",
  nop: "no", ps: "pues", pos: "pues", ora: "ahora", cuanto: "cuanto", lib: "libro", libs: "libros",
  apunts: "apuntes", mats: "materiales", matl: "material", calen: "calendario", cal: "calendario",
  vacas: "vacaciones", examen: "examen", clase: "clase",
}));

// Sufijos que se retiran para obtener la raíz (del más largo al más corto).
const SUFFIXES = [
  "amientos", "imientos", "aciones", "uciones", "amiento", "imiento", "adoras", "adores",
  "aremos", "eremos", "iremos", "abamos", "iamos", "acion", "ucion", "mente", "adora", "ador",
  "ancia", "encia", "ando", "iendo", "aron", "ieron", "adas", "idas", "ados", "idos",
  "amos", "emos", "imos", "aban", "aria", "eria", "iria", "ada", "ida", "ado", "ido",
  "aba", "ian", "ar", "er", "ir", "es", "os", "as", "a", "o", "e", "s",
];

const stripAccents = (value) => value.normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Minúsculas, sin acentos ni signos, letras repetidas reducidas. */
export const normalizeText = (value = "") =>
  stripAccents(String(value))
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/([a-z])\1{2,}/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

/** Raíz aproximada de una palabra en español. */
export const stem = (word) => {
  if (!word || word.length <= 4 || /^\d+$/.test(word)) return word;
  for (const suffix of SUFFIXES) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 4) {
      return word.slice(0, -suffix.length);
    }
  }
  return word;
};

/** Dos raíces son compatibles si son iguales o una empieza por la otra (mín. 4 letras). */
export const stemsMatch = (a, b) => {
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.length >= 4 && long.startsWith(short);
};

/** Distancia de edición con transposiciones (Damerau–Levenshtein restringida). */
export const editDistance = (a, b, max = 3) => {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d = Array.from({ length: rows }, (_, i) => [i, ...new Array(cols - 1).fill(0)]);
  for (let j = 0; j < cols; j += 1) d[0][j] = j;
  for (let i = 1; i < rows; i += 1) {
    let rowMin = Infinity;
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
      rowMin = Math.min(rowMin, d[i][j]);
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length][b.length];
};

/**
 * Vocabulario de referencia para corregir palabras. Se construye con el texto
 * de la base de conocimiento y se amplía con términos de la base de datos
 * (títulos, materias, autores), así «anatomya» se corrige a «anatomia».
 */
export class Vocabulary {
  constructor(words = []) {
    this.frequency = new Map();
    // Forma escrita original (con acentos) de cada palabra normalizada, para mostrarla.
    this.display = new Map();
    this.add(words);
  }

  add(words = []) {
    for (const raw of words) {
      for (const token of String(raw || "").toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
        const word = normalizeText(token);
        if (word.length < 3 || /^\d+$/.test(word) || word.includes(" ")) continue;
        this.frequency.set(word, (this.frequency.get(word) || 0) + 1);
        if (token !== word && !this.display.has(word)) this.display.set(word, token);
      }
    }
    return this;
  }

  has(word) {
    return this.frequency.has(word);
  }

  /** Palabra tal como se escribe («farmacologia» → «farmacología»). */
  displayOf(word) {
    return this.display.get(word) || word;
  }

  /** Devuelve la palabra corregida o la original si no hay un candidato fiable. */
  correct(word) {
    if (word.length < 4 || this.has(word) || /\d/.test(word) || STOPWORDS.has(word)) return word;

    const maxDistance = word.length >= 8 ? 2 : 1;
    let best = null;
    for (const [candidate, freq] of this.frequency) {
      if (Math.abs(candidate.length - word.length) > maxDistance) continue;
      const distance = editDistance(word, candidate, maxDistance);
      if (distance > maxDistance) continue;
      if (!best || distance < best.distance || (distance === best.distance && freq > best.freq)) {
        best = { word: candidate, distance, freq };
      }
    }
    if (best) return best.word;

    // Palabra recortada («prest», «calend», «farmaco»): completa con el
    // candidato más frecuente que empieza igual.
    if (word.length >= 5) {
      let completion = null;
      for (const [candidate, freq] of this.frequency) {
        if (candidate.length > word.length && candidate.startsWith(word)) {
          if (!completion || freq > completion.freq) completion = { word: candidate, freq };
        }
      }
      if (completion) return completion.word;
    }
    return word;
  }
}

/**
 * Analiza un mensaje y devuelve:
 *  - text: texto normalizado y corregido (para patrones),
 *  - words: palabras corregidas,
 *  - content: palabras con contenido (sin relleno),
 *  - stems: raíces de las palabras con contenido.
 */
export const analyze = (message, vocabulary) => {
  const words = normalizeText(message)
    .split(" ")
    .filter(Boolean)
    .map((word) => (ABBREVIATIONS.has(word) ? ABBREVIATIONS.get(word) : word))
    .flatMap((word) => word.split(" "))
    .filter(Boolean)
    .map((word) => (vocabulary ? vocabulary.correct(word) : word));

  const content = words.filter((word) => word.length > 1 && !STOPWORDS.has(word));
  return {
    text: words.join(" "),
    words,
    content,
    stems: [...new Set(content.map(stem))],
  };
};

/** Palabras útiles para buscar en la base de datos (sin verbos de petición). */
export const searchTermsFrom = (content = [], exclude = new Set()) =>
  [...new Set(content)]
    .filter((word) => word.length > 2 && !REQUEST_WORDS.has(word) && !exclude.has(stem(word)))
    .slice(0, 5);
