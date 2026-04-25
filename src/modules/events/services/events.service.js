import { EventsModel } from "../models/events.model.js";
import { EventoImagenModel } from "../models/eventoImagen.model.js";
import { EventoImagenService } from "./eventoImagen.service.js";

const MAX_IMAGENES = 15;
const MAX_ANIOS_PROGRAMACION = 1;
const MAX_ANIOS_FINALIZACION = 5;
const TOLERANCIA_PASADO_MS = 60 * 1000;
const TIPOS_VALIDOS = new Set(["PRESENCIAL", "VIRTUAL"]);
const MODO_PUBLICACION_AHORA = "ahora";
const MODO_PUBLICACION_PROGRAMADA = "programada";

function obtenerFechaActualMexicoMysql() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(new Date()).map((part) => [part.type, part.value])
  );

  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

function obtenerFechaActualMexicoDate() {
  return parseFecha(obtenerFechaActualMexicoMysql()) || new Date();
}

function parseFecha(fecha) {
  if (!fecha) return null;
  const normalizada = String(fecha).replace(" ", "T");
  const parsed = new Date(normalizada);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function sumarAnios(fecha, anios) {
  const copia = new Date(fecha);
  copia.setFullYear(copia.getFullYear() + anios);
  return copia;
}

function normalizarBooleano(valor) {
  if (["1", 1, true, "true"].includes(valor)) return 1;
  return 0;
}

function normalizarModoPublicacion(modo, fecha_inicio) {
  if ([MODO_PUBLICACION_AHORA, MODO_PUBLICACION_PROGRAMADA].includes(modo)) {
    return modo;
  }

  const fechaInicio = parseFecha(fecha_inicio);
  const ahora = obtenerFechaActualMexicoDate();

  return fechaInicio && fechaInicio > ahora
    ? MODO_PUBLICACION_PROGRAMADA
    : MODO_PUBLICACION_AHORA;
}

function resolverInicio(body = {}, existente = null) {
  const fechaInicioInput =
    body.fecha_inicio !== undefined
      ? String(body.fecha_inicio).trim()
      : String(existente?.fecha_inicio || "").trim();

  const modo_publicacion = normalizarModoPublicacion(
    body.modo_publicacion,
    fechaInicioInput
  );

  const ahoraDate = obtenerFechaActualMexicoDate();
  const ahoraMysql = obtenerFechaActualMexicoMysql();
  const fechaInicioExistente = parseFecha(String(existente?.fecha_inicio || "").trim());

  if (modo_publicacion === MODO_PUBLICACION_AHORA) {
    const debeUsarFechaActual =
      !existente ||
      !fechaInicioExistente ||
      fechaInicioExistente > ahoraDate ||
      existente?.estado === "Borrador";

    const fecha_inicio = debeUsarFechaActual
      ? ahoraMysql
      : String(existente.fecha_inicio).trim();

    return {
      modo_publicacion,
      fecha_inicio,
    };
  }

  if (!fechaInicioInput) {
    throw new Error(
      "La fecha de inicio es obligatoria cuando programas la publicacion del evento"
    );
  }

  const fechaInicioDate = parseFecha(fechaInicioInput);
  if (!fechaInicioDate) {
    throw new Error("La fecha de inicio programada no es valida");
  }

  if (fechaInicioDate.getTime() < ahoraDate.getTime() - TOLERANCIA_PASADO_MS) {
    throw new Error("La fecha de inicio programada no puede estar en el pasado");
  }

  const limiteProgramacion = sumarAnios(ahoraDate, MAX_ANIOS_PROGRAMACION);
  if (fechaInicioDate > limiteProgramacion) {
    throw new Error("La fecha de inicio programada no puede superar 1 anio");
  }

  return {
    modo_publicacion,
    fecha_inicio: fechaInicioInput,
  };
}

function validarFechasEvento(fecha_inicio, fecha_fin) {
  const ahora = obtenerFechaActualMexicoDate();
  const inicio = parseFecha(fecha_inicio);
  const fin = parseFecha(fecha_fin);

  if (!inicio || !fin) {
    throw new Error("Las fechas del evento no son validas");
  }

  if (fin <= inicio) {
    throw new Error(
      "La fecha de fin debe ser posterior a la fecha de inicio o publicacion"
    );
  }

  const limiteFinalizacion = sumarAnios(ahora, MAX_ANIOS_FINALIZACION);
  if (fin > limiteFinalizacion) {
    throw new Error("La fecha de fin no puede superar 5 años a partir de hoy");
  }
}

function resolverEstadoAutomatico({ cancelar_evento, fecha_inicio, fecha_fin }) {
  if (cancelar_evento) {
    return "Cancelado";
  }

  const ahora = obtenerFechaActualMexicoDate();
  const inicio = parseFecha(fecha_inicio);
  const fin = parseFecha(fecha_fin);

  if (fin && fin < ahora) {
    return "Finalizado";
  }

  if (inicio && inicio > ahora) {
    return "Borrador";
  }

  return "Publicado";
}

function parseJsonArray(raw, fieldName) {
  if (raw === undefined || raw === null || raw === "") return [];

  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;

    if (!Array.isArray(parsed)) {
      throw new Error("Formato invalido");
    }

    return parsed;
  } catch {
    throw new Error(`El campo ${fieldName} no tiene un formato valido`);
  }
}

