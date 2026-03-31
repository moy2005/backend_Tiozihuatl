import { Router } from "express";
import {
  getPrestamos,
  getAgrupados,
  getModelo,
  getHistorico,
  getPrediccionTotal,
  getMateria,
} from "../controllers/prediction.controller.js";

const router = Router();

/**
 * Rutas del módulo de predicción bibliográfica
 *
 * Fig 2  GET /prediction/prestamos        Lista de préstamos con detalle
 *                                         (alumno, libro, materias, estado)
 *
 * Fig 3  GET /prediction/agrupados        Préstamos por periodo con desglose
 *                                         de materias bajo cada uno
 *
 * Fig 4  GET /prediction/modelo           Histórico + modelo exponencial
 *                                         P(p) = C·e^(kp) + serie para gráfica
 *
 * Fig 5  GET /prediction/historico        Datos históricos desde BD:
 *                                         periodos + cruce materia×periodo
 *
 * Fig 6  GET /prediction/total            Predicción total para los 3
 *                                         próximos periodos académicos
 *
 * Fig 7  GET /prediction/materia          Listado de materias disponibles
 *        GET /prediction/materia?nombre=X Préstamos + predicción de esa materia
 */

router.get("/prestamos", getPrestamos);
router.get("/agrupados", getAgrupados);
router.get("/modelo",    getModelo);
router.get("/historico", getHistorico);
router.get("/total",     getPrediccionTotal);
router.get("/materia",   getMateria);

export default router;