const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAuth, requirePermission } = require('../middleware/auth');

// GET /api/clients — lista clientes com contagem de mensagens
router.get('/', requireAuth, async (req, res) => {
  const [rows] = await db.query(`
    SELECT
      u.id, u.full_name, u.initiatic_name, u.email,
      u.birth_date, u.birth_time, u.birth_country, u.birth_state, u.birth_city,
      u.created_at, u.last_login_at, u.is_active,
      CAST(COALESCE(u.coins_gold,   0) AS DECIMAL(12,7)) AS coins_gold,
      CAST(COALESCE(u.coins_silver, 0) AS DECIMAL(12,7)) AS coins_silver,
      CAST(COALESCE(u.coins_bronze, 0) AS DECIMAL(12,7)) AS coins_bronze,
      COUNT(DISTINCT s.id)  AS session_count,
      COUNT(m.id)           AS message_count
    FROM users u
    LEFT JOIN sessions s ON s.user_id = u.id
    LEFT JOIN messages m ON m.session_id = s.id AND m.role = 'user'
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `);
  res.json({ items: rows });
});

// GET /api/clients/:id — detalhe
router.get('/:id', requireAuth, async (req, res) => {
  const [rows] = await db.query(
    'SELECT id, full_name, initiatic_name, email, birth_date, birth_time, birth_country, birth_state, birth_city, created_at, last_login_at, is_active FROM users WHERE id = ?',
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Cliente não encontrado' });
  res.json(rows[0]);
});

// PUT /api/clients/:id — atualizar cliente
router.put('/:id', requireAuth, requirePermission('clientes', 'update'), async (req, res) => {
  const { full_name, initiatic_name, email, birth_date, birth_time, birth_country, birth_state, birth_city } = req.body;
  const [result] = await db.query(
    'UPDATE users SET full_name=?, initiatic_name=?, email=?, birth_date=?, birth_time=?, birth_country=?, birth_state=?, birth_city=? WHERE id=?',
    [full_name, initiatic_name || null, email, birth_date || null, birth_time || null, birth_country || null, birth_state || null, birth_city || null, req.params.id]
  );
  if (!result.affectedRows) return res.status(404).json({ error: 'Cliente não encontrado' });
  res.json({ ok: true });
});

// PATCH /api/clients/:id/toggle — bloquear/desbloquear
router.patch('/:id/toggle', requireAuth, requirePermission('clientes', 'update'), async (req, res) => {
  const [rows] = await db.query('SELECT is_active FROM users WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Cliente não encontrado' });

  const newState = rows[0].is_active ? 0 : 1;
  await db.query('UPDATE users SET is_active = ? WHERE id = ?', [newState, req.params.id]);
  res.json({ is_active: newState });
});

// DELETE /api/clients/:id
router.delete('/:id', requireAuth, requirePermission('clientes', 'delete'), async (req, res) => {
  const [result] = await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Cliente não encontrado' });
  res.json({ ok: true });
});

// GET /api/clients/:id/sessions — histórico de acessos
router.get('/:id/sessions', requireAuth, async (req, res) => {
  const [rows] = await db.query(`
    SELECT s.id, u.full_name, s.title, s.created_at, m.name AS module_name
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN modules m ON m.id = s.module_id
    WHERE s.user_id = ?
    ORDER BY s.created_at DESC
  `, [req.params.id]);
  res.json({ items: rows });
});

// POST /api/clients/:id/add-balance — adicionar moedas ao cliente
router.post('/:id/add-balance', requireAuth, requirePermission('cobranca', 'update'), async (req, res) => {
  const { amount, coin_type = 'gold', description } = req.body;
  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return res.status(400).json({ error: 'amount deve ser um número positivo' });
  }
  const colMap = { gold: 'coins_gold', silver: 'coins_silver', bronze: 'coins_bronze' };
  const col = colMap[coin_type] || 'coins_gold';

  const [rows] = await db.query('SELECT id FROM users WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Cliente não encontrado' });

  await db.query(`UPDATE users SET ${col} = COALESCE(${col}, 0) + ? WHERE id = ?`, [Number(amount), req.params.id]);
  await db.query(
    'INSERT INTO coin_transactions (user_id, amount, type, coin_type, description) VALUES (?,?,?,?,?)',
    [req.params.id, Number(amount), 'admin_credit', coin_type, description || `Crédito manual — adm`]
  );

  const [updated] = await db.query(
    'SELECT coins_gold, coins_silver, coins_bronze FROM users WHERE id = ?', [req.params.id]
  );
  res.json({ ok: true, ...updated[0] });
});

