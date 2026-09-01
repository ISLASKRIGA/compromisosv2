// JavaScript for INPer - Visualizador Ejecutivo de Conciliación Financiera SICOP vs INPer

let fullData = null;
let currentStatusFilter = 'ALL';
let currentSearchQuery = '';
let currentTolerance = 0.01;
let currentSortCol = 'suficiencia';
let currentSortAsc = true;
let expandedContracts = new Set();
let expandedCommitments = new Set();

let chartSufficiency = null;
let chartDistribution = null;
let chartRanking = null;

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  try {
    const resp = await fetch('data.json');
    if (!resp.ok) throw new Error('No se pudo cargar data.json');
    fullData = await resp.json();

    setupEventListeners();
    renderAll();
  } catch (err) {
    console.error('Error inicializando visualizador:', err);
    document.getElementById('conclusionBody').innerHTML = `<p style="color: #f87171;">Error cargando datos: ${err.message}</p>`;
  }
}

function setupEventListeners() {
  // Search input
  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', (e) => {
    currentSearchQuery = e.target.value.toLowerCase().trim();
    renderTableAndKPIs();
  });

  // Tolerance input
  const toleranceInput = document.getElementById('toleranceInput');
  toleranceInput.addEventListener('change', (e) => {
    currentTolerance = parseFloat(e.target.value) || 0.0;
    recalculateStatuses();
    renderAll();
  });

  // Filter status buttons
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentStatusFilter = btn.dataset.status;
      renderTableAndKPIs();
    });
  });

  // Tab navigation
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetTab = btn.dataset.tab;
      document.getElementById('tabDashboard').style.display = targetTab === 'dashboard' ? 'block' : 'none';
      document.getElementById('tabAudit').style.display = targetTab === 'audit' ? 'block' : 'none';
    });
  });

  // Table header sorting
  const tableHeaders = document.querySelectorAll('.exec-table th[data-sort]');
  tableHeaders.forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.sort;
      if (currentSortCol === col) {
        currentSortAsc = !currentSortAsc;
      } else {
        currentSortCol = col;
        currentSortAsc = false; // Default desc for numbers
      }
      renderTable();
    });
  });

  // Ranking selector
  const rankingSelect = document.getElementById('rankingSelect');
  rankingSelect.addEventListener('change', () => {
    renderRankingChart();
  });

  // Export CSV
  const btnExport = document.getElementById('btnExportCSV');
  btnExport.addEventListener('click', exportToCSV);
}

function recalculateStatuses() {
  if (!fullData) return;

  let countSobra = 0;
  let countEquilibrado = 0;
  let countFalta = 0;
  let sobranteTotal = 0;
  let faltanteTotal = 0;

  fullData.contracts.forEach(c => {
    const suf = c.disponible_sicop - c.estimacion_inper;
    c.suficiencia = suf;

    if (suf > currentTolerance) {
      c.estatus = 'SOBRA RECURSO';
      countSobra++;
      sobranteTotal += suf;
    } else if (suf < -currentTolerance) {
      c.estatus = 'FALTA RECURSO';
      countFalta++;
      faltanteTotal += Math.abs(suf);
    } else {
      c.estatus = 'EQUILIBRADO';
      countEquilibrado++;
    }

    // Recalculate commitments
    c.compromisos.forEach(comp => {
      const compSuf = comp.disponible_sicop - comp.estimacion_inper;
      comp.suficiencia = compSuf;
      if (compSuf > currentTolerance) comp.estatus = 'SOBRA RECURSO';
      else if (compSuf < -currentTolerance) comp.estatus = 'FALTA RECURSO';
      else comp.estatus = 'EQUILIBRADO';
    });
  });

  fullData.global_totals.count_sobra = countSobra;
  fullData.global_totals.count_equilibrado = countEquilibrado;
  fullData.global_totals.count_falta = countFalta;
  fullData.global_totals.sobrante_total = sobranteTotal;
  fullData.global_totals.faltante_total = faltanteTotal;
}

