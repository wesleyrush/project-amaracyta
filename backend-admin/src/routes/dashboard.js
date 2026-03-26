const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// GET /api/dashboard
router.get('/', requireAuth, async (req, res) => {
  try {
    // ── Resumo geral ─────────────────────────────────────────────────────────
    const [[summary]] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM users)    AS total_clients,
        (SELECT COUNT(*) FROM children) AS total_children,
        (
          SELECT COALESCE(SUM(price_brl), 0) FROM coin_orders WHERE status = 'completed'
        ) + (
          SELECT COALESCE(SUM(price_brl), 0) FROM module_orders WHERE status = 'completed'
        ) AS total_revenue,
        (
          SELECT COUNT(*) FROM coin_orders WHERE status = 'completed'
        ) + (
          SELECT COUNT(*) FROM module_orders WHERE status = 'completed'
        ) AS total_orders
    `);

    // ── Top 5 módulos por sessões ─────────────────────────────────────────────
    const [top_modules] = await db.query(`
      SELECT m.name, COUNT(s.id) AS sessions
      FROM modules m
      LEFT JOIN sessions s ON s.module_id = m.id
      GROUP BY m.id, m.name
      ORDER BY sessions DESC
      LIMIT 5
    `);

    // ── Pacotes mais adquiridos (por qtd de módulos) ──────────────────────────
    const [top_packages] = await db.query(`
      SELECT
        CONCAT(quantity, ' módulo', IF(quantity > 1, 's', '')) AS label,
        COUNT(*) AS purchases,
        COALESCE(SUM(price_brl), 0) AS revenue
      FROM module_orders
      WHERE status = 'completed'
      GROUP BY quantity
      ORDER BY purchases DESC
      LIMIT 5
    `);

    // ── Clientes e filhos por mês (últimos 12 meses) ──────────────────────────
    const [clients_by_month] = await db.query(`
      SELECT
        DATE_FORMAT(created_at, '%Y-%m') AS month,
        COUNT(*) AS clients
      FROM users
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY month
      ORDER BY month
    `);

    const [children_by_month] = await db.query(`
      SELECT
        DATE_FORMAT(created_at, '%Y-%m') AS month,
        COUNT(*) AS children
      FROM children
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY month
      ORDER BY month
    `);

    // Mescla clientes e filhos por mês
    const monthMap = {};
    clients_by_month.forEach(r => {
      monthMap[r.month] = { month: r.month, clients: Number(r.clients), children: 0 };
    });
    children_by_month.forEach(r => {
      if (!monthMap[r.month]) monthMap[r.month] = { month: r.month, clients: 0, children: 0 };
      monthMap[r.month].children = Number(r.children);
    });
    const registrations_by_month = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));

    // ── Pedidos e faturamento por mês (últimos 12 meses) ─────────────────────
    const [orders_revenue_raw] = await db.query(`
      SELECT month, SUM(orders) AS orders, SUM(revenue) AS revenue
      FROM (
        SELECT
          DATE_FORMAT(created_at, '%Y-%m') AS month,
          COUNT(*) AS orders,
          COALESCE(SUM(price_brl), 0) AS revenue
        FROM coin_orders
        WHERE status = 'completed'
          AND created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        GROUP BY month
        UNION ALL
        SELECT
          DATE_FORMAT(created_at, '%Y-%m') AS month,
          COUNT(*) AS orders,
          COALESCE(SUM(price_brl), 0) AS revenue
        FROM module_orders
        WHERE status = 'completed'
          AND created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        GROUP BY month
      ) t
      GROUP BY month
      ORDER BY month
    `);

    const orders_by_month = orders_revenue_raw.map(r => ({
      month: r.month,
      orders: Number(r.orders),
      revenue: Number(r.revenue),
    }));

    res.json({
      summary: {
        total_clients:  Number(summary.total_clients),
        total_children: Number(summary.total_children),
        total_revenue:  Number(summary.total_revenue),
        total_orders:   Number(summary.total_orders),
      },
      top_modules:            top_modules.map(r => ({ ...r, sessions: Number(r.sessions) })),
      top_packages:           top_packages.map(r => ({ ...r, purchases: Number(r.purchases), revenue: Number(r.revenue) })),
      registrations_by_month,
      orders_by_month,
    });
  } catch (err) {
    console.error('[dashboard]', err);
    res.status(500).json({ error: 'Erro ao carregar dashboard' });
  }
});

module.exports = router;
