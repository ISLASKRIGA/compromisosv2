// Generador de Reporte Ejecutivo PDF con hoja membretada INPer
// Incluye resumen ejecutivo, 5 gráficas y tabla completa de contratos

let _letterheadCache = null;

async function _cargarMembrete() {
  if (_letterheadCache) return _letterheadCache;
  const resp = await fetch('letterhead_bg.jpg');
  if (!resp.ok) throw new Error('No se pudo cargar el membrete (letterhead_bg.jpg)');
  const blob = await resp.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => { _letterheadCache = reader.result; resolve(_letterheadCache); };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Renderiza un Chart.js fuera de pantalla y devuelve PNG dataURL
async function _renderChart(config, cw = 900, ch = 480) {
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  canvas.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
  document.body.appendChild(canvas);
  const chart = new Chart(canvas, config);
  await new Promise(r => setTimeout(r, 250));
  const url = canvas.toDataURL('image/png');
  chart.destroy();
  document.body.removeChild(canvas);
  return url;
}

const CHART_DEFAULTS = {
  plugins: {
    legend: { labels: { font: { size: 13, family: 'Arial' }, color: '#222' } },
    tooltip: { enabled: false },
  },
  animation: false,
  responsive: false,
};

async function _generarGraficas(data) {
  const ctrl  = data.mandatory_control_values;
  const tot   = data.global_totals;
  const conts = data.contracts || [];

  const ROJO    = '#ef4444';
  const VERDE   = '#10b981';
  const GRIS    = '#94a3b8';
  const AZUL    = '#3b82f6';
  const NARANJA = '#f97316';
  const VINO    = '#78091e';

  // ── Gráfica 1: Distribución de estatus (dona) ─────────────────────────────
  const g1 = await _renderChart({
    type: 'doughnut',
    data: {
      labels: ['Falta Recurso', 'Sobra Recurso', 'Equilibrado'],
      datasets: [{ data: [tot.count_falta, tot.count_sobra, tot.count_equilibrado],
        backgroundColor: [ROJO, VERDE, GRIS], borderWidth: 2, borderColor: '#fff' }],
    },
    options: { ...CHART_DEFAULTS,
      plugins: { ...CHART_DEFAULTS.plugins,
        title: { display: true, text: 'Distribución por Estatus de Suficiencia',
          font: { size: 16, weight: 'bold' }, color: '#1e293b', padding: { bottom: 12 } } } },
  }, 750, 460);

  // ── Gráfica 2: SICOP vs INPer + Saldo (barras verticales) ─────────────────
  const disp = ctrl.disponible_sicop_conciliado;
  const est  = ctrl.estimacion_inper_conciliado;
  const suf  = ctrl.saldo_suficiencia_conciliado;
  const g2 = await _renderChart({
    type: 'bar',
    data: {
      labels: ['Disponible SICOP', 'Estimación INPer', 'Saldo de Suficiencia'],
      datasets: [{ label: 'Millones MXN',
        data: [disp / 1e6, est / 1e6, suf / 1e6],
        backgroundColor: [AZUL, NARANJA, suf >= 0 ? VERDE : ROJO],
        borderRadius: 6 }],
    },
    options: { ...CHART_DEFAULTS,
      plugins: { ...CHART_DEFAULTS.plugins,
        title: { display: true, text: 'Resumen Financiero Global (Millones MXN)',
          font: { size: 16, weight: 'bold' }, color: '#1e293b', padding: { bottom: 10 } },
        legend: { display: false } },
      scales: {
        x: { ticks: { font: { size: 12 }, color: '#334155' }, grid: { display: false } },
        y: { ticks: { font: { size: 11 }, color: '#64748b',
          callback: v => '$' + v.toFixed(1) + 'M' }, grid: { color: '#e2e8f0' } } } },
  }, 750, 460);

  // ── Gráfica 3: Top 10 contratos con mayor FALTANTE (barras horizontales) ──
  const top10falta = [...conts]
    .filter(c => c.suficiencia < 0)
    .sort((a, b) => a.suficiencia - b.suficiencia)
    .slice(0, 10);

  const g3 = await _renderChart({
    type: 'bar',
    data: {
      labels: top10falta.map(c => c.contrato),
      datasets: [{
        label: 'Faltante (MXN)',
        data: top10falta.map(c => Math.abs(c.suficiencia) / 1e6),
        backgroundColor: ROJO + 'cc',
        borderColor: ROJO,
        borderWidth: 1,
        borderRadius: 4,
      }],
    },
    options: { ...CHART_DEFAULTS,
      indexAxis: 'y',
      plugins: { ...CHART_DEFAULTS.plugins,
        title: { display: true, text: 'Top 10 — Mayor Faltante de Recurso (M$)',
          font: { size: 15, weight: 'bold' }, color: '#7f1d1d', padding: { bottom: 8 } },
        legend: { display: false } },
      scales: {
        x: { ticks: { callback: v => '$' + v.toFixed(1) + 'M', font: { size: 10 } },
          grid: { color: '#fee2e2' } },
        y: { ticks: { font: { size: 10 }, color: '#1e293b' }, grid: { display: false } } } },
  }, 900, 500);

  // ── Gráfica 4: Top 10 contratos con mayor SOBRANTE ────────────────────────
  const top10sobra = [...conts]
    .filter(c => c.suficiencia > 0)
    .sort((a, b) => b.suficiencia - a.suficiencia)
    .slice(0, 10);

  const g4 = await _renderChart({
    type: 'bar',
    data: {
      labels: top10sobra.map(c => c.contrato),
      datasets: [{
        label: 'Sobrante (MXN)',
        data: top10sobra.map(c => c.suficiencia / 1e6),
        backgroundColor: VERDE + 'cc',
        borderColor: VERDE,
        borderWidth: 1,
        borderRadius: 4,
      }],
    },
    options: { ...CHART_DEFAULTS,
      indexAxis: 'y',
      plugins: { ...CHART_DEFAULTS.plugins,
        title: { display: true, text: 'Top 10 — Mayor Sobrante de Recurso (M$)',
          font: { size: 15, weight: 'bold' }, color: '#14532d', padding: { bottom: 8 } },
        legend: { display: false } },
      scales: {
        x: { ticks: { callback: v => '$' + v.toFixed(1) + 'M', font: { size: 10 } },
          grid: { color: '#d1fae5' } },
        y: { ticks: { font: { size: 10 }, color: '#1e293b' }, grid: { display: false } } } },
  }, 900, 500);

  // ── Gráfica 5: Diferencia SICOP vs INPer por partida/servicio (top 12) ─────
  const top12 = [...conts]
    .sort((a, b) => Math.abs(b.suficiencia) - Math.abs(a.suficiencia))
    .slice(0, 12);

  const g5 = await _renderChart({
    type: 'bar',
    data: {
      labels: top12.map(c => c.contrato),
      datasets: [
        { label: 'SICOP Disponible', data: top12.map(c => c.disponible_sicop / 1e6),
          backgroundColor: AZUL + 'cc', borderRadius: 3, borderSkipped: false },
        { label: 'INPer Estimado',   data: top12.map(c => c.estimacion_inper / 1e6),
          backgroundColor: NARANJA + 'cc', borderRadius: 3, borderSkipped: false },
      ],
    },
    options: { ...CHART_DEFAULTS,
      plugins: { ...CHART_DEFAULTS.plugins,
        title: { display: true, text: 'SICOP vs. INPer — 12 Contratos de Mayor Impacto (M$)',
          font: { size: 14, weight: 'bold' }, color: '#1e293b', padding: { bottom: 8 } },
        legend: { labels: { font: { size: 12 }, color: '#334155' } } },
      scales: {
        x: { ticks: { font: { size: 9 }, color: '#334155', maxRotation: 45 },
          grid: { display: false } },
        y: { ticks: { callback: v => '$' + v.toFixed(1) + 'M', font: { size: 10 } },
          grid: { color: '#e2e8f0' } } } },
  }, 1100, 480);

  return { g1, g2, g3, g4, g5 };
}

// ─────────────────────────────────────────────────────────────────────────────
async function generarPDFMembretado() {
  if (!fullData) { alert('Los datos aún no están cargados.'); return; }

  const btn = document.getElementById('btnExportPDF');
  const btnLabel = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Generando PDF...'; }

  try {
    const { jsPDF } = window.jspdf;
    const bgData = await _cargarMembrete();

    const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const pageW  = 215.9;
    const pageH  = 279.4;
    const mL     = 18, mR = 18, mTop = 43, mBot = 44;
    const cW     = pageW - mL - mR;   // content width

    function addBg() { doc.addImage(bgData, 'JPEG', 0, 0, pageW, pageH); }

    const ctrl    = fullData.mandatory_control_values;
    const totals  = fullData.global_totals;
    const conts   = fullData.contracts || [];
    const isFalta = ctrl.saldo_suficiencia_conciliado < 0;
    const today   = new Date().toLocaleDateString('es-MX',
      { year: 'numeric', month: 'long', day: 'numeric' });

    // ═══ PÁGINA 1 — Resumen ejecutivo ════════════════════════════════════════
    addBg();
    let y = mTop;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(120, 20, 40);
    doc.text('Reporte Ejecutivo de Conciliación Financiera', pageW / 2, y + 6, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(55, 55, 55);
    doc.text('SICOP vs. INPer — Base Maestra Corregida (Universo Conciliado)', pageW / 2, y + 13, { align: 'center' });
    doc.text(`Ciudad de México, ${today}`, pageW / 2, y + 19, { align: 'center' });

    doc.setDrawColor(120, 20, 40);
    doc.setLineWidth(0.4);
    doc.line(mL, y + 23, pageW - mR, y + 23);
    y += 29;

    // Conclusión badge
    doc.setFillColor(...(isFalta ? [239, 68, 68] : [16, 185, 129]));
    doc.roundedRect(mL, y, cW, 9, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(ctrl.interpretacion, pageW / 2, y + 6, { align: 'center' });
    y += 13;

    // KPI cards 2×3
    const suf = ctrl.saldo_suficiencia_conciliado;
    const kpis = [
      { label: 'Disponible SICOP Real (AT)',      value: formatCurrency(ctrl.disponible_sicop_conciliado),  rgb: [59,130,246] },
      { label: 'Estimación INPer por Ejercer (AV)', value: formatCurrency(ctrl.estimacion_inper_conciliado), rgb: [249,115,22] },
      { label: 'Saldo Real de Suficiencia',         value: formatCurrency(suf),  rgb: isFalta ? [239,68,68] : [52,211,153] },
      { label: 'Universo Conciliado',               value: `${conts.length} contratos`, rgb: [148,163,184] },
      { label: 'Contratos con Sobrante',            value: `${totals.count_sobra} contratos`,   rgb: [52,211,153] },
      { label: 'Contratos con Faltante',            value: `${totals.count_falta} contratos`,   rgb: [239,68,68] },
    ];

    const colW2 = (cW - 5) / 2;
    kpis.forEach((k, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const kx = mL + col * (colW2 + 5);
      const ky = y + row * 17;
      doc.setFillColor(248, 249, 250);
      doc.roundedRect(kx, ky, colW2, 13, 1, 1, 'F');
      doc.setDrawColor(...k.rgb); doc.setLineWidth(0.7);
      doc.line(kx, ky, kx, ky + 13);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(100, 100, 100);
      doc.text(k.label, kx + 4, ky + 5);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...k.rgb);
      doc.text(k.value, kx + 4, ky + 10.5);
    });
    y += Math.ceil(kpis.length / 2) * 17 + 5;

    // Totales sobrante/faltante
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(80, 80, 80);
    doc.text(
      `Sobrante acumulado: ${formatCurrency(totals.sobrante_total)}   |   Faltante acumulado: ${formatCurrency(Math.abs(totals.faltante_total))}   |   Equilibrados: ${totals.count_equilibrado} contratos`,
      pageW / 2, y, { align: 'center' }
    );
    y += 7;

    // Caja de contexto
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(mL, y, cW, 38, 2, 2, 'F');
    doc.setDrawColor(120, 20, 40); doc.setLineWidth(0.3);
    doc.roundedRect(mL, y, cW, 38, 2, 2, 'S');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(120, 20, 40);
    doc.text('CONCLUSIÓN EJECUTIVA', mL + 4, y + 6);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(40, 40, 40);
    const concl = `El análisis sobre la Base Maestra Corregida (Universo Conciliado) determina que con un Disponible SICOP Real de ` +
      `${formatCurrency(ctrl.disponible_sicop_conciliado)} y una Estimación INPer de ${formatCurrency(ctrl.estimacion_inper_conciliado)}, ` +
      `el saldo de suficiencia presupuestal es de ${formatCurrency(suf)}. ` +
      `De los ${conts.length} contratos conciliados, ${totals.count_falta} presentan insuficiencia, ` +
      `${totals.count_sobra} registran excedente y ${totals.count_equilibrado} están en equilibrio.`;
    const lines = doc.splitTextToSize(concl, cW - 8);
    doc.text(lines, mL + 4, y + 13);
    y += 44;

    // Nota sobre páginas siguientes
    doc.setFont('helvetica', 'italic'); doc.setFontSize(7); doc.setTextColor(120, 120, 120);
    doc.text('Las páginas siguientes contienen análisis gráfico y el detalle completo por contrato.', pageW / 2, y, { align: 'center' });

    // ═══ PÁGINA 2 — Gráficas 1 y 2 ══════════════════════════════════════════
    if (btn) btn.innerHTML = '⏳ Generando gráficas...';
    const graficas = await _generarGraficas(fullData);

    doc.addPage();
    addBg();
    y = mTop;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(120, 20, 40);
    doc.text('ANÁLISIS GRÁFICO — DISTRIBUCIÓN Y RESUMEN FINANCIERO', pageW / 2, y, { align: 'center' });
    doc.setDrawColor(120, 20, 40); doc.setLineWidth(0.4);
    doc.line(mL, y + 3, pageW - mR, y + 3);
    y += 8;

    // G1 (dona) y G2 (barras) en fila
    const gH1 = 72, gW1 = (cW - 5) / 2;
    doc.addImage(graficas.g1, 'PNG', mL,           y, gW1, gH1);
    doc.addImage(graficas.g2, 'PNG', mL + gW1 + 5, y, gW1, gH1);
    y += gH1 + 6;

    // G3 (top faltante) - ancho completo
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(120, 20, 40);
    doc.line(mL, y, pageW - mR, y);
    y += 4;
    const gH3 = 80;
    doc.addImage(graficas.g3, 'PNG', mL, y, cW, gH3);
    y += gH3 + 6;

    // G4 (top sobrante) - ancho completo
    doc.line(mL, y, pageW - mR, y);
    y += 4;
    const gH4 = 80;
    doc.addImage(graficas.g4, 'PNG', mL, y, cW, gH4);

    // ═══ PÁGINA 3 — Gráfica 5 + inicio tabla ════════════════════════════════
    doc.addPage();
    addBg();
    y = mTop;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(120, 20, 40);
    doc.text('COMPARATIVO SICOP vs. INPer — CONTRATOS DE MAYOR IMPACTO', pageW / 2, y, { align: 'center' });
    doc.setDrawColor(120, 20, 40); doc.setLineWidth(0.4);
    doc.line(mL, y + 3, pageW - mR, y + 3);
    y += 8;

    const gH5 = 78;
    doc.addImage(graficas.g5, 'PNG', mL, y, cW, gH5);
    y += gH5 + 8;

    doc.setDrawColor(120, 20, 40); doc.line(mL, y, pageW - mR, y);
    y += 5;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(120, 20, 40);
    doc.text('DETALLE POR CONTRATO — UNIVERSO CONCILIADO', mL, y + 3);
    y += 8;

    // ═══ TABLA DE CONTRATOS ══════════════════════════════════════════════════
    if (btn) btn.innerHTML = '⏳ Construyendo tabla...';
    const sorted = [...conts].sort((a, b) => a.suficiencia - b.suficiencia);

    const tableBody = sorted.map(c => {
      const st = c.estatus === 'SOBRA RECURSO' ? 'SOBRA'
               : c.estatus === 'FALTA RECURSO' ? 'FALTA'
               : c.estatus === 'EQUILIBRADO'   ? 'OK' : (c.estatus || '');
      return [
        c.contrato || '',
        (c.proveedor || '').length > 33 ? (c.proveedor).substring(0, 32) + '…' : (c.proveedor || ''),
        st,
        formatCurrency(c.disponible_sicop),
        formatCurrency(c.estimacion_inper),
        formatCurrency(c.suficiencia),
      ];
    });

    doc.autoTable({
      startY: y,
      head: [['Contrato', 'Proveedor', 'Estatus', 'SICOP Disponible', 'INPer Estimado', 'Suficiencia']],
      body: tableBody,
      styles: { fontSize: 6.2,
        cellPadding: { top: 1.4, right: 2, bottom: 1.4, left: 2 },
        lineColor: [210, 210, 210], lineWidth: 0.1, textColor: [40, 40, 40] },
      headStyles: { fillColor: [120, 20, 40], textColor: [255, 255, 255],
        fontStyle: 'bold', fontSize: 6.8, halign: 'center' },
      alternateRowStyles: { fillColor: [248, 248, 250] },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 52 },
        2: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' },
        5: { cellWidth: 30, halign: 'right' },
      },
      margin: { top: mTop, left: mL, right: mR, bottom: mBot },
      willDrawPage: (data) => { if (data.pageNumber > 1) addBg(); },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 2) {
          data.cell.styles.textColor = data.cell.raw === 'FALTA' ? [220,38,38]
                                     : data.cell.raw === 'SOBRA' ? [5,150,105] : [80,80,80];
        }
        if (data.section === 'body' && data.column.index === 5) {
          data.cell.styles.textColor = (data.row.raw[5] || '').startsWith('-') ? [220,38,38] : [5,150,105];
        }
      },
    });

    // ═══ Números de página ═══════════════════════════════════════════════════
    const totalPags = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPags; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(130, 130, 130);
      doc.text(`Página ${p} de ${totalPags}`, pageW / 2, pageH - 37, { align: 'center' });
    }

    const fecha = new Date().toISOString().slice(0, 10);
    doc.save(`Reporte_Ejecutivo_INPer_${fecha}.pdf`);

  } catch (err) {
    console.error('Error generando PDF:', err);
    alert('Error al generar el PDF: ' + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = btnLabel; }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btnExportPDF');
  if (btn) btn.addEventListener('click', generarPDFMembretado);
});