function getFilteredContracts() {
  if (!fullData) return [];

  return fullData.contracts.filter(c => {
    // Status filter
    if (currentStatusFilter !== 'ALL' && c.estatus !== currentStatusFilter) {
      return false;
    }

    // Search query filter
    if (currentSearchQuery) {
      const q = currentSearchQuery;
      const matchContrato = c.contrato.toLowerCase().includes(q);
      const matchProveedor = c.proveedor.toLowerCase().includes(q);
      const matchServicio = c.servicio.toLowerCase().includes(q);
      const matchUR = c.ur.toLowerCase().includes(q);
      const matchFolio = c.compromisos.some(comp => comp.folio.toLowerCase().includes(q));

      if (!matchContrato && !matchProveedor && !matchServicio && !matchUR && !matchFolio) {
        return false;
      }
    }

    return true;
  });
}

function getSortedContracts(contracts) {
  return [...contracts].sort((a, b) => {
    let valA = a[currentSortCol];
    let valB = b[currentSortCol];

    if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = (valB || '').toLowerCase();
    }

    if (valA < valB) return currentSortAsc ? -1 : 1;
    if (valA > valB) return currentSortAsc ? 1 : -1;
    return 0;
  });
}

function renderAll() {
  renderConclusion();
  renderKPIs();
  renderCharts();
  renderTable();
  renderAudit();
}

function renderTableAndKPIs() {
  renderTable();
  renderKPIs();
  renderCharts();
  renderConclusion();
}

