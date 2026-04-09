const router  = require('express').Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { requireAuth, requirePermission } = require('../middleware/auth');

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads/chests');

// Garante que o diretório existe
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `chest-${Date.now()}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) return cb(null, true);
    cb(new Error('Formato não permitido. Use PNG, JPG, WebP, GIF ou SVG.'));
  },
});

// POST /api/upload/chest-image
router.post(
  '/chest-image',
  requireAuth,
  requirePermission('cobranca', 'update'),
  upload.single('image'),
  (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    // Retorna URL absoluta para que o frontend-agent possa usá-la diretamente
    const origin = `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${origin}/uploads/chests/${req.file.filename}`;
    res.json({ url: fileUrl });
  }
);

// DELETE /api/upload/chest-image  — remove arquivo antigo ao trocar imagem
router.delete(
  '/chest-image',
  requireAuth,
  requirePermission('cobranca', 'update'),
  (req, res) => {
    const { filename } = req.body;
    if (!filename || filename.includes('..')) return res.status(400).json({ error: 'Arquivo inválido.' });
    const filePath = path.join(UPLOADS_DIR, path.basename(filename));
    fs.unlink(filePath, () => {}); // ignora erro se já não existir
    res.json({ ok: true });
  }
);

const MODULES_DIR = path.resolve(__dirname, '../../uploads/modules');
if (!fs.existsSync(MODULES_DIR)) fs.mkdirSync(MODULES_DIR, { recursive: true });

const storageModule = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, MODULES_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `module-${Date.now()}${ext}`);
  },
});
const uploadModule = multer({
  storage: storageModule,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) return cb(null, true);
    cb(new Error('Formato não permitido. Use PNG, JPG, WebP, GIF ou SVG.'));
  },
});

// POST /api/upload/module-image
router.post(
  '/module-image',
  requireAuth,
  requirePermission('agente', 'update'),
  uploadModule.single('image'),
  (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    const origin = `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${origin}/uploads/modules/${req.file.filename}`;
    res.json({ url: fileUrl });
  }
);

const LOGOS_DIR = path.resolve(__dirname, '../../uploads/logos');
if (!fs.existsSync(LOGOS_DIR)) fs.mkdirSync(LOGOS_DIR, { recursive: true });

const storageLogo = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, LOGOS_DIR),
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    cb(null, `logo-${Date.now()}${ext}`);
  },
});
const uploadLogo = multer({
  storage: storageLogo,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) return cb(null, true);
    cb(new Error('Formato não permitido.'));
  },
});

// POST /api/upload/logo
router.post(
  '/logo',
  requireAuth,
  requirePermission('agente', 'update'),
  uploadLogo.single('image'),
  (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    const origin  = `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${origin}/uploads/logos/${req.file.filename}`;
    res.json({ url: fileUrl });
  }
);

const LOGIN_BG_DIR = path.resolve(__dirname, '../../uploads/login-bg');
if (!fs.existsSync(LOGIN_BG_DIR)) fs.mkdirSync(LOGIN_BG_DIR, { recursive: true });

const storageLoginBg = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, LOGIN_BG_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `login-bg-${Date.now()}${ext}`);
  },
});
const uploadLoginBg = multer({
  storage: storageLoginBg,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) return cb(null, true);
    cb(new Error('Formato não permitido. Use PNG, JPG ou WebP.'));
  },
});

// POST /api/upload/login-bg
router.post(
  '/login-bg',
  requireAuth,
  requirePermission('agente', 'update'),
  uploadLoginBg.single('image'),
  (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    const origin  = `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${origin}/uploads/login-bg/${req.file.filename}`;
    res.json({ url: fileUrl });
  }
);

module.exports = router;