// GET /api/clients/:id/transactions — histórico de moedas
router.get('/:id/transactions', requireAuth, async (req, res) => {
  const [rows] = await db.query(
    'SELECT * FROM coin_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 200',
    [req.params.id]
  );
  res.json({ items: rows });
});

// GET /api/clients/:id/messages — mensagens do cliente
router.get('/:id/messages', requireAuth, async (req, res) => {
  const [rows] = await db.query(`
    SELECT msg.id, msg.session_id, msg.role, msg.content, msg.ts,
           msg.coin_value, msg.coin_type,
           s.title AS session_title, m.name AS module_name
    FROM messages msg
    JOIN sessions s ON s.id = msg.session_id
    LEFT JOIN modules m ON m.id = s.module_id
    WHERE s.user_id = ?
    ORDER BY msg.ts DESC
    LIMIT 500
  `, [req.params.id]);
  res.json({ items: rows });
});

// GET /api/clients/:id/children
router.get('/:id/children', requireAuth, async (req, res) => {
  const [rows] = await db.query(
    'SELECT * FROM children WHERE user_id = ? ORDER BY full_name ASC',
    [req.params.id]
  );
  res.json({ items: rows });
});

// POST /api/clients/:id/children
router.post('/:id/children', requireAuth, requirePermission('clientes', 'update'), async (req, res) => {
  const { full_name, initiatic_name, birth_date, birth_time, birth_country, birth_state, birth_city } = req.body;
  if (!full_name) return res.status(400).json({ error: 'full_name é obrigatório' });
  const [result] = await db.query(
    'INSERT INTO children (user_id, full_name, initiatic_name, birth_date, birth_time, birth_country, birth_state, birth_city) VALUES (?,?,?,?,?,?,?,?)',
    [req.params.id, full_name, initiatic_name || null, birth_date || null, birth_time || null, birth_country || null, birth_state || null, birth_city || null]
  );
  const [rows] = await db.query('SELECT * FROM children WHERE id = ?', [result.insertId]);
  res.status(201).json(rows[0]);
});

// PUT /api/clients/:id/children/:cid
router.put('/:id/children/:cid', requireAuth, requirePermission('clientes', 'update'), async (req, res) => {
  const { full_name, initiatic_name, birth_date, birth_time, birth_country, birth_state, birth_city } = req.body;
  const [result] = await db.query(
    'UPDATE children SET full_name=?, initiatic_name=?, birth_date=?, birth_time=?, birth_country=?, birth_state=?, birth_city=? WHERE id=? AND user_id=?',
    [full_name, initiatic_name || null, birth_date || null, birth_time || null, birth_country || null, birth_state || null, birth_city || null, req.params.cid, req.params.id]
  );
  if (!result.affectedRows) return res.status(404).json({ error: 'Filho não encontrado' });
  const [rows] = await db.query('SELECT * FROM children WHERE id = ?', [req.params.cid]);
  res.json(rows[0]);
});

// DELETE /api/clients/:id/children/:cid
router.delete('/:id/children/:cid', requireAuth, requirePermission('clientes', 'update'), async (req, res) => {
  const [result] = await db.query(
    'DELETE FROM children WHERE id = ? AND user_id = ?',
    [req.params.cid, req.params.id]
  );
  if (!result.affectedRows) return res.status(404).json({ error: 'Filho não encontrado' });
  res.json({ ok: true });
});

module.exports = router;