function formatCurrency(val) {
  if (val === null || val === undefined) return '$0.00';
  const prefix = val < 0 ? '-$' : '$';
  return prefix + Math.abs(val).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderConclusion() {
  if (!fullData) return;

  const filtered = getFilteredContracts();
  const totals = fullData.global_totals;

  const disp = totals.disponible_sicop;
  const est = totals.estimacion_inper;
  const suf = totals.suficiencia_neta;

  const badgeEl = document.getElementById('conclusionStatusBadge');
  const bodyEl = document.getElementById('conclusionBody');

  let statusText = '';
  let badgeClass = '';

  if (suf > currentTolerance) {
    statusText = `SOBRA RECURSO por ${formatCurrency(suf)}`;
    badgeClass = 'badge-sobra';
  } else if (suf < -currentTolerance) {
    statusText = `FALTA RECURSO por ${formatCurrency(Math.abs(suf))}`;
    badgeClass = 'badge-falta';
  } else {
    statusText = `RECURSO EQUILIBRADO (Diferencia de ${formatCurrency(suf)})`;
    badgeClass = 'badge-equilibrado';
  }

  badgeEl.className = `conclusion-badge ${badgeClass}`;
  badgeEl.innerText = statusText;

  const topDeficit = [...fullData.contracts].sort((a, b) => a.suficiencia - b.suficiencia)[0];
  const topSurplus = [...fullData.contracts].sort((a, b) => b.suficiencia - a.suficiencia)[0];

  bodyEl.innerHTML = `
    <p>
      El análisis financiero de conciliación sobre el universo de <strong>${totals.count_sobra + totals.count_equilibrado + totals.count_falta} contratos</strong> 
      (${fullData.metadata.total_commitments} compromisos y ${fullData.metadata.total_partidas} partidas presupuestales) determina que:
    </p>
    <ul style="margin-top: 8px; margin-left: 20px; margin-bottom: 8px;">
      <li><strong>Fuente Fidedigna (SICOP)</strong> registra un Recurso Disponible acumulado de <span class="highlight-val highlight-neutral">${formatCurrency(disp)}</span>.</li>
      <li><strong>Captura Manual (INPer)</strong> registra una Estimación del Monto por Ejercer de <span class="highlight-val highlight-neutral">${formatCurrency(est)}</span>.</li>
      <li><strong>Resultado Global de Suficiencia</strong>: El disponible en SICOP <strong style="color: ${suf >= 0 ? '#34d399' : '#f87171'};">${suf >= 0 ? 'CUBRE TOTALMENTE' : 'NO ES SUFICIENTE PARA CUBRIR'}</strong> la estimación de INPer, generando un saldo neto de <span class="highlight-val ${suf >= 0 ? 'highlight-positive' : 'highlight-negative'}">${formatCurrency(suf)}</span>.</li>
    </ul>
    <p style="font-size: 0.9rem; color: var(--text-muted);">
      <strong>Desglose por Contratos:</strong> <span style="color: #34d399; font-weight:700;">${totals.count_sobra} contratos</span> presentan Recurso Excedente ($${formatCurrency(totals.sobrante_total)}), 
      <span style="color: #fbbf24; font-weight:700;">${totals.count_equilibrado} contratos</span> se encuentran Equilibrados, y 
      <span style="color: #f87171; font-weight:700;">${totals.count_falta} contratos</span> presentan Insuficiencia Presupuestal (-$${formatCurrency(totals.faltante_total)}).
      ${topDeficit ? ` El mayor faltante individual corresponde al contrato <strong>${topDeficit.contrato}</strong> (${topDeficit.proveedor}) por <strong>${formatCurrency(topDeficit.suficiencia)}</strong>.` : ''}
    </p>
  `;
}

function renderKPIs() {
  if (!fullData) return;

  const totals = fullData.global_totals;
  const filtered = getFilteredContracts();

  document.getElementById('kpiDisponibleSICOP').innerText = formatCurrency(totals.disponible_sicop);
  document.getElementById('kpiEstimacionINPer').innerText = formatCurrency(totals.estimacion_inper);

  const sufEl = document.getElementById('kpiSuficienciaNeta');
  sufEl.innerText = formatCurrency(totals.suficiencia_neta);
  sufEl.style.color = totals.suficiencia_neta >= 0 ? '#34d399' : '#f87171';

  document.getElementById('kpiSobranteTotal').innerText = formatCurrency(totals.sobrante_total);
  document.getElementById('kpiSobranteSub').innerText = `${totals.count_sobra} Contratos con excedente`;

  document.getElementById('kpiFaltanteTotal').innerText = formatCurrency(-totals.faltante_total);
  document.getElementById('kpiFaltanteSub').innerText = `${totals.count_falta} Contratos con insuficiencia`;

  document.getElementById('kpiTotalContratos').innerText = filtered.length;
  document.getElementById('kpiCompromisosSub').innerText = `${fullData.metadata.total_commitments} Compromisos | ${fullData.metadata.total_partidas} Partidas`;
}

function renderCharts() {
  if (!fullData) return;

  renderSufficiencyChart();
  renderDistributionChart();
  renderRankingChart();
}

function renderSufficiencyChart() {
  const ctx = document.getElementById('chartSufficiency').getContext('2d');
  const totals = fullData.global_totals;

  if (chartSufficiency) chartSufficiency.destroy();

  chartSufficiency = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Disponible SICOP (AT)', 'Estimación INPer (AV)'],
      datasets: [{
        label: 'Monto en Pesos ($)',
        data: [totals.disponible_sicop, totals.estimacion_inper],
        backgroundColor: ['#38bdf8', '#a855f7'],
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          ticks: { color: '#94a3b8', callback: (v) => '$' + (v / 1e6).toFixed(1) + 'M' },
          grid: { color: '#334155' }
        },
        x: {
          ticks: { color: '#ffffff', font: { weight: 'bold' } },
          grid: { display: false }
        }
      }
    }
  });
}

function renderDistributionChart() {
  const ctx = document.getElementById('chartDistribution').getContext('2d');
  const totals = fullData.global_totals;

  if (chartDistribution) chartDistribution.destroy();

  chartDistribution = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Sobra Recurso', 'Equilibrado', 'Falta Recurso'],
      datasets: [{
        data: [totals.count_sobra, totals.count_equilibrado, totals.count_falta],
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#ffffff', padding: 16 }
        }
      }
    }
  });
}

