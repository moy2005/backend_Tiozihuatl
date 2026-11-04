import {
  ASSISTANT_TOPICS,
  FALLBACK_SUGGESTIONS,
  ROUTE_TOPIC_MAP,
  STARTER_PROMPTS,
} from "../data/assistant.knowledge.js";
import { AssistantModel } from "../models/assistant.model.js";
import { Vocabulary, analyze, searchTermsFrom, stem, stemsMatch } from "./assistant.language.js";
import { assessScope } from "./assistant.scope.js";
import { buildIntentIndex, confidenceOf, rankIntents, topicStems } from "./assistant.intent.js";

/* ──────────────────────────────────────────────────────────────────────
   Recursos de lenguaje
   ────────────────────────────────────────────────────────────────────── */

const INTENT_INDEX = buildIntentIndex(ASSISTANT_TOPICS);
const TOPIC_BY_ID = new Map(ASSISTANT_TOPICS.map((topic) => [topic.id, topic]));

// Vocabulario académico y de conversación que ayuda a corregir erratas.
const DOMAIN_WORDS = [
  "anatomía fisiología farmacología enfermería microbiología bioquímica patología pediatría",
  "ginecología obstetricia nutrición psicología ética bioética salud comunitaria quirúrgica",
  "cuidados auxilios primeros clínica hospital paciente medicina semiología epidemiología",
  "materia materias semestre examen practica practicas tarea apuntes guia presentacion",
  "prestamo prestamos prestado prestados prestada presten prestan vence vencimiento devolver devolucion renovar matricula grupo carrera",
  "correo telefono datos nombre cuenta contrasena gracias adios hola quien eres como estas",
  "noticias eventos calendario vacaciones clases inicio fin congreso conferencia taller",
  "biblioteca libro libros autor titulo digital fisico disponible revista revistas tienda",
];

const BASE_VOCABULARY = [
  ...DOMAIN_WORDS,
  ...ASSISTANT_TOPICS.flatMap((topic) => [
    ...(topic.keywords || []),
    ...(topic.examples || []),
    topic.title,
  ]),
];

const VOCABULARY_TTL_MS = 15 * 60 * 1000;
let vocabulary = new Vocabulary(BASE_VOCABULARY);
let vocabularyLoadedAt = 0;

/** Amplía el vocabulario con títulos, materias y autores reales (en caché). */
const getVocabulary = async () => {
  if (Date.now() - vocabularyLoadedAt > VOCABULARY_TTL_MS) {
    vocabularyLoadedAt = Date.now();
    try {
      const terms = await AssistantModel.getVocabularyTerms();
      vocabulary = new Vocabulary(BASE_VOCABULARY).add(terms);
    } catch {
      /* Se conserva el vocabulario base. */
    }
  }
  return vocabulary;
};

// Palabras que describen el tipo de búsqueda o el tiempo, no el tema buscado.
const GENERIC_SEARCH_STEMS = new Set(
  [
    "libro", "libros", "material", "materiales", "noticia", "noticias", "evento", "eventos",
    "revista", "revistas", "tema", "temas", "sobre", "semana", "hoy", "manana", "mes", "proximo",
    "proximos", "reciente", "recientes", "ultimo", "ultimos", "ultimas", "nuevo", "nuevos",
    "disponible", "disponibles", "biblioteca", "catalogo", "clase", "clases", "pdf", "digital",
    "fisico", "algo", "cosa", "cosas", "mas", "otro", "otros", "opciones", "informacion",
    "tarea", "tareas", "apunte", "apuntes", "ayuda", "recurso", "recursos", "archivo", "archivos",
    "profesor", "profesora", "maestro", "maestra", "docente", "materia", "materias",
    // Verbos de acción que no describen el tema buscado.
    "veo", "ver", "abre", "abrir", "leo", "leer", "encuentro", "consigo", "conseguir", "reviso",
    "revisar", "aparece", "sale", "salen", "descargo", "descargar", "pido", "pedir", "uso", "usar",
    "hago", "hacer", "tengo", "funciona", "sirve", "checar", "checo",
  ].map(stem)
);

/* ──────────────────────────────────────────────────────────────────────
   Utilidades
   ────────────────────────────────────────────────────────────────────── */

