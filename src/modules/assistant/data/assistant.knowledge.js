export const STARTER_PROMPTS = [
  "Quiero buscar un libro",
  "¿Cómo pido un préstamo?",
  "¿Qué eventos hay?",
  "Quiero hablar con alguien",
  "Olvidé mi contraseña",
  "¿Qué puedo hacer como estudiante?",
];

export const FALLBACK_SUGGESTIONS = [
  { label: "Biblioteca", prompt: "Quiero ayuda con la biblioteca" },
  { label: "Prestamos", prompt: "Como funcionan los prestamos?" },
  { label: "Materiales", prompt: "Como encuentro materiales?" },
  { label: "Contacto", prompt: "Donde puedo contactar al instituto?" },
  { label: "Cuenta", prompt: "Ayuda con mi cuenta o contrasena" },
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
  { route: "/contactanos", topicId: "contact" },
  { route: "/about", topicId: "about" },
  { route: "/perfil", topicId: "profile" },
  { route: "/login", topicId: "login" },
  { route: "/register", topicId: "register" },
  { route: "/forgot-password", topicId: "password" },
  { route: "/reset-password", topicId: "password" },
  { route: "/admin/usuarios", topicId: "admin_users" },
  { route: "/admin/noticias", topicId: "admin_news_events" },
  { route: "/admin/eventos", topicId: "admin_news_events" },
  { route: "/admin/libros", topicId: "admin_library" },
  { route: "/admin/prestamos", topicId: "admin_loans" },
  { route: "/admin/materiales", topicId: "admin_materials" },
  { route: "/admin/calendario-admin", topicId: "admin_calendar" },
  { route: "/admin/monitoreo", topicId: "admin_operations" },
  { route: "/admin/backups", topicId: "admin_operations" },
  { route: "/admin/mantenimiento", topicId: "admin_operations" },
  { route: "/admin/privacidad", topicId: "legal" },
  { route: "/admin/terminos", topicId: "legal" },
];

