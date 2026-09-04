// JavaScript for INPer - Visualizador Ejecutivo de Conciliación SICOP vs INPer (Base Maestra Corregida)

let fullData = null;
let currentStatusFilter = 'ALL';
let currentSearchQuery = '';
let currentTolerance = 0.01; // Internal fixed precision threshold
let currentSortCol = 'suficiencia';
let currentSortAsc = false; // Default desc for numeric columns
let expandedContracts = new Set();
let expandedCommitments = new Set();
let expandedClaves = new Set();

let chartSufficiency = null;
let chartDistribution = null;
let chartRanking = null;

let currentClavesSearchQuery = '';
let currentPartidaFilter = 'ALL';

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
      renderTableAndKPIs();
    });
  }

  // Claves search input
  const clavesSearchInput = document.getElementById('clavesSearchInput');
  if (clavesSearchInput) {
    clavesSearchInput.addEventListener('input', (e) => {
      currentClavesSearchQuery = e.target.value.toLowerCase().trim();
      renderClavesTable();
    });
  }

  // Claves Partida filter buttons
  const partidaBtns = document.querySelectorAll('.filter-btn[data-partida]');
  partidaBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      partidaBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPartidaFilter = btn.dataset.partida;
      renderClavesTable();
    });
  });

  // Filter status buttons
  const filterBtns = document.querySelectorAll('.filter-btn[data-status]');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      setFilterStatus(btn.dataset.status);
    });
  });

  // KPI Card clicks (Interactive Filtering)
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

  const cardClaves = document.getElementById('cardClavesAdquiridas');
  if (cardClaves) {
    cardClaves.addEventListener('click', () => {
      const tabClavesBtn = document.querySelector('.tab-btn[data-tab="claves"]');
      if (tabClavesBtn) tabClavesBtn.click();
    });
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
      document.getElementById('tabClaves').style.display = targetTab === 'claves' ? 'block' : 'none';
      if (targetTab === 'claves') renderClavesTable();
    });
  });

  // Modal Close
  const closeBtn = document.getElementById('closeClavesModal');
  const modal = document.getElementById('clavesModal');
  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });
  }

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

  // Export Excel Original (Base Maestra)
  const btnExportExcel = document.getElementById('btnExportExcel');
  if (btnExportExcel) {
    btnExportExcel.addEventListener('click', downloadOriginalExcel);
  }

  // Export Excel Reporte Ejecutivo
  const btnExportReporte = document.getElementById('btnExportReporte');
  if (btnExportReporte) {
    btnExportReporte.addEventListener('click', downloadReporteExcel);
  }
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

  renderTableAndKPIs();
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