function renderRankingChart() {
  const ctx = document.getElementById('chartRanking').getContext('2d');
  const rankingType = document.getElementById('rankingSelect').value;

  let sorted = [...fullData.contracts];

  if (rankingType === 'faltante') {
    sorted.sort((a, b) => a.suficiencia - b.suficiencia);
  } else if (rankingType === 'sobrante') {
    sorted.sort((a, b) => b.suficiencia - a.suficiencia);
  } else if (rankingType === 'modificado') {
    sorted.sort((a, b) => Math.abs(b.dif_modificado) - Math.abs(a.dif_modificado));
  } else if (rankingType === 'pagado') {
    sorted.sort((a, b) => Math.abs(b.dif_pagado) - Math.abs(a.dif_pagado));
  }

  const top5 = sorted.slice(0, 5);
  const labels = top5.map(c => c.contrato);
  const data = top5.map(c => {
    if (rankingType === 'modificado') return c.dif_modificado;
    if (rankingType === 'pagado') return c.dif_pagado;
    return c.suficiencia;
  });

  if (chartRanking) chartRanking.destroy();

  chartRanking = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Monto ($)',
        data: data,
        backgroundColor: data.map(v => v >= 0 ? '#10b981' : '#ef4444'),
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { color: '#94a3b8', callback: (v) => '$' + (v / 1e6).toFixed(1) + 'M' },
          grid: { color: '#334155' }
        },
        y: {
          ticks: { color: '#ffffff', font: { weight: 'bold' } },
          grid: { display: false }
        }
      }
    }
  });
}

