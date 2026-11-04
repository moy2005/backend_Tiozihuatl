/**
 * Base de conocimiento del asistente virtual.
 *
 * Cada tema describe una intención académica o de uso de la plataforma:
 *  - keywords: términos representativos (se comparan por raíz y con tolerancia a erratas).
 *  - examples: formas naturales de pedirlo; alimentan al clasificador para que no
 *    dependa de palabras exactas.
 *  - answer: respuesta breve y cercana; los datos reales se agregan al responder.
 *  - search: tipo de contenido que se consulta en la base de datos para este tema.
 *
 * El asistente se limita al ámbito académico y a la información publicada en la
 * plataforma: no atiende incidencias ni deriva a contacto con personas.
 */

export const STARTER_PROMPTS = [
  "Busco un libro de anatomía",
  "¿Cómo pido un préstamo?",
  "¿Qué eventos hay?",
  "¿Dónde encuentro materiales de mi clase?",
  "Olvidé mi contraseña",
  "¿Cuándo empiezan las clases?",
];

export const FALLBACK_SUGGESTIONS = [
  { label: "Buscar un libro", prompt: "Quiero buscar un libro" },
  { label: "Préstamos", prompt: "¿Cómo funcionan los préstamos?" },
  { label: "Materiales", prompt: "¿Dónde encuentro materiales de clase?" },
  { label: "Eventos", prompt: "¿Qué eventos hay?" },
];

export const ROUTE_TOPIC_MAP = [
  { route: "/catalogo", topicId: "catalog" },
  { route: "/biblioteca", topicId: "digital_books" },
  { route: "/my-loans", topicId: "loans" },
  { route: "/materiales-doc", topicId: "teacher_materials" },
  { route: "/materiales", topicId: "student_materials" },
  { route: "/magazines", topicId: "magazines" },
  { route: "/cart", topicId: "cart_checkout" },
  { route: "/checkout", topicId: "cart_checkout" },
  { route: "/my-purchases", topicId: "purchases" },
  { route: "/noticias", topicId: "news" },
  { route: "/eventos", topicId: "events" },
  { route: "/calendario", topicId: "calendar" },
  { route: "/about", topicId: "about" },
  { route: "/perfil", topicId: "profile" },
  { route: "/login", topicId: "login" },
  { route: "/register", topicId: "register" },
  { route: "/forgot-password", topicId: "password" },
  { route: "/reset-password", topicId: "password" },
  { route: "/privacidad", topicId: "legal" },
  { route: "/terminos", topicId: "legal" },
];