export const ASSISTANT_TOPICS = [
  {
    id: "greeting",
    category: "Atencion",
    title: "Saludo y alcance",
    priority: 2,
    keywords: [
      "hola", "buenos", "buenas", "saludos", "hey", "ola", "ayuda", "asistente",
      "chat", "bot", "soporte", "orientacion", "orientame", "guia", "guiame",
    ],
    phrases: [
      "que puedes hacer", "en que me ayudas", "necesito ayuda", "puedes ayudarme",
      "asistente virtual", "como funciona el asistente",
    ],
    answer:
      "¡Hola! Qué gusto saludarte. Cuéntame qué necesitas hacer y te acompaño paso a paso. Puedo ayudarte con biblioteca, préstamos, materiales, noticias, eventos, contacto, tu cuenta o las funciones administrativas que correspondan a tu rol.",
    actions: [
      { label: "Ir a inicio", route: "/inicio", icon: "ph-house" },
      { label: "Ver contacto", route: "/contactanos", icon: "ph-envelope" },
    ],
    suggestions: [
      { label: "Buscar libro", prompt: "Como busco un libro?" },
      { label: "Prestamos", prompt: "Como solicito un prestamo?" },
      { label: "Eventos", prompt: "Que eventos hay?" },
    ],
  },
  {
    id: "navigation",
    category: "Navegacion",
    title: "Orientacion dentro de la plataforma",
    priority: 4,
    keywords: [
      "navegar", "menu", "seccion", "pagina", "ir", "donde", "ubicacion", "ruta",
      "enlace", "boton", "opcion", "apartado", "modulo", "plataforma", "sitio",
      "inicio", "principal",
    ],
    phrases: [
      "donde esta", "a donde voy", "como entro", "como llegar", "no encuentro",
      "que ruta", "donde puedo ver", "donde puedo encontrar",
    ],
    answer:
      "Para moverte rapido, usa el menu superior. En Institucional encuentras noticias, eventos, calendario y contacto. Biblioteca abre el catalogo de libros. Tienda abre revistas. Si ya iniciaste sesion, el menu de perfil muestra accesos segun tu rol: perfil, prestamos, compras, materiales o panel de administracion.\n\nSi me dices que quieres hacer, puedo llevarte a la ruta exacta y explicarte el siguiente paso.",
    actions: [
      { label: "Inicio", route: "/inicio", icon: "ph-house" },
      { label: "Biblioteca", route: "/catalogo", icon: "ph-book-bookmark" },
      { label: "Contacto", route: "/contactanos", icon: "ph-envelope" },
    ],
    suggestions: [
      { label: "Mapa de secciones", prompt: "Que secciones tiene la plataforma?" },
      { label: "Soy estudiante", prompt: "Que puedo hacer como estudiante?" },
      { label: "Soy docente", prompt: "Que puedo hacer como docente?" },
    ],
  },
  {
    id: "login",
    category: "Cuenta",
    title: "Inicio de sesion",
    priority: 7,
    keywords: [
      "login", "iniciar", "ingresar", "entrar", "sesion", "acceder", "acceso",
      "correo", "matricula", "credencial", "password", "contrasena", "autenticar",
      "entrar al sistema",
    ],
    phrases: [
      "iniciar sesion", "no puedo entrar", "como ingreso", "como accedo",
      "entrar a mi cuenta", "acceder a mi cuenta", "mi sesion",
    ],
    answer:
      "Para iniciar sesion entra a la pantalla de acceso, escribe tu credencial y contrasena, y selecciona el rol que corresponde a tu cuenta. Algunas cuentas usan correo y otras matricula, segun el tipo de usuario registrado.\n\nSi el sistema indica error de token o sesion expirada, cierra sesion, vuelve a entrar y evita tener varias pestanas antiguas con la sesion abierta.",
    actions: [
      { label: "Iniciar sesion", route: "/login", icon: "ph-sign-in" },
      { label: "Recuperar contrasena", route: "/forgot-password", icon: "ph-key" },
    ],
    suggestions: [
      { label: "Olvide mi contrasena", prompt: "Olvide mi contrasena" },
      { label: "Registro", prompt: "Como me registro?" },
      { label: "Activacion", prompt: "Como activo mi cuenta?" },
    ],
  },
  {
    id: "register",
    category: "Cuenta",
    title: "Registro de usuario",
    priority: 7,
    keywords: [
      "registro", "registrar", "crear", "cuenta", "alta", "nuevo", "usuario",
      "inscribirme", "formulario", "pre registro", "preregistro", "correo",
      "telefono", "datos",
    ],
    phrases: [
      "crear cuenta", "registrarme", "como me registro", "nueva cuenta",
      "hacer registro", "darme de alta", "pre registro",
    ],
    answer:
      "Para crear tu cuenta, entra a Registro y completa los datos solicitados. El sistema valida correo y telefono para evitar duplicados. Despues puede enviarse un proceso de verificacion o activacion, segun la configuracion de la cuenta.\n\nUsa datos reales y revisa bien el correo, porque ahi llegan avisos de verificacion, recuperacion o activacion.",
    actions: [
      { label: "Registrarme", route: "/register", icon: "ph-user-plus" },
      { label: "Verificar correo", route: "/verificar-correo", icon: "ph-envelope-simple" },
    ],
    suggestions: [
      { label: "Activar cuenta", prompt: "Como activo mi cuenta?" },
      { label: "Ya tengo cuenta", prompt: "Como inicio sesion?" },
    ],
  },
  {
    id: "activation",
    category: "Cuenta",
    title: "Activacion de cuenta",
    priority: 7,
    keywords: [
      "activar", "activacion", "token", "verificar", "verificacion", "correo",
      "enlace", "link", "pendiente", "pending", "cuenta activa",
    ],
    phrases: [
      "activar cuenta", "cuenta pendiente", "verificar correo", "link de activacion",
      "enlace de activacion", "mi cuenta no esta activa",
    ],
    answer:
      "Si recibiste un enlace de activacion, abrelo y completa la configuracion solicitada. Si el enlace vencio o tu cuenta aparece pendiente, solicita apoyo para regenerar el enlace desde el area responsable o intenta el flujo indicado en la pantalla de activacion.\n\nCuando la cuenta queda activa, ya puedes iniciar sesion con tu credencial y rol.",
    actions: [
      { label: "Activar cuenta", route: "/activar", icon: "ph-check-circle" },
      { label: "Contacto", route: "/contactanos", icon: "ph-envelope" },
    ],
    suggestions: [
      { label: "No puedo entrar", prompt: "No puedo iniciar sesion" },
      { label: "Recuperar clave", prompt: "Olvide mi contrasena" },
    ],
  },
  {
    id: "password",
    category: "Cuenta",
    title: "Recuperacion de contrasena",
    priority: 8,
    keywords: [
      "contrasena", "password", "clave", "recuperar", "restablecer", "reset",
      "olvide", "olvidada", "cambiar", "codigo", "palabra", "secreta",
      "bloqueado", "bloqueada",
    ],
    phrases: [
      "olvide mi contrasena", "recuperar contrasena", "restablecer contrasena",
      "cambiar mi contrasena", "no recuerdo mi clave", "palabra secreta",
    ],
    answer:
      "Para recuperar tu contrasena, abre Recuperar contrasena, escribe el correo registrado y la palabra secreta si el sistema la solicita. Despues sigue el enlace o token de restablecimiento y crea una nueva contrasena.\n\nSi ya iniciaste sesion y solo quieres cambiarla, entra a tu perfil y usa la opcion de cambio de contrasena.",
    actions: [
      { label: "Recuperar", route: "/forgot-password", icon: "ph-key" },
      { label: "Mi perfil", route: "/perfil", icon: "ph-user-gear" },
    ],
    suggestions: [
      { label: "Inicio de sesion", prompt: "Como inicio sesion?" },
      { label: "Activacion", prompt: "Mi cuenta esta pendiente de activacion" },
    ],
  },
  {
    id: "profile",
    category: "Cuenta",
    title: "Perfil de usuario",
    priority: 6,
    keywords: [
      "perfil", "mis datos", "datos personales", "telefono", "correo", "nombre",
      "editar", "actualizar", "cambiar datos", "mi cuenta", "configuracion",
      "seguridad", "eliminar cuenta",
    ],
    phrases: [
      "actualizar mi perfil", "editar mi perfil", "cambiar mis datos",
      "ver mi cuenta", "mi informacion", "datos de usuario",
    ],
    answer:
      "En Mi Perfil puedes consultar y actualizar datos de tu cuenta. Desde ahi tambien puedes realizar acciones de seguridad disponibles para tu usuario, como cambio de contrasena.\n\nSi una actualizacion no se guarda, revisa que la sesion este activa y que los campos obligatorios no esten vacios.",
    actions: [
      { label: "Abrir perfil", route: "/perfil", icon: "ph-user-gear" },
      { label: "Cambiar contrasena", route: "/perfil", icon: "ph-lock-key" },
    ],
    suggestions: [
      { label: "Cerrar sesion", prompt: "Como cierro sesion?" },
      { label: "Recuperar clave", prompt: "Como cambio mi contrasena?" },
    ],
  },
  {
    id: "logout",
    category: "Cuenta",
    title: "Cerrar sesion",
    priority: 5,
    keywords: [
      "salir", "cerrar", "logout", "sesion", "desconectar", "terminar", "cerrarme",
    ],
    phrases: [
      "cerrar sesion", "salir de mi cuenta", "cerrar mi cuenta", "terminar sesion",
    ],
    answer:
      "Para cerrar sesion, abre el menu de usuario en la parte superior y selecciona Cerrar Sesion. En el panel administrativo tambien existe un boton de salida en la barra lateral.\n\nCuando cierres sesion se eliminan los tokens locales y tendras que autenticarte de nuevo para entrar a modulos protegidos.",
    actions: [
      { label: "Ir a perfil", route: "/perfil", icon: "ph-user" },
      { label: "Inicio", route: "/inicio", icon: "ph-house" },
    ],
    suggestions: [
      { label: "Iniciar sesion", prompt: "Como inicio sesion?" },
      { label: "Problemas de acceso", prompt: "No puedo entrar a mi cuenta" },
    ],
  },
  {
    id: "roles",
    category: "Cuenta",
    title: "Roles y permisos",
    priority: 5,
    keywords: [
      "rol", "roles", "permiso", "permisos", "estudiante", "docente",
      "administrador", "bibliotecario", "acceso", "autorizacion", "bloqueado",
      "no autorizado",
    ],
    phrases: [
      "que puedo hacer", "segun mi rol", "no tengo permiso", "me sale no autorizado",
      "acceso denegado", "soy estudiante", "soy docente", "soy administrador",
    ],
    answer:
      "La plataforma muestra opciones segun tu rol. Estudiantes pueden consultar biblioteca, materiales, prestamos y compras. Docentes pueden administrar sus materiales. Administradores acceden al panel de gestion. Bibliotecarios pueden participar en flujos relacionados con biblioteca, segun la configuracion del sistema.\n\nSi ves No autorizado, probablemente iniciaste sesion con un rol distinto o tu cuenta no tiene permiso para esa seccion.",
    actions: [
      { label: "Inicio", route: "/inicio", icon: "ph-house" },
      { label: "Mi perfil", route: "/perfil", icon: "ph-user" },
    ],
    suggestions: [
      { label: "Estudiante", prompt: "Que puedo hacer como estudiante?" },
      { label: "Docente", prompt: "Que puedo hacer como docente?" },
      { label: "Admin", prompt: "Que puedo hacer como administrador?" },
    ],
  },
  {
    id: "catalog",
    category: "Biblioteca",
    title: "Catalogo bibliografico",
    priority: 9,
    keywords: [
      "biblioteca", "catalogo", "libro", "libros", "buscar", "busqueda", "autor",
      "autores", "materia", "materias", "semestre", "fisico", "digital", "pdf",
      "existencia", "disponible", "disponibles", "ejemplar", "ejemplares",
    ],
    phrases: [
      "buscar libro", "buscar un libro", "catalogo bibliografico", "ver libros",
      "libros disponibles", "libro fisico", "libro digital", "por materia",
      "por autor", "por semestre", "hay un libro",
    ],
    answer:
      "En Biblioteca puedes buscar libros por titulo, autor, materia, formato y semestre. Cada resultado indica si tiene formato fisico, digital o ambos. Si el libro es digital, puedes abrirlo desde el visor. Si es fisico y hay disponibilidad, puedes solicitar prestamo si tu rol lo permite.\n\nPara una busqueda precisa, escribe titulo, autor o materia. Tambien puedes preguntarme por un libro especifico y revisare coincidencias en el catalogo.",
    actions: [
      { label: "Abrir catalogo", route: "/catalogo", icon: "ph-book-bookmark" },
      { label: "Mis prestamos", route: "/my-loans", icon: "ph-books" },
    ],
    suggestions: [
      { label: "Prestamo", prompt: "Como solicito un prestamo fisico?" },
      { label: "Libro digital", prompt: "Como leo un libro digital?" },
      { label: "Buscar por materia", prompt: "Como filtro libros por materia?" },
    ],
  },
  {
    id: "digital_books",
    category: "Biblioteca",
    title: "Libros digitales y visor",
    priority: 8,
    keywords: [
      "digital", "pdf", "visor", "leer", "lectura", "abrir", "preview", "vista",
      "documento", "libro digital", "descargar", "visualizar",
    ],
    phrases: [
      "leer libro digital", "abrir pdf", "ver pdf", "visor de libro",
      "libro en linea", "como leo un libro", "pdf del libro",
    ],
    answer:
      "Cuando un libro tiene formato digital, el catalogo muestra una accion para abrir el visor. El visor carga el PDF seguro y te permite consultar el material dentro de la plataforma.\n\nSi no aparece la opcion digital, ese libro probablemente solo tiene formato fisico o no cuenta con PDF activo.",
    actions: [
      { label: "Catalogo", route: "/catalogo", icon: "ph-book-open" },
    ],
    suggestions: [
      { label: "Buscar libro", prompt: "Quiero buscar un libro digital" },
      { label: "Prestamo fisico", prompt: "Como solicito un prestamo?" },
    ],
  },
  {
    id: "loans",
    category: "Biblioteca",
    title: "Prestamos de libros",
    priority: 10,
    keywords: [
      "prestamo", "prestamos", "solicitar", "pedir", "tomar", "renovar",
      "devolver", "devolucion", "vencimiento", "vencido", "pendiente",
      "fisico", "libro fisico", "bibliotecario", "stock",
      "solicito", "solicitud", "solicitudes",
    ],
    phrases: [
      "solicitar prestamo", "pedir prestamo", "mis prestamos", "prestamo fisico",
      "libro prestado", "devolver libro", "fecha de vencimiento",
      "cuantos prestamos", "limite de prestamos",
      "como solicito un prestamo", "como pedir un prestamo",
    ],
    answer:
      "Los prestamos aplican para libros fisicos y requieren sesion de estudiante. El sistema permite solicitar prestamos de lunes a viernes, de 10:00 a 16:00, y maneja un limite de 3 prestamos pendientes por estudiante.\n\nPara solicitar uno, entra al catalogo, localiza un libro fisico con disponibilidad y usa la accion de prestamo. Despues puedes revisar estado y vencimiento en Mis Prestamos.",
    actions: [
      { label: "Catalogo", route: "/catalogo", icon: "ph-book-bookmark" },
      { label: "Mis prestamos", route: "/my-loans", icon: "ph-clock-counter-clockwise" },
    ],
    suggestions: [
      { label: "Disponibilidad", prompt: "Como se si un libro esta disponible?" },
      { label: "Vencimiento", prompt: "Donde veo el vencimiento de mis prestamos?" },
      { label: "Libro digital", prompt: "Puedo leer libros digitales?" },
    ],
  },
  {
    id: "student_materials",
    category: "Materiales",
    title: "Materiales para estudiantes",
    priority: 8,
    keywords: [
      "material", "materiales", "recurso", "recursos", "apunte", "apuntes",
      "archivo", "documento", "descargar", "materia", "semestre", "docente",
      "estudiante", "alumno", "clase", "publico",
    ],
    phrases: [
      "ver materiales", "materiales de clase", "materiales por materia",
      "materiales por semestre", "materiales del docente", "recursos educativos",
      "descargar material",
    ],
    answer:
      "En Materiales puedes consultar recursos publicados por docentes. La vista permite buscar por texto y filtrar por docente, tipo, materia o semestre. Si tu cuenta es de estudiante, el menu puede mostrar el acceso directo a esta seccion.\n\nSi no ves materiales, prueba quitar filtros o revisar que tu sesion corresponda al rol Estudiante.",
    actions: [
      { label: "Ver materiales", route: "/materiales", icon: "ph-folder-open" },
      { label: "Mi perfil", route: "/perfil", icon: "ph-user" },
    ],
    suggestions: [
      { label: "Por docente", prompt: "Como busco materiales de un docente?" },
      { label: "Por materia", prompt: "Como filtro materiales por materia?" },
    ],
  },
  {
    id: "teacher_materials",
    category: "Materiales",
    title: "Materiales para docentes",
    priority: 8,
    keywords: [
      "docente", "profesor", "maestro", "subir", "cargar", "publicar",
      "material", "materiales", "archivo", "visibilidad", "editar", "eliminar",
      "mis materiales",
    ],
    phrases: [
      "subir material", "publicar material", "mis materiales", "material docente",
      "editar material", "eliminar material", "cargar archivo",
    ],
    answer:
      "Como docente, usa Mis Materiales para subir, editar o desactivar recursos. Al crear un material puedes asociarlo con materias y semestres, ademas de definir tipo y visibilidad.\n\nSi el material debe verlo el alumnado, revisa que este activo y con visibilidad publica cuando corresponda.",
    actions: [
      { label: "Mis materiales", route: "/materiales-doc", icon: "ph-upload-simple" },
      { label: "Materiales publicos", route: "/materiales", icon: "ph-folder" },
    ],
    suggestions: [
      { label: "Estudiantes", prompt: "Como ven los estudiantes mis materiales?" },
      { label: "Permisos", prompt: "No puedo entrar a materiales-doc" },
    ],
  },
  {
    id: "magazines",
    category: "Tienda",
    title: "Revistas y tienda",
    priority: 8,
    keywords: [
      "tienda", "revista", "revistas", "magazine", "magazines", "comprar",
      "precio", "stock", "catalogo", "producto", "pdf", "lectura",
    ],
    phrases: [
      "comprar revista", "ver revistas", "catalogo de revistas", "tienda de revistas",
      "revista digital", "precio de revista",
    ],
    answer:
      "La Tienda muestra revistas activas con stock disponible. Puedes revisar detalle, agregar al carrito y completar la compra. Despues de comprar, tus revistas quedan en Mis Compras y puedes abrir el PDF seguro desde la plataforma.\n\nSi no aparece una revista, puede estar sin stock o inactiva.",
    actions: [
      { label: "Abrir tienda", route: "/magazines", icon: "ph-shopping-cart" },
      { label: "Mis compras", route: "/my-purchases", icon: "ph-receipt" },
    ],
    suggestions: [
      { label: "Carrito", prompt: "Como funciona el carrito?" },
      { label: "Mis compras", prompt: "Donde veo mis compras?" },
    ],
  },
  {
    id: "cart_checkout",
    category: "Tienda",
    title: "Carrito y checkout",
    priority: 8,
    keywords: [
      "carrito", "cart", "checkout", "pagar", "pago", "compra", "comprar",
      "efectivo", "debito", "credito", "metodo", "total", "confirmar",
    ],
    phrases: [
      "agregar al carrito", "ver carrito", "finalizar compra", "completar compra",
      "metodo de pago", "procesar pago",
    ],
    answer:
      "El flujo de compra inicia en Tienda. Agrega revistas al carrito, revisa el resumen y continua a Checkout para confirmar el metodo de pago. Cuando la compra queda pagada, el sistema descuenta stock y habilita el acceso al contenido comprado.\n\nSi un pago falla, revisa el metodo seleccionado y vuelve a intentarlo desde el carrito o checkout.",
    actions: [
      { label: "Carrito", route: "/cart", icon: "ph-shopping-cart-simple" },
      { label: "Checkout", route: "/checkout", icon: "ph-credit-card" },
      { label: "Tienda", route: "/magazines", icon: "ph-storefront" },
    ],
    suggestions: [
      { label: "Mis compras", prompt: "Donde veo revistas compradas?" },
      { label: "Revistas", prompt: "Que revistas hay disponibles?" },
    ],
  },
  {
    id: "purchases",
    category: "Tienda",
    title: "Mis compras",
    priority: 7,
    keywords: [
      "compras", "mis compras", "historial", "comprado", "pagado", "recibo",
      "revistas compradas", "lectura", "progreso",
    ],
    phrases: [
      "ver mis compras", "revistas compradas", "historial de compras",
      "donde veo mis compras", "leer compra",
    ],
    answer:
      "En Mis Compras puedes ver las revistas que compraste correctamente. Desde ahi se abre el PDF seguro y, si el modulo lo tiene activo, se puede guardar progreso de lectura.\n\nSi una compra no aparece, confirma que el pago haya finalizado y que estes usando la misma cuenta.",
    actions: [
      { label: "Mis compras", route: "/my-purchases", icon: "ph-receipt" },
      { label: "Tienda", route: "/magazines", icon: "ph-storefront" },
    ],
    suggestions: [
      { label: "Checkout", prompt: "Como completo una compra?" },
      { label: "PDF seguro", prompt: "Como abro una revista comprada?" },
    ],
  },
  {
    id: "news",
    category: "Institucional",
    title: "Noticias",
    priority: 7,
    keywords: [
      "noticia", "noticias", "novedad", "novedades", "aviso", "avisos",
      "comunicado", "publicacion", "institucional", "reciente", "ultimas",
    ],
    phrases: [
      "ultimas noticias", "ver noticias", "noticias recientes", "hay noticias",
      "noticia institucional", "comunicados recientes",
    ],
    answer:
      "La seccion Noticias publica comunicados institucionales activos. Desde Inicio tambien puedes ver noticias destacadas o recientes y abrir cada detalle.\n\nSi me preguntas por una noticia especifica, buscare coincidencias publicadas por titulo o contenido.",
    actions: [
      { label: "Ver noticias", route: "/noticias", icon: "ph-newspaper" },
      { label: "Inicio", route: "/inicio", icon: "ph-house" },
    ],
    suggestions: [
      { label: "Eventos", prompt: "Que eventos hay?" },
      { label: "Calendario", prompt: "Donde veo el calendario escolar?" },
    ],
  },
  {
    id: "events",
    category: "Institucional",
    title: "Eventos",
    priority: 7,
    keywords: [
      "evento", "eventos", "actividad", "actividades", "agenda", "programa",
      "fecha", "ubicacion", "virtual", "presencial", "destacado", "proximos",
    ],
    phrases: [
      "proximos eventos", "ver eventos", "eventos recientes", "actividades",
      "eventos disponibles", "agenda institucional", "evento presencial",
      "evento virtual",
    ],
    answer:
      "En Eventos encuentras actividades institucionales publicadas o finalizadas. Cada evento puede incluir fecha, ubicacion si es presencial, enlace si es virtual e imagenes del evento.\n\nPuedo buscar eventos por titulo, descripcion, ubicacion o tipo si escribes lo que necesitas.",
    actions: [
      { label: "Ver eventos", route: "/eventos", icon: "ph-calendar-blank" },
      { label: "Calendario", route: "/calendario", icon: "ph-calendar" },
    ],
    suggestions: [
      { label: "Calendario", prompt: "Donde veo fechas escolares?" },
      { label: "Contacto", prompt: "Quiero preguntar por un evento" },
    ],
  },
  {
    id: "calendar",
    category: "Institucional",
    title: "Calendario escolar",
    priority: 7,
    keywords: [
      "calendario", "fecha", "fechas", "escolar", "docente", "estudiante",
      "periodo", "periodos", "horario", "clases", "vacaciones", "inicio",
      "fin", "pdf", "archivo",
    ],
    phrases: [
      "calendario escolar", "ver calendario", "fechas importantes",
      "calendario docente", "calendario estudiante", "periodo escolar",
    ],
    answer:
      "El modulo Calendario muestra calendarios activos por tipo, como estudiante o docente, segun lo publicado por administracion. Si existe un archivo activo, podras consultarlo desde la pagina.\n\nTambien puedes revisar noticias y eventos para avisos relacionados con fechas institucionales.",
    actions: [
      { label: "Abrir calendario", route: "/calendario", icon: "ph-calendar" },
      { label: "Noticias", route: "/noticias", icon: "ph-newspaper" },
    ],
    suggestions: [
      { label: "Eventos", prompt: "Que eventos hay en la agenda?" },
      { label: "Contacto", prompt: "A quien contacto por fechas?" },
    ],
  },
  {
    id: "contact",
    category: "Institucional",
    title: "Contacto institucional",
    priority: 8,
    keywords: [
      "contacto", "contactar", "telefono", "correo", "email", "direccion",
      "ubicacion", "whatsapp", "facebook", "instagram", "twitter", "horario",
      "atencion", "ayuda", "soporte",
    ],
    phrases: [
      "como contacto", "datos de contacto", "numero de telefono", "correo del instituto",
      "donde esta ubicado", "horario de atencion", "necesito hablar",
    ],
    answer:
      "En Contacto se publica la informacion institucional activa: telefono, correo, direccion, horario y redes disponibles. Es la mejor ruta si necesitas atencion directa o confirmacion de un tramite.\n\nSi tu consulta es sobre una cuenta, incluye tu correo o matricula cuando contactes al area correspondiente.",
    actions: [
      { label: "Ver contacto", route: "/contactanos", icon: "ph-envelope" },
    ],
    suggestions: [
      { label: "Recuperar cuenta", prompt: "No puedo entrar a mi cuenta" },
      { label: "Eventos", prompt: "Tengo una duda de eventos" },
    ],
  },
  {
    id: "about",
    category: "Institucional",
    title: "Quienes somos",
    priority: 6,
    keywords: [
      "quienes", "somos", "instituto", "tiozihuatl", "historia", "mision",
      "vision", "valores", "acerca", "institucional", "informacion",
    ],
    phrases: [
      "quienes somos", "sobre el instituto", "acerca del instituto", "mision vision",
      "informacion institucional",
    ],
    answer:
      "La seccion Quienes Somos presenta informacion institucional publicada por administracion, como contenidos de identidad, descripcion, mision, vision u otros bloques activos.\n\nSi necesitas informacion formal o de contacto, revisa tambien la pagina de Contacto.",
    actions: [
      { label: "Quienes somos", route: "/about", icon: "ph-buildings" },
      { label: "Contacto", route: "/contactanos", icon: "ph-envelope" },
    ],
    suggestions: [
      { label: "Noticias", prompt: "Hay noticias del instituto?" },
      { label: "Calendario", prompt: "Quiero ver el calendario escolar" },
    ],
  },
  {
    id: "legal",
    category: "Legal",
    title: "Privacidad, terminos y seguridad",
    priority: 6,
    keywords: [
      "privacidad", "terminos", "condiciones", "seguridad", "legal", "politica",
      "datos", "proteccion", "aviso", "normas", "uso", "cuenta",
    ],
    phrases: [
      "politica de privacidad", "terminos y condiciones", "seguridad de datos",
      "proteccion de datos", "aviso de privacidad",
    ],
    answer:
      "Las paginas legales explican privacidad, terminos de uso y recomendaciones de seguridad. Son publicas y estan disponibles desde la plataforma.\n\nPara asuntos de datos personales o cambios en informacion sensible, utiliza tambien la seccion de Contacto.",
    actions: [
      { label: "Privacidad", route: "/privacidad", icon: "ph-shield-check" },
      { label: "Terminos", route: "/terminos", icon: "ph-file-doc" },
      { label: "Seguridad", route: "/seguridad", icon: "ph-lock" },
    ],
    suggestions: [
      { label: "Cuenta", prompt: "Como protejo mi cuenta?" },
      { label: "Contacto", prompt: "Necesito contacto institucional" },
    ],
  },
  {
    id: "faq",
    category: "Ayuda",
    title: "Preguntas frecuentes",
    priority: 5,
    keywords: [
      "faq", "pregunta", "preguntas", "frecuente", "frecuentes", "duda",
      "dudas", "respuesta", "respuestas", "ayuda",
    ],
    phrases: [
      "preguntas frecuentes", "tengo una duda", "resolver duda", "faq",
    ],
    answer:
      "El sistema cuenta con preguntas frecuentes administrables. Cuando tu consulta coincide con una FAQ activa, te mostrare la respuesta publicada y, si aplica, un acceso directo al modulo relacionado.\n\nTambien puedo combinar esa informacion con guias de navegacion y datos publicos actuales.",
    actions: [
      { label: "Contacto", route: "/contactanos", icon: "ph-envelope" },
    ],
    suggestions: [
      { label: "Biblioteca", prompt: "FAQ de biblioteca" },
      { label: "Cuenta", prompt: "FAQ de cuenta" },
    ],
  },
  {
    id: "admin_panel",
    category: "Administracion",
    title: "Panel de administracion",
    priority: 7,
    keywords: [
      "admin", "administrador", "panel", "gestion", "administracion", "dashboard",
      "sidebar", "topbar", "modulo", "modulos", "control",
    ],
    phrases: [
      "panel de administracion", "entrar al admin", "modulos admin",
      "gestion administrativa", "soy administrador",
    ],
    answer:
      "El Panel de Administracion concentra la gestion de usuarios, contactos, noticias, eventos, quienes somos, libros, calendarios, revistas, prestamos, materiales, respaldos, monitoreo, mantenimiento, periodos, materias, privacidad y terminos.\n\nSolo las cuentas con rol Administrador pueden entrar. Si no aparece el panel, revisa el rol con el que iniciaste sesion.",
    actions: [
      { label: "Panel admin", route: "/admin", icon: "ph-gear-six" },
      { label: "Mi perfil", route: "/perfil", icon: "ph-user" },
    ],
    suggestions: [
      { label: "Usuarios", prompt: "Como gestiono usuarios?" },
      { label: "Libros", prompt: "Como gestiono libros?" },
      { label: "Prestamos admin", prompt: "Como administra prestamos el admin?" },
    ],
  },
  {
    id: "admin_users",
    category: "Administracion",
    title: "Gestion de usuarios",
    priority: 7,
    keywords: [
      "usuarios", "usuario", "roles", "rol", "periodo", "periodos", "alta",
      "editar usuario", "estado usuario", "matricula", "administrar usuarios",
    ],
    phrases: [
      "gestionar usuarios", "administrar usuarios", "editar usuario",
      "crear usuario", "cambiar rol", "usuarios del sistema",
    ],
    answer:
      "En Usuarios, administracion puede consultar y gestionar cuentas del sistema. Es el modulo adecuado para revisar datos, rol, estado y configuraciones relacionadas con acceso.\n\nSi un usuario no puede entrar, valida su estado, rol y datos de identificacion antes de regenerar o cambiar credenciales.",
    actions: [
      { label: "Gestion usuarios", route: "/admin/usuarios", icon: "ph-users" },
      { label: "Periodos", route: "/admin/periodos", icon: "ph-calendar-check" },
    ],
    suggestions: [
      { label: "Roles", prompt: "Como funcionan los roles?" },
      { label: "Activacion", prompt: "Usuario pendiente de activacion" },
    ],
  },
  {
    id: "admin_news_events",
    category: "Administracion",
    title: "Gestion de noticias y eventos",
    priority: 7,
    keywords: [
      "gestionar noticias", "admin noticias", "crear noticia", "publicar noticia",
      "gestionar eventos", "admin eventos", "crear evento", "publicar evento",
      "destacado", "borrador", "publicada", "programar",
    ],
    phrases: [
      "administrar noticias", "administrar eventos", "publicar noticia",
      "programar evento", "evento destacado", "noticia publicada",
    ],
    answer:
      "Desde administracion puedes crear y editar noticias o eventos. Las noticias manejan publicacion, caducidad y estado. Los eventos manejan tipo presencial o virtual, fechas, imagenes, destacado y estados automaticos.\n\nSi programas contenido a futuro, el sistema lo conserva como borrador hasta que llegue la fecha correspondiente.",
    actions: [
      { label: "Noticias admin", route: "/admin/noticias", icon: "ph-megaphone" },
      { label: "Eventos admin", route: "/admin/eventos", icon: "ph-ticket" },
    ],
    suggestions: [
      { label: "Noticias publicas", prompt: "Como se ven las noticias publicas?" },
      { label: "Eventos publicos", prompt: "Como se ven los eventos?" },
    ],
  },
  {
    id: "admin_library",
    category: "Administracion",
    title: "Gestion de catalogo y libros",
    priority: 7,
    keywords: [
      "admin libros", "gestionar libros", "crear libro", "editar libro",
      "catalogo admin", "autor", "materia", "semestre", "formato", "fisico",
      "digital", "stock", "pdf", "biblioteca admin",
    ],
    phrases: [
      "administrar libros", "gestion de catalogo", "subir libro digital",
      "agregar libro", "editar stock", "asignar materia",
    ],
    answer:
      "En Libros, administracion puede crear, editar, activar o desactivar recursos del catalogo. Cada libro puede tener autores, materias, semestres y formatos fisico o digital. El formato fisico usa total/disponibles, y el digital usa PDF.\n\nLos cambios impactan directamente en el catalogo publico y en solicitudes de prestamo.",
    actions: [
      { label: "Libros admin", route: "/admin/libros", icon: "ph-books" },
      { label: "Catalogo publico", route: "/catalogo", icon: "ph-book-bookmark" },
    ],
    suggestions: [
      { label: "Prestamos", prompt: "Como impacta el stock en prestamos?" },
      { label: "Materia", prompt: "Como se usan las materias en libros?" },
    ],
  },
  {
    id: "admin_loans",
    category: "Administracion",
    title: "Gestion administrativa de prestamos",
    priority: 7,
    keywords: [
      "admin prestamos", "gestionar prestamos", "aprobar prestamo",
      "devolver prestamo", "vencidos", "prestamos admin", "bibliotecario",
      "estado prestamo", "observaciones",
    ],
    phrases: [
      "administrar prestamos", "gestion de prestamos", "prestamos vencidos",
      "marcar devolucion", "validar prestamo",
    ],
    answer:
      "El modulo administrativo de Prestamos permite revisar solicitudes, estados, fechas de vencimiento y gestion operativa de libros fisicos. Es clave para controlar devoluciones y vencimientos.\n\nRecuerda que el modulo publico limita solicitudes de estudiantes a horario habilitado y maximo 3 prestamos pendientes.",
    actions: [
      { label: "Prestamos admin", route: "/admin/prestamos", icon: "ph-book-bookmark" },
      { label: "Catalogo", route: "/catalogo", icon: "ph-books" },
    ],
    suggestions: [
      { label: "Reglas", prompt: "Cuales son las reglas de prestamos?" },
      { label: "Mis prestamos", prompt: "Donde ve un estudiante sus prestamos?" },
    ],
  },
  {
    id: "admin_materials",
    category: "Administracion",
    title: "Gestion administrativa de materiales",
    priority: 7,
    keywords: [
      "admin materiales", "gestionar materiales", "material admin",
      "aprobar material", "desactivar material", "docente", "materias",
      "semestres", "archivos",
    ],
    phrases: [
      "administrar materiales", "gestion de materiales", "materiales admin",
      "ver materiales de docentes",
    ],
    answer:
      "En Materiales del panel administrativo se revisan recursos publicados por docentes y su relacion con materias, semestres, tipo, estado y visibilidad.\n\nPara que el alumnado los vea, el material debe estar activo y visible segun la configuracion aplicada.",
    actions: [
      { label: "Materiales admin", route: "/admin/materiales", icon: "ph-folder-open" },
      { label: "Materiales publicos", route: "/materiales", icon: "ph-folder" },
    ],
    suggestions: [
      { label: "Docente", prompt: "Como sube materiales un docente?" },
      { label: "Estudiante", prompt: "Como ve materiales un estudiante?" },
    ],
  },
  {
    id: "admin_calendar",
    category: "Administracion",
    title: "Gestion de calendarios",
    priority: 7,
    keywords: [
      "admin calendario", "calendario admin", "subir calendario", "activar calendario",
      "calendario estudiante", "calendario docente", "archivo calendario",
    ],
    phrases: [
      "gestionar calendario", "administrar calendarios", "activar calendario",
      "publicar calendario escolar",
    ],
    answer:
      "En Calendarios del panel administrativo se publican archivos activos por tipo de calendario, como estudiante o docente. Al activar uno, el sistema desactiva otros calendarios del mismo tipo para mantener un unico calendario vigente.\n\nLa pagina publica muestra el calendario activo correspondiente.",
    actions: [
      { label: "Calendarios admin", route: "/admin/calendario-admin", icon: "ph-calendar" },
      { label: "Calendario publico", route: "/calendario", icon: "ph-calendar-check" },
    ],
    suggestions: [
      { label: "Fechas", prompt: "Donde veo fechas importantes?" },
      { label: "Eventos", prompt: "Como publico eventos?" },
    ],
  },
  {
    id: "admin_operations",
    category: "Administracion",
    title: "Operacion, monitoreo y mantenimiento",
    priority: 6,
    keywords: [
      "monitoreo", "respaldo", "respaldos", "backup", "mantenimiento",
      "automatizacion", "automation", "base de datos", "rendimiento",
      "alerta", "servidor", "storage", "logs",
    ],
    phrases: [
      "ver monitoreo", "hacer respaldo", "gestion de respaldos",
      "modo mantenimiento", "tareas automaticas", "estado del sistema",
    ],
    answer:
      "Los modulos de operacion ayudan a revisar salud del sistema, respaldos, tareas automaticas y mantenimiento. Son secciones sensibles, pensadas para administradores.\n\nAntes de aplicar cambios operativos, valida el alcance porque pueden afectar disponibilidad o datos del sistema.",
    actions: [
      { label: "Monitoreo", route: "/admin/monitoreo", icon: "ph-monitor" },
      { label: "Respaldos", route: "/admin/backups", icon: "ph-download-simple" },
      { label: "Mantenimiento", route: "/admin/mantenimiento", icon: "ph-wrench" },
    ],
    suggestions: [
      { label: "Panel admin", prompt: "Que incluye el panel de administracion?" },
      { label: "Seguridad", prompt: "Que debo cuidar en seguridad?" },
    ],
  },
  {
    id: "errors_support",
    category: "Soporte",
    title: "Errores y soporte",
    priority: 5,
    keywords: [
      "error", "falla", "problema", "no carga", "no abre", "lento", "bug",
      "pantalla", "404", "500", "400", "servidor", "conexion", "token",
      "cors", "permiso", "autorizado",
    ],
    phrases: [
      "me sale error", "no funciona", "no puedo abrir", "pagina no encontrada",
      "error 404", "error 500", "error 400", "no carga la pagina",
      "fallo de conexion",
    ],
    answer:
      "Si aparece un error, primero identifica si es de acceso, ruta o servidor. Un 404 suele indicar pagina no encontrada. Un 400 indica datos invalidos. Un 500 apunta a error interno del servidor. Si es acceso, cierra sesion e inicia de nuevo.\n\nSi el problema continua, toma nota de la seccion, hora aproximada y accion realizada para reportarlo con mas precision.",
    actions: [
      { label: "Inicio", route: "/inicio", icon: "ph-house" },
      { label: "Contacto", route: "/contactanos", icon: "ph-envelope" },
    ],
    suggestions: [
      { label: "No puedo entrar", prompt: "No puedo iniciar sesion" },
      { label: "Ruta no encontrada", prompt: "Me sale error 404" },
      { label: "Servidor", prompt: "Me sale error 500" },
    ],
  },
];
