require('dotenv').config({ path: require('path').resolve(__dirname, '../../backend-agent/.env.dev') });
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRouter       = require('./routes/auth');
const modulesRouter    = require('./routes/modules');
const clientsRouter    = require('./routes/clients');
const adminUsersRouter = require('./routes/adminUsers');
const chestsRouter          = require('./routes/chests');
const coinProportionsRouter = require('./routes/coinProportions');
const ordersRouter          = require('./routes/orders');
const uploadRouter          = require('./routes/upload');

const app  = express();
const PORT = process.env.ADMIN_PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5174';

app.set('trust proxy', 1);

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

app.use('/api/auth',        authRouter);
app.use('/api/modules',     modulesRouter);
app.use('/api/clients',     clientsRouter);
app.use('/api/admin-users', adminUsersRouter);
app.use('/api/chests',           chestsRouter);
app.use('/api/coin-proportions', coinProportionsRouter);
app.use('/api/orders',           ordersRouter);
app.use('/api/upload',           uploadRouter);
app.use('/api/module-packages',  require('./routes/modulePackages'));
app.use('/api/settings', require('./routes/settings'));
app.use('/uploads', require('express').static(require('path').resolve(__dirname, '../uploads')));

// Error handler
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  console.log(`[admin-api] Rodando em http://localhost:${PORT}`);
});
