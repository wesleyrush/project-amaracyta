const router = require('express').Router();
const db = require('../db');
const { requireAuth, requirePermission } = require('../middleware/auth');

// GET /api/modules — lista todos os módulos
router.get('/', requireAuth, async (req, res) => {
  const [rows] = await db.query(
    `SELECT id, slug, name, description, image_svg, system_prompt,
            opening_prompt, few_shot, welcome_message, use_opening_prompt,
            is_active, module_type, price_brl, created_at
     FROM modules ORDER BY id DESC`
  );
  res.json({ items: rows });
});

// GET /api/modules/:id — detalhe de um módulo
router.get('/:id', requireAuth, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM modules WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Módulo não encontrado' });
  res.json(rows[0]);
});

// POST /api/modules — criar módulo
router.post('/', requireAuth, requirePermission('agente', 'insert'), async (req, res) => {
  const { slug, name, description, image_svg, system_prompt,
          opening_prompt, few_shot, welcome_message, use_opening_prompt,
          module_type, price_brl } = req.body;
  if (!slug || !name || !system_prompt)
    return res.status(400).json({ error: 'slug, name e system_prompt são obrigatórios' });

  const [result] = await db.query(
    `INSERT INTO modules
       (slug, name, description, image_svg, system_prompt,
        opening_prompt, few_shot, welcome_message, use_opening_prompt,
        module_type, price_brl)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [
      slug, name, description || null, image_svg || null, system_prompt,
      opening_prompt || null, few_shot || null, welcome_message || null,
      use_opening_prompt ? 1 : 0,
      module_type || 'free',
      (module_type === 'fixed' && price_brl) ? price_brl : null,
    ]
  );
  res.status(201).json({ id: result.insertId });
});

// PUT /api/modules/:id — atualizar módulo
router.put('/:id', requireAuth, requirePermission('agente', 'update'), async (req, res) => {
  const { slug, name, description, image_svg, system_prompt,
          opening_prompt, few_shot, welcome_message, use_opening_prompt,
          module_type, price_brl } = req.body;
  if (!slug || !name || !system_prompt)
    return res.status(400).json({ error: 'slug, name e system_prompt são obrigatórios' });

  const [result] = await db.query(
    `UPDATE modules
     SET slug=?, name=?, description=?, image_svg=?, system_prompt=?,
         opening_prompt=?, few_shot=?, welcome_message=?, use_opening_prompt=?,
         module_type=?, price_brl=?
     WHERE id=?`,
    [
      slug, name, description || null, image_svg || null, system_prompt,
      opening_prompt || null, few_shot || null, welcome_message || null,
      use_opening_prompt ? 1 : 0,
      module_type || 'free',
      (module_type === 'fixed' && price_brl) ? price_brl : null,
      req.params.id,
    ]
  );
  if (!result.affectedRows) return res.status(404).json({ error: 'Módulo não encontrado' });
  res.json({ ok: true });
});

// PATCH /api/modules/:id/toggle — ativar/desativar
router.patch('/:id/toggle', requireAuth, requirePermission('agente', 'update'), async (req, res) => {
  const [rows] = await db.query('SELECT is_active FROM modules WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Módulo não encontrado' });

  const newState = rows[0].is_active ? 0 : 1;
  await db.query('UPDATE modules SET is_active = ? WHERE id = ?', [newState, req.params.id]);
  res.json({ is_active: newState });
});

// DELETE /api/modules/:id
router.delete('/:id', requireAuth, requirePermission('agente', 'delete'), async (req, res) => {
  const [result] = await db.query('DELETE FROM modules WHERE id = ?', [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Módulo não encontrado' });
  res.json({ ok: true });
});

module.exports = router;
