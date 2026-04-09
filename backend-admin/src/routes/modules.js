const router = require('express').Router();
const db = require('../db');
const { requireAuth, requirePermission } = require('../middleware/auth');

// GET /api/modules — lista todos os módulos
router.get('/', requireAuth, async (req, res) => {
  const [rows] = await db.query(
    `SELECT m.id, m.slug, m.name, m.description, m.image_svg, m.system_prompt,
            m.opening_prompt, m.few_shot, m.welcome_message, m.use_opening_prompt, m.show_opening_prompt,
            m.is_active, m.module_type, m.price_brl, m.level_id, m.life_category, m.created_at,
            ml.name AS level_name, ml.slug AS level_slug, ml.price_brl AS level_price_brl
     FROM modules m
     LEFT JOIN module_levels ml ON ml.id = m.level_id
     ORDER BY m.id DESC`
  );
  res.json({ items: rows });
});

// GET /api/modules/:id — detalhe de um módulo
router.get('/:id', requireAuth, async (req, res) => {
  const [rows] = await db.query(
    `SELECT m.*, ml.name AS level_name, ml.slug AS level_slug, ml.price_brl AS level_price_brl
     FROM modules m LEFT JOIN module_levels ml ON ml.id = m.level_id
     WHERE m.id = ?`,
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Módulo não encontrado' });
  res.json(rows[0]);
});

// POST /api/modules — criar módulo
router.post('/', requireAuth, requirePermission('agente', 'insert'), async (req, res) => {
  const { slug, name, description, image_svg, system_prompt,
          opening_prompt, few_shot, welcome_message, use_opening_prompt, show_opening_prompt,
          module_type, level_id, life_category } = req.body;
  if (!slug || !name || !system_prompt)
    return res.status(400).json({ error: 'slug, name e system_prompt são obrigatórios' });

  try {
    const [result] = await db.query(
      `INSERT INTO modules
         (slug, name, description, image_svg, system_prompt,
          opening_prompt, few_shot, welcome_message, use_opening_prompt, show_opening_prompt,
          module_type, level_id, life_category)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        slug, name, description || null, image_svg || null, system_prompt,
        opening_prompt || null, few_shot || null, welcome_message || null,
        use_opening_prompt ? 1 : 0,
        show_opening_prompt ? 1 : 0,
        module_type || 'free',
        (module_type === 'fixed' && level_id) ? level_id : null,
        life_category || null,
      ]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: `O slug "${slug}" já está em uso. Escolha outro.` });
    }
    throw err;
  }
});

// PUT /api/modules/:id — atualizar módulo
router.put('/:id', requireAuth, requirePermission('agente', 'update'), async (req, res) => {
  const { slug, name, description, image_svg, system_prompt,
          opening_prompt, few_shot, welcome_message, use_opening_prompt, show_opening_prompt,
          module_type, level_id, life_category } = req.body;
  if (!slug || !name || !system_prompt)
    return res.status(400).json({ error: 'slug, name e system_prompt são obrigatórios' });

  try {
    const [result] = await db.query(
      `UPDATE modules
       SET slug=?, name=?, description=?, image_svg=?, system_prompt=?,
           opening_prompt=?, few_shot=?, welcome_message=?, use_opening_prompt=?, show_opening_prompt=?,
           module_type=?, level_id=?, life_category=?
       WHERE id=?`,
      [
        slug, name, description || null, image_svg || null, system_prompt,
        opening_prompt || null, few_shot || null, welcome_message || null,
        use_opening_prompt ? 1 : 0,
        show_opening_prompt ? 1 : 0,
        module_type || 'free',
        (module_type === 'fixed' && level_id) ? level_id : null,
        life_category || null,
        req.params.id,
      ]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Módulo não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: `O slug "${slug}" já está em uso. Escolha outro.` });
    }
    throw err;
  }
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

// ── Flow Steps ────────────────────────────────────────────────────────────────

// GET /api/modules/:id/flow-steps
router.get('/:id/flow-steps', requireAuth, async (req, res) => {
  const [rows] = await db.query(
    `SELECT * FROM module_flow_steps WHERE module_id = ? ORDER BY step_order`,
    [req.params.id]
  );
  res.json({ items: rows });
});

// POST /api/modules/:id/flow-steps
router.post('/:id/flow-steps', requireAuth, requirePermission('agente', 'insert'), async (req, res) => {
  const { step_order, label, button_label, button_response, prompt_template, step_system_prompt, include_user_profile, is_hidden } = req.body;
  if (!step_order) return res.status(400).json({ error: 'step_order é obrigatório' });

  const [existing] = await db.query(
    'SELECT id FROM module_flow_steps WHERE module_id = ? AND step_order = ?',
    [req.params.id, step_order]
  );
  if (existing.length) return res.status(409).json({ error: `Já existe um passo com step_order=${step_order}` });

  const [result] = await db.query(
    `INSERT INTO module_flow_steps
       (module_id, step_order, label, button_label, button_response, prompt_template, step_system_prompt, include_user_profile, is_hidden)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.params.id, step_order,
      label || null, button_label || null, button_response || null, prompt_template || null,
      step_system_prompt || null,
      include_user_profile ? 1 : 0,
      is_hidden ? 1 : 0,
    ]
  );
  const [rows] = await db.query('SELECT * FROM module_flow_steps WHERE id = ?', [result.insertId]);
  res.status(201).json(rows[0]);
});

// PUT /api/modules/:id/flow-steps/:stepId
router.put('/:id/flow-steps/:stepId', requireAuth, requirePermission('agente', 'update'), async (req, res) => {
  const { step_order, label, button_label, button_response, prompt_template, step_system_prompt, include_user_profile, is_hidden } = req.body;

  const [existing] = await db.query(
    'SELECT id FROM module_flow_steps WHERE id = ? AND module_id = ?',
    [req.params.stepId, req.params.id]
  );
  if (!existing.length) return res.status(404).json({ error: 'Passo não encontrado' });

  await db.query(
    `UPDATE module_flow_steps
     SET step_order=?, label=?, button_label=?, button_response=?, prompt_template=?, step_system_prompt=?,
         include_user_profile=?, is_hidden=?, updated_at=NOW()
     WHERE id=?`,
    [
      step_order, label || null, button_label || null, button_response || null, prompt_template || null,
      step_system_prompt || null,
      include_user_profile ? 1 : 0,
      is_hidden ? 1 : 0,
      req.params.stepId,
    ]
  );
  const [rows] = await db.query('SELECT * FROM module_flow_steps WHERE id = ?', [req.params.stepId]);
  res.json(rows[0]);
});

// DELETE /api/modules/:id/flow-steps/:stepId
router.delete('/:id/flow-steps/:stepId', requireAuth, requirePermission('agente', 'delete'), async (req, res) => {
  const [result] = await db.query(
    'DELETE FROM module_flow_steps WHERE id = ? AND module_id = ?',
    [req.params.stepId, req.params.id]
  );
  if (!result.affectedRows) return res.status(404).json({ error: 'Passo não encontrado' });
  res.status(204).send();
});

module.exports = router;
