import {
  ASSISTANT_TOPICS,
  FALLBACK_SUGGESTIONS,
  ROUTE_TOPIC_MAP,
  STARTER_PROMPTS,
} from "../data/assistant.knowledge.js";
import { AssistantModel } from "../models/assistant.model.js";

const STOPWORDS = new Set([
  "a", "al", "algo", "ante", "como", "con", "cual", "cuales", "cuando", "de",
  "del", "dime", "donde", "el", "ella", "en", "es", "esa", "ese", "eso", "esta",
  "este", "estos", "hay", "la", "las", "le", "lo", "los", "me", "mi", "mis",
  "necesito", "para", "por", "puedo", "que", "quiero", "se", "si", "sobre",
  "su", "sus", "te", "tengo", "tu", "un", "una", "unas", "unos", "ver", "y",
]);

const SEARCH_NOISE = new Set([
  ...STOPWORDS,
  "abrir", "ayuda", "buscar", "busca", "buscame", "consulta", "consultar",
  "encuentra", "encontrar", "explica", "explicame", "guia", "guiame",
  "informacion", "mostrar", "muestrame", "quiero", "saber",
]);

const NATURAL_EXPRESSIONS = {
  greeting: ["hola que tal", "buen dia", "como estas", "echame la mano", "me ayudas por favor"],
  navigation: ["no se donde esta", "me perdi", "a donde le pico", "llevame a", "en que parte esta"],
  login: ["no me deja entrar", "no puedo acceder", "quiero entrar a mi cuenta", "se cerro mi sesion"],
  register: ["quiero hacer una cuenta", "soy nuevo", "aun no tengo cuenta", "como me doy de alta"],
  activation: ["no me llega el enlace", "mi cuenta sigue pendiente", "no puedo activar mi cuenta"],
  password: ["se me olvido la clave", "perdi mi contrasena", "quiero cambiar mi clave", "no recuerdo mi password"],
  profile: ["quiero cambiar mis datos", "mi correo esta mal", "actualizar mi telefono"],
  logout: ["quiero salir", "sacame de mi cuenta", "como me desconecto"],
  roles: ["que puedo hacer aqui", "por que no me deja", "que permisos tengo"],
  catalog: ["ando buscando un libro", "tienen el libro", "quiero encontrar un libro", "que libros tienen"],
  digital_books: ["lo tienen en pdf", "puedo leerlo en linea", "quiero verlo digital", "se puede descargar"],
  loans: ["me prestan un libro", "quiero sacar un libro", "cuando regreso el libro", "como lo solicito"],
  student_materials: ["busco apuntes", "material de mi clase", "recursos de la materia", "que subio el profesor"],
  teacher_materials: ["quiero subir un archivo", "compartir material con alumnos", "publicar mis apuntes"],
  magazines: ["quiero comprar una revista", "que revistas venden", "tienen revistas disponibles"],
  cart_checkout: ["como puedo pagar", "quiero terminar mi compra", "ir a pagar", "vaciar mi carrito"],
  purchases: ["que compre", "donde esta mi pedido", "quiero ver mis compras", "ya pague"],
  news: ["que hay de nuevo", "hay algun aviso", "ultimas novedades", "que publicaron"],
  events: ["que hay esta semana", "hay algo proximamente", "que actividades tienen", "quiero asistir a un evento"],
  calendar: ["cuando empiezan las clases", "fechas escolares", "cuando son las vacaciones", "calendario del semestre"],
  contact: ["quiero hablar con alguien", "necesito atencion de una persona", "a donde llamo", "cual es su whatsapp"],
  errors_support: ["se quedo cargando", "algo salio mal", "no responde", "me aparece un mensaje raro"],
};

const CONVERSATION_TOPICS = [
  {
    id: "gratitude",
    category: "Conversacion",
    title: "Agradecimiento",
    priority: 12,
    answer: "¡Con gusto! Me alegra haberte ayudado. Si necesitas otra cosa, escríbeme como lo dirías normalmente y seguimos.",
    actions: [],
    suggestions: FALLBACK_SUGGESTIONS,
  },
  {
    id: "farewell",
    category: "Conversacion",
    title: "Despedida",
    priority: 12,
    answer: "¡Hasta luego! Aquí estaré cuando necesites volver a buscar algo o realizar otro proceso en Tiozihuatl.",
    actions: [],
    suggestions: [],
  },
  {
    id: "confirmation",
    category: "Conversacion",
    title: "Continuar conversación",
    priority: 12,
    answer: "Perfecto. ¿Quieres que sigamos con este tema o necesitas ayuda con algo más?",
    actions: [],
    suggestions: FALLBACK_SUGGESTIONS,
  },
];

