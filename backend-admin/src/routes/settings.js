const router = require('express').Router();
const db     = require('../db');
const { requireAuth, requirePermission } = require('../middleware/auth');

// GET /api/settings
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT `key`, `value` FROM site_settings');
    const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

// PUT /api/settings
router.put('/', requireAuth, requirePermission('agente', 'update'), async (req, res) => {
  try {
    const allowed = ['site_title', 'logo_url', 'logo_svg', 'login_bg_url'];
    const entries = Object.entries(req.body).filter(([k]) => allowed.includes(k));
    if (!entries.length) return res.status(400).json({ error: 'Nenhum campo válido.' });

    for (const [key, value] of entries) {
      await db.query(
        'INSERT INTO site_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?, updated_at = NOW()',
        [key, value, value]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar configurações' });
  }
});

module.exports = router;
