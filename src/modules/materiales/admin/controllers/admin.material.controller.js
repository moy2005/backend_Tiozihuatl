import { AdminMaterialService } from "../services/admin.material.service.js";

export const createMaterial = async (req, res) => {
  try {
    const id = await AdminMaterialService.createMaterial(
      req.body,
      req.file,
      req.user
    );
    res.json({ ok: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteMaterial = async (req, res) => {
  try {
    await AdminMaterialService.deleteMaterial(req.params.id, req.user);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateMaterial = async (req, res) => {
  try {
    await AdminMaterialService.updateMaterial(
      req.params.id,
      req.body,
      req.file,
      req.user
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMaterialById = async (req, res) => {
  try {
    const data = await AdminMaterialService.getMaterialById(
      req.params.id,
      req.user
    );
    res.json(data);
  } catch (error) {
    console.error("❌ getMaterialById:", error.message);
    res.status(500).json({ error: error.message });
  }
};

export const getMyMaterials = async (req, res) => {
  try {
    const filters = {
      search:   req.query.search,
      materia:  req.query.materia,
      semestre: req.query.semestre,
      tipo:     req.query.tipo,
      page:     req.query.page,
      limit:    req.query.limit
    };
    const data = await AdminMaterialService.getMyMaterials(req.user, filters);
    res.json(data);
  } catch (error) {
    console.error("❌ getMyMaterials:", error.message);
    res.status(500).json({ error: error.message });
  }
};

export const getAllMaterials = async (req, res) => {
  try {
    const filters = {
      search: req.query.search,
      materia: req.query.materia,
      semestre: req.query.semestre,
      tipo: req.query.tipo,
      page: req.query.page,
      limit: req.query.limit
    };

    const data = await AdminMaterialService.getAllMaterials(filters);
    res.json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const changeStatus = async (req, res) => {
  try {
    const { activo } = req.body;
    await AdminMaterialService.changeStatus(req.params.id, activo, req.user);
    res.json({ ok: true });
  } catch (error) {
    console.error("❌ changeStatus:", error.message);
    res.status(500).json({ error: error.message });
  }
};
