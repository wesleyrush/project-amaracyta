const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');

const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';
const COOKIE_SAMESITE = process.env.COOKIE_SAMESITE || 'Lax';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

function msFromExpiry(exp) {
  const match = exp.match(/^(\d+)([hd])$/);
  if (!match) return 8 * 60 * 60 * 1000;
  const [, n, unit] = match;
  return unit === 'h' ? n * 3600000 : n * 86400000;
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email e senha obrigatórios' });

  const [users] = await db.query('SELECT * FROM admin_users WHERE email = ?', [email]);
  if (!users.length) return res.status(401).json({ error: 'Credenciais inválidas' });

  const user = users[0];
  if (user.status !== 'active') return res.status(403).json({ error: 'Usuário inativo' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Credenciais inválidas' });

  // Busca permissões
  const [perms] = await db.query(
    'SELECT resource, can_insert, can_update, can_delete FROM admin_permissions WHERE admin_user_id = ?',
    [user.id]
  );

  const sessionId = uuidv4().replace(/-/g, '');
  const expiresAt = new Date(Date.now() + msFromExpiry(JWT_EXPIRES_IN));

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, sessionId, permissions: perms },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // Sessão única: remove todas as sessões anteriores desse usuário
  await db.query('DELETE FROM admin_sessions WHERE admin_user_id = ?', [user.id]);

  await db.query(
    'INSERT INTO admin_sessions (id, admin_user_id, token_hash, ip_address, user_agent, expires_at) VALUES (?,?,?,?,?,?)',
    [sessionId, user.id, tokenHash, req.ip, req.headers['user-agent']?.slice(0, 500), expiresAt]
  );

  res.cookie('admin_token', token, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAMESITE,
    path: '/',
    expires: expiresAt,
  });

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    permissions: perms,
  });
});

// POST /api/auth/logout
router.post('/logout', requireAuth, async (req, res) => {
  await db.query('DELETE FROM admin_sessions WHERE admin_user_id = ?', [req.adminUser.id]);
  res.clearCookie('admin_token', { path: '/' });
  res.json({ ok: true });
});

// POST /api/auth/change-password
router.post('/change-password', requireAuth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password)
    return res.status(400).json({ error: 'Senhas obrigatórias' });
  if (new_password.length < 6)
    return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres' });

  const [users] = await db.query('SELECT * FROM admin_users WHERE id = ?', [req.adminUser.id]);
  if (!users.length) return res.status(404).json({ error: 'Usuário não encontrado' });

  const valid = await bcrypt.compare(current_password, users[0].password_hash);
  if (!valid) return res.status(401).json({ error: 'Senha atual incorreta' });

  const hash = await bcrypt.hash(new_password, 10);
  await db.query('UPDATE admin_users SET password_hash = ? WHERE id = ?', [hash, req.adminUser.id]);
  res.json({ ok: true });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  const [users] = await db.query(
    'SELECT id, name, email, status FROM admin_users WHERE id = ?',
    [req.adminUser.id]
  );
  if (!users.length) return res.status(404).json({ error: 'Usuário não encontrado' });

  const [perms] = await db.query(
    'SELECT resource, can_insert, can_update, can_delete FROM admin_permissions WHERE admin_user_id = ?',
    [req.adminUser.id]
  );

  res.json({ ...users[0], permissions: perms });
});

module.exports = router;
