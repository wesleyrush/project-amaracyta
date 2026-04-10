/**
 * Gerador de Mandala Merkaba Tetraédrica — Estrutura totalmente dinâmica
 * Cada parâmetro geométrico é derivado do hash do texto personalizado do agente
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

function rand(seed: number, idx: number): number {
  return fnv32(`${seed}|${idx}`) / 0xFFFFFFFF;
}

/* ── Extração de cores ───────────────────────────────────────────── */
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
      if (found.length >= 6) break;
    }
  }
  return found;
}

const FALLBACK_PALETTES: string[][] = [
  ['#fbbf24', '#818cf8', '#10b981', '#e0e7ff', '#f472b6', '#06b6d4'],
  ['#f97316', '#8b5cf6', '#06b6d4', '#fde68a', '#4ade80', '#e879f9'],
  ['#ef4444', '#3b82f6', '#a855f7', '#fca5a5', '#67e8f9', '#fcd34d'],
  ['#eab308', '#14b8a6', '#f43f5e', '#bef264', '#c084fc', '#38bdf8'],
  ['#f472b6', '#6366f1', '#84cc16', '#fcd34d', '#fb923c', '#a5f3fc'],
  ['#fb923c', '#4ade80', '#c084fc', '#67e8f9', '#fbbf24', '#f9a8d4'],
  ['#38bdf8', '#fb7185', '#fde68a', '#86efac', '#818cf8', '#f97316'],
  ['#a3e635', '#e879f9', '#67e8f9', '#fda4af', '#fbbf24', '#6366f1'],
];

