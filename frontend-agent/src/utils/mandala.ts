/**
 * Gerador de Mandala Merkaba Tetraédrica
 * Parâmetros visuais derivados deterministicamente do texto personalizado do agente
 */

/* ── Hash FNV-1a 32-bit ──────────────────────────────────────────── */
function fnv32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (Math.imul(h, 16777619)) >>> 0;
  }
  return h;
}

/** Número pseudo-aleatório [0,1) derivado do seed e de um índice */
function rand(seed: number, idx: number): number {
  return fnv32(`${seed}|${idx}`) / 0xFFFFFFFF;
}

/* ── Extração de cores a partir do texto do agente ───────────────── */
const COLOR_MAP: [RegExp, string][] = [
  [/dourad|ouro\b/i,                       '#fbbf24'],
  [/\bâmbar|\bambar\b/i,                   '#f59e0b'],
  [/laranja/i,                             '#f97316'],
  [/vermelho|rubi|escarlate/i,             '#ef4444'],
  [/rosa|quartzo.?rosa/i,                  '#ec4899'],
  [/magenta|fúcsia|fucsia/i,              '#e879f9'],
  [/violeta|ametista|amatista/i,           '#8b5cf6'],
  [/púrpura|purpura/i,                    '#a855f7'],
  [/índigo|indigo/i,                      '#6366f1'],
  [/safira|azul.?profundo/i,              '#1d4ed8'],
  [/\bazul\b/i,                            '#3b82f6'],
  [/esmeralda/i,                           '#10b981'],
  [/\bverde\b/i,                           '#22c55e'],
  [/turquesa|água.?marinha|aquamarina/i,  '#06b6d4'],
  [/ciano|cian\b/i,                        '#22d3ee'],
  [/prata|prateado|pérola/i,             '#94a3b8'],
  [/branco|cristal|diamante/i,             '#e0e7ff'],
];

function extractColors(text: string): string[] {
  const found: string[] = [];
  for (const [re, color] of COLOR_MAP) {
    if (re.test(text) && !found.includes(color)) {
      found.push(color);
      if (found.length >= 5) break;
    }
  }
  return found;
}

/* ── Paletas de fallback (8 temas) ──────────────────────────────── */
const FALLBACK_PALETTES: string[][] = [
  ['#fbbf24', '#818cf8', '#10b981', '#e0e7ff'],
  ['#f97316', '#8b5cf6', '#06b6d4', '#fde68a'],
  ['#ef4444', '#3b82f6', '#a855f7', '#fca5a5'],
  ['#eab308', '#14b8a6', '#f43f5e', '#bef264'],
  ['#f472b6', '#6366f1', '#84cc16', '#fcd34d'],
  ['#fb923c', '#4ade80', '#c084fc', '#67e8f9'],
  ['#38bdf8', '#fb7185', '#fde68a', '#86efac'],
  ['#a3e635', '#e879f9', '#67e8f9', '#fda4af'],
];

