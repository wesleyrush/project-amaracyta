const router = require('express').Router();
const db = require('../db');
const { requireAuth, requirePermission } = require('../middleware/auth');

// GET /api/module-packages — lista todos
router.get('/', requireAuth, async (req, res) => {
  const [rows] = await db.query(
    `SELECT id, quantity, price_brl, description, is_active, created_at, updated_at
     FROM module_packages ORDER BY quantity ASC`
  );
  res.json({ items: rows });
});

// GET /api/module-packages/:id
router.get('/:id', requireAuth, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM module_packages WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Pacote não encontrado' });
  res.json(rows[0]);
});

// POST /api/module-packages — criar
router.post('/', requireAuth, requirePermission('agente', 'insert'), async (req, res) => {
  const { quantity, price_brl, description, is_active } = req.body;
  if (!quantity || !price_brl)
    return res.status(400).json({ error: 'quantity e price_brl são obrigatórios' });

  const [conflict] = await db.query(
    'SELECT id FROM module_packages WHERE quantity = ?', [quantity]
  );
  if (conflict.length)
    return res.status(409).json({ error: 'Já existe pacote para essa quantidade' });

  const [result] = await db.query(
    `INSERT INTO module_packages (quantity, price_brl, description, is_active)
     VALUES (?, ?, ?, ?)`,
    [quantity, price_brl, description || null, is_active !== false ? 1 : 0]
  );
  res.status(201).json({ id: result.insertId });
});

// PUT /api/module-packages/:id — atualizar
router.put('/:id', requireAuth, requirePermission('agente', 'update'), async (req, res) => {
  const { quantity, price_brl, description, is_active } = req.body;
  if (!quantity || !price_brl)
    return res.status(400).json({ error: 'quantity e price_brl são obrigatórios' });

  const [conflict] = await db.query(
    'SELECT id FROM module_packages WHERE quantity = ? AND id != ?', [quantity, req.params.id]
  );
  if (conflict.length)
    return res.status(409).json({ error: 'Já existe pacote para essa quantidade' });

  const [result] = await db.query(
    `UPDATE module_packages
     SET quantity=?, price_brl=?, description=?, is_active=?
     WHERE id=?`,
    [quantity, price_brl, description || null, is_active !== false ? 1 : 0, req.params.id]
  );
  if (!result.affectedRows) return res.status(404).json({ error: 'Pacote não encontrado' });
  res.json({ ok: true });
});

// PATCH /api/module-packages/:id/toggle
router.patch('/:id/toggle', requireAuth, requirePermission('agente', 'update'), async (req, res) => {
  const [rows] = await db.query('SELECT is_active FROM module_packages WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Pacote não encontrado' });

  const newState = rows[0].is_active ? 0 : 1;
  await db.query('UPDATE module_packages SET is_active = ? WHERE id = ?', [newState, req.params.id]);
  res.json({ is_active: newState });
});

// DELETE /api/module-packages/:id
router.delete('/:id', requireAuth, requirePermission('agente', 'delete'), async (req, res) => {
  const [result] = await db.query('DELETE FROM module_packages WHERE id = ?', [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Pacote não encontrado' });
  res.json({ ok: true });
});

module.exports = router;