export const ASSISTANT_TOPICS = [
  {
    id: "greeting",
    category: "Conversación",
    title: "Saludo",
    priority: 2,
    keywords: ["hola", "saludos", "buenas", "asistente"],
    examples: [
      "hola", "buenas tardes", "buenas noches", "que tal", "en que me puedes ayudar", "que puedes hacer",
      "necesito ayuda", "me ayudas", "para que sirves", "como funcionas",
    ],
    answer:
      "¡Hola! Soy el asistente del Instituto Tiozihuatl. Te ayudo a encontrar libros, materiales de clase, préstamos, eventos, noticias, fechas escolares y a usar tu cuenta. ¿Qué necesitas?",
    actions: [],
    suggestions: FALLBACK_SUGGESTIONS,
  },
  {
    id: "navigation",
    category: "Plataforma",
    title: "Secciones de la plataforma",
    priority: 3,
    keywords: ["seccion", "secciones", "menu", "pagina", "navegar", "apartado", "modulo", "plataforma", "donde"],
    examples: [
      "que secciones tiene la pagina", "como me muevo en la plataforma", "donde esta el menu",
      "no encuentro donde esta", "me perdi en la pagina", "que hay en la plataforma",
    ],
    answer:
      "Desde el menú superior llegas a todo: Institucional (noticias, eventos, calendario), Biblioteca, Materiales y Tienda. Si ya iniciaste sesión, en tu perfil están tus préstamos y compras. Dime qué buscas y te llevo directo.",
    actions: [
      { label: "Inicio", route: "/inicio", icon: "ph-house" },
      { label: "Biblioteca", route: "/catalogo", icon: "ph-book-bookmark" },
    ],
    suggestions: [
      { label: "Biblioteca", prompt: "¿Cómo busco un libro?" },
      { label: "Materiales", prompt: "¿Dónde están los materiales de clase?" },
    ],
  },
  {
    id: "login",
    category: "Cuenta",
    title: "Iniciar sesión",
    priority: 6,
    keywords: ["login", "iniciar sesion", "ingresar", "entrar", "acceder", "acceso", "credencial", "sesion"],
    examples: [
      "como inicio sesion", "como entro a mi cuenta", "no me deja entrar", "no puedo acceder",
      "como me logueo", "quiero entrar a la plataforma", "se me cerro la sesion",
    ],
    answer:
      "Entra a Iniciar sesión, escribe tu correo o matrícula y tu contraseña. Si la sesión se cerró sola, solo vuelve a entrar. ¿Olvidaste tu contraseña? Te digo cómo recuperarla.",
    actions: [
      { label: "Iniciar sesión", route: "/login", icon: "ph-sign-in" },
      { label: "Recuperar contraseña", route: "/forgot-password", icon: "ph-key" },
    ],
    suggestions: [
      { label: "Olvidé mi contraseña", prompt: "Olvidé mi contraseña" },
      { label: "Crear cuenta", prompt: "¿Cómo me registro?" },
    ],
  },
  {
    id: "register",
    category: "Cuenta",
    title: "Crear cuenta",
    priority: 6,
    keywords: ["registro", "registrar", "registrarme", "crear cuenta", "alta", "nueva cuenta", "inscribirme"],
    examples: [
      "como me registro", "quiero crear una cuenta", "soy nuevo", "aun no tengo cuenta",
      "como me doy de alta", "donde me registro", "hacer una cuenta nueva",
    ],
    answer:
      "Ve a Registro y llena tus datos con un correo que revises seguido: ahí te llega la verificación. Después podrás iniciar sesión.",
    actions: [{ label: "Registrarme", route: "/register", icon: "ph-user-plus" }],
    suggestions: [
      { label: "Activar cuenta", prompt: "¿Cómo activo mi cuenta?" },
      { label: "Iniciar sesión", prompt: "¿Cómo inicio sesión?" },
    ],
  },
  {
    id: "activation",
    category: "Cuenta",
    title: "Activar cuenta",
    priority: 6,
    keywords: ["activar", "activacion", "verificar", "verificacion", "enlace", "link", "pendiente"],
    examples: [
      "como activo mi cuenta", "mi cuenta esta pendiente", "no me llego el correo de activacion",
      "donde verifico mi correo", "el link de activacion", "mi cuenta no esta activa",
    ],
    answer:
      "Abre el enlace de activación que llegó a tu correo y sigue los pasos; revisa también la carpeta de spam. Cuando tu cuenta esté activa ya puedes iniciar sesión.",
    actions: [{ label: "Activar cuenta", route: "/activar", icon: "ph-check-circle" }],
    suggestions: [
      { label: "Iniciar sesión", prompt: "¿Cómo inicio sesión?" },
      { label: "Recuperar contraseña", prompt: "Olvidé mi contraseña" },
    ],
  },
  {
    id: "password",
    category: "Cuenta",
    title: "Contraseña",
    priority: 7,
    keywords: ["contrasena", "password", "clave", "recuperar", "restablecer", "olvide", "cambiar contrasena", "palabra secreta"],
    examples: [
      "olvide mi contrasena", "se me olvido la clave", "no recuerdo mi password",
      "como recupero mi contrasena", "quiero cambiar mi contrasena", "perdi mi clave",
    ],
    answer:
      "Entra a Recuperar contraseña, escribe tu correo registrado y sigue el enlace que te llega para crear una nueva. Si ya iniciaste sesión y solo quieres cambiarla, hazlo desde Mi perfil.",
    actions: [
      { label: "Recuperar contraseña", route: "/forgot-password", icon: "ph-key" },
      { label: "Mi perfil", route: "/perfil", icon: "ph-user-gear" },
    ],
    suggestions: [{ label: "Iniciar sesión", prompt: "¿Cómo inicio sesión?" }],
  },
  {
    id: "profile",
    category: "Cuenta",
    title: "Mi perfil",
    priority: 5,
    keywords: ["perfil", "mis datos", "datos personales", "editar perfil", "actualizar datos", "mi cuenta"],
    examples: [
      "como actualizo mis datos", "quiero cambiar mi telefono", "editar mi perfil",
      "donde veo mi cuenta", "mi correo esta mal", "cambiar mi foto",
    ],
    answer:
      "En Mi perfil puedes ver y actualizar tus datos, y cambiar tu contraseña. Si quieres, también te muestro aquí tus datos: pregúntame «¿cuáles son mis datos?».",
    actions: [{ label: "Mi perfil", route: "/perfil", icon: "ph-user-gear" }],
    suggestions: [
      { label: "Mis datos", prompt: "¿Cuáles son mis datos?" },
      { label: "Cambiar contraseña", prompt: "Quiero cambiar mi contraseña" },
    ],
  },
  {
    id: "logout",
    category: "Cuenta",
    title: "Cerrar sesión",
    priority: 4,
    keywords: ["cerrar sesion", "salir", "logout", "desconectar"],
    examples: ["como cierro sesion", "quiero salir de mi cuenta", "como me desconecto"],
    answer: "Abre el menú de tu usuario, arriba a la derecha, y elige Cerrar sesión.",
    actions: [{ label: "Mi perfil", route: "/perfil", icon: "ph-user" }],
    suggestions: [{ label: "Iniciar sesión", prompt: "¿Cómo inicio sesión?" }],
  },
  {
    id: "roles",
    category: "Cuenta",
    title: "Qué puedo hacer",
    priority: 4,
    keywords: ["rol", "roles", "tipo de cuenta", "puedo hacer"],
    examples: [
      "que puedo hacer como estudiante", "que puedo hacer como docente", "que opciones tengo",
      "soy alumno que puedo hacer", "soy maestro", "para que me sirve la plataforma",
    ],
    answer:
      "Como estudiante puedes consultar la biblioteca, ver materiales de tus materias, revisar tus préstamos y comprar revistas. Como docente, además, publicas y organizas tus materiales.",
    actions: [
      { label: "Biblioteca", route: "/catalogo", icon: "ph-book-bookmark" },
      { label: "Materiales", route: "/materiales", icon: "ph-folder-open" },
    ],
    suggestions: [
      { label: "Buscar un libro", prompt: "Quiero buscar un libro" },
      { label: "Subir material", prompt: "¿Cómo subo material como docente?" },
    ],
  },
  {
    id: "catalog",
    category: "Biblioteca",
    title: "Catálogo de libros",
    priority: 9,
    search: "books",
    keywords: ["biblioteca", "catalogo", "libro", "libros", "autor", "titulo", "ejemplar", "disponible", "bibliografia"],
    examples: [
      "busco un libro", "tienen el libro de", "hay libros de anatomia", "quiero un libro de farmacologia",
      "libros del autor", "que libros tienen", "esta disponible el libro", "libros para mi materia",
      "ando buscando un libro", "me recomiendas un libro de enfermeria",
    ],
    answer:
      "En la Biblioteca buscas por título, autor o materia y ves si cada libro está en físico, digital o ambos. Dime el tema o el título y lo busco por ti.",
    actions: [{ label: "Abrir biblioteca", route: "/catalogo", icon: "ph-book-bookmark" }],
    suggestions: [
      { label: "Préstamos", prompt: "¿Cómo pido un préstamo?" },
      { label: "Libros digitales", prompt: "¿Cómo leo un libro digital?" },
    ],
  },
  {
    id: "digital_books",
    category: "Biblioteca",
    title: "Libros digitales",
    priority: 7,
    search: "books",
    keywords: ["digital", "pdf", "visor", "leer", "en linea", "descargar", "ebook"],
    examples: [
      "lo tienen en pdf", "puedo leerlo en linea", "como leo un libro digital",
      "hay libros digitales", "quiero verlo en digital", "se puede descargar el libro",
    ],
    answer:
      "Si un libro tiene versión digital, en la Biblioteca verás la opción para abrirlo en el visor y leerlo dentro de la plataforma. Si no aparece, ese título solo está en físico.",
    actions: [{ label: "Abrir biblioteca", route: "/catalogo", icon: "ph-book-open" }],
    suggestions: [{ label: "Buscar un libro", prompt: "Quiero buscar un libro digital" }],
  },
  {
    id: "loans",
    category: "Biblioteca",
    title: "Préstamos",
    priority: 9,
    keywords: ["prestamo", "prestamos", "prestar", "pedir libro", "devolver", "devolucion", "vencimiento", "renovar"],
    examples: [
      "como pido un prestamo", "me prestan un libro", "quiero sacar un libro", "como solicito un prestamo",
      "cuando tengo que devolver el libro", "puedo renovar mi prestamo", "cuantos libros me prestan",
      "como funcionan los prestamos",
    ],
    answer:
      "Los préstamos de libros físicos se hacen en persona en la biblioteca: revisa primero que el libro esté disponible en el catálogo y acude con la bibliotecaria. Tus préstamos y sus fechas de vencimiento aparecen en Mis préstamos.",
    actions: [
      { label: "Ver catálogo", route: "/catalogo", icon: "ph-book-bookmark" },
      { label: "Mis préstamos", route: "/my-loans", icon: "ph-clock-counter-clockwise" },
    ],
    suggestions: [
      { label: "Mis préstamos", prompt: "¿Tengo préstamos activos?" },
      { label: "Buscar un libro", prompt: "Quiero buscar un libro" },
    ],
  },
  {
    id: "student_materials",
    category: "Materiales",
    title: "Materiales de clase",
    priority: 8,
    search: "materials",
    keywords: ["material", "materiales", "apuntes", "recursos", "archivo", "presentacion", "guia", "clase"],
    examples: [
      "donde estan los materiales de clase", "busco apuntes de", "material de mi materia",
      "que subio el profesor", "recursos de la materia", "hay material de anatomia",
      "donde descargo las presentaciones",
    ],
    answer:
      "En Materiales están los recursos que publican tus docentes; puedes filtrarlos por materia, semestre o docente. Si me dices la materia, busco lo que hay.",
    actions: [{ label: "Ver materiales", route: "/materiales", icon: "ph-folder-open" }],
    suggestions: [{ label: "Buscar libro", prompt: "Busco un libro de la misma materia" }],
  },
  {
    id: "teacher_materials",
    category: "Materiales",
    title: "Publicar materiales (docentes)",
    priority: 7,
    keywords: ["subir material", "publicar material", "publicar apuntes", "subir apuntes", "mis materiales", "cargar archivo", "compartir material"],
    examples: [
      "como subo material", "quiero publicar mis apuntes", "como publico apuntes", "soy docente como subo material",
      "compartir material con mis alumnos",
      "como cargo un archivo para mi clase", "editar un material que subi",
    ],
    answer:
      "En Mis materiales puedes subir, editar o desactivar tus recursos y asignarles materia y semestre. Para que tus estudiantes los vean, déjalos activos y con visibilidad pública.",
    actions: [{ label: "Mis materiales", route: "/materiales-doc", icon: "ph-upload-simple" }],
    suggestions: [{ label: "Vista de estudiantes", prompt: "¿Dónde ven los alumnos los materiales?" }],
  },
  {
    id: "magazines",
    category: "Tienda",
    title: "Revistas",
    priority: 7,
    search: "magazines",
    keywords: ["revista", "revistas", "tienda", "comprar revista", "precio"],
    examples: [
      "que revistas venden", "quiero comprar una revista", "cuanto cuesta la revista",
      "tienen revistas", "revistas disponibles",
    ],
    answer:
      "En la Tienda ves las revistas disponibles con su precio. Las agregas al carrito, pagas y quedan en Mis compras para leerlas cuando quieras.",
    actions: [{ label: "Abrir tienda", route: "/magazines", icon: "ph-storefront" }],
    suggestions: [{ label: "Mis compras", prompt: "¿Dónde veo mis compras?" }],
  },
  {
    id: "cart_checkout",
    category: "Tienda",
    title: "Carrito y pago",
    priority: 6,
    keywords: ["carrito", "pagar", "pago", "checkout", "finalizar compra", "metodo de pago"],
    examples: [
      "como pago", "quiero terminar mi compra", "como funciona el carrito",
      "donde esta mi carrito", "con que puedo pagar",
    ],
    answer:
      "Agrega las revistas al carrito, revisa el resumen y continúa al pago. Al confirmarse, la compra aparece en Mis compras.",
    actions: [
      { label: "Carrito", route: "/cart", icon: "ph-shopping-cart-simple" },
      { label: "Tienda", route: "/magazines", icon: "ph-storefront" },
    ],
    suggestions: [{ label: "Mis compras", prompt: "¿Dónde veo mis compras?" }],
  },
  {
    id: "purchases",
    category: "Tienda",
    title: "Mis compras",
    priority: 6,
    keywords: ["mis compras", "historial de compras", "compre", "revistas compradas"],
    examples: [
      "donde veo lo que compre", "donde estan mis compras", "ya pague donde esta mi revista",
      "como leo una revista que compre",
    ],
    answer:
      "Tus revistas compradas están en Mis compras; desde ahí las abres para leerlas.",
    actions: [{ label: "Mis compras", route: "/my-purchases", icon: "ph-receipt" }],
    suggestions: [{ label: "Revistas", prompt: "¿Qué revistas hay?" }],
  },
  {
    id: "news",
    category: "Institucional",
    title: "Noticias",
    priority: 7,
    search: "news",
    keywords: ["noticia", "noticias", "aviso", "avisos", "comunicado", "novedades", "anuncio"],
    examples: [
      "que hay de nuevo", "hay algun aviso", "ultimas noticias", "que noticias hay",
      "que publicaron", "hay comunicados nuevos",
    ],
    answer: "Estas son las noticias publicadas más recientes.",
    emptyAnswer: "Por ahora no hay noticias publicadas.",
    actions: [{ label: "Ver noticias", route: "/noticias", icon: "ph-newspaper" }],
    suggestions: [{ label: "Eventos", prompt: "¿Qué eventos hay?" }],
  },
  {
    id: "events",
    category: "Institucional",
    title: "Eventos",
    priority: 7,
    search: "events",
    keywords: ["evento", "eventos", "actividad", "actividades", "congreso", "conferencia", "taller", "agenda"],
    examples: [
      "que eventos hay", "hay algo esta semana", "que actividades tienen", "proximos eventos",
      "quiero ir a un evento", "cuando es el congreso", "hay talleres",
    ],
    answer: "Estos son los eventos publicados.",
    emptyAnswer: "Por ahora no hay eventos publicados.",
    actions: [{ label: "Ver eventos", route: "/eventos", icon: "ph-calendar-blank" }],
    suggestions: [{ label: "Calendario escolar", prompt: "¿Dónde veo el calendario escolar?" }],
  },
  {
    id: "calendar",
    category: "Institucional",
    title: "Calendario escolar",
    priority: 7,
    search: "calendar",
    keywords: ["calendario", "fechas", "vacaciones", "inicio de clases", "fin de semestre", "periodo", "ciclo escolar"],
    examples: [
      "cuando empiezan las clases", "cuando son las vacaciones", "fechas del semestre",
      "calendario escolar", "cuando termina el semestre", "fechas importantes del ciclo",
    ],
    answer: "Las fechas oficiales del ciclo están en el calendario escolar.",
    emptyAnswer: "Aún no hay un calendario escolar publicado.",
    actions: [{ label: "Abrir calendario", route: "/calendario", icon: "ph-calendar" }],
    suggestions: [{ label: "Eventos", prompt: "¿Qué eventos hay?" }],
  },
  {
    id: "about",
    category: "Institucional",
    title: "Sobre el instituto",
    priority: 5,
    search: "about",
    keywords: ["instituto", "tiozihuatl", "mision", "vision", "valores", "historia", "quienes somos"],
    examples: [
      "quienes son", "cual es la mision del instituto", "cual es la vision", "que valores tienen",
      "historia del instituto", "que es tiozihuatl",
    ],
    answer: "Esto es lo que el instituto comparte sobre sí mismo.",
    emptyAnswer: "La información institucional está en Quiénes somos.",
    actions: [{ label: "Quiénes somos", route: "/about", icon: "ph-buildings" }],
    suggestions: [{ label: "Noticias", prompt: "¿Qué noticias hay?" }],
  },
  {
    id: "legal",
    category: "Institucional",
    title: "Privacidad y términos",
    priority: 4,
    keywords: ["privacidad", "terminos", "condiciones", "aviso de privacidad", "datos personales", "politica"],
    examples: [
      "aviso de privacidad", "terminos y condiciones", "que hacen con mis datos",
      "politica de privacidad",
    ],
    answer:
      "El aviso de privacidad explica cómo se usan tus datos y los términos describen las reglas de uso de la plataforma.",
    actions: [
      { label: "Privacidad", route: "/privacidad", icon: "ph-shield-check" },
      { label: "Términos", route: "/terminos", icon: "ph-file-doc" },
    ],
    suggestions: [],
  },
];