function normalizarPayload(body = {}, existente = null) {
  const titulo = String(
    body.titulo !== undefined ? body.titulo : existente?.titulo || ""
  ).trim();
  const descripcion = String(
    body.descripcion !== undefined ? body.descripcion : existente?.descripcion || ""
  ).trim();
  const tipo = String(
    body.tipo !== undefined ? body.tipo : existente?.tipo || "PRESENCIAL"
  )
    .trim()
    .toUpperCase();
  const ubicacion = String(
    body.ubicacion !== undefined ? body.ubicacion : existente?.ubicacion || ""
  ).trim();
  const enlace = String(
    body.enlace !== undefined ? body.enlace : existente?.enlace || ""
  ).trim();
  const fechaFinInput = String(
    body.fecha_fin !== undefined ? body.fecha_fin : existente?.fecha_fin || ""
  ).trim();
  const inicio = resolverInicio(body, existente);
  const fecha_fin = fechaFinInput;

  if (!titulo) {
    throw new Error("El titulo es obligatorio");
  }

  if (!descripcion) {
    throw new Error("La descripcion es obligatoria");
  }

  if (!TIPOS_VALIDOS.has(tipo)) {
    throw new Error("El tipo de evento no es valido");
  }

  if (!fecha_fin) {
    throw new Error("La fecha de fin del evento es obligatoria");
  }

  validarFechasEvento(inicio.fecha_inicio, fecha_fin);

  if (tipo === "VIRTUAL" && !enlace) {
    throw new Error("El enlace es obligatorio para eventos virtuales");
  }

  if (tipo === "VIRTUAL" && enlace) {
    try {
      new URL(enlace);
    } catch {
      throw new Error("El enlace del evento virtual no es valido");
    }
  }

  if (tipo === "PRESENCIAL" && !ubicacion) {
    throw new Error("La ubicacion es obligatoria para eventos presenciales");
  }

  const cancelar_evento = !!existente && normalizarBooleano(body.cancelar_evento);

  return {
    titulo,
    descripcion,
    tipo,
    ubicacion: tipo === "PRESENCIAL" ? ubicacion : null,
    enlace: tipo === "VIRTUAL" ? enlace : null,
    fecha_inicio: inicio.fecha_inicio,
    fecha_fin,
    estado: resolverEstadoAutomatico({
      cancelar_evento,
      fecha_inicio: inicio.fecha_inicio,
      fecha_fin,
    }),
    destacado: normalizarBooleano(body.destacado ?? existente?.destacado),
  };
}

