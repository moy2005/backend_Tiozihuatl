export const CLUSTER_PROFILES = {
  "Uso principalmente físico": {
    studentLabel: "Disponible para solicitar",
    description: "Libros consultados principalmente mediante ejemplares físicos; su lectura digital es mínima.",
    icon: "library-outline",
    action: "Mantener disponibilidad física y revisar el acceso digital.",
  },
  "Uso integral intensivo": {
    studentLabel: "Continúa estudiando",
    description: "Libros utilizados tanto en lectura digital como mediante préstamos físicos.",
    icon: "school-outline",
    action: "Priorizar la continuidad del acceso físico y digital.",
  },
  "Uso digital emergente": {
    studentLabel: "Descubre recursos digitales",
    description: "Libros con pocos préstamos físicos y señales recientes de crecimiento en lectura digital.",
    icon: "sparkles-outline",
    action: "Dar visibilidad digital y comprobar si el crecimiento se mantiene.",
  },
};

const scoreByProfile = {
  "Uso principalmente físico": (book) =>
    book.prestamos_mes_1 + book.prestamos_mes_2 + book.prestamos_mes_3,
  "Uso integral intensivo": (book) =>
    book.sesiones_mes_1 + book.sesiones_mes_2 + book.sesiones_mes_3 +
    book.usuarios_unicos_3m * 2 + book.porcentaje_promedio_avance_3m / 10,
  "Uso digital emergente": (book) =>
    book.tendencia_sesiones * 100 + book.sesiones_mes_1 * 2 + book.usuarios_unicos_3m,
};

export const rankClusterBooks = (books, profileName, limit) => {
  const score = scoreByProfile[profileName] || (() => 0);
  return [...books].sort((a, b) => score(b) - score(a)).slice(0, limit);
};

export const summarizeClusters = (books) => {
  const numericFields = [
    "sesiones_mes_3", "sesiones_mes_2", "sesiones_mes_1", "usuarios_unicos_3m",
    "promedio_tiempo_segundos_3m", "porcentaje_promedio_avance_3m",
    "prestamos_mes_3", "prestamos_mes_2", "prestamos_mes_1",
    "tendencia_sesiones", "tendencia_prestamos",
  ];

  return Object.values(
    books.reduce((groups, book) => {
      const key = String(book.cluster);
      if (!groups[key]) {
        groups[key] = {
          cluster: book.cluster,
          profileName: book.profileName,
          totalBooks: 0,
          averages: Object.fromEntries(numericFields.map((field) => [field, 0])),
        };
      }
      const group = groups[key];
      group.totalBooks += 1;
      numericFields.forEach((field) => { group.averages[field] += Number(book[field]) || 0; });
      return groups;
    }, {})
  ).map((group) => {
    Object.keys(group.averages).forEach((field) => {
      group.averages[field] = Number((group.averages[field] / group.totalBooks).toFixed(2));
    });
    return { ...group, ...CLUSTER_PROFILES[group.profileName] };
  }).sort((a, b) => a.cluster - b.cluster);
};
