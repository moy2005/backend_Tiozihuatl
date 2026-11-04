/**
 * Alcance y moderación del asistente.
 *
 * Distingue entre:
 *  - lenguaje ofensivo (insultos, vulgaridades fuertes, contenido sexual explícito),
 *    resistente a ofuscaciones como «p3nd3jo» o «p u t o»;
 *  - expresiones coloquiales que no deben penalizarse («no manches», «chido», «wey»);
 *  - solicitudes fuera del propósito académico (deportes, entretenimiento, tareas
 *    generales…) y solicitudes de soporte o de contacto con personas, que el
 *    asistente no atiende.
 *
 * Los términos de anatomía y salud (por ejemplo «pene», «vagina», «sexual»)
 * no se consideran ofensivos: son vocabulario académico en un instituto de enfermería.
 */
import { normalizeText } from "./assistant.language.js";

const LEET = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", 8: "b", "@": "a", $: "s", "!": "i", "€": "e" };

/** Texto preparado para moderación: sin leetspeak ni letras separadas. */
export const deobfuscate = (message = "") => {
  const replaced = String(message)
    .toLowerCase()
    // Solo dígitos o símbolos pegados a letras («p3nd3jo»); «error 404» se conserva.
    .replace(/(?<=[a-zñ])[01345780@$!€]|[01345780@$!€](?=[a-zñ])/g, (char) => LEET[char] || char);
  // «p u t o», «p.u.t.o», «p-u-t-o» → «puto»
  const joined = replaced.replace(/\b(?:[a-zñ][\s.\-_*]){2,}[a-zñ]\b/g, (match) => match.replace(/[\s.\-_*]/g, ""));
  return normalizeText(joined);
};

// Insultos y vulgaridades fuertes (raíces; se comparan por palabra).
const OFFENSIVE = [
  /\bpendej\w*/, /\bidiota\w*/, /\bimbecil\w*/, /\bestupid\w*/, /\bputo\b/, /\bputa\b/, /\bputos\b/,
  /\bputas\b/, /\bputit\w*/, /\bculer\w*/, /\bcabron\w*/, /\bmierd\w*/, /\bchingad\w*/,
  /\bchinga(?:s|r|n|te|tu)?\b/, /\bverga\w*/, /\bmamon\w*/, /\bmamada\w*/, /\bjoto\w*/,
  /\bmaricon\w*/, /\bzorra\w*/, /\bperra\b/, /\bojete\w*/, /\bmalparid\w*/, /\bhijo de (?:la )?puta\b/,
  /\bhdp\b/, /\bptm\b/, /\bctm\b/, /\bpinche (?:bot|asistente|maquina|robot)\b/, /\bnaco\b/,
  /\bretrasad[oa]\b/, /\bsubnormal\w*/, /\bgilipollas\b/, /\bmarica\b/,
];

// Insulto dirigido al asistente aunque use palabras suaves («eres un inútil»).
const DIRECTED_INSULT = /\b(?:eres|estas|que) (?:un |una |bien |muy )?(?:inutil|tonto|tonta|tarado|tarada|basura|bruto|menso|mensa|burro|baboso|torpe|lento|pesimo)\b/;

// Contenido sexual explícito (no anatomía).
const SEXUAL = [/\bporno\w*/, /\bpornograf\w*/, /\bxxx\b/, /\bnudes?\b/, /\bpack\b/, /\bdesnud[oa]s\b/, /\bcachond\w*/, /\bsexting\b/];

// Coloquialismos que no se penalizan (se ignoran al interpretar).
export const COLLOQUIAL = /\b(?:no manches|no mames|que onda|chido|chida|padre|neta|chale|orale|a poco|que pedo|wey|guey|cuate|chamba|ahorita)\b/g;

// Muletillas vulgares leves: no se penalizan solas, pero se ignoran al interpretar.
const FILLER_VULGAR = /\b(?:pinche|pinches|pinchi|que pedo)\b/g;

