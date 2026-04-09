const router = require('express').Router();
const db = require('../db');
const { requireAuth, requirePermission } = require('../middleware/auth');

// GET /api/module-levels — lista todos os níveis
router.get('/', requireAuth, async (req, res) => {
  const [rows] = await db.query(
    `SELECT id, slug, name, description, price_brl, is_active, created_at, updated_at
     FROM module_levels ORDER BY id ASC`
  );
  res.json({ items: rows });
});

// GET /api/module-levels/:id
router.get('/:id', requireAuth, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM module_levels WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Nível não encontrado' });
  res.json(rows[0]);
});

// POST /api/module-levels
router.post('/', requireAuth, requirePermission('agente', 'insert'), async (req, res) => {
  const { slug, name, description, price_brl, is_active } = req.body;
  if (!slug || !name || price_brl == null)
    return res.status(400).json({ error: 'slug, name e price_brl são obrigatórios' });

  try {
    const [result] = await db.query(
      `INSERT INTO module_levels (slug, name, description, price_brl, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [slug, name, description || null, price_brl, is_active !== false ? 1 : 0]
    );
    const [rows] = await db.query('SELECT * FROM module_levels WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: `O slug "${slug}" já está em uso.` });
    throw err;
  }
});

// PUT /api/module-levels/:id
router.put('/:id', requireAuth, requirePermission('agente', 'update'), async (req, res) => {
  const { slug, name, description, price_brl, is_active } = req.body;
  if (!slug || !name || price_brl == null)
    return res.status(400).json({ error: 'slug, name e price_brl são obrigatórios' });

  try {
    const [result] = await db.query(
      `UPDATE module_levels SET slug=?, name=?, description=?, price_brl=?, is_active=?, updated_at=NOW()
       WHERE id=?`,
      [slug, name, description || null, price_brl, is_active !== false ? 1 : 0, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Nível não encontrado' });
    const [rows] = await db.query('SELECT * FROM module_levels WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: `O slug "${slug}" já está em uso.` });
    throw err;
  }
});

// PATCH /api/module-levels/:id/toggle
router.patch('/:id/toggle', requireAuth, requirePermission('agente', 'update'), async (req, res) => {
  const [rows] = await db.query('SELECT is_active FROM module_levels WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Nível não encontrado' });
  const newState = rows[0].is_active ? 0 : 1;
  await db.query('UPDATE module_levels SET is_active=?, updated_at=NOW() WHERE id=?', [newState, req.params.id]);
  res.json({ is_active: newState });
});

// DELETE /api/module-levels/:id
router.delete('/:id', requireAuth, requirePermission('agente', 'delete'), async (req, res) => {
  const [result] = await db.query('DELETE FROM module_levels WHERE id = ?', [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Nível não encontrado' });
  res.json({ ok: true });
});

module.exports = router;