function downloadReporteExcel() {
  const excelFilename = 'Pruebareporteejecutivo_validado_PCOM_CM_correcto.xlsx';
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
  renderKPIs();
  renderCharts();
  renderTable();
  renderUnlinkedResources();
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

function renderKPIs() {
  if (!fullData || !fullData.mandatory_control_values) return;

  const ctrl = fullData.mandatory_control_values;
  const totals = fullData.global_totals;
  const filtered = getFilteredContracts();

  document.getElementById('kpiDisponibleSICOP').innerText = formatCurrency(ctrl.disponible_sicop_conciliado);
  document.getElementById('kpiEstimacionINPer').innerText = formatCurrency(ctrl.estimacion_inper_conciliado);

  const sufEl = document.getElementById('kpiSuficienciaNeta');
  sufEl.innerText = formatCurrency(ctrl.saldo_suficiencia_conciliado);
  sufEl.style.color = ctrl.saldo_suficiencia_conciliado >= 0 ? '#34d399' : '#f87171';
  document.getElementById('kpiSuficienciaSub').innerText = ctrl.saldo_suficiencia_conciliado >= 0 ? 'SOBRA RECURSO' : 'FALTA RECURSO';

  document.getElementById('kpiSobranteTotal').innerText = formatCurrency(totals.sobrante_total);
  document.getElementById('kpiSobranteSub').innerText = `${totals.count_sobra} Contratos con excedente`;

  document.getElementById('kpiFaltanteTotal').innerText = formatCurrency(-totals.faltante_total);
  document.getElementById('kpiFaltanteSub').innerText = `${totals.count_falta} Contratos con insuficiencia`;

  document.getElementById('kpiTotalContratos').innerText = filtered.length;
  document.getElementById('kpiCompromisosSub').innerText = `${fullData.metadata.total_conciliated_commitments} Compromisos Conciliados`;

  if (fullData.adquisiciones_kpis) {
    const kpisAdq = fullData.adquisiciones_kpis;
    const kpiClavesEl = document.getElementById('kpiClavesTotal');
    if (kpiClavesEl) kpiClavesEl.innerText = `${kpisAdq.total_claves_vinculadas_count.toLocaleString('es-MX')} Claves`;
    
    const kpiClavesSubEl = document.getElementById('kpiClavesMontoSub');
    if (kpiClavesSubEl) kpiClavesSubEl.innerText = `${formatCurrency(kpisAdq.monto_total_claves_vinculadas)} en ${kpisAdq.contratos_con_claves_count} contratos`;
    
    const countBadgeEl = document.getElementById('clavesCountBadge');
    if (countBadgeEl) countBadgeEl.innerText = kpisAdq.total_claves_vinculadas_count.toLocaleString('es-MX');
  }
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

    let provCell = `<td title="${c.proveedor}" style="max-width: 220px; overflow: hidden; text-overflow: ellipsis;">
      <div style="font-weight: 600;">${c.proveedor}</div>`;
    if (c.adquisicion_metadata && c.adquisicion_metadata.rfc && c.adquisicion_metadata.rfc !== 'N/A') {
      provCell += `<div style="font-size:0.7rem; color:var(--text-muted);">RFC: ${c.adquisicion_metadata.rfc}</div>`;
    }
    if (c.claves_adquiridas_count > 0) {
      const clavesOpen = expandedClaves.has(c.contrato);
      provCell += `<div style="margin-top: 3px;">
        <span class="badge-clave" onclick="event.stopPropagation(); toggleClaves('${c.contrato}')" title="Haz clic para ${clavesOpen ? 'ocultar' : 'desplegar'} las ${c.claves_adquiridas_count} claves adquiridas">
          💊 ${c.claves_adquiridas_count} claves ${clavesOpen ? '▼' : '▶'}
        </span>
      </div>`;
    }
    provCell += `</td>`;

    html += `
      <tr class="contract-row" onclick="toggleContract('${c.contrato}')" data-contrato="${c.contrato}">
        <td style="text-align: center;">
          <button class="btn-toggle">${isExpanded ? '▼' : '▶'}</button>
        </td>
        <td><strong>${c.contrato}</strong></td>
        ${provCell}
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
      const hasMeta = c.adquisicion_metadata && c.adquisicion_metadata.procedimiento !== 'N/A';
      
      html += `
        <tr>
          <td colspan="13" style="padding: 0;">
            <div class="subtable-container">
              ${hasMeta ? `
                <div style="background:#0f172a; border: 1px solid #334155; border-radius:8px; padding:10px 14px; margin-bottom: 12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                  <div>
                    <div style="font-size:0.78rem; font-weight:800; color:#c084fc;">📋 METADATOS DE ADQUISICIÓN Y CONTRATACIÓN (MADRE 3.3)</div>
                    <div style="font-size:0.78rem; color:#cbd5e1; margin-top:3px;">
                      <strong>Procedimiento:</strong> ${c.adquisicion_metadata.procedimiento} | 
                      <strong>Administrador:</strong> ${c.adquisicion_metadata.administrador} | 
                      <strong>SIFGO:</strong> <span style="color:#34d399; font-weight:700;">${c.adquisicion_metadata.sifgo}</span>
                    </div>
                  </div>
                  ${c.claves_adquiridas_count > 0 ? `
                    <button class="btn-export" style="background:#8b5cf6; color:#fff; border:none; padding:5px 12px; font-size:0.78rem; border-radius:6px; cursor:pointer;" onclick="toggleClaves('${c.contrato}')">
                      💊 ${expandedClaves.has(c.contrato) ? 'Ocultar' : 'Ver'} ${c.claves_adquiridas_count} Claves Adquiridas
                    </button>
                  ` : ''}
                </div>
              ` : ''}

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
          <tr class="commitment-row" onclick="toggleCommitment('${compKey}')">
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

          comp.partidas.forEach(p => {
            html += `
              <tr>
                <td>Row ${p.row_id}</td>
                <td><strong style="color: #60a5fa;">${p.ptda}</strong></td>
                <td style="font-family: monospace; font-size: 0.75rem;">${p.clave_programatica}</td>
                <td title="${p.bien_servicio}" style="max-width: 240px; overflow: hidden; text-overflow: ellipsis;">${p.bien_servicio}</td>
                <td style="text-align: right;">${formatCurrency(p.modificado_sicop)}</td>
                <td style="text-align: right;">${formatCurrency(p.pagado_sicop)}</td>
                <td style="text-align: right; font-weight: 600; color: var(--color-sicop);">${formatCurrency(p.disponible_sicop)}</td>
                <td style="font-size: 0.75rem; color: #94a3b8;">${p.observaciones || ''}</td>
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
      `;

      if (expandedClaves.has(c.contrato) && c.claves_adquiridas && c.claves_adquiridas.length > 0) {
        html += `
          <div style="margin-top:16px; border-top:1px solid #334155; padding-top:14px;">
            <div class="subtable-header" style="color:#c084fc; margin-bottom:8px;">
              <span>💊</span> CLAVES ADQUIRIDAS — CONTRATO ${c.contrato} (${c.claves_adquiridas_count} CLAVES | ${formatCurrency(c.claves_adquiridas.reduce((s,cl)=>s+cl.monto_maximo_con_iva,0))})
            </div>
            <div style="overflow-x:auto;">
              <table class="sub-table" style="table-layout:fixed; min-width:860px;">
                <thead>
                  <tr style="background:#0f172a;">
                    <th style="width:90px;">Clave Almacén</th>
                    <th style="width:130px;">CNIS / CUCOP+</th>
                    <th>Concepto del Insumo</th>
                    <th style="width:75px;">Unidad</th>
                    <th style="width:105px; text-align:right;">P. Unitario</th>
                    <th style="width:85px; text-align:center;">Cant. Máx.</th>
                    <th style="width:120px; text-align:right; color:#c084fc;">Monto Máx. IVA</th>
                  </tr>
                </thead>
                <tbody>
        `;
        c.claves_adquiridas.forEach(cl => {
          let pClass = 'partida-other';
          if (cl.clave_cucop.startsWith('25301')) pClass = 'partida-25301';
          else if (cl.clave_cucop.startsWith('25101')) pClass = 'partida-25101';
          else if (cl.clave_cucop.startsWith('25401')) pClass = 'partida-25401';
          else if (cl.clave_cucop.startsWith('25501')) pClass = 'partida-25501';
          html += `
                  <tr>
                    <td><strong style="color:#38bdf8;">${cl.clave_almacen}</strong></td>
                    <td>
                      <span class="partida-tag ${pClass}" style="font-size:0.68rem;">${cl.clave_cucop}</span>
                      ${cl.clave_cnis && cl.clave_cnis !== 'N/A' ? `<div style="font-size:0.65rem;color:var(--text-muted);margin-top:2px;">CNIS: ${cl.clave_cnis}</div>` : ''}
                    </td>
                    <td class="cell-wrap" title="${cl.concepto}" style="font-size:0.78rem;">${cl.concepto}</td>
                    <td style="white-space:nowrap;">${cl.unidad_medida}</td>
                    <td style="text-align:right;white-space:nowrap;">${formatCurrency(cl.precio_unitario)}</td>
                    <td style="text-align:center;white-space:nowrap;">${cl.cantidad_maxima.toLocaleString('es-MX')}</td>
                    <td style="text-align:right;font-weight:700;color:#c084fc;white-space:nowrap;">${formatCurrency(cl.monto_maximo_con_iva)}</td>
                  </tr>
          `;
        });
        html += `
                </tbody>
              </table>
            </div>
          </div>
        `;
      }

      html += `
            </div>
          </td>
        </tr>
      `;
    }
  });

  tbody.innerHTML = html;
}

