// JavaScript for INPer - Visualizador Ejecutivo de Conciliación SICOP vs INPer (Base Maestra Corregida)

let fullData = null;
let currentStatusFilter = 'ALL';
let currentSearchQuery = '';
let currentTolerance = 0.01; // Internal fixed precision threshold
let currentSortCol = 'suficiencia';
let currentSortAsc = false; // Default desc for numeric columns

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
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearchQuery = e.target.value.toLowerCase().trim();
      renderTableOnly();
    });
  }

  // Filter status buttons
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      setFilterStatus(btn.dataset.status);
    });
  });

  // KPI Card clicks (Interactive Filtering for Table Below)
  const cardSobrante = document.getElementById('cardSobranteTotal');
  if (cardSobrante) {
    cardSobrante.addEventListener('click', () => setFilterStatus('SOBRA RECURSO'));
  }

  const cardFaltante = document.getElementById('cardFaltanteTotal');
  if (cardFaltante) {
    cardFaltante.addEventListener('click', () => setFilterStatus('FALTA RECURSO'));
  }

  const cardTotal = document.getElementById('cardTotalContratos');
  if (cardTotal) {
    cardTotal.addEventListener('click', () => setFilterStatus('ALL'));
  }

  const cardDisp = document.getElementById('cardDisponibleSICOP');
  if (cardDisp) {
    cardDisp.addEventListener('click', () => setFilterStatus('ALL'));
  }

  const cardEst = document.getElementById('cardEstimacionINPer');
  if (cardEst) {
    cardEst.addEventListener('click', () => setFilterStatus('ALL'));
  }

  const cardSuf = document.getElementById('cardSuficienciaNeta');
  if (cardSuf) {
    cardSuf.addEventListener('click', () => {
      const netSuf = fullData ? fullData.mandatory_control_values.saldo_suficiencia_conciliado : 0;
      setFilterStatus(netSuf >= 0 ? 'SOBRA RECURSO' : 'FALTA RECURSO');
    });
  }

  // Tab navigation
  const tabBtns = document.querySelectorAll('.tab-btn[data-tab]');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetTab = btn.dataset.tab;
      document.getElementById('tabDashboard').style.display = targetTab === 'dashboard' ? 'block' : 'none';
      document.getElementById('tabUnlinked').style.display = targetTab === 'unlinked' ? 'block' : 'none';
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
        currentSortAsc = false;
      }
      renderTable();
    });
  });

  // Ranking selector
  const rankingSelect = document.getElementById('rankingSelect');
  if (rankingSelect) {
    rankingSelect.addEventListener('change', () => {
      renderRankingChart();
    });
  }

  // Export Excel Original
  const btnExportExcel = document.getElementById('btnExportExcel');
  if (btnExportExcel) {
    btnExportExcel.addEventListener('click', downloadOriginalExcel);
  }

  // Modal Close Events
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeModal);
  }

  const modalBackdrop = document.getElementById('detailModal');
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

function setFilterStatus(status) {
  currentStatusFilter = status;

  // Update active state of filter buttons
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    if (btn.dataset.status === status) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  renderTableOnly();
}

function renderTableOnly() {
  renderTable();
}

