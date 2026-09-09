// Generador de Reporte Ejecutivo PDF con hoja membretada INPer

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

async function generarPDFMembretado() {
  if (!fullData) { alert('Los datos aún no están cargados.'); return; }

  const btn = document.getElementById('btnExportPDF');
  const btnLabel = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Generando PDF...'; }

  try {
    const { jsPDF } = window.jspdf;

    const bgData = await _cargarMembrete();

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const pageW = 215.9;
    const pageH = 279.4;
    const mL = 18, mR = 18, mTop = 43, mBot = 44;

    function addBg() {
      doc.addImage(bgData, 'JPEG', 0, 0, pageW, pageH);
    }

    // ── Página 1 ─────────────────────────────────────────────────────────────
    addBg();

    const ctrl = fullData.mandatory_control_values;
    const totals = fullData.global_totals;
    const contracts = fullData.contracts || [];
    const meta = fullData.metadata || {};

    const today = new Date().toLocaleDateString('es-MX', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    const isFalta = ctrl.saldo_suficiencia_conciliado < 0;
    let y = mTop;

    // Título
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
    y += 28;

    // Conclusión badge
    if (isFalta) {
      doc.setFillColor(239, 68, 68);
    } else {
      doc.setFillColor(16, 185, 129);
    }
    doc.roundedRect(mL, y, pageW - mL - mR, 9, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(ctrl.interpretacion, pageW / 2, y + 6, { align: 'center' });
    y += 13;

    // KPI cards (2 columns)
    const kpis = [
      { label: 'Disponible SICOP Real (AT)', value: formatCurrency(ctrl.disponible_sicop_conciliado), rgb: [59, 130, 246] },
      { label: 'Estimación INPer por Ejercer (AV)', value: formatCurrency(ctrl.estimacion_inper_conciliado), rgb: [249, 115, 22] },
      { label: 'Saldo Real de Suficiencia', value: formatCurrency(ctrl.saldo_suficiencia_conciliado), rgb: isFalta ? [239, 68, 68] : [52, 211, 153] },
      { label: 'Universo Conciliado', value: `${contracts.length} contratos`, rgb: [148, 163, 184] },
      { label: 'Contratos con Sobrante', value: `${totals.count_sobra} contratos`, rgb: [52, 211, 153] },
      { label: 'Contratos con Faltante', value: `${totals.count_falta} contratos`, rgb: [239, 68, 68] },
    ];

    const colW = (pageW - mL - mR - 5) / 2;
    kpis.forEach((kpi, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const kx = mL + col * (colW + 5);
      const ky = y + row * 17;

      doc.setFillColor(248, 249, 250);
      doc.roundedRect(kx, ky, colW, 13, 1, 1, 'F');
      doc.setDrawColor(...kpi.rgb);
      doc.setLineWidth(0.7);
      doc.line(kx, ky, kx, ky + 13);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 100, 100);
      doc.text(kpi.label, kx + 4, ky + 5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...kpi.rgb);
      doc.text(kpi.value, kx + 4, ky + 10.5);
    });

    y += Math.ceil(kpis.length / 2) * 17 + 5;

    // Sobrante / Faltante row
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text(
      `Sobrante acumulado: ${formatCurrency(totals.sobrante_total)}   |   Faltante acumulado: ${formatCurrency(Math.abs(totals.faltante_total))}   |   Equilibrados: ${totals.count_equilibrado} contratos`,
      pageW / 2, y, { align: 'center' }
    );
    y += 6;

    // Separador tabla
    doc.setDrawColor(120, 20, 40);
    doc.setLineWidth(0.4);
    doc.line(mL, y, pageW - mR, y);
    y += 4;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(120, 20, 40);
    doc.text('DETALLE POR CONTRATO — UNIVERSO CONCILIADO', mL, y + 3);
    y += 7;

    // ── Tabla de contratos ────────────────────────────────────────────────────
    const sorted = [...contracts].sort((a, b) => a.suficiencia - b.suficiencia);

    const tableBody = sorted.map(c => {
      const st = c.estatus === 'SOBRA RECURSO' ? 'SOBRA'
               : c.estatus === 'FALTA RECURSO' ? 'FALTA'
               : c.estatus === 'EQUILIBRADO'   ? 'OK'
               : (c.estatus || '');
      return [
        c.contrato || '',
        (c.proveedor || '').length > 34 ? (c.proveedor || '').substring(0, 33) + '…' : (c.proveedor || ''),
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
      styles: {
        fontSize: 6.2,
        cellPadding: { top: 1.4, right: 2, bottom: 1.4, left: 2 },
        lineColor: [210, 210, 210],
        lineWidth: 0.1,
        textColor: [40, 40, 40],
      },
      headStyles: {
        fillColor: [120, 20, 40],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 6.8,
        halign: 'center',
      },
      alternateRowStyles: { fillColor: [248, 248, 250] },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 52 },
        2: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' },
        5: { cellWidth: 30, halign: 'right' },
      },
      margin: { left: mL, right: mR, bottom: mBot },
      willDrawPage: (data) => {
        if (data.pageNumber > 1) addBg();
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 2) {
          const val = data.cell.raw;
          if (val === 'FALTA') {
            data.cell.styles.textColor = [220, 38, 38];
          } else if (val === 'SOBRA') {
            data.cell.styles.textColor = [5, 150, 105];
          }
        }
        if (data.section === 'body' && data.column.index === 5) {
          const raw = data.row.raw[5];
          if (raw && raw.startsWith('-')) {
            data.cell.styles.textColor = [220, 38, 38];
          } else {
            data.cell.styles.textColor = [5, 150, 105];
          }
        }
      },
    });

    // Número de páginas en todas las páginas
    const totalPags = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPags; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(130, 130, 130);
      doc.text(`Página ${p} de ${totalPags}`, pageW / 2, pageH - 37, { align: 'center' });
    }

    const fecha = new Date().toISOString().slice(0, 10);
    doc.save(`Reporte_Ejecutivo_Conciliacion_INPer_${fecha}.pdf`);

  } catch (err) {
    console.error('Error generando PDF membretado:', err);
    alert('Error al generar el PDF: ' + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = btnLabel; }
  }
}

// Wire up button once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btnExportPDF');
  if (btn) btn.addEventListener('click', generarPDFMembretado);
});
