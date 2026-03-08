import { PeriodoModel } from "../models/periodo.model.js";

export const PeriodoService = {

  async getAllPeriodos() {
    return await PeriodoModel.findAll();
  },

  async getPeriodoById(id_periodo) {
    const periodo = await PeriodoModel.findById(id_periodo);

    if (!periodo) {
      throw new Error("Periodo no encontrado.");
    }

    return periodo;
  },

  async getPeriodoActivo() {
    const periodo = await PeriodoModel.findActivo();

    if (!periodo) {
      throw new Error("No existe un periodo activo.");
    }

    return periodo;
  }

};