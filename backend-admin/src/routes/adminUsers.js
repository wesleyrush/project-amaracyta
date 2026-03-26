const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAuth, requirePermission } = require('../middleware/auth');

const RESOURCES = ['agente', 'clientes', 'usuarios', 'cobranca', 'pedidos', 'configuracoes'];

// GET /api/admin-users
router.get('/', requireAuth, async (req, res) => {
  const [users] = await db.query(
    'SELECT id, name, cpf, email, status, created_at, updated_at FROM admin_users ORDER BY id DESC'
  );
  // Carregar permissões de todos de uma vez
  const [perms] = await db.query('SELECT * FROM admin_permissions');
  const result = users.map(u => ({
    ...u,
    permissions: perms.filter(p => p.admin_user_id === u.id),
  }));
  res.json({ items: result });
});

// GET /api/admin-users/:id
router.get('/:id', requireAuth, async (req, res) => {
  const [users] = await db.query(
    'SELECT id, name, cpf, email, status FROM admin_users WHERE id = ?',
    [req.params.id]
  );
  if (!users.length) return res.status(404).json({ error: 'Usuário não encontrado' });
  const [perms] = await db.query(
    'SELECT resource, can_insert, can_update, can_delete FROM admin_permissions WHERE admin_user_id = ?',
    [req.params.id]
  );
  res.json({ ...users[0], permissions: perms });
});

// POST /api/admin-users
router.post('/', requireAuth, requirePermission('usuarios', 'insert'), async (req, res) => {
  const { name, cpf, email, password, status = 'active', permissions = [] } = req.body;
  if (!name || !cpf || !email || !password)
    return res.status(400).json({ error: 'name, cpf, email e password são obrigatórios' });

  const hash = await bcrypt.hash(password, 12);
  const [result] = await db.query(
    'INSERT INTO admin_users (name, cpf, email, password_hash, status) VALUES (?,?,?,?,?)',
    [name, cpf, email, hash, status]
  );
  const userId = result.insertId;

  // Insere permissões
  for (const resource of RESOURCES) {
    const p = permissions.find(x => x.resource === resource) || {};
    await db.query(
      'INSERT INTO admin_permissions (admin_user_id, resource, can_insert, can_update, can_delete) VALUES (?,?,?,?,?)',
      [userId, resource, p.can_insert ? 1 : 0, p.can_update ? 1 : 0, p.can_delete ? 1 : 0]
    );
  }

  res.status(201).json({ id: userId });
});

// PUT /api/admin-users/:id
router.put('/:id', requireAuth, requirePermission('usuarios', 'update'), async (req, res) => {
  const { name, cpf, email, password, status, permissions = [] } = req.body;

  const fields = ['name=?', 'cpf=?', 'email=?', 'status=?'];
  const values = [name, cpf, email, status];

  if (password) {
    fields.push('password_hash=?');
    values.push(await bcrypt.hash(password, 12));
  }
  values.push(req.params.id);

  const [result] = await db.query(
    `UPDATE admin_users SET ${fields.join(', ')} WHERE id=?`, values
  );
  if (!result.affectedRows) return res.status(404).json({ error: 'Usuário não encontrado' });

  // Atualiza permissões (upsert)
  for (const resource of RESOURCES) {
    const p = permissions.find(x => x.resource === resource) || {};
    await db.query(`
      INSERT INTO admin_permissions (admin_user_id, resource, can_insert, can_update, can_delete)
      VALUES (?,?,?,?,?)
      ON DUPLICATE KEY UPDATE can_insert=VALUES(can_insert), can_update=VALUES(can_update), can_delete=VALUES(can_delete)
    `, [req.params.id, resource, p.can_insert ? 1 : 0, p.can_update ? 1 : 0, p.can_delete ? 1 : 0]);
  }

  res.json({ ok: true });
});

// PATCH /api/admin-users/:id/toggle
router.patch('/:id/toggle', requireAuth, requirePermission('usuarios', 'update'), async (req, res) => {
  const [rows] = await db.query('SELECT status FROM admin_users WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Usuário não encontrado' });

  const newStatus = rows[0].status === 'active' ? 'inactive' : 'active';
  await db.query('UPDATE admin_users SET status = ? WHERE id = ?', [newStatus, req.params.id]);

  // Encerra sessão se desativado
  if (newStatus === 'inactive')
    await db.query('DELETE FROM admin_sessions WHERE admin_user_id = ?', [req.params.id]);

  res.json({ status: newStatus });
});

// DELETE /api/admin-users/:id
router.delete('/:id', requireAuth, requirePermission('usuarios', 'delete'), async (req, res) => {
  // Impede deletar a si mesmo
  if (parseInt(req.params.id) === req.adminUser.id)
    return res.status(400).json({ error: 'Você não pode excluir seu próprio usuário' });

  const [result] = await db.query('DELETE FROM admin_users WHERE id = ?', [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Usuário não encontrado' });
  res.json({ ok: true });
});

module.exports = router;
