const router = require('express').Router();
const db = require('../db');
const { requireAuth, requirePermission } = require('../middleware/auth');

const PAY_LABELS = {
  credit_card: 'Cartão de Crédito',
  pix: 'PIX',
  boleto: 'Boleto',
};

const STATUS_LABELS = {
  completed:  'Concluído',
  refunded:   'Estornado',
  cancelled:  'Cancelado',
};

const COIN_LABELS = { gold: 'Ouro', silver: 'Prata', bronze: 'Cobre' };

// GET /api/orders
router.get('/', requireAuth, async (req, res) => {
  const { search = '', status = '', page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let where = 'WHERE 1=1';
  const params = [];

  if (status) {
    where += ' AND o.status = ?';
    params.push(status);
  }
  if (search) {
    where += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR o.chest_name LIKE ?)';
    const q = `%${search}%`;
    params.push(q, q, q);
  }

  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM coin_orders o
     LEFT JOIN users u ON u.id = o.user_id ${where}`,
    params
  );

  const [rows] = await db.query(
    `SELECT
       o.id, o.chest_name, o.coin_type, o.coin_amount, o.price_brl,
       o.payment_method, o.status, o.created_at,
       u.id AS user_id, u.full_name, u.email
     FROM coin_orders o
     LEFT JOIN users u ON u.id = o.user_id
     ${where}
     ORDER BY o.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  );

  res.json({
    total: Number(total),
    page: Number(page),
    limit: Number(limit),
    items: rows.map(r => ({
      ...r,
      coin_amount:      Number(r.coin_amount),
      price_brl:        Number(r.price_brl),
      payment_label:    PAY_LABELS[r.payment_method] ?? r.payment_method,
      status_label:     STATUS_LABELS[r.status] ?? r.status,
      coin_label:       COIN_LABELS[r.coin_type] ?? r.coin_type,
    })),
  });
});

// POST /api/orders/:id/refund  — estorno fictício
router.post('/:id/refund', requireAuth, requirePermission('cobranca', 'update'), async (req, res) => {
  const [rows] = await db.query('SELECT * FROM coin_orders WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Pedido não encontrado' });

  const order = rows[0];
  if (order.status !== 'completed') {
    return res.status(400).json({ error: `Não é possível estornar um pedido com status "${STATUS_LABELS[order.status] ?? order.status}".` });
  }

  // Fictício: debita as moedas de volta do usuário (se houver saldo)
  const fieldMap = { gold: 'coins_gold', silver: 'coins_silver', bronze: 'coins_bronze' };
  const field = fieldMap[order.coin_type];
  if (field) {
    await db.query(
      `UPDATE users SET ${field} = GREATEST(0, ${field} - ?) WHERE id = ?`,
      [order.coin_amount, order.user_id]
    );
  }

  await db.query('UPDATE coin_orders SET status = ? WHERE id = ?', ['refunded', order.id]);

  res.json({ ok: true, status: 'refunded', status_label: 'Estornado' });
});

// POST /api/orders/:id/cancel  — cancelamento fictício
router.post('/:id/cancel', requireAuth, requirePermission('cobranca', 'update'), async (req, res) => {
  const [rows] = await db.query('SELECT * FROM coin_orders WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Pedido não encontrado' });

  const order = rows[0];
  if (order.status !== 'completed') {
    return res.status(400).json({ error: `Não é possível cancelar um pedido com status "${STATUS_LABELS[order.status] ?? order.status}".` });
  }

  await db.query('UPDATE coin_orders SET status = ? WHERE id = ?', ['cancelled', order.id]);

  res.json({ ok: true, status: 'cancelled', status_label: 'Cancelado' });
});

module.exports = router;
