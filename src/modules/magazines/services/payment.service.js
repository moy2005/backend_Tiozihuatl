/* =====================================
   SIMULAR PASARELA DE PAGO
===================================== */
export const processPayment = async ({
  connection,
  id_compra,
  metodo,
  monto
}) => {

  if (!['efectivo', 'debito', 'credito'].includes(metodo)) {
    throw new Error('Invalid payment method');
  }

  const approved = Math.random() > 0.1;

  if (!approved) {
    throw new Error('Payment declined by bank');
  }

  const transactionId = `TX-${Date.now()}`;

  await connection.query(
    `INSERT INTO pagos
     (id_compra, metodo, monto, estado, referencia_externa)
     VALUES (?, ?, ?, 'aprobado', ?)`,
    [id_compra, metodo, monto, transactionId]
  );

  return {
    transactionId,
    status: 'approved'
  };
};
