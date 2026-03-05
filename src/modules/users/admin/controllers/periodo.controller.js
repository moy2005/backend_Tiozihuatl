import { PeriodoService } from "../services/periodo.service.js";

export const PeriodoController = {

  async getAll(req, res) {
    try {

      const periodos = await PeriodoService.getAllPeriodos();

      res.status(200).json(periodos);

    } catch (error) {

      console.error("❌ Error al obtener periodos:", error);

      res.status(500).json({
        error: "Error interno al obtener periodos"
      });

    }
  },

  async getActivo(req, res) {
    try {

      const periodo = await PeriodoService.getPeriodoActivo();

      res.status(200).json(periodo);

    } catch (error) {

      res.status(404).json({
        error: error.message
      });

    }
  }

};