function downloadOriginalExcel() {
  const excelFilename = 'Base_Maestra_Corregida_SICOP_INPer.xlsx';
  const encodedPath = encodeURIComponent(excelFilename);
  
  const link = document.createElement('a');
  link.href = encodedPath;
  link.download = excelFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function getFilteredContracts() {
  if (!fullData || !fullData.contracts) return [];

  return fullData.contracts.filter(c => {
    if (currentStatusFilter !== 'ALL' && c.estatus !== currentStatusFilter) {
      return false;
    }

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
  renderKPIs(); // Static & Inamovibles
  renderCharts();
  renderTable();
  renderUnlinkedResources();
  renderAudit();
}

function formatCurrency(val) {
  if (val === null || val === undefined) return '$0.00';
  const prefix = val < 0 ? '-$' : '$';
  return prefix + Math.abs(val).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderConclusion() {
  if (!fullData || !fullData.mandatory_control_values) return;

  const ctrl = fullData.mandatory_control_values;
  const totals = fullData.global_totals;

  const disp = ctrl.disponible_sicop_conciliado;
  const est = ctrl.estimacion_inper_conciliado;
  const suf = ctrl.saldo_suficiencia_conciliado;

  const badgeEl = document.getElementById('conclusionStatusBadge');
  const bodyEl = document.getElementById('conclusionBody');

  if (suf >= 0) {
    badgeEl.className = 'conclusion-badge badge-sobra';
    badgeEl.innerText = ctrl.interpretacion;
  } else {
    badgeEl.className = 'conclusion-badge badge-falta';
    badgeEl.innerText = ctrl.interpretacion;
  }

  const topDeficit = [...fullData.contracts].sort((a, b) => a.suficiencia - b.suficiencia)[0];
  const sufColorClass = suf >= 0 ? 'highlight-positive' : 'highlight-negative';
  const sufTextColor = suf >= 0 ? '#34d399' : '#f87171';

  bodyEl.innerHTML = `
    <p>
      El análisis de conciliación sobre la <strong>Base Maestra Corregida (Universo Conciliado)</strong> determina que:
    </p>
    <ul style="margin-top: 8px; margin-left: 20px; margin-bottom: 8px;">
      <li><strong>Disponible SICOP Real (AT)</strong>: <span class="highlight-val highlight-neutral">${formatCurrency(disp)}</span></li>
      <li><strong>Estimación INPer Conciliado (AV)</strong>: <span class="highlight-val highlight-neutral">${formatCurrency(est)}</span></li>
      <li><strong>Saldo Real de Suficiencia</strong>: <span class="highlight-val ${sufColorClass}">${formatCurrency(suf)}</span></li>
      <li><strong>Conclusión Financiera</strong>: <strong style="color: ${sufTextColor};">${ctrl.interpretacion}</strong>.</li>
    </ul>
    <p style="font-size: 0.9rem; color: var(--text-muted);">
      <strong>Distribución de Contratos:</strong> <span style="color: #34d399; font-weight:700;">${totals.count_sobra} contratos</span> presentan Recurso Excedente ($${formatCurrency(totals.sobrante_total)}), 
      <span style="color: #fbbf24; font-weight:700;">${totals.count_equilibrado} contratos</span> se encuentran Equilibrados, y 
      <span style="color: #f87171; font-weight:700;">${totals.count_falta} contratos</span> presentan Insuficiencia Presupuestal (-$${formatCurrency(totals.faltante_total)}).
      ${topDeficit ? ` El mayor faltante individual corresponde al contrato <strong>${topDeficit.contrato}</strong> (${topDeficit.proveedor}) por <strong>${formatCurrency(topDeficit.suficiencia)}</strong>.` : ''}
    </p>
  `;
}

// Render Static & Inamovible Macro KPI Cards
function renderKPIs() {
  if (!fullData || !fullData.mandatory_control_values) return;

  const ctrl = fullData.mandatory_control_values;
  const totals = fullData.global_totals;

  // 1. Disponible SICOP Real (Inamovible)
  document.getElementById('kpiDisponibleSICOP').innerText = formatCurrency(ctrl.disponible_sicop_conciliado);

  // 2. Estimación INPer por Ejercer (Inamovible)
  document.getElementById('kpiEstimacionINPer').innerText = formatCurrency(ctrl.estimacion_inper_conciliado);

  // 3. Saldo Real de Suficiencia (Inamovible)
  const sufEl = document.getElementById('kpiSuficienciaNeta');
  sufEl.innerText = formatCurrency(ctrl.saldo_suficiencia_conciliado);
  sufEl.style.color = ctrl.saldo_suficiencia_conciliado >= 0 ? '#34d399' : '#f87171';
  document.getElementById('kpiSuficienciaSub').innerText = ctrl.saldo_suficiencia_conciliado >= 0 ? 'SOBRA RECURSO' : 'FALTA RECURSO';

  // 4. Sobrante Total Acumulado (Inamovible)
  document.getElementById('kpiSobranteTotal').innerText = formatCurrency(totals.sobrante_total);
  document.getElementById('kpiSobranteSub').innerText = `${totals.count_sobra} Contratos con excedente`;

  // 5. Faltante Total Acumulado (Inamovible)
  document.getElementById('kpiFaltanteTotal').innerText = formatCurrency(-totals.faltante_total);
  document.getElementById('kpiFaltanteSub').innerText = `${totals.count_falta} Contratos con insuficiencia`;

  // 6. Universo Conciliado (Inamovible)
  document.getElementById('kpiTotalContratos').innerText = fullData.metadata.total_conciliated_contracts;
  document.getElementById('kpiCompromisosSub').innerText = `${fullData.metadata.total_conciliated_commitments} Compromisos Conciliados`;
}

function renderCharts() {
  if (!fullData) return;

  renderSufficiencyChart();
  renderDistributionChart();
  renderRankingChart();
}

function renderSufficiencyChart() {
  const ctx = document.getElementById('chartSufficiency').getContext('2d');
  const ctrl = fullData.mandatory_control_values;

  if (chartSufficiency) chartSufficiency.destroy();

  chartSufficiency = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Disponible SICOP (AT)', 'Estimación INPer (AV)'],
      datasets: [{
        label: 'Monto en Pesos ($)',
        data: [ctrl.disponible_sicop_conciliado, ctrl.estimacion_inper_conciliado],
        backgroundColor: ['#38bdf8', '#a855f7'],
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
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
  if (!fullData || !fullData.contracts) return;

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
      <tr class="contract-row" onclick="toggleContract('${c.contrato}')" data-contrato="${c.contrato}" title="Haz clic para abrir el desglose por abajo">
        <td style="text-align: center;">
          <button class="btn-toggle">${isExpanded ? '▼' : '▶'}</button>
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
          <tr class="commitment-row" onclick="event.stopPropagation(); toggleCommitment('${compKey}')">
            <td style="text-align: center;">
              <button class="btn-toggle">${isCompExpanded ? '▼' : '▶'}</button>
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

function closeModal() {
  const modal = document.getElementById('detailModal');
  if (modal) modal.style.display = 'none';
}

function renderUnlinkedResources() {
  if (!fullData || !fullData.unlinked_resources) return;

  const unlinked = fullData.unlinked_resources;

  document.getElementById('unlinkedCountBadge').innerText = unlinked.total_unlinked_rows;
  document.getElementById('lblUnlinkedAT').innerText = formatCurrency(unlinked.at_unlinked_total);
  document.getElementById('lblUnlinkedAV').innerText = formatCurrency(unlinked.av_unlinked_total);

  const casoAContainer = document.getElementById('unlinkedCasoAList');
  casoAContainer.innerHTML = unlinked.caso_a_rows.map(item => `
    <div class="audit-item">
      <div><strong>Contrato ${item.contrato}</strong> (Row ${item.row_id})<br><span style="font-size:0.75rem; color:var(--text-muted);">${item.servicio}</span></div>
      <div style="text-align:right;">
        <div style="color:var(--color-sicop); font-weight:700;">AT: ${formatCurrency(item.at)}</div>
        <div style="color:var(--color-inper); font-size:0.75rem;">AV: ${formatCurrency(item.av)}</div>
      </div>
    </div>
  `).join('');

  const casoBContainer = document.getElementById('unlinkedCasoBList');
  casoBContainer.innerHTML = unlinked.caso_b_rows.map(item => `
    <div class="audit-item">
      <div><strong>Row ${item.row_id} (No. ${item.no})</strong><br><span style="font-size:0.75rem; color:var(--text-muted);">${item.servicio}</span></div>
      <div style="text-align:right;">
        <div style="color:var(--color-sicop); font-weight:700;">AT: ${formatCurrency(item.at)}</div>
        <div style="color:var(--color-inper); font-size:0.75rem;">AV: ${formatCurrency(item.av)}</div>
      </div>
    </div>
  `).join('');
}

function renderAudit() {
  if (!fullData || !fullData.audit) return;

  const audit = fullData.audit;

  document.getElementById('auditCountBadge').innerText = audit.count_sicop_only + audit.count_inper_only + audit.count_extreme_variances;

  const sicopOnlyContainer = document.getElementById('auditSicopOnlyList');
  sicopOnlyContainer.innerHTML = audit.sicop_only_summary.map(item => `
    <div class="audit-item">
      <div><strong>Contrato ${item.contrato}</strong><br><span style="font-size:0.75rem; color:var(--text-muted);">${item.proveedor}</span></div>
      <div style="color: var(--color-sicop); font-weight:700;">${formatCurrency(item.disponible_sicop)}</div>
    </div>
  `).join('');

  const inperOnlyContainer = document.getElementById('auditInperOnlyList');
  inperOnlyContainer.innerHTML = audit.inper_only_summary.map(item => `
    <div class="audit-item">
      <div><strong>Contrato ${item.contrato}</strong><br><span style="font-size:0.75rem; color:var(--text-muted);">${item.proveedor}</span></div>
      <div style="color: var(--color-inper); font-weight:700;">${formatCurrency(item.estimacion_inper)}</div>
    </div>
  `).join('');

  const extremeContainer = document.getElementById('auditExtremeList');
  extremeContainer.innerHTML = audit.extreme_variances_summary.map(item => `
    <div class="audit-item">
      <div><strong>Contrato ${item.contrato}</strong><br><span style="font-size:0.75rem; color: var(--text-muted);">${item.proveedor}</span></div>
      <div style="font-weight:700; color: ${item.suficiencia >= 0 ? '#34d399' : '#f87171'};">${formatCurrency(item.suficiencia)}</div>
    </div>
  `).join('');
}
