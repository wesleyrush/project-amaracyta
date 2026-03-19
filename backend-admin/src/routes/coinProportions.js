const router = require('express').Router();
const db = require('../db');
const { requireAuth, requirePermission } = require('../middleware/auth');

const COIN_LABELS = { gold: 'Ouro', silver: 'Prata', bronze: 'Cobre' };

// GET /api/coin-proportions
router.get('/', requireAuth, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM coin_proportions ORDER BY FIELD(coin_type,"gold","silver","bronze","copper")');
  // Normaliza 'copper' → 'bronze' para compatibilidade com DB legado (antes da migração V3)
  const items = rows.map(r => r.coin_type === 'copper' ? { ...r, coin_type: 'bronze' } : r);
  res.json({ items });
});

// PUT /api/coin-proportions/:coin_type
router.put('/:coin_type', requireAuth, requirePermission('cobranca', 'update'), async (req, res) => {
  const { coin_type } = req.params;
  const { cost_per_message } = req.body;
  if (!['gold', 'silver', 'bronze'].includes(coin_type))
    return res.status(400).json({ error: 'Tipo de moeda inválido' });
  if (cost_per_message == null || isNaN(Number(cost_per_message)) || Number(cost_per_message) <= 0)
    return res.status(400).json({ error: 'cost_per_message deve ser um número positivo' });

  await db.query(
    'INSERT INTO coin_proportions (coin_type, cost_per_message) VALUES (?,?) ON DUPLICATE KEY UPDATE cost_per_message=?',
    [coin_type, Number(cost_per_message), Number(cost_per_message)]
  );
  res.json({ ok: true, coin_type, label: COIN_LABELS[coin_type], cost_per_message: Number(cost_per_message) });
});

module.exports = router;