// Soporte técnico, incidencias o contacto con personas: fuera del alcance.
const SUPPORT = [
  /\b(?:reportar|reporte|levantar un reporte|incidencia|queja|quejarme|soporte tecnico|mesa de ayuda)\b/,
  /\b(?:hablar|comunicarme|contactar|contacto) (?:con )?(?:alguien|una persona|un humano|un asesor|un agente|soporte|el instituto|la escuela|direccion|servicios escolares)\b/,
  /\b(?:numero|telefono|whatsapp|correo) (?:de|del|para) (?:contacto|soporte|el instituto|la escuela)\b/,
  /\b(?:quiero|necesito) (?:una persona|un humano|un asesor|atencion humana)\b/,
];

// Reportes de fallas o incidencias técnicas: el asistente no las atiende.
const MALFUNCTION = /\b(?:no (?:me |nos |le )?(?:funciona|sirve|carga|abre|jala|deja entrar)|se cayo|se trabo|se traba|se congela|pagina en blanco|error \d{3}|bug|falla del sistema|esta caido|esta caida|marca error|sale un error|me sale error)\b/;

// Temas ajenos al propósito académico de la plataforma.
const OFF_TOPIC = [
  /\b(?:futbol|partido|liga|mundial|america|chivas|pumas|basquet|beisbol|nba|nfl|apuesta\w*)\b/,
  /\b(?:pelicula\w*|serie\w*|netflix|anime|cancion\w*|musica|cantante|reggaeton|concierto)\b/,
  /\b(?:videojuego\w*|fortnite|minecraft|free fire|roblox|xbox|playstation|nintendo)\b/,
  /\b(?:receta\w*|cocinar|comida rapida|pizza|hamburguesa|tacos)\b/,
  /\b(?:clima|lluvia|temperatura de hoy|pronostico)\b/,
  /\b(?:novia|novio|ligar|crush|cita romantica|enamorad\w*)\b/,
  /\b(?:chiste\w*|adivinanza\w*|cuentame algo|aburrido|aburrida)\b/,
  /\b(?:bitcoin|cripto\w*|dolar|inversion\w*|acciones de la bolsa)\b/,
  /\b(?:politica|presidente|elecciones|partido politico|diputado|senador)\b/,
  /\b(?:horoscopo|signo zodiacal|tarot|astrologia)\b/,
  /\b(?:escribe(?:me)? un (?:poema|cuento|ensayo|codigo|programa)|hazme la tarea|resuelve (?:mi|la) tarea|traduce\w*|programa en|codigo en python|javascript)\b/,
  /\b(?:capital de|quien gano|cuanto es \d|cuantos anos tienes|donde vives|tienes novia|eres humano)\b/,
];

/**
 * Evalúa el mensaje. Devuelve:
 *  - offensive: insulto, vulgaridad fuerte o contenido sexual explícito.
 *  - support: pide soporte, reportar fallas o contactar a una persona.
 *  - malfunction: describe una falla técnica (siempre fuera del alcance).
 *  - offTopic: tema ajeno (se confirma solo si el mensaje no tiene intención académica).
 *  - cleaned: mensaje sin coloquialismos, listo para interpretarse.
 */
export const assessScope = (message = "") => {
  const plain = deobfuscate(message);
  const offensive = OFFENSIVE.some((rx) => rx.test(plain)) || DIRECTED_INSULT.test(plain) || SEXUAL.some((rx) => rx.test(plain));
  const malfunction = MALFUNCTION.test(plain);
  const support = malfunction || SUPPORT.some((rx) => rx.test(plain));
  const offTopic = OFF_TOPIC.some((rx) => rx.test(plain));
  // Para interpretar se retiran coloquialismos y groserías: no aportan al tema.
  const cleaned = OFFENSIVE.reduce(
    (text, rx) => text.replace(new RegExp(rx.source, "g"), " "),
    normalizeText(message).replace(COLLOQUIAL, " ").replace(FILLER_VULGAR, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
  return { offensive, support, malfunction, offTopic, cleaned };
};