/* ── Helpers de cor ──────────────────────────────────────────────── */
function hexToRgb(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}
function rgba(hex: string, a: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a.toFixed(2)})`;
}

/* ── Gerador principal ───────────────────────────────────────────── */
export function generateMandala(firstName: string, seedText?: string): string {
  const rawSeed = (seedText || firstName).trim().toLowerCase();
  const seed    = fnv32(rawSeed);

  /* Cores: prioriza palavras-chave extraídas, cai no tema hash */
  const extracted = seedText ? extractColors(seedText) : [];
  const fallback  = FALLBACK_PALETTES[Math.floor(rand(seed, 99) * FALLBACK_PALETTES.length)];
  const fireColor  = extracted[0] ?? fallback[0];
  const waterColor = extracted[1] ?? fallback[1];
  const sq1Color   = extracted[2] ?? fallback[2];
  const sq2Color   = extracted[3] ?? fallback[3];

  /* Parâmetros geométricos variáveis */
  const PETAL_OPTIONS = [8, 10, 12, 14, 16];
  const petalCount = PETAL_OPTIONS[Math.floor(rand(seed, 0) * PETAL_OPTIONS.length)];
  const rotOffset  = rand(seed, 1) * Math.PI * 2;           // rotação base do Merkaba
  const starCount  = 160 + Math.floor(rand(seed, 2) * 100); // 160–260 estrelas
  const bgHue      = 240 + Math.floor(rand(seed, 3) * 60);  // matiz do fundo (240–300)

  /* ── Canvas ─────────────────────────────────────────────────── */
  const S = 900;
  const canvas = document.createElement('canvas');
  canvas.width = S; canvas.height = S;
  const ctx = canvas.getContext('2d')!;
  const cx = S / 2, cy = S / 2;

  const setGlow  = (c: string, b: number) => { ctx.shadowColor = c; ctx.shadowBlur = b; };
  const clearGlow = () => { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; };

  /* BACKGROUND */
  {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 0.65);
    g.addColorStop(0, '#0e0b2e');
    g.addColorStop(0.4, `hsl(${bgHue},70%,8%)`);
    g.addColorStop(1, '#030110');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
  }

  /* STAR FIELD — espiral áurea + offset do seed */
  {
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < starCount; i++) {
      const t  = (i + 0.5) / starCount;
      const r2 = Math.sqrt(t) * S * 0.495;
      const a  = i * goldenAngle + rotOffset * 0.1;
      const x  = cx + r2 * Math.cos(a);
      const y  = cy + r2 * Math.sin(a);
      const sz = 0.35 + (1 - t) * 1.6;
      const al = (0.15 + (1 - t) * 0.55).toFixed(2);
      ctx.beginPath();
      ctx.arc(x, y, sz, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(210,215,255,${al})`;
      ctx.fill();
    }
  }

  /* NEBULA */
  {
    const g = ctx.createRadialGradient(cx, cy, S * 0.28, cx, cy, S * 0.52);
    g.addColorStop(0, rgba(waterColor, 0.12));
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
  }

  /* LOTUS PETALS */
  {
    const PR = S * 0.42;
    for (let i = 0; i < petalCount; i++) {
      const a  = (i / petalCount) * Math.PI * 2 - Math.PI / 2 + rotOffset * 0.05;
      const px = cx + PR * Math.cos(a);
      const py = cy + PR * Math.sin(a);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(a + Math.PI / 2);
      ctx.beginPath();
      ctx.ellipse(0, 0, S * 0.025, S * 0.056, 0, 0, Math.PI * 2);
      const pg = ctx.createLinearGradient(0, -S * 0.056, 0, S * 0.056);
      pg.addColorStop(0, rgba(fireColor,  0.55));
      pg.addColorStop(0.4, rgba(waterColor, 0.30));
      pg.addColorStop(1, rgba(waterColor, 0.0));
      ctx.fillStyle = pg; ctx.fill();
      ctx.strokeStyle = rgba(waterColor, 0.38); ctx.lineWidth = 0.5; ctx.stroke();
      ctx.restore();
    }
  }

  /* RINGS */
  const ring = (r2: number, color: string, glow: string, lw: number, blur = 8) => {
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r2, 0, Math.PI * 2);
    ctx.strokeStyle = color; ctx.lineWidth = lw;
    if (glow) setGlow(glow, blur);
    ctx.stroke(); clearGlow(); ctx.restore();
  };
  ring(S * 0.406, rgba(waterColor, 0.65), rgba(waterColor, 0.30), 1.5);
  ring(S * 0.370, rgba(fireColor,  0.40), '', 0.7);

  /* MERKABA */
  const triR = S * 0.31;
  const triPath = (baseAngle: number) => () => {
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = baseAngle + rotOffset * 0.08 + (i * 2 * Math.PI) / 3;
      i === 0
        ? ctx.moveTo(cx + triR * Math.cos(a), cy + triR * Math.sin(a))
        : ctx.lineTo(cx + triR * Math.cos(a), cy + triR * Math.sin(a));
    }
    ctx.closePath();
  };

  // UP — fogo
  { const path = triPath(-Math.PI / 2);
    ctx.save(); path();
    const gf = ctx.createLinearGradient(cx, cy - triR, cx, cy + triR * 0.55);
    gf.addColorStop(0, rgba(fireColor, 0.22)); gf.addColorStop(1, rgba(fireColor, 0.03));
    ctx.fillStyle = gf; ctx.fill(); ctx.restore();
    ctx.save(); path();
    ctx.strokeStyle = rgba(fireColor, 0.92); ctx.lineWidth = 2;
    setGlow(rgba(fireColor, 0.55), 14); ctx.stroke(); clearGlow(); ctx.restore(); }

  // DOWN — água
  { const path = triPath(Math.PI / 2);
    ctx.save(); path();
    const gf = ctx.createLinearGradient(cx, cy + triR, cx, cy - triR * 0.55);
    gf.addColorStop(0, rgba(waterColor, 0.22)); gf.addColorStop(1, rgba(waterColor, 0.03));
    ctx.fillStyle = gf; ctx.fill(); ctx.restore();
    ctx.save(); path();
    ctx.strokeStyle = rgba(waterColor, 0.92); ctx.lineWidth = 2;
    setGlow(rgba(waterColor, 0.55), 14); ctx.stroke(); clearGlow(); ctx.restore(); }

  /* VÉRTICES */
  const vcols = [fireColor, sq1Color, waterColor, fireColor, sq1Color, waterColor];
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + rotOffset * 0.08 + (i * Math.PI * 2) / 6;
    const x = cx + triR * Math.cos(a), y = cy + triR * Math.sin(a);
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = vcols[i]; setGlow(vcols[i], 14); ctx.fill(); clearGlow(); ctx.restore();
  }

  /* ESTRELA 8 PONTAS */
  const sqR = S * 0.185;
  const sqPath = (offset: number) => () => {
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = offset + rotOffset * 0.06 + (i * Math.PI) / 2;
      i === 0
        ? ctx.moveTo(cx + sqR * Math.cos(a), cy + sqR * Math.sin(a))
        : ctx.lineTo(cx + sqR * Math.cos(a), cy + sqR * Math.sin(a));
    }
    ctx.closePath();
  };
  { const p = sqPath(-Math.PI / 4);
    ctx.save(); p(); ctx.fillStyle = rgba(sq1Color, 0.08); ctx.fill(); ctx.restore();
    ctx.save(); p(); ctx.strokeStyle = rgba(sq1Color, 0.78); ctx.lineWidth = 1.5;
    setGlow(rgba(sq1Color, 0.42), 8); ctx.stroke(); clearGlow(); ctx.restore(); }
  { const p = sqPath(0);
    ctx.save(); p(); ctx.fillStyle = rgba(sq2Color, 0.05); ctx.fill(); ctx.restore();
    ctx.save(); p(); ctx.strokeStyle = rgba(sq2Color, 0.68); ctx.lineWidth = 1.5;
    setGlow(rgba(sq2Color, 0.35), 6); ctx.stroke(); clearGlow(); ctx.restore(); }

  /* CÍRCULO INTERNO */
  ring(S * 0.21, rgba(sq2Color, 0.25), '', 0.5, 0);

  /* GLOW CENTRAL */
  {
    const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 0.09);
    cg.addColorStop(0, 'rgba(255,255,255,0.95)');
    cg.addColorStop(0.25, rgba(fireColor,  0.75));
    cg.addColorStop(0.6,  rgba(waterColor, 0.35));
    cg.addColorStop(1, 'transparent');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, S * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, S * 0.016, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff'; setGlow('#ffffff', 18); ctx.fill(); clearGlow();
  }

  /* PONTOS CARDINAIS */
  {
    const cardR = S * 0.446;
    const dirs = [
      { a: -Math.PI / 2, top: '♊ LIRA',    bot: 'Norte · Cura'   },
      { a:  0,           top: '≈ SÍRIUS',   bot: 'Leste · Ondas'  },
      { a:  Math.PI / 2, top: '⊕ PORTAL',  bot: 'Sul · Guarda'   },
      { a:  Math.PI,     top: '〜 LEMÚRIA', bot: 'Oeste · Águas'  },
    ];
    for (const d of dirs) {
      const dx = cx + cardR * Math.cos(d.a), dy = cy + cardR * Math.sin(d.a);
      ctx.save(); ctx.translate(dx, dy);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 12.5px Arial, sans-serif';
      ctx.fillStyle = rgba(fireColor, 0.92);
      setGlow(rgba(fireColor, 0.45), 5);
      ctx.fillText(d.top, 0, -9);
      ctx.font = '10.5px Arial, sans-serif';
      ctx.fillStyle = rgba(sq2Color, 0.80);
      clearGlow(); ctx.fillText(d.bot, 0, 9);
      ctx.restore();
    }
  }

  /* TÍTULO */
  {
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.fillStyle = rgba(waterColor, 0.88);
    ctx.fillText('✦  JORNADA AKASHA  ✦', cx, cy - S * 0.376);
    ctx.restore();
  }

  /* NOME + DATA */
  {
    const nameY = cy + S * 0.298;
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 19px Arial, sans-serif';
    ctx.fillStyle = rgba(fireColor, 0.96);
    setGlow(rgba(fireColor, 0.55), 10);
    ctx.fillText(firstName.toUpperCase(), cx, nameY);
    ctx.font = '11.5px Arial, sans-serif';
    ctx.fillStyle = rgba(sq2Color, 0.70);
    clearGlow();
    const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    ctx.fillText('Mandala Merkaba Tetraédrica · ' + today, cx, nameY + 22);
    ctx.restore();
  }

  return canvas.toDataURL('image/png');
}

export function downloadMandala(dataUrl: string, firstName: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `mandala-${firstName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
