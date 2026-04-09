const router = require('express').Router();
const db = require('../db');
const { requireAuth, requirePermission } = require('../middleware/auth');

// GET /api/module-packages — lista todos
router.get('/', requireAuth, async (req, res) => {
  const [rows] = await db.query(
    `SELECT p.id, p.level_id, l.name AS level_name, p.quantity, p.price_brl,
            p.description, p.is_active, p.created_at, p.updated_at
     FROM module_packages p
     LEFT JOIN module_levels l ON l.id = p.level_id
     ORDER BY p.level_id ASC, p.quantity ASC`
  );
  res.json({ items: rows });
});

// GET /api/module-packages/:id
router.get('/:id', requireAuth, async (req, res) => {
  const [rows] = await db.query(
    `SELECT p.id, p.level_id, l.name AS level_name, p.quantity, p.price_brl,
            p.description, p.is_active, p.created_at, p.updated_at
     FROM module_packages p
     LEFT JOIN module_levels l ON l.id = p.level_id
     WHERE p.id = ?`,
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Pacote não encontrado' });
  res.json(rows[0]);
});

// POST /api/module-packages — criar
router.post('/', requireAuth, requirePermission('agente', 'insert'), async (req, res) => {
  const { level_id, quantity, price_brl, description, is_active } = req.body;
  if (!quantity || !price_brl)
    return res.status(400).json({ error: 'quantity e price_brl são obrigatórios' });

  const [conflict] = await db.query(
    'SELECT id FROM module_packages WHERE level_id <=> ? AND quantity = ?',
    [level_id ?? null, quantity]
  );
  if (conflict.length)
    return res.status(409).json({ error: 'Já existe pacote para essa quantidade neste nível' });

  const [result] = await db.query(
    `INSERT INTO module_packages (level_id, quantity, price_brl, description, is_active)
     VALUES (?, ?, ?, ?, ?)`,
    [level_id ?? null, quantity, price_brl, description || null, is_active !== false ? 1 : 0]
  );
  res.status(201).json({ id: result.insertId });
});

// PUT /api/module-packages/:id — atualizar
router.put('/:id', requireAuth, requirePermission('agente', 'update'), async (req, res) => {
  const { level_id, quantity, price_brl, description, is_active } = req.body;
  if (!quantity || !price_brl)
    return res.status(400).json({ error: 'quantity e price_brl são obrigatórios' });

  const [conflict] = await db.query(
    'SELECT id FROM module_packages WHERE level_id <=> ? AND quantity = ? AND id != ?',
    [level_id ?? null, quantity, req.params.id]
  );
  if (conflict.length)
    return res.status(409).json({ error: 'Já existe pacote para essa quantidade neste nível' });

  const [result] = await db.query(
    `UPDATE module_packages
     SET level_id=?, quantity=?, price_brl=?, description=?, is_active=?
     WHERE id=?`,
    [level_id ?? null, quantity, price_brl, description || null, is_active !== false ? 1 : 0, req.params.id]
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
