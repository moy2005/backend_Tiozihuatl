import { poolPromise } from "../../../config/db.config.js";

/**
 * Reconstruye exactamente las 11 variables usadas por el Pipeline mensual.
 * La ventana termina en el último mes con actividad disponible en la BD y
 * conserva mes_3 (antiguo), mes_2 y mes_1 (reciente).
 */
export const getMonthlyClusteringDataset = async () => {
  const [rows] = await poolPromise.query(`
    WITH
    fecha_corte AS (
      SELECT GREATEST(
        COALESCE((SELECT MAX(fecha_hora) FROM interacciones_libros), '1970-01-01'),
        COALESCE((SELECT MAX(fecha_prestamo) FROM prestamos), '1970-01-01')
      ) AS fecha_maxima
    ),
    periodo AS (
      SELECT
        CAST(DATE_FORMAT(fecha_maxima, '%Y-%m-01') AS DATE) AS inicio_mes_1,
        DATE_SUB(CAST(DATE_FORMAT(fecha_maxima, '%Y-%m-01') AS DATE), INTERVAL 1 MONTH) AS inicio_mes_2,
        DATE_SUB(CAST(DATE_FORMAT(fecha_maxima, '%Y-%m-01') AS DATE), INTERVAL 2 MONTH) AS inicio_mes_3,
        DATE_ADD(CAST(DATE_FORMAT(fecha_maxima, '%Y-%m-01') AS DATE), INTERVAL 1 MONTH) AS fin_exclusivo
      FROM fecha_corte
    ),
    lectura AS (
      SELECT
        i.libro_id,
        SUM(i.fecha_hora >= p.inicio_mes_3 AND i.fecha_hora < p.inicio_mes_2) AS sesiones_mes_3,
        SUM(i.fecha_hora >= p.inicio_mes_2 AND i.fecha_hora < p.inicio_mes_1) AS sesiones_mes_2,
        SUM(i.fecha_hora >= p.inicio_mes_1 AND i.fecha_hora < p.fin_exclusivo) AS sesiones_mes_1,
        COUNT(*) AS total_sesiones_3m,
        COUNT(DISTINCT i.id_usuario) AS usuarios_unicos_3m,
        ROUND(AVG(GREATEST(i.tiempo_segundos, 0)), 2) AS promedio_tiempo_segundos_3m,
        ROUND(AVG(CASE
          WHEN i.total_paginas > 0
          THEN LEAST(GREATEST(i.pagina_maxima, 0) / i.total_paginas, 1) * 100
          ELSE 0
        END), 2) AS porcentaje_promedio_avance_3m
      FROM interacciones_libros i
      CROSS JOIN periodo p
      WHERE i.fecha_hora >= p.inicio_mes_3
        AND i.fecha_hora < p.fin_exclusivo
      GROUP BY i.libro_id
    ),
    circulacion AS (
      SELECT
        pr.libro_id,
        SUM(pr.fecha_prestamo >= p.inicio_mes_3 AND pr.fecha_prestamo < p.inicio_mes_2) AS prestamos_mes_3,
        SUM(pr.fecha_prestamo >= p.inicio_mes_2 AND pr.fecha_prestamo < p.inicio_mes_1) AS prestamos_mes_2,
        SUM(pr.fecha_prestamo >= p.inicio_mes_1 AND pr.fecha_prestamo < p.fin_exclusivo) AS prestamos_mes_1,
        COUNT(*) AS total_prestamos_3m
      FROM prestamos pr
      CROSS JOIN periodo p
      WHERE pr.fecha_prestamo >= p.inicio_mes_3
        AND pr.fecha_prestamo < p.fin_exclusivo
        AND pr.estado <> 'Cancelado'
      GROUP BY pr.libro_id
    ),
    base AS (
      SELECT
        l.id AS libro_id,
        l.titulo,
        p.inicio_mes_3 AS periodo_inicio,
        DATE_SUB(p.fin_exclusivo, INTERVAL 1 DAY) AS periodo_fin,
        COALESCE(i.sesiones_mes_3, 0) AS sesiones_mes_3,
        COALESCE(i.sesiones_mes_2, 0) AS sesiones_mes_2,
        COALESCE(i.sesiones_mes_1, 0) AS sesiones_mes_1,
        COALESCE(i.total_sesiones_3m, 0) AS total_sesiones_3m,
        COALESCE(i.usuarios_unicos_3m, 0) AS usuarios_unicos_3m,
        COALESCE(i.promedio_tiempo_segundos_3m, 0) AS promedio_tiempo_segundos_3m,
        COALESCE(i.porcentaje_promedio_avance_3m, 0) AS porcentaje_promedio_avance_3m,
        COALESCE(c.prestamos_mes_3, 0) AS prestamos_mes_3,
        COALESCE(c.prestamos_mes_2, 0) AS prestamos_mes_2,
        COALESCE(c.prestamos_mes_1, 0) AS prestamos_mes_1,
        COALESCE(c.total_prestamos_3m, 0) AS total_prestamos_3m
      FROM libros l
      CROSS JOIN periodo p
      LEFT JOIN lectura i ON i.libro_id = l.id
      LEFT JOIN circulacion c ON c.libro_id = l.id
      WHERE l.activo = 1
    )
    SELECT
      libro_id,
      titulo,
      periodo_inicio,
      periodo_fin,
      sesiones_mes_3,
      sesiones_mes_2,
      sesiones_mes_1,
      usuarios_unicos_3m,
      promedio_tiempo_segundos_3m,
      porcentaje_promedio_avance_3m,
      prestamos_mes_3,
      prestamos_mes_2,
      prestamos_mes_1,
      ROUND((sesiones_mes_1 - sesiones_mes_3) / GREATEST(total_sesiones_3m, 1), 4) AS tendencia_sesiones,
      ROUND((prestamos_mes_1 - prestamos_mes_3) / GREATEST(total_prestamos_3m, 1), 4) AS tendencia_prestamos
    FROM base
    ORDER BY libro_id
  `);

  return rows;
};
