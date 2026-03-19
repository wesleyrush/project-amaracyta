const router = require('express').Router();
const db = require('../db');
const { requireAuth, requirePermission } = require('../middleware/auth');

// GET /api/chests
router.get('/', requireAuth, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM coin_chests ORDER BY price_brl ASC');
  res.json({ items: rows });
});

// GET /api/chests/:id
router.get('/:id', requireAuth, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM coin_chests WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Baú não encontrado' });
  res.json(rows[0]);
});

// POST /api/chests
router.post('/', requireAuth, requirePermission('cobranca', 'insert'), async (req, res) => {
  const { name, coin_amount, coin_type = 'gold', price_brl, status = 'active', image_url = null } = req.body;
  if (!name || coin_amount == null || price_brl == null) {
    return res.status(400).json({ error: 'name, coin_amount e price_brl são obrigatórios' });
  }
  const [result] = await db.query(
    'INSERT INTO coin_chests (name, image_url, coin_amount, coin_type, price_brl, status) VALUES (?,?,?,?,?,?)',
    [name, image_url, coin_amount, coin_type, price_brl, status]
  );
  res.status(201).json({ id: result.insertId, ok: true });
});

// PUT /api/chests/:id
router.put('/:id', requireAuth, requirePermission('cobranca', 'update'), async (req, res) => {
  const { name, coin_amount, coin_type, price_brl, status, image_url = null } = req.body;
  const [result] = await db.query(
    'UPDATE coin_chests SET name=?, image_url=?, coin_amount=?, coin_type=?, price_brl=?, status=? WHERE id=?',
    [name, image_url, coin_amount, coin_type, price_brl, status, req.params.id]
  );
  if (!result.affectedRows) return res.status(404).json({ error: 'Baú não encontrado' });
  res.json({ ok: true });
});

// DELETE /api/chests/:id
router.delete('/:id', requireAuth, requirePermission('cobranca', 'delete'), async (req, res) => {
  const [result] = await db.query('DELETE FROM coin_chests WHERE id = ?', [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Baú não encontrado' });
  res.json({ ok: true });
});

// PATCH /api/chests/:id/toggle
router.patch('/:id/toggle', requireAuth, requirePermission('cobranca', 'update'), async (req, res) => {
  const [rows] = await db.query('SELECT status FROM coin_chests WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Baú não encontrado' });
  const newStatus = rows[0].status === 'active' ? 'inactive' : 'active';
  await db.query('UPDATE coin_chests SET status = ? WHERE id = ?', [newStatus, req.params.id]);
  res.json({ status: newStatus });
});

module.exports = router;
