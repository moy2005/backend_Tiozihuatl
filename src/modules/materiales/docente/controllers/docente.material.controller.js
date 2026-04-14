import { DocenteMaterialService } from "../services/docente.material.service.js"

export const createMaterial = async (req, res) => {
  try {

    const id = await DocenteMaterialService.createMaterial(
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
    await DocenteMaterialService.deleteMaterial(
      req.params.id,
      req.user
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateMaterial = async (req, res) => {
  try {
    await DocenteMaterialService.updateMaterial(
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

export const changeStatus = async (req, res) => {
  try {

    const { activo } = req.body;

    await DocenteMaterialService.changeStatus(
      req.params.id,
      activo,
      req.user
    );

    res.json({ ok: true });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMaterialById = async (req, res) => {
  try {

    const data = await DocenteMaterialService.getMaterialById(
      req.params.id,
      req.user
    );

    res.json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMyMaterials = async (req, res) => {
  try {

    const filters = {
      search: req.query.search,
      materia: req.query.materia,
      semestre: req.query.semestre,
      tipo: req.query.tipo,
      page: req.query.page,
      limit: req.query.limit
    };

    const data = await DocenteMaterialService.getMyMaterials(
      req.user,
      filters
    );

    res.json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


