const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_in_prod';

/**
 * Verifica o token JWT (cookie) e valida a sessão única no banco.
 */
async function requireAuth(req, res, next) {
  const token = req.cookies?.admin_token;
  if (!token) return res.status(401).json({ error: 'Não autenticado' });

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }

  // Verifica se a sessão ainda existe no banco (sessão única)
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const [rows] = await db.query(
    'SELECT id FROM admin_sessions WHERE id = ? AND token_hash = ? AND expires_at > NOW()',
    [payload.sessionId, tokenHash]
  );
  if (!rows.length) return res.status(401).json({ error: 'Sessão expirada ou encerrada em outro dispositivo' });

  req.adminUser = payload;
  next();
}

/**
 * Verifica permissão para o recurso e ação solicitados.
 * uso: requirePermission('clientes', 'delete')
 */
function requirePermission(resource, action) {
  return async (req, res, next) => {
    const [rows] = await db.query(
      'SELECT * FROM admin_permissions WHERE admin_user_id = ? AND resource = ?',
      [req.adminUser.id, resource]
    );
    if (!rows.length) return res.status(403).json({ error: 'Sem permissão' });

    const perm = rows[0];
    const actionMap = { insert: 'can_insert', update: 'can_update', delete: 'can_delete' };
    const col = actionMap[action];
    if (col && !perm[col]) return res.status(403).json({ error: `Sem permissão para ${action} em ${resource}` });
    next();
  };
}

module.exports = { requireAuth, requirePermission, JWT_SECRET };