function renderTable() {
  if (!fullData) return;

  const tbody = document.getElementById('contractsTableBody');
  const filtered = getFilteredContracts();
  const sorted = getSortedContracts(filtered);

  document.getElementById('lblRecordCount').innerText = sorted.length;

  if (sorted.length === 0) {
    tbody.innerHTML = `<tr><td colspan="13" style="text-align: center; padding: 40px; color: var(--text-muted);">No se encontraron contratos con los criterios especificados.</td></tr>`;
    return;
  }

  let html = '';

  sorted.forEach(c => {
    const isExpanded = expandedContracts.has(c.contrato);
    const badgeClass = c.estatus === 'SOBRA RECURSO' ? 'badge-sobra' : (c.estatus === 'FALTA RECURSO' ? 'badge-falta' : 'badge-equilibrado');

    html += `
      <tr class="contract-row" data-contrato="${c.contrato}">
        <td style="text-align: center;">
          <button class="btn-toggle" onclick="toggleContract('${c.contrato}')">${isExpanded ? '▼' : '▶'}</button>
        </td>
        <td><strong>${c.contrato}</strong></td>
        <td title="${c.proveedor}" style="max-width: 220px; overflow: hidden; text-overflow: ellipsis;">${c.proveedor}</td>
        <td style="text-align: center;"><span class="badge" style="background:#334155; color:#fff;">${c.folios_count}</span></td>
        <td style="text-align: right;">${formatCurrency(c.modificado_sicop)}</td>
        <td style="text-align: right;">${formatCurrency(c.modificado_inper)}</td>
        <td style="text-align: right; color: ${c.dif_modificado === 0 ? '#94a3b8' : '#fbbf24'};">${formatCurrency(c.dif_modificado)}</td>
        <td style="text-align: right;">${formatCurrency(c.pagado_sicop)}</td>
        <td style="text-align: right;">${formatCurrency(c.pagado_inper)}</td>
        <td style="text-align: right; font-weight: 700; color: var(--color-sicop);">${formatCurrency(c.disponible_sicop)}</td>
        <td style="text-align: right; font-weight: 700; color: var(--color-inper);">${formatCurrency(c.estimacion_inper)}</td>
        <td style="text-align: right; font-weight: 800; color: ${c.suficiencia >= 0 ? '#34d399' : '#f87171'};">${formatCurrency(c.suficiencia)}</td>
        <td style="text-align: center;"><span class="badge ${badgeClass}">${c.estatus}</span></td>
      </tr>
    `;

    if (isExpanded) {
      html += `
        <tr>
          <td colspan="13" style="padding: 0;">
            <div class="subtable-container">
              <div class="subtable-header">
                <span>📑</span> COMPROMISOS DEL CONTRATO ${c.contrato} (${c.compromisos.length} FOLIOS)
              </div>
              <table class="sub-table">
                <thead>
                  <tr>
                    <th style="width: 30px;"></th>
                    <th>Folio Compromiso</th>
                    <th>Área Solicitante / Servicio</th>
                    <th style="text-align: center;">Partidas</th>
                    <th style="text-align: right;">Modif. SICOP</th>
                    <th style="text-align: right;">Modif. INPer</th>
                    <th style="text-align: right;">Pagado SICOP</th>
                    <th style="text-align: right;">Pagado INPer</th>
                    <th style="text-align: right; color: var(--color-sicop);">Disponible SICOP</th>
                    <th style="text-align: right; color: var(--color-inper);">Estimación INPer</th>
                    <th style="text-align: right;">Suficiencia</th>
                    <th style="text-align: center;">Estatus</th>
                  </tr>
                </thead>
                <tbody>
      `;

      c.compromisos.forEach(comp => {
        const compKey = `${c.contrato}_${comp.folio}`;
        const isCompExpanded = expandedCommitments.has(compKey);
        const compBadgeClass = comp.estatus === 'SOBRA RECURSO' ? 'badge-sobra' : (comp.estatus === 'FALTA RECURSO' ? 'badge-falta' : 'badge-equilibrado');

        html += `
          <tr>
            <td style="text-align: center;">
              <button class="btn-toggle" onclick="toggleCommitment('${compKey}')">${isCompExpanded ? '▼' : '▶'}</button>
            </td>
            <td><strong>Folio ${comp.folio}</strong></td>
            <td title="${comp.servicio}" style="max-width: 250px; overflow: hidden; text-overflow: ellipsis;">${comp.servicio}</td>
            <td style="text-align: center;">${comp.partidas_count}</td>
            <td style="text-align: right;">${formatCurrency(comp.modificado_sicop)}</td>
            <td style="text-align: right;">${formatCurrency(comp.modificado_inper)}</td>
            <td style="text-align: right;">${formatCurrency(comp.pagado_sicop)}</td>
            <td style="text-align: right;">${formatCurrency(comp.pagado_inper)}</td>
            <td style="text-align: right; font-weight: 600; color: var(--color-sicop);">${formatCurrency(comp.disponible_sicop)}</td>
            <td style="text-align: right; font-weight: 600; color: var(--color-inper);">${formatCurrency(comp.estimacion_inper)}</td>
            <td style="text-align: right; font-weight: 700; color: ${comp.suficiencia >= 0 ? '#34d399' : '#f87171'};">${formatCurrency(comp.suficiencia)}</td>
            <td style="text-align: center;"><span class="badge ${compBadgeClass}">${comp.estatus}</span></td>
          </tr>
        `;

        if (isCompExpanded) {
          html += `
            <tr>
              <td colspan="12" style="padding: 0;">
                <div style="background: #111827; padding: 10px 16px 14px 40px;">
                  <div style="font-size: 0.75rem; font-weight: 700; color: #94a3b8; margin-bottom: 6px;">
                    📌 DESGLOSE DE PARTIDAS PRESUPUESTALES SICOP (FOLIO ${comp.folio})
                  </div>
                  <table class="sub-table" style="background: #1f2937;">
                    <thead>
                      <tr style="background: #111827;">
                        <th>Fila Excel</th>
                        <th>PTDA</th>
                        <th>Clave Programática (F-FN-SF-RG-AI-PP)</th>
                        <th>Bien o Servicio Desglosado</th>
                        <th style="text-align: right;">Modificado SICOP</th>
                        <th style="text-align: right;">Pagado SICOP</th>
                        <th style="text-align: right; color: var(--color-sicop);">Disponible SICOP</th>
                        <th>Observaciones</th>
                      </tr>
                    </thead>
                    <tbody>
          `;

          comp.partidas.forEach(ptda => {
            html += `
              <tr>
                <td>Row ${ptda.row_id}</td>
                <td><strong>${ptda.ptda}</strong></td>
                <td><code>${ptda.clave_programatica}</code></td>
                <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;">${ptda.bien_servicio}</td>
                <td style="text-align: right;">${formatCurrency(ptda.modificado_sicop)}</td>
                <td style="text-align: right;">${formatCurrency(ptda.pagado_sicop)}</td>
                <td style="text-align: right; font-weight: 600; color: var(--color-sicop);">${formatCurrency(ptda.disponible_sicop)}</td>
                <td style="font-size: 0.75rem; color: var(--text-muted);">${ptda.observaciones || '-'}</td>
              </tr>
            `;
          });

          html += `
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>
          `;
        }
      });

      html += `
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      `;
    }
  });

  tbody.innerHTML = html;
}