async function aplicarOrdenImagenes(id_evento, body, nuevasImagenes = []) {
  const ordenImagenes = parseJsonArray(body.orden_imagenes, "orden_imagenes");
  if (!ordenImagenes.length) return;

  const imagenesTempIds = parseJsonArray(body.imagenes_temp_ids, "imagenes_temp_ids");
  const nuevasPorTempId = new Map();

  nuevasImagenes.forEach((imagen, index) => {
    const tempId = imagenesTempIds[index];
    if (tempId) {
      nuevasPorTempId.set(String(tempId), Number(imagen.id_imagen));
    }
  });

  const payload = ordenImagenes.map((imagen, index) => {
    const source = String(imagen.source || imagen.tipo || "").toLowerCase();

    if (source === "existing" || source === "existente") {
      const id_imagen = Number(imagen.id_imagen);
      if (!id_imagen) {
        throw new Error("Las imagenes existentes deben incluir id_imagen");
      }

      return {
        id_imagen,
        orden: index + 1,
      };
    }

    if (source === "new" || source === "nueva") {
      const temp_id = String(imagen.temp_id || imagen.uid || "").trim();
      const id_imagen = nuevasPorTempId.get(temp_id);

      if (!temp_id || !id_imagen) {
        throw new Error("No se pudo resolver el orden de las nuevas imagenes");
      }

      return {
        id_imagen,
        orden: index + 1,
      };
    }

    throw new Error("El orden de imagenes contiene elementos no validos");
  });

  const actuales = await EventoImagenModel.getByEvento(id_evento);
  const idsActuales = actuales
    .map((imagen) => Number(imagen.id_imagen))
    .sort((a, b) => a - b);
  const idsPayload = payload
    .map((imagen) => Number(imagen.id_imagen))
    .sort((a, b) => a - b);

  const coincideCantidad = idsActuales.length === idsPayload.length;
  const coincideContenido =
    coincideCantidad && idsActuales.every((id, index) => id === idsPayload[index]);

  if (!coincideContenido) {
    throw new Error("El orden de imagenes debe incluir todas las imagenes del evento");
  }

  await EventoImagenService.reorder(payload);
}

export const EventsService = {
  create: async (req) => {
    const imagenes = req.files?.imagenes || [];

    if (imagenes.length > MAX_IMAGENES) {
      throw new Error("Maximo 15 imagenes permitidas");
    }

    const payload = normalizarPayload(req.body);
    const id_evento = await EventsModel.create(payload);

    const nuevasImagenes = imagenes.length
      ? await EventoImagenService.agregarImagenes(id_evento, imagenes)
      : [];

    await aplicarOrdenImagenes(id_evento, req.body, nuevasImagenes);

    return {
      message: "Evento creado correctamente",
      id_evento,
    };
  },

  update: async (req) => {
    const { id } = req.params;

    const existente = await EventsModel.getById(id);
    if (!existente) {
      throw new Error("Evento no encontrado");
    }

    const imagenes = req.files?.imagenes || [];
    if (imagenes.length > MAX_IMAGENES) {
      throw new Error("Maximo 15 imagenes permitidas por solicitud");
    }

    const payload = normalizarPayload(req.body, existente);
    await EventsModel.update(id, payload);

    const nuevasImagenes = imagenes.length
      ? await EventoImagenService.agregarImagenes(id, imagenes)
      : [];

    await aplicarOrdenImagenes(id, req.body, nuevasImagenes);

    return { message: "Evento actualizado correctamente" };
  },

  delete: async (id) => {
    const existente = await EventsModel.getById(id);
    if (!existente) {
      throw new Error("Evento no encontrado");
    }

    await EventoImagenService.eliminarImagenesDeEvento(id);
    await EventsModel.delete(id);

    return { message: "Evento eliminado correctamente" };
  },

  updateDestacado: async (id, destacado) => {
    const existente = await EventsModel.getById(id);
    if (!existente) {
      throw new Error("Evento no encontrado");
    }

    const destacadoNormalizado = normalizarBooleano(destacado);
    await EventsModel.updateDestacado(id, destacadoNormalizado);

    return {
      message: destacadoNormalizado
        ? "Evento marcado como destacado"
        : "Evento retirado de destacados",
    };
  },
};
