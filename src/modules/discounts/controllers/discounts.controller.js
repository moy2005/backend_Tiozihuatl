import {
  createDiscount,
  listDiscounts,
  toggleDiscountStatus,
  updateDiscount,
} from '../services/discounts.service.js';

const sendError = (res, error) => {
  const statusCode = error.statusCode || 500;

  console.error('[admin.discounts.error]', {
    statusCode,
    message: error.message,
  });

  return res.status(statusCode).json({
    error: statusCode === 500 ? 'Error interno gestionando descuentos.' : error.message,
  });
};

export const getDiscounts = async (_req, res) => {
  try {
    const discounts = await listDiscounts();
    return res.json(discounts);
  } catch (error) {
    return sendError(res, error);
  }
};

export const postDiscount = async (req, res) => {
  try {
    const discount = await createDiscount(req.body);
    return res.status(201).json(discount);
  } catch (error) {
    return sendError(res, error);
  }
};

export const putDiscount = async (req, res) => {
  try {
    const discount = await updateDiscount(req.params.id, req.body);
    return res.json(discount);
  } catch (error) {
    return sendError(res, error);
  }
};

export const patchDiscountStatus = async (req, res) => {
  try {
    const result = await toggleDiscountStatus(req.params.id);
    return res.json(result);
  } catch (error) {
    return sendError(res, error);
  }
};