window.openClavesModal = function(contractNumber) {
  if (!fullData || !fullData.contracts) return;
  const contract = fullData.contracts.find(c => c.contrato === contractNumber);
  if (!contract || !contract.claves_adquiridas || contract.claves_adquiridas.length === 0) {
    alert(`No se encontraron claves de insumos desglosadas para el contrato ${contractNumber}.`);
    return;
  }

  const modal = document.getElementById('clavesModal');
  const titleEl = document.getElementById('clavesModalTitle');
  const bodyEl = document.getElementById('clavesModalBody');

  titleEl.innerHTML = `💊 Catálogo de Claves Adquiridas — Contrato ${contract.contrato} (${contract.proveedor})`;

  let html = `
    <div style="margin-bottom: 16px; background: #0f172a; border: 1px solid #334155; padding: 14px 18px; border-radius: 8px;">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; font-size: 0.85rem;">
        <div><strong>Proveedor:</strong> ${contract.proveedor}</div>
        <div><strong>RFC:</strong> ${contract.rfc}</div>
        <div><strong>Procedimiento:</strong> ${contract.adquisicion_metadata.procedimiento}</div>
        <div><strong>Administrador:</strong> ${contract.adquisicion_metadata.administrador}</div>
        <div><strong>Estatus SIFGO:</strong> <span style="color:#34d399; font-weight:700;">${contract.adquisicion_metadata.sifgo}</span></div>
        <div><strong>Total Claves:</strong> <span style="color:#c084fc; font-weight:800;">${contract.claves_adquiridas_count} claves</span></div>
      </div>
    </div>

    <table class="exec-table" style="table-layout:fixed; min-width:800px;">
      <thead>
        <tr>
          <th style="width:90px;">Clave Almacén</th>
          <th style="width:130px;">Clave CNIS / CUCOP+</th>
          <th>Concepto / Descripción del Medicamento o Insumo</th>
          <th style="width:75px;">Unidad</th>
          <th style="width:110px; text-align: right;">Precio Unitario</th>
          <th style="width:85px; text-align: center;">Cant. Máx.</th>
          <th style="width:120px; text-align: right; color: #c084fc;">Monto Máx. con IVA</th>
        </tr>
      </thead>
      <tbody>
  `;

  contract.claves_adquiridas.forEach(cl => {
    let pClass = 'partida-other';
    if (cl.clave_cucop.startsWith('25301')) pClass = 'partida-25301';
    else if (cl.clave_cucop.startsWith('25101')) pClass = 'partida-25101';
    else if (cl.clave_cucop.startsWith('25401')) pClass = 'partida-25401';
    else if (cl.clave_cucop.startsWith('25501')) pClass = 'partida-25501';

    html += `
      <tr>
        <td><strong style="color: #38bdf8;">${cl.clave_almacen}</strong></td>
        <td>
          <span class="partida-tag ${pClass}">${cl.clave_cucop}</span>
          ${cl.clave_cnis && cl.clave_cnis !== 'N/A' ? `<div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px;">CNIS: ${cl.clave_cnis}</div>` : ''}
        </td>
        <td class="cell-wrap" title="${cl.concepto}">${cl.concepto}</td>
        <td style="white-space: nowrap;">${cl.unidad_medida}</td>
        <td style="text-align: right; white-space: nowrap;">${formatCurrency(cl.precio_unitario)}</td>
        <td style="text-align: center; white-space: nowrap;">${cl.cantidad_maxima.toLocaleString('es-MX')}</td>
        <td style="text-align: right; font-weight: 700; color: #c084fc; white-space: nowrap;">${formatCurrency(cl.monto_maximo_con_iva)}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  bodyEl.innerHTML = html;
  modal.style.display = 'flex';
};

function renderClavesTable() {
  if (!fullData || !fullData.contracts) return;

  const tbody = document.getElementById('clavesTableBody');
  if (!tbody) return;

  // Flatten all claves from conciliated contracts
  let allClaves = [];
  fullData.contracts.forEach(c => {
    if (c.claves_adquiridas && c.claves_adquiridas.length > 0) {
      c.claves_adquiridas.forEach(cl => {
        allClaves.push({
          contrato: c.contrato,
          proveedor: c.proveedor,
          ...cl
        });
      });
    }
  });

  // Apply search query & partida filter
  const filtered = allClaves.filter(cl => {
    if (currentPartidaFilter !== 'ALL') {
      if (!cl.clave_cucop.startsWith(currentPartidaFilter)) return false;
    }

    if (currentClavesSearchQuery) {
      const q = currentClavesSearchQuery;
      const matchConcepto = cl.concepto.toLowerCase().includes(q);
      const matchCucop = cl.clave_cucop.toLowerCase().includes(q);
      const matchCnis = cl.clave_cnis.toLowerCase().includes(q);
      const matchAlmacen = cl.clave_almacen.toLowerCase().includes(q);
      const matchContrato = cl.contrato.toLowerCase().includes(q);
      const matchProv = cl.proveedor.toLowerCase().includes(q);

      if (!matchConcepto && !matchCucop && !matchCnis && !matchAlmacen && !matchContrato && !matchProv) {
        return false;
      }
    }

    return true;
  });

  const countEl = document.getElementById('lblClavesRecordCount');
  if (countEl) countEl.innerText = filtered.length.toLocaleString('es-MX');

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">No se encontraron claves con los criterios de búsqueda.</td></tr>`;
    return;
  }

  let html = '';
  filtered.forEach(cl => {
    let pClass = 'partida-other';
    if (cl.clave_cucop.startsWith('25301')) pClass = 'partida-25301';
    else if (cl.clave_cucop.startsWith('25101')) pClass = 'partida-25101';
    else if (cl.clave_cucop.startsWith('25401')) pClass = 'partida-25401';
    else if (cl.clave_cucop.startsWith('25501')) pClass = 'partida-25501';

    html += `
      <tr>
        <td>
          <strong style="color: #60a5fa;">${cl.contrato}</strong>
          <div style="font-size:0.7rem; color:var(--text-muted); max-width: 140px; overflow:hidden; text-overflow:ellipsis;">${cl.proveedor}</div>
        </td>
        <td><strong style="color: #38bdf8;">${cl.clave_almacen}</strong></td>
        <td>
          <span class="partida-tag ${pClass}">${cl.clave_cucop}</span>
          ${cl.clave_cnis && cl.clave_cnis !== 'N/A' ? `<div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px;">CNIS: ${cl.clave_cnis}</div>` : ''}
        </td>
        <td class="cell-wrap" title="${cl.concepto}">${cl.concepto}</td>
        <td style="white-space: nowrap;">${cl.unidad_medida}</td>
        <td style="text-align: right; white-space: nowrap;">${formatCurrency(cl.precio_unitario)}</td>
        <td style="text-align: center; white-space: nowrap;">${cl.cantidad_maxima.toLocaleString('es-MX')}</td>
        <td style="text-align: right; font-weight: 700; color: #c084fc; white-space: nowrap;">${formatCurrency(cl.monto_maximo_con_iva)}</td>
      </tr>
    `;
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

window.toggleClaves = function(contrato) {
  if (expandedClaves.has(contrato)) {
    expandedClaves.delete(contrato);
  } else {
    expandedClaves.add(contrato);
    expandedContracts.add(contrato);
  }
  renderTable();
};

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