function hexToRgb(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}
function rgba(hex: string, a: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a.toFixed(2)})`;
}

/* ── Gerador principal ───────────────────────────────────────────── */
export function generateMandala(
  displayName: string,
  seedText?: string,
  moduleName?: string,
): string {
  const rawSeed = (seedText || displayName).trim().toLowerCase();
  const seed    = fnv32(rawSeed);

  /* Paleta de cores */
  const extracted = seedText ? extractColors(seedText) : [];
  const fallback  = FALLBACK_PALETTES[Math.floor(rand(seed, 99) * FALLBACK_PALETTES.length)];
  const palette   = [0, 1, 2, 3, 4, 5].map(i => extracted[i] ?? fallback[i]);
  const [c0, c1, c2, c3, c4, c5] = palette;

  /* ── Parâmetros geométricos variáveis ───────────────────────────── */
  const PETAL_OPTS  = [6, 8, 10, 12, 14, 16, 18, 20, 24];
  const petalCount  = PETAL_OPTS[Math.floor(rand(seed, 0) * PETAL_OPTS.length)];
  const rotOffset   = rand(seed, 1) * Math.PI * 2;
  const starCount   = 150 + Math.floor(rand(seed, 2) * 120);
  const bgHue       = 220 + Math.floor(rand(seed, 3) * 80);

  // Triângulos do Merkaba — raio variável
  const triR        = (S: number) => S * (0.26 + rand(seed, 4) * 0.08);

  // Polígonos internos: lados 3–8, raio variável
  const p1Sides     = 3 + Math.floor(rand(seed, 5) * 6);  // 3-8
  const p1R         = (S: number) => S * (0.13 + rand(seed, 6) * 0.10);
  const p1Rot       = rand(seed, 7) * (Math.PI * 2 / p1Sides);

  const p2Sides     = 3 + Math.floor(rand(seed, 8) * 6);
  const p2R         = (S: number) => S * (0.13 + rand(seed, 9) * 0.10);
  const p2Rot       = rand(seed, 10) * (Math.PI * 2 / p2Sides);

  // Terceiro polígono opcional
  const hasP3       = rand(seed, 11) > 0.35;
  const p3Sides     = 3 + Math.floor(rand(seed, 12) * 6);
  const p3R         = (S: number) => S * (0.17 + rand(seed, 13) * 0.07);
  const p3Rot       = rand(seed, 14) * (Math.PI * 2 / p3Sides);

  // Anéis externos: 2–4
  const ringCount   = 2 + Math.floor(rand(seed, 15) * 3);

  // Spokes radiais opcionais
  const hasSpokes   = rand(seed, 16) > 0.45;
  const SPOKE_OPTS  = [6, 8, 12, 16];
  const spokeCount  = SPOKE_OPTS[Math.floor(rand(seed, 17) * SPOKE_OPTS.length)];
  const spokeLen    = 0.28 + rand(seed, 18) * 0.06;

  // Pétala: proporção altura/largura variável
  const petalH      = 0.044 + rand(seed, 19) * 0.024;
  const petalW      = 0.018 + rand(seed, 20) * 0.012;

  /* ── Canvas ─────────────────────────────────────────────────── */
  const S = 900;
  const canvas = document.createElement('canvas');
  canvas.width = S; canvas.height = S;
  const ctx = canvas.getContext('2d')!;
  const cx = S / 2, cy = S / 2;

  const setGlow   = (c: string, b: number) => { ctx.shadowColor = c; ctx.shadowBlur = b; };
  const clearGlow = () => { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; };

  /* ── Helper: polígono regular ───────────────────────────────── */
  const polygon = (
    sides: number, r: number, rotation: number,
    fillColor: string, fillA: number,
    strokeColor: string, strokeA: number, lw: number,
    glowBlur = 12,
  ) => {
    const path = () => {
      ctx.beginPath();
      for (let i = 0; i < sides; i++) {
        const a = rotation + (i * 2 * Math.PI) / sides;
        const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
    };
    if (fillA > 0) {
      ctx.save(); path();
      ctx.fillStyle = rgba(fillColor, fillA); ctx.fill(); ctx.restore();
    }
    ctx.save(); path();
    ctx.strokeStyle = rgba(strokeColor, strokeA); ctx.lineWidth = lw;
    setGlow(rgba(strokeColor, strokeA * 0.5), glowBlur);
    ctx.stroke(); clearGlow(); ctx.restore();
  };

  /* ── Helper: vértices como pontos luminosos ─────────────────── */
  const vertexDots = (sides: number, r: number, rotation: number, color: string, dotR = 5) => {
    for (let i = 0; i < sides; i++) {
      const a = rotation + (i * 2 * Math.PI) / sides;
      const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
      ctx.save(); ctx.beginPath(); ctx.arc(x, y, dotR, 0, Math.PI * 2);
      ctx.fillStyle = color; setGlow(color, 14); ctx.fill(); clearGlow(); ctx.restore();
    }
  };

  /* ── BACKGROUND ─────────────────────────────────────────────── */
  {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 0.65);
    g.addColorStop(0, '#0e0b2e');
    g.addColorStop(0.4, `hsl(${bgHue},65%,8%)`);
    g.addColorStop(1, '#030110');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  }

  /* ── STAR FIELD ─────────────────────────────────────────────── */
  {
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < starCount; i++) {
      const t  = (i + 0.5) / starCount;
      const r2 = Math.sqrt(t) * S * 0.495;
      const a  = i * goldenAngle + rotOffset * 0.1;
      const sz = 0.3 + (1 - t) * 1.7;
      const al = (0.12 + (1 - t) * 0.58).toFixed(2);
      ctx.beginPath();
      ctx.arc(cx + r2 * Math.cos(a), cy + r2 * Math.sin(a), sz, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(210,215,255,${al})`; ctx.fill();
    }
  }

  /* ── NEBULA ─────────────────────────────────────────────────── */
  {
    const g = ctx.createRadialGradient(cx, cy, S * 0.25, cx, cy, S * 0.52);
    g.addColorStop(0, rgba(c1, 0.14));
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  }

  /* ── LOTUS PETALS (count variável) ─────────────────────────── */
  {
    const PR = S * 0.42;
    for (let i = 0; i < petalCount; i++) {
      const a  = (i / petalCount) * Math.PI * 2 - Math.PI / 2 + rotOffset * 0.05;
      ctx.save();
      ctx.translate(cx + PR * Math.cos(a), cy + PR * Math.sin(a));
      ctx.rotate(a + Math.PI / 2);
      ctx.beginPath();
      ctx.ellipse(0, 0, S * petalW, S * petalH, 0, 0, Math.PI * 2);
      const pg = ctx.createLinearGradient(0, -S * petalH, 0, S * petalH);
      pg.addColorStop(0, rgba(c0, 0.60));
      pg.addColorStop(0.45, rgba(c1, 0.28));
      pg.addColorStop(1, rgba(c1, 0.0));
      ctx.fillStyle = pg; ctx.fill();
      ctx.strokeStyle = rgba(c1, 0.35); ctx.lineWidth = 0.5; ctx.stroke();
      ctx.restore();
    }
  }

  /* ── ANÉIS EXTERNOS (count variável) ───────────────────────── */
  {
    const baseR   = 0.370;
    const spacing = 0.013;
    const ringColors = [c1, c0, c2, c3];
    for (let i = 0; i < ringCount; i++) {
      const r2  = S * (baseR + i * spacing + (i === 0 ? 0.036 : 0));
      const lw  = i === 0 ? 1.5 : 0.7;
      const a   = ringColors[i % ringColors.length];
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r2, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(a, i === 0 ? 0.65 : 0.35); ctx.lineWidth = lw;
      if (i === 0) setGlow(rgba(a, 0.30), 8);
      ctx.stroke(); clearGlow(); ctx.restore();
    }
  }

  /* ── SPOKES RADIAIS (opcional) ──────────────────────────────── */
  if (hasSpokes) {
    for (let i = 0; i < spokeCount; i++) {
      const a  = rotOffset * 0.03 + (i * Math.PI * 2) / spokeCount;
      const r1 = S * 0.06, r2 = S * spokeLen;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx + r1 * Math.cos(a), cy + r1 * Math.sin(a));
      ctx.lineTo(cx + r2 * Math.cos(a), cy + r2 * Math.sin(a));
      ctx.strokeStyle = rgba(c2, 0.18); ctx.lineWidth = 0.8;
      ctx.stroke(); ctx.restore();
    }
  }

  /* ── MERKABA — dois triângulos (fixos, mas raio variável) ───── */
  const tR = triR(S);
  const tRot = rotOffset * 0.08;
  // UP — c0
  polygon(3, tR, -Math.PI / 2 + tRot, c0, 0.18, c0, 0.90, 2);
  vertexDots(3, tR, -Math.PI / 2 + tRot, c0, 5.5);
  // DOWN — c1
  polygon(3, tR,  Math.PI / 2 + tRot, c1, 0.18, c1, 0.90, 2);
  vertexDots(3, tR,  Math.PI / 2 + tRot, c1, 5.5);

  /* ── POLÍGONOS INTERNOS VARIÁVEIS ───────────────────────────── */
  polygon(p1Sides, p1R(S), p1Rot + tRot, c2, 0.10, c2, 0.80, 1.5, 8);
  vertexDots(p1Sides, p1R(S), p1Rot + tRot, c2, 4);

  polygon(p2Sides, p2R(S), p2Rot + tRot, c3, 0.07, c3, 0.70, 1.5, 6);
  vertexDots(p2Sides, p2R(S), p2Rot + tRot, c3, 3.5);

  if (hasP3) {
    polygon(p3Sides, p3R(S), p3Rot + tRot, c4, 0.06, c4, 0.60, 1, 5);
  }

  /* ── CÍRCULO INTERNO ────────────────────────────────────────── */
  {
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, S * 0.21, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(c5, 0.22); ctx.lineWidth = 0.5; ctx.stroke(); ctx.restore();
  }

  /* ── GLOW CENTRAL ───────────────────────────────────────────── */
  {
    const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 0.09);
    cg.addColorStop(0, 'rgba(255,255,255,0.95)');
    cg.addColorStop(0.25, rgba(c0, 0.75));
    cg.addColorStop(0.6,  rgba(c1, 0.35));
    cg.addColorStop(1, 'transparent');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, S * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, S * 0.016, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff'; setGlow('#ffffff', 18); ctx.fill(); clearGlow();
  }

  /* ── PONTOS CARDINAIS ───────────────────────────────────────── */
  {
    const cardR = S * 0.446;
    const dirs = [
      { a: -Math.PI / 2, top: '♊ LIRA',    bot: 'Norte · Cura'   },
      { a:  0,           top: '≈ SÍRIUS',   bot: 'Leste · Ondas'  },
      { a:  Math.PI / 2, top: '⊕ PORTAL',  bot: 'Sul · Guarda'   },
      { a:  Math.PI,     top: '〜 LEMÚRIA', bot: 'Oeste · Águas'  },
    ];
    for (const d of dirs) {
      ctx.save();
      ctx.translate(cx + cardR * Math.cos(d.a), cy + cardR * Math.sin(d.a));
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 12.5px Arial, sans-serif';
      ctx.fillStyle = rgba(c0, 0.92); setGlow(rgba(c0, 0.45), 5);
      ctx.fillText(d.top, 0, -9);
      ctx.font = '10.5px Arial, sans-serif';
      ctx.fillStyle = rgba(c5, 0.80); clearGlow();
      ctx.fillText(d.bot, 0, 9);
      ctx.restore();
    }
  }

  /* ── TÍTULO — Módulo ────────────────────────────────────────── */
  {
    const label    = moduleName ? `✦  MÓDULO: ${moduleName.toUpperCase()}  ✦` : '✦  Mahamatrix  ✦';
    const fontSize = label.length > 38 ? 11 : 14;
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.fillStyle = rgba(c1, 0.88);
    ctx.fillText(label, cx, cy - S * 0.376);
    ctx.restore();
  }

  /* ── NOME + DATA ─────────────────────────────────────────────── */
  {
    const nameY = cy + S * 0.298;
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 19px Arial, sans-serif';
    ctx.fillStyle = rgba(c0, 0.96); setGlow(rgba(c0, 0.55), 10);
    ctx.fillText(displayName.toUpperCase(), cx, nameY);
    ctx.font = '11.5px Arial, sans-serif';
    ctx.fillStyle = rgba(c5, 0.70); clearGlow();
    const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    ctx.fillText('Mandala Merkaba Tetraédrica · ' + today, cx, nameY + 22);
    ctx.restore();
  }

  return canvas.toDataURL('image/png');
}

export function downloadMandala(dataUrl: string, displayName: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `mandala-${displayName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