const ALL_TOPICS = [...ASSISTANT_TOPICS, ...CONVERSATION_TOPICS];

const DIRECT_CONVERSATION_PATTERNS = [
  { id: "gratitude", pattern: /^(?:(?:muchas|mil)\s+)?gracias\b|\b(te\s+lo\s+agradezco|te\s+agradezco|me\s+ayudaste|me\s+sirvio)\b/ },
  { id: "farewell", pattern: /^(adios|hasta\s+luego|nos\s+vemos|bye|hasta\s+pronto|me\s+voy)\b/ },
  { id: "confirmation", pattern: /^(ok|okay|vale|va|entendido|perfecto|listo|de\s+acuerdo|esta\s+bien)[\s.!]*$/ },
  { id: "greeting", pattern: /^(hola|holi|buen\s+dia|buenas\s+tardes|buenas\s+noches|que\s+tal|hey)[\s!.,?]*(como\s+estas)?[\s!.,?]*$/ },
];

const normalizeText = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (value = "") =>
  normalizeText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 1);

const conversationHistory = (context = {}) =>
  (Array.isArray(context.history) ? context.history : [])
    .filter((item) => item && ["assistant", "user"].includes(item.sender))
    .slice(-8);

const previousAssistantIntentId = (context = {}) =>
  [...conversationHistory(context)]
    .reverse()
    .find((item) => item.sender === "assistant" && item.intentId)?.intentId || null;

const isContextualFollowUp = (normalizedMessage, tokens) => {
  if (!normalizedMessage || tokens.length > 8) return false;
  if (DIRECT_CONVERSATION_PATTERNS.some((item) => item.pattern.test(normalizedMessage))) return false;

  return /^(y|pero|tambien|entonces|ahora|sobre eso)\b/.test(normalizedMessage) ||
    /\b(eso|esa|ese|ahi|lo|la|ellos|ellas|mas opciones|que sigue|y luego)\b/.test(normalizedMessage) ||
    /^(donde|como|cuando|cual|muestrame mas|quiero verlo|hay mas)\b/.test(normalizedMessage);
};

const unique = (items) => Array.from(new Set(items.filter(Boolean)));

