/**
 * Gerador de Relatório PDF (via janela de impressão do navegador)
 * Inclui cabeçalho com logo, dados do consulente, registros da consulta e mandala.
 */

import type { Message } from '../types';
import { renderMarkdown } from './markdown';

export interface ReportOptions {
  moduleName: string;
  userName: string;
  userEmail?: string;
  birthDate?: string;      // dd/mm/aaaa
  consultationDate: string; // data formatada
  messages: Message[];
  flowStep?: number;       // quantos bubbles de fluxo pular além do welcome
  mandalaDataUrl?: string;
  logoUrl?: string;
  logoSvg?: string;
  siteTitle?: string;
}

export function openPdfReport(opts: ReportOptions): void {
  const {
    moduleName, userName, userEmail, birthDate,
    consultationDate, messages, flowStep = 0,
    mandalaDataUrl,
    logoUrl, logoSvg, siteTitle = 'Mahamatrix',
  } = opts;

  // Pula welcome (1) + bubbles de avanço de fluxo (flowStep)
  const agentMsgs = messages.filter(m => m.role === 'assistant' && !m.hidden).slice(1 + flowStep);

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" class="logo-img" alt="${siteTitle}">`
    : logoSvg
      ? `<div class="logo-svg">${logoSvg}</div>`
      : `<div class="logo-text">${siteTitle}</div>`;

  const headerRows = [
    `<tr><td class="hk">MÓDULO</td><td class="hv">${moduleName}</td></tr>`,
    `<tr><td class="hk">CONSULENTE</td><td class="hv">${userName}</td></tr>`,
    birthDate  ? `<tr><td class="hk">NASCIMENTO</td><td class="hv">${birthDate}</td></tr>` : '',
    `<tr><td class="hk">DATA DA CONSULTA</td><td class="hv">${consultationDate}</td></tr>`,
  ].filter(Boolean).join('');

  const messagesHtml = agentMsgs.length
    ? agentMsgs.map((m, i) =>
        `<div class="msg-block">
          <div class="msg-content">${renderMarkdown(m.content)}</div>
        </div>${i < agentMsgs.length - 1 ? '<div class="msg-sep"></div>' : ''}`
      ).join('')
    : '<p style="color:#9ca3af;font-style:italic">Nenhuma resposta registrada.</p>';

  const mandalaSection = mandalaDataUrl
    ? `<div class="section mandala-section">
        <h2 class="section-title">Sua Mandala Merkaba Tetraédrica</h2>
        <p class="mandala-subtitle">Canal de conexão personalizado com suas frequências ancestrais</p>
        <div class="mandala-wrap">
          <img src="${mandalaDataUrl}" class="mandala-img" alt="Mandala Merkaba Personalizada">
        </div>
      </div>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Relatório · ${moduleName} · ${userName}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.68;
    color: #1a1a2e;
    background: #fff;
  }
  .report {
    max-width: 760px;
    margin: 0 auto;
    padding: 44px 44px 64px;
  }

  /* ── CABEÇALHO ── */
  .report-header {
    display: flex;
    align-items: stretch;
    border: 1.5px solid #3730a3;
    border-radius: 5px;
    margin-bottom: 28px;
    overflow: hidden;
  }
  .header-logo-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 12px 16px;
    border-right: 1.5px solid #3730a3;
    flex: 0 0 33%;
    background: #fafafe;
  }
  .logo-img { width: 100%; max-height: 110px; object-fit: contain; }
  .logo-svg { width: 100%; }
  .logo-svg svg { width: 100%; height: auto; }
  .logo-text {
    font-size: 10pt;
    font-weight: 700;
    color: #3730a3;
    text-align: center;
    line-height: 1.3;
  }
  .header-table {
    flex: 1;
    border-collapse: collapse;
  }
  .header-table tr { border-bottom: 1px solid #e5e7eb; }
  .header-table tr:last-child { border-bottom: none; }
  .hk {
    font-size: 8pt;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #3730a3;
    background: #f5f5ff;
    padding: 2px 8px;
    white-space: nowrap;
    border-right: 1px solid #e5e7eb;
    width: 145px;
    vertical-align: middle;
  }
  .hv {
    padding: 2px 8px;
    font-size: 9pt;
    color: #111827;
    vertical-align: middle;
  }

  /* ── TÍTULO DO RELATÓRIO ── */
  .report-title-bar {
    text-align: center;
    font-size: 13pt;
    font-weight: 700;
    color: #3730a3;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 10px 0 14px;
    border-bottom: 1.5px solid #c7d2fe;
    margin-bottom: 20px;
  }

  /* ── SEÇÃO ── */
  .section { margin-bottom: 32px; }
  .section-title {
    font-size: 13pt;
    font-weight: 700;
    color: #3730a3;
    border-left: 3.5px solid #7c3aed;
    padding-left: 10px;
    margin-bottom: 18px;
    line-height: 1.3;
  }

  /* ── MENSAGENS ── */
  .msg-block { margin-bottom: 6px; }
  .msg-label {
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #7c3aed;
    margin-bottom: 8px;
  }
  .msg-content { color: #111827; }
  .msg-content h1, .msg-content h2, .msg-content h3 {
    color: #1e3a8a;
    margin: 14px 0 6px;
    font-weight: 700;
    line-height: 1.3;
  }
  .msg-content h1 { font-size: 13.5pt; }
  .msg-content h2 { font-size: 12pt; }
  .msg-content h3 { font-size: 11pt; }
  .msg-content p { margin-bottom: 8px; }
  .msg-content ul, .msg-content ol { padding-left: 20px; margin-bottom: 8px; }
  .msg-content li { margin-bottom: 3px; }
  .msg-content strong { font-weight: 700; }
  .msg-content em { font-style: italic; color: #374151; }
  .msg-content code { font-family: monospace; background: #f3f4f6; padding: 1px 5px; border-radius: 3px; font-size: 9pt; }
  .msg-content pre { background: #f3f4f6; padding: 12px; border-radius: 6px; margin: 8px 0; overflow-x: auto; font-size: 9pt; }
  .msg-content table { border-collapse: collapse; width: 100%; margin-bottom: 10px; table-layout: fixed; word-break: break-word; }
  .msg-content th, .msg-content td { border: 1px solid #d1d5db; padding: 6px 10px; text-align: left; }
  .msg-content th { background: #f9fafb; font-weight: 600; }
  .msg-sep { height: 1px; background: linear-gradient(90deg, #e0e7ff, #c7d2fe, #e0e7ff); margin: 22px 0; }

  /* ── MANDALA ── */
  .mandala-section { text-align: center; padding-top: 12px; }
  .mandala-subtitle { color: #6b7280; font-size: 9.5pt; font-style: italic; margin-bottom: 22px; }
  .mandala-wrap { display: flex; justify-content: center; }
  .mandala-img {
    max-width: 480px;
    width: 100%;
    height: auto;
    border-radius: 50%;
    box-shadow: 0 4px 32px rgba(99,102,241,.25), 0 0 0 4px rgba(99,102,241,.15);
  }

  /* ── RODAPÉ ── */
  .report-footer {
    margin-top: 44px;
    padding-top: 16px;
    border-top: 1px solid #e5e7eb;
    text-align: center;
    color: #9ca3af;
    font-size: 8.5pt;
  }

  /* ── IMPRESSÃO ── */
  @media print {
    body { background: #fff; }
    .report { padding: 0; max-width: 100%; }
    .mandala-section { page-break-before: always; }
    .mandala-img { max-width: 400px; border-radius: 50%; }
    .msg-content table { font-size: 8pt; width: 100%; table-layout: fixed; word-break: break-word; }
    .msg-content th, .msg-content td { padding: 4px 6px; font-size: 8pt; }
  }
</style>
</head>
<body>
<div class="report">
  <header class="report-header">
    <div class="header-logo-box">
      ${logoHtml}
    </div>
    <table class="header-table">
      ${headerRows}
    </table>
  </header>

  <div class="report-title-bar">Relatório Final</div>

  <div class="section">
    ${messagesHtml}
  </div>

  ${mandalaSection}

  <footer class="report-footer">
    ${siteTitle} &middot; Relatório gerado em ${consultationDate} &middot; Documento confidencial
  </footer>
</div>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) {
    alert('Por favor, permita pop-ups neste site para baixar o relatório.');
    return;
  }
  win.document.write(html);
  win.document.close();
  // Aguarda carregamento do logo antes de imprimir
  setTimeout(() => {
    try { win.print(); } catch { /* janela pode ter sido fechada */ }
  }, 900);
}