window.toggleContract = function(contrato) {
  if (expandedContracts.has(contrato)) {
    expandedContracts.delete(contrato);
  } else {
    expandedContracts.add(contrato);
  }
  renderTable();
};

window.toggleCommitment = function(compKey) {
  if (expandedCommitments.has(compKey)) {
    expandedCommitments.delete(compKey);
  } else {
    expandedCommitments.add(compKey);
  }
  renderTable();
};

function renderAudit() {
  if (!fullData) return;

  const audit = fullData.audit;

  document.getElementById('auditCountBadge').innerText = audit.count_sicop_only + audit.count_inper_only + audit.count_extreme_variances;

  // Sicop only
  const sicopOnlyContainer = document.getElementById('auditSicopOnlyList');
  sicopOnlyContainer.innerHTML = audit.sicop_only_summary.map(item => `
    <div class="audit-item">
      <div><strong>Contrato ${item.contrato}</strong> (Folio ${item.folio})</div>
      <div style="color: var(--color-sicop); font-weight:700;">${formatCurrency(item.disponible_sicop)}</div>
    </div>
  `).join('');

  // Inper only
  const inperOnlyContainer = document.getElementById('auditInperOnlyList');
  inperOnlyContainer.innerHTML = audit.inper_only_summary.map(item => `
    <div class="audit-item">
      <div><strong>Contrato ${item.contrato}</strong> (Folio ${item.folio})</div>
      <div style="color: var(--color-inper); font-weight:700;">${formatCurrency(item.estimacion_inper)}</div>
    </div>
  `).join('');

  // Extreme variances
  const extremeContainer = document.getElementById('auditExtremeList');
  extremeContainer.innerHTML = audit.extreme_variances_summary.map(item => `
    <div class="audit-item">
      <div><strong>Contrato ${item.contrato}</strong><br><span style="font-size:0.75rem; color: var(--text-muted);">${item.proveedor}</span></div>
      <div style="font-weight:700; color: ${item.suficiencia >= 0 ? '#34d399' : '#f87171'};">${formatCurrency(item.suficiencia)}</div>
    </div>
  `).join('');
}

function exportToCSV() {
  if (!fullData) return;

  const filtered = getFilteredContracts();
  const headers = [
    'Contrato', 'Proveedor', 'UR', 'Folios_Count', 'Partidas_Count',
    'Modificado_SICOP', 'Modificado_INPer', 'Diferencia_Modificado',
    'Pagado_SICOP', 'Pagado_INPer', 'Diferencia_Pagado',
    'Disponible_SICOP_AT', 'Estimacion_INPer_AV', 'Saldo_Suficiencia', 'Estatus'
  ];

  let csvContent = headers.join(',') + '\n';

  filtered.forEach(c => {
    const row = [
      `"${c.contrato}"`,
      `"${c.proveedor.replace(/"/g, '""')}"`,
      `"${c.ur}"`,
      c.folios_count,
      c.partidas_count,
      c.modificado_sicop,
      c.modificado_inper,
      c.dif_modificado,
      c.pagado_sicop,
      c.pagado_inper,
      c.dif_pagado,
      c.disponible_sicop,
      c.estimacion_inper,
      c.suficiencia,
      `"${c.estatus}"`
    ];
    csvContent += row.join(',') + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Conciliacion_SICOP_vs_INPer_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