const compact = (value, max = 240) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max).trim()}...` : text;
};

const sanitizeContext = (context = {}) => ({
  sessionId: compact(context.sessionId, 100),
  path: compact(context.path || context.route, 180),
  role: compact(context.role, 80) || null,
  isAuthenticated: Boolean(context.isAuthenticated),
  history: conversationHistory(context).map((item) => ({
    sender: item.sender,
    text: compact(item.text, 300),
    intentId: compact(item.intentId, 80) || undefined,
  })),
});

const levenshtein = (a, b) => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix = Array.from({ length: b.length + 1 }, (_, index) => [index]);
  for (let index = 0; index <= a.length; index += 1) {
    matrix[0][index] = index;
  }

  for (let row = 1; row <= b.length; row += 1) {
    for (let col = 1; col <= a.length; col += 1) {
      const cost = b[row - 1] === a[col - 1] ? 0 : 1;
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost
      );
    }
  }

  return matrix[b.length][a.length];
};

const tokenMatches = (keyword, tokens) => {
  const normalizedKeyword = normalizeText(keyword);

  if (!normalizedKeyword) return { score: 0, matched: false };

  if (normalizedKeyword.includes(" ")) {
    return { score: 0, matched: false };
  }

  for (const token of tokens) {
    if (token === normalizedKeyword) return { score: 3, matched: true };

    if (
      normalizedKeyword.length >= 5 &&
      token.length >= 5 &&
      (token.includes(normalizedKeyword) || normalizedKeyword.includes(token))
    ) {
      return { score: 1.6, matched: true };
    }

    if (
      normalizedKeyword.length >= 5 &&
      token.length >= 5 &&
      levenshtein(token, normalizedKeyword) <= 1
    ) {
      return { score: 1, matched: true };
    }
  }

  return { score: 0, matched: false };
};

const scoreTopic = (topic, normalizedMessage, tokens, context = {}) => {
  let score = Number(topic.priority || 0) * 0.12;
  const matches = [];

  const naturalPhrases = NATURAL_EXPRESSIONS[topic.id] || [];
  for (const phrase of [...(topic.phrases || []), ...naturalPhrases]) {
    const normalizedPhrase = normalizeText(phrase);
    if (normalizedPhrase && normalizedMessage.includes(normalizedPhrase)) {
      score += 7;
      matches.push(phrase);
    }
  }

  for (const keyword of topic.keywords || []) {
    const normalizedKeyword = normalizeText(keyword);
    if (!normalizedKeyword) continue;

    if (normalizedKeyword.includes(" ") && normalizedMessage.includes(normalizedKeyword)) {
      score += 4.5;
      matches.push(keyword);
      continue;
    }

    const match = tokenMatches(normalizedKeyword, tokens);
    if (match.matched) {
      score += match.score;
      matches.push(keyword);
    }
  }

  const hasMessageMatch = matches.length > 0;

  const route = normalizeText(context.path || context.route || "");
  const routeBoost = ROUTE_TOPIC_MAP.some(
    (item) => item.topicId === topic.id && route.includes(normalizeText(item.route))
  );

  if (routeBoost && (hasMessageMatch || isContextualFollowUp(normalizedMessage, tokens))) {
    score += 4.5;
    matches.push("ruta actual");
  }

  const role = normalizeText(context.role || "");
  if (
    hasMessageMatch &&
    role &&
    topic.keywords?.some((keyword) => normalizeText(keyword) === role)
  ) {
    score += 1.5;
    matches.push(role);
  }

  const previousIntentId = previousAssistantIntentId(context);
  if (
    previousIntentId === topic.id &&
    isContextualFollowUp(normalizedMessage, tokens)
  ) {
    score += 6;
    matches.push("contexto de la conversación");
  }

  return {
    topic,
    score,
    matches: unique(matches).slice(0, 8),
  };
};

const detectIntent = (message, context) => {
  const normalizedMessage = normalizeText(message);
  const tokens = tokenize(message);

  const directConversation = DIRECT_CONVERSATION_PATTERNS.find((item) =>
    item.pattern.test(normalizedMessage)
  );

  if (directConversation) {
    const topic = ALL_TOPICS.find((item) => item.id === directConversation.id);
    return {
      normalizedMessage,
      tokens,
      best: { topic, score: 16, matches: ["expresión conversacional"] },
      confidence: 0.8,
      alternatives: [],
      contextual: false,
      previousIntentId: previousAssistantIntentId(context),
    };
  }

  const ranked = ALL_TOPICS
    .map((topic) => scoreTopic(topic, normalizedMessage, tokens, context))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  const confidence = best ? Math.min(0.98, best.score / (best.score + 8)) : 0;

  return {
    normalizedMessage,
    tokens,
    best,
    confidence,
    alternatives: ranked
      .filter((item) => item.score > 1 && item.topic.id !== best?.topic.id)
      .slice(0, 3),
    contextual:
      Boolean(previousAssistantIntentId(context)) &&
      previousAssistantIntentId(context) === best?.topic.id &&
      isContextualFollowUp(normalizedMessage, tokens),
    previousIntentId: previousAssistantIntentId(context),
  };
};

const extractSearchTerm = (message, topic) => {
  const normalizedKeywords = new Set([
    ...(topic?.keywords || []).flatMap((keyword) => tokenize(keyword)),
    ...(topic?.phrases || []).flatMap((phrase) => tokenize(phrase)),
  ]);

  const tokens = tokenize(message).filter(
    (token) =>
      token.length > 2 &&
      !SEARCH_NOISE.has(token) &&
      !normalizedKeywords.has(token)
  );

  return unique(tokens).slice(0, 8).join(" ");
};

const scoreFaq = (faq, normalizedMessage, tokens) => {
  const question = normalizeText(faq.pregunta);
  const answer = normalizeText(faq.respuesta);
  const faqTokens = unique([...tokenize(faq.pregunta), ...tokenize(faq.respuesta)]).filter(
    (token) => !STOPWORDS.has(token)
  );

  let score = 0;

  if (question && normalizedMessage.includes(question)) score += 10;
  if (question && question.includes(normalizedMessage) && normalizedMessage.length > 8) score += 7;

  for (const token of tokens) {
    if (STOPWORDS.has(token)) continue;
    if (faqTokens.includes(token)) score += 2;
    else if (answer.includes(token) || question.includes(token)) score += 1;
  }

  return score;
};

const findFaqMatches = async (message, normalizedMessage, tokens) => {
  const faqs = await AssistantModel.getFaqs();

  return faqs
    .map((faq) => ({ ...faq, score: scoreFaq(faq, normalizedMessage, tokens) }))
    .filter((faq) => faq.score >= 4)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
};

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
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

const buildBookRelated = (books = []) =>
  books.map((book) => ({
    type: "book",
    title: book.titulo,
    description: compact(
      [
        book.autores ? `Autor(es): ${book.autores}` : "",
        book.materias ? `Materias: ${book.materias}` : "",
        Number(book.tiene_fisico) ? `Fisico disponible: ${book.disponibles ?? 0}` : "",
        Number(book.tiene_digital) ? "Digital disponible" : "",
      ]
        .filter(Boolean)
        .join(" | "),
      220
    ),
    route: "/catalogo",
    meta: Number(book.tiene_digital)
      ? "Tiene formato digital"
      : Number(book.tiene_fisico)
        ? "Tiene formato fisico"
        : "Catalogo",
  }));

const buildNewsRelated = (news = []) =>
  news.map((item) => ({
    type: "news",
    title: item.titulo,
    description: compact(item.contenido, 180),
    route: `/noticias/${item.id_noticia}`,
    meta: formatDate(item.fecha_publicacion),
  }));

const buildEventRelated = (events = []) =>
  events.map((event) => ({
    type: "event",
    title: event.titulo,
    description: compact(
      [
        event.tipo,
        event.ubicacion || event.enlace,
        event.descripcion,
      ]
        .filter(Boolean)
        .join(" | "),
      180
    ),
    route: `/eventos/${event.id_evento}`,
    meta: formatDate(event.fecha_inicio),
  }));

const buildMaterialRelated = (materials = []) =>
  materials.map((material) => ({
    type: "material",
    title: material.titulo,
    description: compact(
      [
        material.tipo,
        material.nombre_docente ? `Docente: ${material.nombre_docente}` : "",
        material.materias ? `Materias: ${material.materias}` : "",
        material.descripcion,
      ]
        .filter(Boolean)
        .join(" | "),
      200
    ),
    route: "/materiales",
    meta: "Material publico",
  }));

const buildMagazineRelated = (magazines = []) =>
  magazines.map((magazine) => ({
    type: "magazine",
    title: magazine.titulo,
    description: compact(
      [
        magazine.descripcion,
        magazine.precio !== undefined ? `Precio: $${Number(magazine.precio).toFixed(2)}` : "",
        magazine.stock !== undefined ? `Stock: ${magazine.stock}` : "",
      ]
        .filter(Boolean)
        .join(" | "),
      180
    ),
    route: `/magazines/${magazine.id_revista}`,
    meta: "Revista disponible",
  }));

const buildContactSection = (contact) => {
  if (!contact) return null;

  const items = [
    contact.telefono ? `Telefono: ${contact.telefono}` : "",
    contact.correo ? `Correo: ${contact.correo}` : "",
    contact.direccion ? `Direccion: ${contact.direccion}` : "",
    contact.horario ? `Horario: ${contact.horario}` : "",
    contact.whatsapp ? `WhatsApp: ${contact.whatsapp}` : "",
  ].filter(Boolean);

  if (!items.length) return null;

  return {
    title: "Contacto publicado",
    items: items.map((item) => ({ title: item })),
  };
};

const buildCalendarSection = (calendars = []) => {
  if (!calendars.length) return null;

  return {
    title: "Calendarios activos",
    items: calendars.map((calendar) => ({
      title: `${calendar.tipo_calendario}: ${calendar.titulo || calendar.titulo_seccion}`,
      text: calendar.tipo_archivo ? `Archivo ${calendar.tipo_archivo}` : "",
      href: calendar.archivo_url || null,
    })),
  };
};

const buildAboutSection = (items = []) => {
  if (!items.length) return null;

  return {
    title: "Informacion institucional",
    items: items.slice(0, 3).map((item) => ({
      title: item.title || item.type || "Contenido",
      text: compact(item.content, 180),
    })),
  };
};

const hasSearchIntent = (normalizedMessage) =>
  /\b(busca|buscar|buscame|busco|encuentra|encontrar|hay|tienes|existe|disponible|disponibles|ultimas|ultimos|proximos|recientes|mostrar|muestrame|ver)\b/.test(
    normalizedMessage
  );

const shouldSearchBooks = (topicId, normalizedMessage, searchIntent) =>
  searchIntent &&
  (["catalog", "digital_books"].includes(topicId) ||
    /\b(libro|libros|biblioteca|catalogo|autor|materia|pdf)\b/.test(normalizedMessage));

const shouldSearchNews = (topicId, normalizedMessage) =>
  topicId === "news" || /\b(noticia|noticias|aviso|comunicado)\b/.test(normalizedMessage);

const shouldSearchEvents = (topicId, normalizedMessage) =>
  topicId === "events" || /\b(evento|eventos|actividad|agenda)\b/.test(normalizedMessage);

const shouldSearchMaterials = (topicId, normalizedMessage, searchIntent) =>
  searchIntent &&
  (["student_materials", "teacher_materials", "admin_materials"].includes(topicId) ||
    /\b(material|materiales|recurso|docente|materia)\b/.test(normalizedMessage));

const shouldSearchMagazines = (topicId, normalizedMessage, searchIntent) =>
  searchIntent &&
  (["magazines", "cart_checkout", "purchases"].includes(topicId) ||
    /\b(revista|revistas|tienda|compra|compras)\b/.test(normalizedMessage));

const composeDynamic = async ({ topic, message, normalizedMessage, tokens }) => {
  const topicId = topic?.id;
  const searchTerm = extractSearchTerm(message, topic);
  const queryTerm = searchTerm || "";
  const searchIntent = hasSearchIntent(normalizedMessage);
  const shouldRunBookSearch = shouldSearchBooks(topicId, normalizedMessage, searchIntent);
  const shouldRunNewsSearch = shouldSearchNews(topicId, normalizedMessage);
  const shouldRunEventSearch = shouldSearchEvents(topicId, normalizedMessage);
  const shouldRunMaterialSearch = shouldSearchMaterials(topicId, normalizedMessage, searchIntent);
  const shouldRunMagazineSearch = shouldSearchMagazines(topicId, normalizedMessage, searchIntent);

  const [
    faqMatches,
    contact,
    calendars,
    about,
    books,
    news,
    events,
    materials,
    magazines,
  ] = await Promise.all([
    findFaqMatches(message, normalizedMessage, tokens),
    topicId === "contact" ? AssistantModel.getContact() : Promise.resolve(null),
    topicId === "calendar" ? AssistantModel.getCalendars() : Promise.resolve([]),
    topicId === "about" ? AssistantModel.getAbout() : Promise.resolve([]),
    shouldRunBookSearch
      ? AssistantModel.searchBooks(queryTerm, 4)
      : Promise.resolve([]),
    shouldRunNewsSearch
      ? AssistantModel.searchNews(queryTerm, 3)
      : Promise.resolve([]),
    shouldRunEventSearch
      ? AssistantModel.searchEvents(queryTerm, 3)
      : Promise.resolve([]),
    shouldRunMaterialSearch
      ? AssistantModel.searchMaterials(queryTerm, 3)
      : Promise.resolve([]),
    shouldRunMagazineSearch
      ? AssistantModel.searchMagazines(queryTerm, 3)
      : Promise.resolve([]),
  ]);

  const sections = [];
  const related = [
    ...buildBookRelated(books),
    ...buildNewsRelated(news),
    ...buildEventRelated(events),
    ...buildMaterialRelated(materials),
    ...buildMagazineRelated(magazines),
  ].slice(0, 8);

  if (faqMatches.length) {
    sections.push({
      title: "FAQ relacionada",
      items: faqMatches.map((faq) => ({
        title: faq.pregunta,
        text: compact(faq.respuesta, 260),
      })),
    });
  }

  const contactSection = buildContactSection(contact);
  if (contactSection) sections.push(contactSection);

  const calendarSection = buildCalendarSection(calendars);
  if (calendarSection) sections.push(calendarSection);

  const aboutSection = buildAboutSection(about);
  if (aboutSection) sections.push(aboutSection);

  if (related.length) {
    sections.push({
      title: "Coincidencias encontradas",
      items: related.slice(0, 5).map((item) => ({
        title: item.title,
        text: item.description,
        route: item.route,
        meta: item.meta,
      })),
    });
  }

  return {
    searchTerm,
    sections,
    related,
    hasDynamicResults: Boolean(sections.length || related.length),
    attemptedSearch:
      shouldRunBookSearch ||
      shouldRunNewsSearch ||
      shouldRunEventSearch ||
      shouldRunMaterialSearch ||
      shouldRunMagazineSearch,
  };
};

const buildLowConfidenceResponse = (alternatives = []) => ({
  topic: {
    id: "fallback",
    title: "Orientacion general",
    category: "Ayuda",
  },
  reply:
    "Quiero ayudarte, pero no alcancé a identificar exactamente qué necesitas. Puedes explicármelo con tus propias palabras o decirme la acción concreta, por ejemplo: \"busco un libro de anatomía\", \"no puedo entrar a mi cuenta\" o \"¿qué eventos hay?\".",
  actions: [
    routeAction("Biblioteca", "/catalogo", "ph-book-bookmark"),
    routeAction("Contacto", "/contactanos", "ph-envelope"),
    routeAction("Inicio", "/inicio", "ph-house"),
  ],
  suggestions: alternatives.length
    ? alternatives.map((item) => ({
        label: item.topic.title,
        prompt: `Ayuda con ${item.topic.title.toLowerCase()}`,
      }))
    : FALLBACK_SUGGESTIONS,
});

const buildNaturalLead = ({ normalizedMessage, topicId, contextual }) => {
  if (["greeting", "gratitude", "farewell", "confirmation", "fallback"].includes(topicId)) {
    return "";
  }
  if (contextual) return "Claro, seguimos con lo que estábamos viendo.";
  if (/\b(no puedo|no me deja|error|problema|falla|olvide|perdi)\b/.test(normalizedMessage)) {
    return "Entiendo. Vamos a resolverlo paso a paso.";
  }
  if (/\b(busca|buscar|buscame|ando buscando|tienen|encuentra)\b/.test(normalizedMessage)) {
    return "Claro, voy a revisar qué opciones hay para ti.";
  }
  if (/\b(donde|a donde|en que parte)\b/.test(normalizedMessage)) {
    return "Sí, te indico dónde encontrarlo.";
  }
  if (/\b(como|quiero|necesito|puedo)\b/.test(normalizedMessage)) {
    return "Claro, te explico de forma sencilla.";
  }
  return "Con gusto, te ayudo con eso.";
};

const buildResponse = async ({ message, context = {}, reqMeta = {} }) => {
  const intent = detectIntent(message, context);
  const lowConfidence = !intent.best || intent.confidence < 0.2;
  const previousTopic = intent.previousIntentId
    ? ALL_TOPICS.find((topic) => topic.id === intent.previousIntentId)
    : null;

  let base = lowConfidence
    ? buildLowConfidenceResponse(intent.alternatives)
    : {
        topic: intent.best.topic,
        reply: intent.best.topic.answer,
        actions: intent.best.topic.actions || [],
        suggestions: intent.best.topic.suggestions || FALLBACK_SUGGESTIONS,
      };

  if (!lowConfidence && base.topic.id === "confirmation" && previousTopic) {
    base = {
      ...base,
      reply: `Perfecto. Podemos seguir con ${previousTopic.title.toLowerCase()}. ¿Qué más te gustaría saber?`,
      actions: previousTopic.actions || [],
      suggestions: previousTopic.suggestions || FALLBACK_SUGGESTIONS,
    };
  }

  const dynamic = lowConfidence
    ? { sections: [], related: [], searchTerm: "", hasDynamicResults: false }
    : await composeDynamic({
        topic: base.topic,
        message,
        normalizedMessage: intent.normalizedMessage,
        tokens: intent.tokens,
      });

  const dynamicActions = [];

  if (dynamic.related.some((item) => item.type === "book")) {
    dynamicActions.push(routeAction("Ver catalogo", "/catalogo", "ph-book-bookmark"));
  }
  if (dynamic.related.some((item) => item.type === "news")) {
    dynamicActions.push(routeAction("Noticias", "/noticias", "ph-newspaper"));
  }
  if (dynamic.related.some((item) => item.type === "event")) {
    dynamicActions.push(routeAction("Eventos", "/eventos", "ph-calendar-blank"));
  }
  if (dynamic.related.some((item) => item.type === "material")) {
    dynamicActions.push(routeAction("Materiales", "/materiales", "ph-folder-open"));
  }
  if (dynamic.related.some((item) => item.type === "magazine")) {
    dynamicActions.push(routeAction("Tienda", "/magazines", "ph-storefront"));
  }

  const naturalLead = buildNaturalLead({
    normalizedMessage: intent.normalizedMessage,
    topicId: base.topic.id,
    contextual: intent.contextual,
  });
  const replyParts = [naturalLead, base.reply].filter(Boolean);

  if (!lowConfidence && dynamic.hasDynamicResults && dynamic.attemptedSearch) {
    replyParts.push("Encontré estas opciones relacionadas. Puedes abrir cualquiera desde los resultados de abajo.");
  }

  if (!lowConfidence && dynamic.attemptedSearch && !dynamic.hasDynamicResults) {
    const target = dynamic.searchTerm ? ` para "${dynamic.searchTerm}"` : "";
    replyParts.push(
      `Revise coincidencias publicas${target}, pero no encontre resultados exactos en este momento. Puedes intentar con menos palabras o revisar la seccion directamente.`
    );
  }

  const response = {
    sessionId: context.sessionId || null,
    intent: {
      id: base.topic.id,
      title: base.topic.title,
      category: base.topic.category,
      confidence: Number(intent.confidence.toFixed(2)),
      matches: intent.best?.matches || [],
      alternatives: intent.alternatives.map((item) => ({
        id: item.topic.id,
        title: item.topic.title,
        category: item.topic.category,
        score: Number(item.score.toFixed(2)),
      })),
    },
    reply: replyParts.join("\n\n"),
    sections: dynamic.sections,
    actions: dedupeActions([...(base.actions || []), ...dynamicActions]).slice(0, 6),
    suggestions: (base.suggestions || FALLBACK_SUGGESTIONS).slice(0, 5),
    related: dynamic.related,
    meta: {
      searchTerm: dynamic.searchTerm,
      deterministic: true,
      source: "project-rules",
      contextUsed: Boolean(intent.contextual),
    },
  };

  await AssistantModel.saveInteraction({
    sessionId: context.sessionId,
    message,
    intent: response.intent.id,
    confidence: response.intent.confidence,
    responsePreview: response.reply,
    route: context.path || context.route,
    role: context.role,
    ip: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return response;
};

export const AssistantService = {
  async answer({ message, context, reqMeta }) {
    const cleanMessage = compact(message, 1000);

    if (!cleanMessage || cleanMessage.length < 2) {
      return {
        sessionId: context?.sessionId || null,
        intent: {
          id: "empty",
          title: "Mensaje vacio",
          category: "Ayuda",
          confidence: 0,
          matches: [],
          alternatives: [],
        },
        reply: "Escribe una pregunta o una accion concreta y te guio dentro de la plataforma.",
        sections: [],
        actions: [routeAction("Inicio", "/inicio", "ph-house")],
        suggestions: FALLBACK_SUGGESTIONS,
        related: [],
        meta: {
          deterministic: true,
          source: "project-rules",
        },
      };
    }

    return buildResponse({
      message: cleanMessage,
      context: sanitizeContext(context),
      reqMeta: reqMeta || {},
    });
  },

  getTopics() {
    const categories = ASSISTANT_TOPICS.reduce((acc, topic) => {
      if (!acc[topic.category]) acc[topic.category] = [];
      acc[topic.category].push({
        id: topic.id,
        title: topic.title,
        suggestions: topic.suggestions?.slice(0, 3) || [],
      });
      return acc;
    }, {});

    return {
      starters: STARTER_PROMPTS,
      categories,
    };
  },
};