const compact = (value, max = 240) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max).replace(/\s+\S*$/, "")}…` : text;
};

const plural = (count, singular, pluralForm = `${singular}s`) => (count === 1 ? singular : pluralForm);

/** Variante estable según el mensaje: evita repetir siempre la misma frase. */
const pick = (options, seed) => {
  let hash = 0;
  for (const char of String(seed)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return options[hash % options.length];
};

const formatDate = (value, withTime = false) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "America/Mexico_City",
  });
};

const routeAction = (label, route, icon) => ({ label, route, icon });

const dedupeActions = (actions = []) => {
  const seen = new Set();
  return actions.filter((action) => {
    const key = action.route || action.href || action.label;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// Términos entre comillas, con su escritura original (acentos incluidos).
const quote = (terms) => `«${terms.map((term) => vocabulary.displayOf(term)).join(" ")}»`;

/* ──────────────────────────────────────────────────────────────────────
   Contexto de la conversación
   ────────────────────────────────────────────────────────────────────── */

const sanitizeContext = (context = {}, authenticatedUser = null) => ({
  sessionId: compact(context.sessionId, 100),
  path: compact(context.path || context.route, 180),
  role: compact(authenticatedUser?.rol, 80) || null,
  history: (Array.isArray(context.history) ? context.history : [])
    .filter((item) => item && ["assistant", "user"].includes(item.sender))
    .slice(-12)
    .map((item) => ({
      sender: item.sender,
      text: compact(item.text, 300),
      intentId: compact(item.intentId, 80) || undefined,
      searchType: compact(item.searchType, 20) || undefined,
      searchTerms: (Array.isArray(item.searchTerms) ? item.searchTerms : [])
        .map((term) => compact(term, 40))
        .filter(Boolean)
        .slice(0, 5),
      shownIds: (Array.isArray(item.shownIds) ? item.shownIds : [])
        .map(Number)
        .filter(Number.isInteger)
        .slice(0, 60),
    })),
});

/** Último turno del asistente con un tema reconocible (para seguimientos). */
const previousTurn = (context) =>
  [...context.history].reverse().find((item) => item.sender === "assistant" && item.intentId) || null;

const FOLLOW_UP_START = /^(?:y|e|pero|tambien|entonces|ahora|y si|y de|y del|y para|y sobre|y en|y los|y las|y el|y la)\b/;
const REFERENCE = /\b(?:eso|esa|ese|esos|esas|ahi|alli|lo mismo|del mismo|de esa|de ese)\b/;
const MORE_REQUEST = /^(?:y\s+)?(?:hay\s+|dame\s+|muestrame\s+|ver\s+|tienes\s+|tienen\s+)?(?:mas|otros|otras|otro|otra|mas opciones|alguno mas|siguientes)(?:\s+(?:opciones|resultados))?$/;

const routeTopicId = (path) => {
  const route = String(path || "");
  return ROUTE_TOPIC_MAP.find((item) => route.startsWith(item.route))?.topicId || null;
};

/* ──────────────────────────────────────────────────────────────────────
   Conversación social
   ────────────────────────────────────────────────────────────────────── */

const SOCIAL = [
  {
    id: "assistant_identity",
    title: "Sobre el asistente",
    pattern: /\b(?:quien eres|que eres|como te llamas|eres (?:un |una )?(?:bot|robot|ia|inteligencia artificial|humano|persona|maquina))\b/,
    replies: [
      "Soy el asistente virtual del Instituto Tiozihuatl. Te ayudo con lo académico y con la plataforma: biblioteca, materiales, préstamos, eventos, noticias, calendario y tu cuenta.",
    ],
  },
  {
    id: "wellbeing",
    title: "Saludo",
    pattern: /^(?:hola\s+)?(?:como estas|como te va|como andas|que tal estas|todo bien)\b/,
    replies: ["¡Muy bien, gracias! ¿En qué te ayudo hoy?", "¡Todo bien por aquí! Cuéntame qué necesitas."],
  },
  {
    id: "gratitude",
    title: "Agradecimiento",
    pattern: /\b(?:gracias|te lo agradezco|te agradezco|muy amable|me sirvio|me ayudaste)\b/,
    maxWords: 7,
    replies: ["¡Con gusto! Si necesitas algo más, aquí estoy.", "¡De nada! Aquí sigo para lo que necesites."],
  },
  {
    id: "farewell",
    title: "Despedida",
    pattern: /^(?:adios|hasta luego|nos vemos|bye|chao|hasta pronto|me voy|hasta manana)\b/,
    replies: ["¡Hasta luego! Que te vaya muy bien.", "¡Nos vemos! Aquí estaré cuando lo necesites."],
  },
  {
    id: "confirmation",
    title: "Confirmación",
    pattern: /^(?:ok|okay|vale|va|entendido|perfecto|listo|de acuerdo|esta bien|claro|sale|si|ya)$/,
    replies: ["¡Perfecto! ¿Te ayudo con algo más?"],
  },
  {
    id: "greeting",
    title: "Saludo",
    pattern: /^(?:hola|buenos dias|buen dia|buenas tardes|buenas noches|buenas|que tal|hey|saludos)(?:\s+\w+)?$/,
    replies: [TOPIC_BY_ID.get("greeting").answer],
    suggestions: FALLBACK_SUGGESTIONS,
  },
];

const matchSocial = (analysis) => {
  const wordCount = analysis.words.length;
  return SOCIAL.find((item) => item.pattern.test(analysis.text) && (!item.maxWords || wordCount <= item.maxWords)) || null;
};

/* ──────────────────────────────────────────────────────────────────────
   Datos personales (solo con sesión validada por el servidor)
   ────────────────────────────────────────────────────────────────────── */

const PERSONAL_LOANS = /\b(?:mis prestamos|mi prestamo|tengo (?:algun |un |algunos )?prestamos?|tengo (?:libros? )?prestados?|libros? que (?:tengo|debo|pedi)|debo (?:algun |un )?libros?|cuando (?:vence|tengo que devolver|devuelvo|entrego)|mi fecha de (?:vencimiento|entrega|devolucion)|tengo que devolver)\b/;
const PERSONAL_PROFILE = /\b(?:mis datos|mi informacion|datos de mi cuenta|quien soy|como me llamo|cual es mi (?:nombre|correo|telefono|matricula|carrera|semestre|grupo|rol)|mi (?:nombre|correo|telefono|matricula|carrera|semestre|grupo|rol)\b|en que (?:semestre|grupo) (?:estoy|voy|ando)|que (?:carrera|semestre|grupo) (?:tengo|estudio|curso)|estado de mi cuenta)\b/;

const PROFILE_FIELDS = [
  { pattern: /\b(?:nombre|quien soy|como me llamo)\b/, title: "Nombre", value: (p) => [p.nombre, p.a_paterno, p.a_materno].filter(Boolean).join(" ") },
  { pattern: /\b(?:rol|quien soy)\b/, title: "Rol", value: (p) => p.rol },
  { pattern: /\bcorreo\b/, title: "Correo", value: (p) => p.correo },
  { pattern: /\btelefono\b/, title: "Teléfono", value: (p) => p.telefono },
  { pattern: /\bmatricula\b/, title: "Matrícula", value: (p) => p.matricula, student: true },
  { pattern: /\bcarrera\b/, title: "Carrera", value: (p) => p.carrera, student: true },
  { pattern: /\bsemestre\b/, title: "Semestre", value: (p) => p.semestre, student: true },
  { pattern: /\bgrupo\b/, title: "Grupo", value: (p) => p.grupo, student: true },
  { pattern: /\bestado de mi cuenta\b/, title: "Estado de la cuenta", value: (p) => p.estado },
];

const personalResponse = async (analysis, rawText, authenticatedUser) => {
  // Se revisa el texto corregido y el original, por si la corrección cambió una palabra.
  const texts = [analysis.text, rawText];
  const wantsLoans = texts.some((text) => PERSONAL_LOANS.test(text));
  const wantsProfile = !wantsLoans && texts.some((text) => PERSONAL_PROFILE.test(text));
  if (!wantsLoans && !wantsProfile) return null;

  const topic = wantsLoans
    ? { id: "personal_loans", title: "Mis préstamos", category: "Mi cuenta" }
    : { id: "personal_profile", title: "Mis datos", category: "Mi cuenta" };

  if (!authenticatedUser?.id_usuario) {
    return {
      topic,
      reply: "Para ver esa información necesitas iniciar sesión; así me aseguro de mostrarte solo tus propios datos.",
      actions: [routeAction("Iniciar sesión", "/login", "ph-sign-in")],
      suggestions: [{ label: "Olvidé mi contraseña", prompt: "Olvidé mi contraseña" }],
    };
  }

  const profile = await AssistantModel.getUserSummary(authenticatedUser.id_usuario);
  if (!profile) {
    return {
      topic,
      reply: "No pude consultar tu información en este momento. Puedes verla directamente en Mi perfil.",
      actions: [routeAction("Mi perfil", "/perfil", "ph-user")],
    };
  }

  const isStudent = String(profile.rol || "").toLowerCase() === "estudiante";

  if (wantsLoans) {
    if (!isStudent) {
      return {
        topic,
        reply: "Los préstamos personales se consultan con una cuenta de estudiante.",
        actions: [routeAction("Mi perfil", "/perfil", "ph-user")],
      };
    }

    const loans = await AssistantModel.getUserLoans(authenticatedUser.id_usuario, 5);
    const pending = loans.filter((loan) => !loan.fecha_devolucion);
    const overdue = pending.filter((loan) => loan.estado === "Vencido");
    const name = profile.nombre ? `${profile.nombre}, ` : "";

    let reply;
    if (!loans.length) reply = `${name}no tienes préstamos registrados. Si necesitas un libro, revisa que esté disponible y pídelo en la biblioteca.`;
    else if (!pending.length) reply = `${name}no tienes préstamos pendientes; estos son los más recientes que ya devolviste.`;
    else if (overdue.length) reply = `${name}tienes ${overdue.length} ${plural(overdue.length, "préstamo vencido", "préstamos vencidos")}. Te recomiendo devolverlo${overdue.length === 1 ? "" : "s"} pronto en la biblioteca.`;
    else reply = `${name}tienes ${pending.length} ${plural(pending.length, "préstamo activo", "préstamos activos")}.`;

    return {
      topic,
      reply,
      sections: loans.length
        ? [{
            title: "Tus préstamos",
            items: loans.map((loan) => ({
              title: loan.titulo,
              text: loan.fecha_devolucion
                ? `Devuelto el ${formatDate(loan.fecha_devolucion)}`
                : `Vence el ${formatDate(loan.fecha_vencimiento)}`,
              meta: loan.estado,
            })),
          }]
        : [],
      actions: [routeAction("Mis préstamos", "/my-loans", "ph-books")],
      suggestions: [{ label: "Buscar un libro", prompt: "Quiero buscar un libro" }],
    };
  }

  const wantsAll = /\b(?:mis datos|mi informacion|datos de mi cuenta)\b/.test(analysis.text);
  const items = PROFILE_FIELDS
    .filter((field) => (!field.student || isStudent) && (wantsAll || field.pattern.test(analysis.text)))
    .map((field) => ({ title: field.title, text: String(field.value(profile) || "").trim() }))
    .filter((item) => item.text);

  return {
    topic,
    reply: items.length
      ? items.length === 1
        ? `Tu ${items[0].title.toLowerCase()} es ${items[0].text}.`
        : `${profile.nombre ? `Claro, ${profile.nombre}. ` : ""}Estos son tus datos:`
      : "Ese dato no está registrado en tu cuenta. Puedes completarlo en Mi perfil.",
    sections: items.length > 1 ? [{ title: "Tu cuenta", items }] : [],
    actions: [routeAction("Mi perfil", "/perfil", "ph-user-gear")],
    suggestions: [{ label: "Mis préstamos", prompt: "¿Tengo préstamos activos?" }],
  };
};

/* ──────────────────────────────────────────────────────────────────────
   Preguntas frecuentes publicadas
   ────────────────────────────────────────────────────────────────────── */

const bestFaq = async (analysis) => {
  if (analysis.stems.length < 2) return null;
  const faqs = await AssistantModel.getFaqs();
  let best = null;
  for (const faq of faqs) {
    const questionStems = analyze(faq.pregunta, vocabulary).stems;
    if (questionStems.length < 2) continue;
    const matched = questionStems.filter((q) => analysis.stems.some((s) => stemsMatch(s, q))).length;
    const ratio = matched / questionStems.length;
    if (matched >= 2 && ratio >= 0.6 && (!best || ratio > best.ratio)) best = { faq, ratio };
  }
  return best;
};

/* ──────────────────────────────────────────────────────────────────────
   Respuestas con datos reales
   ────────────────────────────────────────────────────────────────────── */

const describeBook = (book) => {
  const authors = String(book.autores || "").split(";").map((a) => a.trim()).filter(Boolean);
  const authorText = authors.length ? authors.slice(0, 2).join(", ") + (authors.length > 2 ? " y otros" : "") : "";
  const physical = Number(book.tiene_fisico) === 1;
  const digital = Number(book.tiene_digital) === 1;
  const available = Number(book.disponibles || 0);
  const format = physical && digital
    ? `Físico (${available} ${plural(available, "disponible", "disponibles")}) y digital`
    : physical
      ? available > 0 ? `Físico, ${available} ${plural(available, "disponible", "disponibles")}` : "Físico, sin ejemplares disponibles por ahora"
      : digital ? "Digital" : "";
  return [authorText, format].filter(Boolean).join(" · ");
};

const SEARCHERS = {
  books: {
    run: (terms, opts) => AssistantModel.searchBooks(terms.map(stem), opts),
    id: (row) => row.id,
    section: "Libros",
    item: (row) => ({ title: row.titulo, text: describeBook(row), route: "/catalogo" }),
    found: (n, terms, seed) => terms.length
      ? pick([`Encontré ${n} ${plural(n, "libro")} sobre ${quote(terms)}:`, `Esto hay en la biblioteca sobre ${quote(terms)}:`], seed)
      : `Estos son algunos libros del catálogo:`,
    none: (terms) => `No encontré libros sobre ${quote(terms)} en el catálogo. Prueba con el nombre del autor o con una palabra más general.`,
    action: routeAction("Abrir biblioteca", "/catalogo", "ph-book-bookmark"),
    needsTerms: true,
  },
  materials: {
    run: (terms, opts) => AssistantModel.searchMaterials(terms.map(stem), opts),
    id: (row) => row.id_material,
    section: "Materiales",
    item: (row) => ({
      title: row.titulo,
      text: [row.tipo, row.nombre_docente ? `Docente: ${row.nombre_docente}` : "", row.materias].filter(Boolean).join(" · "),
      route: "/materiales",
    }),
    found: (n, terms, seed) => pick([`Encontré ${n} ${plural(n, "material", "materiales")} sobre ${quote(terms)}:`, `Esto publicaron los docentes sobre ${quote(terms)}:`], seed),
    none: (terms) => `No hay materiales publicados sobre ${quote(terms)} por ahora. Puedes revisar todos en Materiales.`,
    action: routeAction("Ver materiales", "/materiales", "ph-folder-open"),
    needsTerms: true,
  },
  news: {
    run: (terms, opts) => AssistantModel.searchNews(terms.map(stem), opts),
    id: (row) => row.id_noticia,
    section: "Noticias",
    item: (row) => ({ title: row.titulo, text: compact(row.contenido, 110), meta: formatDate(row.fecha_publicacion), route: `/noticias/${row.id_noticia}` }),
    found: (n, terms) => terms.length ? `Esto encontré en las noticias sobre ${quote(terms)}:` : "Estas son las noticias más recientes:",
    none: (terms, topic) => terms.length ? `No encontré noticias sobre ${quote(terms)}.` : topic.emptyAnswer,
    action: routeAction("Ver noticias", "/noticias", "ph-newspaper"),
  },
  events: {
    run: (terms, opts) => AssistantModel.searchEvents(terms.map(stem), opts),
    id: (row) => row.id_evento,
    section: "Eventos",
    item: (row) => ({
      title: row.titulo,
      text: [formatDate(row.fecha_inicio, true), row.tipo === "VIRTUAL" ? "En línea" : row.ubicacion].filter(Boolean).join(" · "),
      meta: row.estado === "Finalizado" ? "Finalizado" : "",
      route: `/eventos/${row.id_evento}`,
    }),
    found: (n, terms, seed, rows) => {
      if (terms.length) return `Esto encontré en eventos sobre ${quote(terms)}:`;
      return rows.some((row) => row.estado === "Publicado")
        ? pick(["Estos son los próximos eventos:", "Esto viene en la agenda del instituto:"], seed)
        : "No hay eventos próximos por ahora; estos son los más recientes:";
    },
    none: (terms, topic) => terms.length ? `No encontré eventos sobre ${quote(terms)}.` : topic.emptyAnswer,
    action: routeAction("Ver eventos", "/eventos", "ph-calendar-blank"),
  },
  magazines: {
    run: (terms, opts) => AssistantModel.searchMagazines(terms.map(stem), opts),
    id: (row) => row.id_revista,
    section: "Revistas",
    item: (row) => ({ title: row.titulo, text: row.precio != null ? `$${Number(row.precio).toFixed(2)}` : "", route: `/magazines/${row.id_revista}` }),
    found: (n, terms) => terms.length ? `Encontré ${n} ${plural(n, "revista")} sobre ${quote(terms)}:` : "Estas revistas están disponibles:",
    none: (terms) => terms.length ? `No hay revistas sobre ${quote(terms)} en la tienda por ahora.` : "Por ahora no hay revistas disponibles en la tienda.",
    action: routeAction("Abrir tienda", "/magazines", "ph-storefront"),
  },
};

const searchResponse = async ({ topic, searchType, terms, seed, excludeIds = [], more = false, howTo = false }) => {
  const searcher = SEARCHERS[searchType];
  if (searcher.needsTerms && !terms.length) {
    return { reply: topic.answer, sections: [], actions: topic.actions, meta: { searchType, searchTerms: [], shownIds: [] } };
  }

  const rows = await searcher.run(terms, { limit: 4, excludeIds });
  const ids = rows.map(searcher.id);
  // «¿Cómo compro una revista?»: primero se explica; los datos, si hay, acompañan.
  const explain = howTo && !terms.length && !more;
  if (!rows.length) {
    return {
      reply: explain && !topic.emptyAnswer ? topic.answer : more ? `No hay más resultados sobre ${quote(terms)}.` : searcher.none(terms, topic),
      sections: [],
      actions: [searcher.action],
      meta: { searchType, searchTerms: terms, shownIds: excludeIds },
    };
  }

  return {
    reply: explain ? topic.answer : more ? "Aquí tienes más opciones:" : searcher.found(rows.length, terms, seed, rows),
    sections: [{ title: searcher.section, items: rows.map(searcher.item) }],
    actions: [searcher.action],
    meta: { searchType, searchTerms: terms, shownIds: [...excludeIds, ...ids] },
  };
};

const calendarResponse = async (topic, analysis) => {
  const calendars = await AssistantModel.getCalendars();
  const asksDate = /\b(?:cuando|fecha|fechas|empiezan|inician|terminan|acaba|vacaciones)\b/.test(analysis.text);
  if (!calendars.length) return { reply: topic.emptyAnswer, sections: [], actions: topic.actions };
  return {
    reply: asksDate
      ? "Las fechas oficiales vienen en el calendario escolar vigente; ábrelo aquí:"
      : "Este es el calendario escolar vigente:",
    sections: [{
      title: "Calendario escolar",
      items: calendars.map((calendar) => ({
        title: calendar.titulo || calendar.titulo_seccion || "Calendario",
        text: calendar.tipo_calendario ? `Calendario ${String(calendar.tipo_calendario).toLowerCase()}` : "",
        href: calendar.archivo_url || null,
        route: calendar.archivo_url ? null : "/calendario",
      })),
    }],
    actions: topic.actions,
  };
};

const ABOUT_BLOCKS = [
  { pattern: /\bmision\b/, label: "La misión" },
  { pattern: /\bvision\b/, label: "La visión" },
  { pattern: /\bvalores?\b/, label: "Los valores" },
  { pattern: /\bhistoria\b/, label: "La historia" },
];

const aboutResponse = async (topic, analysis) => {
  const blocks = await AssistantModel.getAbout();
  if (!blocks.length) return { reply: topic.emptyAnswer, sections: [], actions: topic.actions };

  const requested = ABOUT_BLOCKS.find((block) => block.pattern.test(analysis.text));
  if (requested) {
    const block = blocks.find((item) => requested.pattern.test(analyze(`${item.type} ${item.title}`).text));
    if (block) {
      return { reply: `${requested.label} del instituto: ${compact(block.content, 450)}`, sections: [], actions: topic.actions };
    }
  }

  return {
    reply: topic.answer,
    sections: [{
      title: "El instituto",
      items: blocks.slice(0, 3).map((item) => ({ title: item.title || item.type, text: compact(item.content, 160), route: "/about" })),
    }],
    actions: topic.actions,
  };
};

/* ──────────────────────────────────────────────────────────────────────
   Respuestas fuera de alcance
   ────────────────────────────────────────────────────────────────────── */

// Datos que la plataforma no registra (horarios, costos, admisiones…).
const UNAVAILABLE_INFO = /\b(?:horario|horarios|colegiatura|colegiaturas|mensualidad|inscripcion|inscripciones|reinscripcion|beca|becas|admision|requisitos de ingreso|uniforme|cuanto cuesta la carrera|costo de la carrera)\b/;

const SCOPE_REMINDER ="Puedo ayudarte con libros, préstamos, materiales de clase, eventos, noticias, el calendario escolar o tu cuenta.";

const outOfScope = (kind, seed) => {
  const replies = {
    offensive: [
      `Prefiero que mantengamos una conversación respetuosa. ${SCOPE_REMINDER}`,
      `Mantengamos el respeto, por favor. ${SCOPE_REMINDER}`,
    ],
    support: [
      `Eso no lo puedo atender por aquí: me enfoco en información académica y de la plataforma. ${SCOPE_REMINDER}`,
    ],
    offTopic: [
      `Eso se sale de lo que puedo ayudarte. ${SCOPE_REMINDER}`,
      `Me encantaría platicar de eso, pero mi tema es lo académico. ${SCOPE_REMINDER}`,
    ],
    unavailable: [
      `Esa información no la tengo disponible en la plataforma, así que prefiero no darte un dato equivocado. ${SCOPE_REMINDER}`,
    ],
    unknown: [
      "No logré entenderte del todo. ¿Me lo dices de otra forma? Por ejemplo: «busco un libro de anatomía» o «¿cuándo empiezan las clases?».",
      "Creo que no te entendí bien. ¿Me cuentas un poco más de lo que buscas?",
    ],
  };
  return {
    topic: { id: kind === "unknown" ? "fallback" : `out_of_scope_${kind}`, title: "Alcance del asistente", category: "Asistente" },
    reply: pick(replies[kind], seed),
    actions: [],
    suggestions: FALLBACK_SUGGESTIONS,
  };
};

/* ──────────────────────────────────────────────────────────────────────
   Orquestación
   ────────────────────────────────────────────────────────────────────── */

const topicResponse = async ({ topic, analysis, terms, seed, previous, more }) => {
  if (topic.search === "calendar") return calendarResponse(topic, analysis);
  if (topic.search === "about") return aboutResponse(topic, analysis);
  if (SEARCHERS[topic.search]) {
    return searchResponse({
      topic,
      searchType: topic.search,
      terms,
      seed,
      excludeIds: more ? previous?.shownIds || [] : [],
      more,
      howTo: /^(?:y\s+)?(?:como|donde|que (?:necesito|tengo que|debo))\b/.test(analysis.text),
    });
  }
  return { reply: topic.answer, sections: [], actions: topic.actions };
};

const toResult = ({ context, topic, confidence = 1, matched = [], alternatives = [], body, authenticatedUser, contextUsed = false }) => ({
  sessionId: context.sessionId || null,
  intent: {
    id: topic.id,
    title: topic.title,
    category: topic.category,
    confidence: Number(confidence.toFixed(2)),
    matches: matched,
    alternatives: alternatives.map((item) => ({
      id: item.topic.id,
      title: item.topic.title,
      category: item.topic.category,
      score: Number(item.score.toFixed(2)),
    })),
  },
  reply: body.reply,
  sections: body.sections || [],
  actions: dedupeActions(body.actions || []).slice(0, 4),
  suggestions: (body.suggestions || topic.suggestions || []).slice(0, 4),
  related: [],
  meta: {
    searchType: body.meta?.searchType || null,
    searchTerms: body.meta?.searchTerms || [],
    shownIds: body.meta?.shownIds || [],
    deterministic: true,
    source: "assistant-nlp",
    contextUsed,
    authenticated: Boolean(authenticatedUser?.id_usuario),
  },
});

const buildResponse = async ({ message, context, authenticatedUser }) => {
  const seed = message;
  const scope = assessScope(message);
  const vocab = await getVocabulary();
  const analysis = analyze(scope.cleaned, vocab);
  const ranked = rankIntents(analysis, INTENT_INDEX);
  const best = ranked[0];
  let confidence = confidenceOf(ranked);
  const strongIntent = confidence >= 0.5 && best.coverage >= 0.5;
  const result = (topic, body, extra = {}) =>
    toResult({ context, topic, body, authenticatedUser, confidence, matched: best?.matched || [], ...extra });

  // 1) Ofensas: si además hay una intención académica clara, se atiende con una nota.
  let courtesyNote = "";
  if (scope.offensive) {
    if (!strongIntent || /\b(?:eres|estas)\b/.test(analysis.text)) {
      const body = outOfScope("offensive", seed);
      return result(body.topic, body, { confidence: 1 });
    }
    courtesyNote = "Te ayudo con gusto; solo te pido que cuidemos el lenguaje. ";
  }

  // 2) Conversación social (saludos, gracias, despedidas…).
  const social = matchSocial(analysis);
  if (social && !(social.id === "gratitude" && strongIntent)) {
    return result(
      { id: social.id, title: social.title, category: "Conversación" },
      { reply: pick(social.replies, seed), actions: [], suggestions: social.suggestions || [] },
      { confidence: 1 }
    );
  }

  // 3) Soporte, fallas o contacto con personas: fuera del alcance, salvo que
  //    el mensaje sea sobre todo una consulta académica clara.
  if (scope.malfunction || (scope.support && (!strongIntent || best.coverage < 0.75))) {
    const body = outOfScope("support", seed);
    return result(body.topic, body, { confidence: 1 });
  }

  // 4) Datos personales.
  const personal = await personalResponse(analysis, scope.cleaned, authenticatedUser);
  if (personal) {
    return result(personal.topic, { ...personal, reply: courtesyNote + personal.reply }, { confidence: 1 });
  }

  // 5) Seguimiento de la conversación («y de farmacología?», «dame más»).
  const previous = previousTurn(context);
  const previousTopic = previous ? TOPIC_BY_ID.get(previous.intentId) : null;
  const more = Boolean(previous?.searchType) && MORE_REQUEST.test(analysis.text);
  const followUpCue = FOLLOW_UP_START.test(analysis.text) || REFERENCE.test(analysis.text);
  const sameTopic = Boolean(previousTopic) && best?.score > 0 && best.topic.id === previousTopic.id;
  const isFollowUp = Boolean(previousTopic) && (
    more ||
    (followUpCue && (confidence < 0.55 || sameTopic)) ||
    (analysis.stems.length <= 2 && confidence < 0.4)
  );

  let topic = best?.score > 0 ? best.topic : null;
  let contextUsed = false;
  if (isFollowUp) {
    topic = previousTopic;
    contextUsed = true;
    confidence = Math.max(confidence, 0.6);
  } else if (!strongIntent && confidence < 0.3) {
    // Sin intención clara: la sección actual ayuda a desempatar.
    const routeTopic = TOPIC_BY_ID.get(routeTopicId(context.path));
    const routeRanked = routeTopic && ranked.find((item) => item.topic.id === routeTopic.id);
    if (routeRanked?.score > 0) {
      topic = routeTopic;
      confidence = Math.max(confidence, 0.45);
    }
  }

  // 6) Fuera de tema: solo si no hay una intención académica que lo explique.
  if (scope.offTopic && !contextUsed && (confidence < 0.6 || best.coverage < 0.5)) {
    const body = outOfScope("offTopic", seed);
    return result(body.topic, body, { confidence: 1 });
  }

  // Información institucional que la plataforma no publica: se admite sin inventar.
  if (UNAVAILABLE_INFO.test(analysis.text) && !contextUsed && best.coverage < 0.75) {
    const body = outOfScope("unavailable", seed);
    return result(body.topic, body, { confidence: 1 });
  }

  // 7) Pregunta frecuente publicada que coincide con lo que se pregunta.
  const faq = await bestFaq(analysis);
  if (faq && (faq.ratio >= 0.75 || confidence < 0.55)) {
    return result(
      { id: "faq", title: "Pregunta frecuente", category: "Ayuda" },
      { reply: courtesyNote + compact(faq.faq.respuesta, 600), actions: topic?.actions || [], suggestions: topic?.suggestions || FALLBACK_SUGGESTIONS },
      { confidence: Math.max(confidence, faq.ratio) }
    );
  }

  // 8) Términos de búsqueda: lo que pide el mensaje sin el «cómo» ni el tipo de contenido.
  const exclude = new Set([...topicStems(topic), ...GENERIC_SEARCH_STEMS]);
  let terms = searchTermsFrom(analysis.content, exclude);
  if (more || (contextUsed && !terms.length)) terms = previous?.searchTerms || [];

  // 9) Intención poco clara: si hay términos, se buscan en biblioteca y materiales.
  if (!topic || (confidence < 0.25 && !contextUsed)) {
    if (terms.length) {
      const [books, materials] = await Promise.all([
        AssistantModel.searchBooks(terms.map(stem), { limit: 3 }),
        AssistantModel.searchMaterials(terms.map(stem), { limit: 3 }),
      ]);
      if (books.length || materials.length) {
        const sections = [];
        if (books.length) sections.push({ title: "Libros", items: books.map(SEARCHERS.books.item) });
        if (materials.length) sections.push({ title: "Materiales", items: materials.map(SEARCHERS.materials.item) });
        return result(
          { id: "academic_search", title: "Búsqueda académica", category: "Biblioteca" },
          {
            reply: `${courtesyNote}No estoy seguro de qué necesitas exactamente, pero esto es lo que hay sobre ${quote(terms)} en la plataforma:`,
            sections,
            actions: [SEARCHERS.books.action, SEARCHERS.materials.action],
            suggestions: FALLBACK_SUGGESTIONS,
            meta: { searchType: books.length ? "books" : "materials", searchTerms: terms, shownIds: (books.length ? books : materials).map((row) => row.id ?? row.id_material) },
          },
          { confidence: 0.4 }
        );
      }
    }
    const body = outOfScope("unknown", seed);
    return result(body.topic, body, { confidence, alternatives: ranked.filter((item) => item.score > 1).slice(0, 3) });
  }

  // 10) Respuesta del tema con la información real disponible.
  const body = await topicResponse({ topic, analysis, terms, seed, previous, more });
  return result(
    topic,
    {
      ...body,
      reply: courtesyNote + body.reply,
      actions: dedupeActions([...(body.actions || []), ...(topic.actions || [])]),
      suggestions: topic.suggestions,
    },
    { contextUsed, alternatives: ranked.slice(1, 3).filter((item) => item.score > 1) }
  );
};

export const AssistantService = {
  async answer({ message, context, authenticatedUser, reqMeta }) {
    const cleanMessage = compact(message, 1000);
    const safeContext = sanitizeContext(context, authenticatedUser);

    if (!cleanMessage || cleanMessage.length < 2) {
      return toResult({
        context: safeContext,
        topic: { id: "empty", title: "Mensaje vacío", category: "Asistente" },
        body: { reply: "Escríbeme tu pregunta y te ayudo.", suggestions: FALLBACK_SUGGESTIONS },
        confidence: 0,
        authenticatedUser,
      });
    }

    const response = await buildResponse({
      message: cleanMessage,
      context: safeContext,
      authenticatedUser: authenticatedUser || null,
    });

    await AssistantModel.saveInteraction({
      sessionId: safeContext.sessionId,
      message: cleanMessage,
      intent: response.intent.id,
      confidence: response.intent.confidence,
      responsePreview: response.reply,
      route: safeContext.path,
      role: safeContext.role,
      ip: reqMeta?.ip,
      userAgent: reqMeta?.userAgent,
    });

    return response;
  },

  getTopics() {
    const categories = ASSISTANT_TOPICS.reduce((acc, topic) => {
      if (!acc[topic.category]) acc[topic.category] = [];
      acc[topic.category].push({ id: topic.id, title: topic.title, suggestions: topic.suggestions?.slice(0, 3) || [] });
      return acc;
    }, {});
    return { starters: STARTER_PROMPTS, categories };
  },
};
