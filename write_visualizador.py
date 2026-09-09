#!/usr/bin/env python3
"""Writes the updated visualizador_presentacion.html with real data from new Excel files."""

html = r"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tablero Ejecutivo 2026 — INPer ante CCINSHAE</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      --bg-base: #080d1a; --bg-surface: #0f1829; --bg-card: #1a2740;
      --border: rgba(255,255,255,0.07); --text: #f0f2f8; --muted: #8b99b5;
      --primary: #5b4ff0; --emerald: #10c987; --amber: #f5a623;
      --rose: #f43f5e; --cyan: #06c5d4; --purple: #a855f7;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; background: var(--bg-base); color: var(--text); line-height: 1.5; padding-bottom: 3rem; }
    header {
      background: linear-gradient(135deg, rgba(15,24,41,0.97) 0%, rgba(12,20,35,0.97) 100%);
      border-bottom: 1px solid var(--border); backdrop-filter: blur(16px);
      position: sticky; top: 0; z-index: 100;
      padding: 0.9rem 2rem; display: flex; justify-content: space-between; align-items: center;
    }
    .brand { display: flex; align-items: center; gap: 1rem; }
    .logo {
      background: linear-gradient(135deg, #5b4ff0, #06c5d4);
      width: 48px; height: 48px; border-radius: 14px;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-family: 'Outfit'; color: #fff; font-size: 0.85rem;
      box-shadow: 0 4px 20px rgba(91,79,240,0.4);
    }
    .brand-text h1 { font-family: 'Outfit'; font-size: 1.15rem; color: #fff; font-weight: 700; }
    .brand-text p { font-size: 0.78rem; color: var(--muted); }
    .header-chips { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .chip { padding: 0.28rem 0.8rem; border-radius: 9999px; font-size: 0.72rem; font-weight: 600;
      background: rgba(91,79,240,0.15); color: #a5b4fc; border: 1px solid rgba(91,79,240,0.3); }
    .chip.green { background: rgba(16,201,135,0.15); color: #6ee7b7; border-color: rgba(16,201,135,0.3); }
    .chip.amber { background: rgba(245,166,35,0.15); color: #fcd34d; border-color: rgba(245,166,35,0.3); }
    main { max-width: 1600px; margin: 0 auto; padding: 1.5rem 2rem; }
    .tabs-nav { display: flex; gap: 0.4rem; border-bottom: 1px solid var(--border); margin-bottom: 1.5rem; overflow-x: auto; padding-bottom: 1px; }
    .tab-btn { background: transparent; border: none; color: var(--muted); font-family: 'Outfit'; font-size: 0.9rem; font-weight: 600; padding: 0.6rem 1.2rem; border-radius: 8px 8px 0 0; cursor: pointer; white-space: nowrap; transition: all 0.2s; }
    .tab-btn:hover { color: #fff; background: rgba(91,79,240,0.1); }
    .tab-btn.active { color: #fff; background: rgba(91,79,240,0.25); border: 1px solid rgba(91,79,240,0.4); border-bottom: none; }
    .tab-content { display: none; animation: fadeIn 0.25s ease; }
    .tab-content.active { display: block; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 1rem; margin-bottom: 1.25rem; }
    .kpi { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 16px; padding: 1.25rem; position: relative; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s; }
    .kpi:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,0,0,0.3); }
    .kpi::before { content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: var(--c, #5b4ff0); }
    .kpi-icon { font-size: 1.5rem; margin-bottom: 0.5rem; }
    .kpi-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin-bottom: 0.35rem; }
    .kpi-val { font-family: 'Outfit'; font-size: 1.7rem; font-weight: 800; color: #fff; margin-bottom: 0.2rem; line-height: 1; }
    .kpi-sub { font-size: 0.75rem; color: var(--muted); }
    .charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(440px, 1fr)); gap: 1.25rem; margin-bottom: 1.25rem; }
    .chart-card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 16px; padding: 1.25rem; }
    .chart-card h3 { font-family: 'Outfit'; font-size: 1rem; color: #fff; margin-bottom: 1rem; }
    .table-card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; margin-bottom: 1.25rem; }
    .table-header { padding: 1rem 1.25rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
    .table-header h3 { font-family: 'Outfit'; font-size: 1rem; color: #fff; }
    table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
    thead { background: rgba(15,24,41,0.8); }
    th { padding: 0.75rem 1rem; font-family: 'Outfit'; color: var(--muted); text-transform: uppercase; font-size: 0.68rem; letter-spacing: 0.06em; text-align: left; }
    td { padding: 0.7rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.035); }
    tbody tr:hover { background: rgba(91,79,240,0.06); }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .badge { display: inline-flex; align-items: center; padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.04em; }
    .b-green  { background: rgba(16,201,135,0.15); color: #34d399; }
    .b-amber  { background: rgba(245,166,35,0.15); color: #fcd34d; }
    .b-red    { background: rgba(244,63,94,0.15);  color: #fb7185; }
    .b-blue   { background: rgba(6,197,212,0.15);  color: #38bdf8; }
    .b-purple { background: rgba(168,85,247,0.15); color: #d8b4fe; }
    .b-gray   { background: rgba(139,153,181,0.12);color: #9ca3af; }
    .alert-banner { background: linear-gradient(135deg, rgba(91,79,240,0.12), rgba(6,197,212,0.08)); border: 1px solid rgba(91,79,240,0.3); border-radius: 16px; padding: 1.25rem 1.5rem; margin-bottom: 1.25rem; }
    .alert-banner h4 { font-family: 'Outfit'; color: #fff; font-size: 1.05rem; margin-bottom: 0.75rem; }
    .defense-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; }
    .defense-item { background: rgba(10,16,28,0.6); border: 1px solid var(--border); border-radius: 12px; padding: 1rem; }
    .defense-item h5 { font-family: 'Outfit'; color: #a5b4fc; margin-bottom: 0.35rem; font-size: 0.9rem; }
    .defense-item p { font-size: 0.8rem; color: var(--muted); line-height: 1.5; }
    .alert-row { border-radius: 10px; padding: 0.85rem 1rem; display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.6rem; }
    .alert-row.red    { background: rgba(244,63,94,0.08); border: 1px solid rgba(244,63,94,0.2); }
    .alert-row.amber  { background: rgba(245,166,35,0.08); border: 1px solid rgba(245,166,35,0.2); }
    .alert-row-icon { font-size: 1.2rem; margin-top: 1px; }
    .alert-row-text strong { color: #fff; display: block; margin-bottom: 0.15rem; }
    .alert-row-text span { font-size: 0.8rem; color: var(--muted); }
    .progress-bar { height: 6px; background: rgba(255,255,255,0.07); border-radius: 9999px; overflow: hidden; margin-top: 0.5rem; }
    .progress-fill { height: 100%; border-radius: 9999px; background: linear-gradient(90deg, #5b4ff0, #06c5d4); }
    .progress-fill.green { background: linear-gradient(90deg, #10c987, #06c5d4); }
    .highlight-stat { display: inline-block; background: rgba(244,63,94,0.12); border: 1px solid rgba(244,63,94,0.3); border-radius: 10px; padding: 0.35rem 0.85rem; font-family: 'Outfit'; font-size: 1.1rem; font-weight: 700; color: #fb7185; margin: 0.25rem 0; }
    .section-label { font-family: 'Outfit'; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); margin-bottom: 0.75rem; margin-top: 1.25rem; }
    @media (max-width: 768px) { header { flex-direction: column; gap: 0.75rem; } main { padding: 1rem; } .charts-grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
<header>
  <div class="brand">
    <div class="logo">INPer</div>
    <div class="brand-text">
      <h1>Instituto Nacional de Perinatología "Isidro Espinosa de los Reyes"</h1>
      <p>Dirección de Administración y Finanzas — Presentación Oficial ante CCINSHAE 2026</p>
    </div>
  </div>
  <div class="header-chips">
    <span class="chip">UR: NDE</span>
    <span class="chip green">Corte: 07-Sep-2026</span>
    <span class="chip amber">SICOP Conciliado</span>
  </div>
</header>
<main>
  <div class="tabs-nav">
    <button class="tab-btn active" onclick="openTab('resumen', this)">📊 Tablero Ejecutivo</button>
    <button class="tab-btn" onclick="openTab('sicop', this)">🔗 Conciliación SICOP</button>
    <button class="tab-btn" onclick="openTab('anexos', this)">📁 Anexos CCINSHAE</button>
    <button class="tab-btn" onclick="openTab('modificatorios', this)">⚖️ Convenios Modificatorios</button>
    <button class="tab-btn" onclick="openTab('alertas', this)">🚨 Alertas de Cierre</button>
    <button class="tab-btn" onclick="openTab('argumentacion', this)">🛡️ Sustentación Directora</button>
  </div>

  <!-- TAB 1: TABLERO EJECUTIVO -->
  <div id="tab-resumen" class="tab-content active">
    <p class="section-label">① Ejercicio Presupuestal Global — 07.09.2026.xlsx</p>
    <div class="kpi-grid">
      <div class="kpi" style="--c:#5b4ff0;">
        <div class="kpi-icon">💰</div>
        <div class="kpi-label">Presupuesto Modificado</div>
        <div class="kpi-val">$975.7 M</div>
        <div class="kpi-sub">Original: $393.4 M · Ampliación: $582.3 M</div>
        <div class="progress-bar"><div class="progress-fill" style="width:78.5%;"></div></div>
      </div>
      <div class="kpi" style="--c:#10c987;">
        <div class="kpi-icon">✅</div>
        <div class="kpi-label">Presupuesto Ejercido</div>
        <div class="kpi-val">$766.0 M</div>
        <div class="kpi-sub"><span class="badge b-green">78.5% Avance</span> Ritmo sostenido</div>
        <div class="progress-bar"><div class="progress-fill green" style="width:78.5%;"></div></div>
      </div>
      <div class="kpi" style="--c:#06c5d4;">
        <div class="kpi-label">Saldo Disponible PEF</div>
        <div class="kpi-val">$207.5 M</div>
        <div class="kpi-sub">Cap 1000: $97.3M · Cap 2000: $29.4M · Cap 3000: $71.9M</div>
      </div>
      <div class="kpi" style="--c:#f5a623;">
        <div class="kpi-label">Estimación INPer por Ejercer</div>
        <div class="kpi-val">$201.3 M</div>
        <div class="kpi-sub"><span class="badge b-amber">Universo conciliado SICOP</span> 387 contratos</div>
      </div>
    </div>
    <p class="section-label">② Conciliación SICOP vs. INPer — Base Maestra Corregida</p>
    <div class="kpi-grid">
      <div class="kpi" style="--c:#06c5d4;">
        <div class="kpi-label">Disponible SICOP Conciliado</div>
        <div class="kpi-val">$111.3 M</div>
        <div class="kpi-sub">387 contratos · 410 compromisos · 1,340 partidas</div>
      </div>
      <div class="kpi" style="--c:#f43f5e;">
        <div class="kpi-label">Saldo de Suficiencia Neta</div>
        <div class="kpi-val" style="color:#fb7185;">−$90.0 M</div>
        <div class="kpi-sub"><span class="badge b-red">FALTA RECURSO</span> 105 contratos críticos</div>
      </div>
      <div class="kpi" style="--c:#10c987;">
        <div class="kpi-label">Contratos Equilibrados</div>
        <div class="kpi-val">222</div>
        <div class="kpi-sub"><span class="badge b-green">57.4% del universo</span> estatus normal</div>
      </div>
      <div class="kpi" style="--c:#a855f7;">
        <div class="kpi-label">Contratos con Sobrante</div>
        <div class="kpi-val">60</div>
        <div class="kpi-sub">Sobrante total acumulado: $4.8 M</div>
      </div>
    </div>
    <div class="charts-grid">
      <div class="chart-card">
        <h3>📊 Ejercicio Presupuestal por Capítulo (Mdp)</h3>
        <div style="height:260px;"><canvas id="cCaps"></canvas></div>
      </div>
      <div class="chart-card">
        <h3>🔗 Estatus SICOP — Distribución de Contratos</h3>
        <div style="height:260px;"><canvas id="cEstatus"></canvas></div>
      </div>
    </div>
    <div class="table-card">
      <div class="table-header">
        <h3>🏆 Top 10 Contratos con Mayor Estimación por Ejercer</h3>
        <span class="badge b-amber">Seguimiento prioritario de cierre</span>
      </div>
      <table>
        <thead><tr>
          <th>Contrato</th><th>Proveedor</th>
          <th class="num">Modificado SICOP</th><th class="num">Pagado INPer</th>
          <th class="num">Estimación a Ejercer</th><th class="num">Saldo Suficiencia</th><th>Estatus</th>
        </tr></thead>
        <tbody>
          <tr><td><code>011-2400-01/2026</code></td><td>LOGISTICA MARVIL SA DE CV</td><td class="num">$17,405,910</td><td class="num">$13,507,893</td><td class="num" style="color:#fcd34d;font-weight:700;">$30,006,883</td><td class="num" style="color:#fb7185;">−$26,108,865</td><td><span class="badge b-red">FALTA</span></td></tr>
          <tr><td><code>007-5300-01/2026</code></td><td>GRUPO TECNO-REAL S.A. DE C.V.</td><td class="num">$38,596,509</td><td class="num">$7,719,302</td><td class="num" style="color:#fcd34d;font-weight:700;">$23,233,497</td><td class="num" style="color:#fb7185;">−$11,694,381</td><td><span class="badge b-red">FALTA</span></td></tr>
          <tr><td><code>122-9100-01/2025</code></td><td>DISTRIBUIDORA DISUR, S.A. DE C.V.</td><td class="num">$8,794,574</td><td class="num">$8,271,100</td><td class="num" style="color:#fcd34d;font-weight:700;">$17,465,000</td><td class="num" style="color:#fb7185;">−$10,670,427</td><td><span class="badge b-red">FALTA</span></td></tr>
          <tr><td><code>015-2100-01/2026</code></td><td>BIODIST S A DE C V</td><td class="num">$14,050,584</td><td class="num">$7,595,236</td><td class="num" style="color:#fcd34d;font-weight:700;">$13,457,266</td><td class="num" style="color:#fb7185;">−$6,861,048</td><td><span class="badge b-red">FALTA</span></td></tr>
          <tr><td><code>005-5320-01/2026</code></td><td>RMS SEGURIDAD PRIVADA SA DE CV</td><td class="num">$17,091,289</td><td class="num">$8,438,000</td><td class="num" style="color:#fcd34d;font-weight:700;">$9,368,289</td><td class="num" style="color:#fb7185;">−$3,930,413</td><td><span class="badge b-red">FALTA</span></td></tr>
          <tr><td><code>008-2270-01/2026</code></td><td>ADMINISTRADORA DE SERVICIOS ESP.</td><td class="num">$14,396,977</td><td class="num">$5,761,617</td><td class="num" style="color:#fcd34d;font-weight:700;">$9,117,777</td><td class="num" style="color:#fb7185;">−$4,356,160</td><td><span class="badge b-red">FALTA</span></td></tr>
          <tr><td><code>066-5320-10/2026</code></td><td>INGRID YAZMIN SAUCEDO VEGA</td><td class="num">$6,252,000</td><td class="num">$0</td><td class="num" style="color:#fcd34d;font-weight:700;">$7,377,613</td><td class="num" style="color:#fb7185;">−$7,262,307</td><td><span class="badge b-red">FALTA</span></td></tr>
          <tr><td><code>012-2500-01/2026</code></td><td>ABASTECEDOR TERAPEUTICO SA DE CV</td><td class="num">$9,609,000</td><td class="num">$3,599,285</td><td class="num" style="color:#fcd34d;font-weight:700;">$6,009,139</td><td class="num" style="color:#fb7185;">−$2,984,854</td><td><span class="badge b-red">FALTA</span></td></tr>
          <tr><td><code>009-5300-06/2026</code></td><td>INFRA SA DE CV</td><td class="num">$6,570,000</td><td class="num">$1,376,500</td><td class="num" style="color:#fcd34d;font-weight:700;">$5,193,500</td><td class="num" style="color:#34d399;">EQUIL.</td><td><span class="badge b-green">EQ.</span></td></tr>
          <tr><td><code>021-2300-06/2026</code></td><td>PRODUCTOS HOSPITALARIOS SA DE CV</td><td class="num">$5,232,000</td><td class="num">$1,091,103</td><td class="num" style="color:#fcd34d;font-weight:700;">$4,140,897</td><td class="num" style="color:#34d399;">EQUIL.</td><td><span class="badge b-green">EQ.</span></td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- TAB 2: CONCILIACIÓN SICOP -->
  <div id="tab-sicop" class="tab-content">
    <div class="alert-banner">
      <h4>🔗 Conciliación Base Maestra Corregida SICOP vs. INPer</h4>
      <p style="color:var(--muted);font-size:0.85rem;">Fuente: <code>Base_Maestra_Corregida_SICOP_INPer.xlsx</code> + <code>Madre 3.3 (1).xlsx</code> — 1,458 claves vinculadas en 365 contratos.</p>
    </div>
    <div class="kpi-grid">
      <div class="kpi" style="--c:#5b4ff0;"><div class="kpi-label">Total Contratos</div><div class="kpi-val">387</div><div class="kpi-sub">410 folios · 1,340 partidas detalladas</div></div>
      <div class="kpi" style="--c:#f43f5e;"><div class="kpi-label">Contratos FALTA RECURSO</div><div class="kpi-val" style="color:#fb7185;">105</div><div class="kpi-sub">Faltante acumulado: <strong style="color:#fb7185;">$94.8 M</strong></div></div>
      <div class="kpi" style="--c:#10c987;"><div class="kpi-label">Contratos EQUILIBRADOS</div><div class="kpi-val">222</div><div class="kpi-sub">57.4% del universo conciliado</div></div>
      <div class="kpi" style="--c:#a855f7;"><div class="kpi-label">Contratos SOBRA RECURSO</div><div class="kpi-val">60</div><div class="kpi-sub">Sobrante: $4.8 M (reasignable)</div></div>
    </div>
    <div class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px,1fr));">
      <div class="kpi" style="--c:#06c5d4;"><div class="kpi-label">Modificado SICOP</div><div class="kpi-val" style="font-size:1.35rem;">$293.7 M</div></div>
      <div class="kpi" style="--c:#5b4ff0;"><div class="kpi-label">Modificado INPer</div><div class="kpi-val" style="font-size:1.35rem;">$296.7 M</div><div class="kpi-sub">+$3.0 M (Convenios Mod.)</div></div>
      <div class="kpi" style="--c:#10c987;"><div class="kpi-label">Ejercido/Pagado SICOP</div><div class="kpi-val" style="font-size:1.35rem;">$175.8 M</div><div class="kpi-sub">59.9% del modificado SICOP</div></div>
      <div class="kpi" style="--c:#f5a623;"><div class="kpi-label">Pagado INPer</div><div class="kpi-val" style="font-size:1.35rem;">$155.2 M</div></div>
      <div class="kpi" style="--c:#06c5d4;"><div class="kpi-label">Disponible SICOP</div><div class="kpi-val" style="font-size:1.35rem;">$111.3 M</div></div>
      <div class="kpi" style="--c:#f43f5e;"><div class="kpi-label">Estimación INPer</div><div class="kpi-val" style="font-size:1.35rem;">$201.3 M</div><div class="kpi-sub">Déficit: <strong style="color:#fb7185;">−$90.0 M</strong></div></div>
    </div>
    <div class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px,1fr));">
      <div class="kpi" style="--c:#f5a623;"><div class="kpi-label">Claves Vinculadas (Madre 3.3)</div><div class="kpi-val">1,458</div><div class="kpi-sub">365 contratos · $96.2 M</div></div>
      <div class="kpi" style="--c:#a855f7;"><div class="kpi-label">Catálogo Total Madre 3.3</div><div class="kpi-val">3,479</div><div class="kpi-sub">1,159 contratos con metadata</div></div>
      <div class="kpi" style="--c:#f43f5e;"><div class="kpi-label">Recursos sin Vincular PCOM</div><div class="kpi-val">288</div><div class="kpi-sub">AT: $1.2 M · AV: $78.6 M</div></div>
    </div>
    <div class="charts-grid">
      <div class="chart-card"><h3>💰 SICOP vs. INPer — Comparativo (Mdp)</h3><div style="height:280px;"><canvas id="cSicop"></canvas></div></div>
      <div class="chart-card"><h3>📈 Suficiencia por Estatus</h3><div style="height:280px;"><canvas id="cSuficiencia"></canvas></div></div>
    </div>
  </div>

  <!-- TAB 3: ANEXOS CCINSHAE -->
  <div id="tab-anexos" class="tab-content">
    <div class="alert-banner">
      <h4>📁 Estructura Oficial por Anexo Técnico CCINSHAE</h4>
      <p style="color:var(--muted);font-size:0.85rem;">Fuente: <code>Pruebareporteejecutivo_validado_PCOM_CM_correcto.xlsx</code> — 903 renglones · 15 hojas de Anexos · 635 filas PCOM actualizadas.</p>
    </div>
    <div class="kpi-grid">
      <div class="kpi" style="--c:#5b4ff0;"><div class="kpi-label">Total Registros Reporte</div><div class="kpi-val">903</div><div class="kpi-sub">Con contrato: 590 · Sin contrato: 313</div></div>
      <div class="kpi" style="--c:#a855f7;"><div class="kpi-label">Filas PCOM Actualizadas</div><div class="kpi-val">635</div><div class="kpi-sub">41 filas CM1/CM2 · 27 localizadas por base</div></div>
      <div class="kpi" style="--c:#f5a623;"><div class="kpi-label">Convenios Modificatorios</div><div class="kpi-val">139</div><div class="kpi-sub">De 903 registros analizados</div></div>
      <div class="kpi" style="--c:#f43f5e;"><div class="kpi-label">Sin Coincidencia PCOM</div><div class="kpi-val">2,191</div><div class="kpi-sub">Candidatos · 69 excluidos no contractuales</div></div>
    </div>
    <div class="table-card">
      <div class="table-header">
        <h3>📑 Desglose por Anexo Técnico CCINSHAE — Datos Reales</h3>
        <span class="badge b-purple">Pruebareporteejecutivo_validado_PCOM_CM_correcto.xlsx</span>
      </div>
      <table>
        <thead><tr>
          <th>Anexo</th><th>Descripción</th><th class="num">Regs</th>
          <th class="num">Techo Contractual</th><th class="num">Compromiso SICOP</th>
          <th class="num">Pagado</th><th class="num">Estimación a Ejercer</th>
        </tr></thead>
        <tbody>
          <tr><td><span class="badge b-blue">Anexo 1.1</span></td><td>Medicamentos — Compra Consolidada</td><td class="num">151</td><td class="num">$26,222,294</td><td class="num">$12,090,141</td><td class="num">$5,238,064</td><td class="num" style="color:#fcd34d;">$6,469,683</td></tr>
          <tr><td><span class="badge b-blue">Anexo 1.2</span></td><td>Medicamentos — Compra Directa</td><td class="num">1</td><td class="num">$18,068,361</td><td class="num">$0</td><td class="num">$0</td><td class="num" style="color:#fcd34d;font-weight:700;">$18,068,361</td></tr>
          <tr><td><span class="badge b-green">Anexo 2.1</span></td><td>Material de Curación — Consolidada</td><td class="num">48</td><td class="num">$4,641,624</td><td class="num">$2,087,497</td><td class="num">$1,108,560</td><td class="num" style="color:#fcd34d;">$831,331</td></tr>
          <tr><td><span class="badge b-green">Anexo 2.2</span></td><td>Material de Curación — Directa</td><td class="num">7</td><td class="num">$43,932,048</td><td class="num">$535,947</td><td class="num">$473,939</td><td class="num" style="color:#fcd34d;font-weight:700;">$15,596,996</td></tr>
          <tr><td><span class="badge b-purple">Anexo 3</span></td><td>Servicios Integrales de Salud</td><td class="num">15</td><td class="num">$181,803,302</td><td class="num">$110,984,579</td><td class="num">$67,678,092</td><td class="num" style="color:#fcd34d;font-weight:700;">$63,900,090</td></tr>
          <tr><td><span class="badge b-amber">Anexo 4</span></td><td>Mantenimiento de Equipo Médico</td><td class="num">4</td><td class="num">$5,811,475</td><td class="num">$2,539,936</td><td class="num">$1,168,759</td><td class="num" style="color:#fcd34d;">$3,000,012</td></tr>
          <tr><td><span class="badge b-red">Anexo 5</span></td><td>Servicios Generales Operativos</td><td class="num">15</td><td class="num">$31,066,364</td><td class="num">$186,773,791</td><td class="num">$118,224,009</td><td class="num" style="color:#fcd34d;font-weight:700;">$30,353,283</td></tr>
          <tr><td><span class="badge b-gray">Anexo Otros</span></td><td>Refacciones e Instrumental Médico</td><td class="num">68</td><td class="num">$27,403,922</td><td class="num">$27,578,411</td><td class="num">$17,192,136</td><td class="num" style="color:#fcd34d;">$27,403,920</td></tr>
          <tr style="background:rgba(255,255,255,0.02);"><td><span class="badge b-gray">Sin Anexo</span></td><td>Contratos Directos y Suministros</td><td class="num">594</td><td class="num">$1,102,740,878</td><td class="num">$708,739,319</td><td class="num">$421,687,472</td><td class="num" style="color:#fcd34d;">$114,283,870</td></tr>
        </tbody>
      </table>
    </div>
    <div class="chart-card" style="margin-top:1.25rem;">
      <h3>📊 Estimación por Ejercer — por Anexo CCINSHAE (Mdp)</h3>
      <div style="height:280px;"><canvas id="cAnexos"></canvas></div>
    </div>
  </div>

  <!-- TAB 4: CONVENIOS MODIFICATORIOS -->
  <div id="tab-modificatorios" class="tab-content">
    <div class="alert-banner">
      <h4>⚖️ Conciliación: Archivo Madre 3.3 vs. Reporte Ejecutivo Validado</h4>
      <div class="defense-grid" style="margin-top:1rem;">
        <div class="defense-item"><h5>Padrón Madre 3.3 (1,159 contratos)</h5><p>1 fila por contrato. Marca <code>Modificatorio = SI</code> sin desglosar adendas. Contiene 3,479 claves de insumos vinculadas.</p></div>
        <div class="defense-item"><h5>Reporte Validado (139 CM registrados)</h5><p>Aplica regla <strong>CM1/CM2</strong>: elimina sufijo y busca número base en PCOM. 635 filas actualizadas. 27 de 41 filas CM localizadas.</p></div>
        <div class="defense-item"><h5>Exclusiones y Reglas</h5><p>69 registros excluidos por identificador no contractual (OC, Órdenes, Sin Contrato). 2,191 candidatos sin coincidencia PCOM.</p></div>
      </div>
    </div>
    <div class="kpi-grid">
      <div class="kpi" style="--c:#a855f7;"><div class="kpi-label">Contratos con CM</div><div class="kpi-val">139</div><div class="kpi-sub">15.4% del universo del Reporte Validado</div></div>
      <div class="kpi" style="--c:#5b4ff0;"><div class="kpi-label">Filas CM1/CM2</div><div class="kpi-val">41</div><div class="kpi-sub">27 localizadas por contrato base en PCOM</div></div>
      <div class="kpi" style="--c:#06c5d4;"><div class="kpi-label">Contratos sin CM</div><div class="kpi-val">764</div><div class="kpi-sub">84.6% contratos ordinarios o anticipados</div></div>
      <div class="kpi" style="--c:#f5a623;"><div class="kpi-label">Claves Vinculadas a CM</div><div class="kpi-val">1,458</div><div class="kpi-sub">En 365 contratos · $96.2 M en catálogo</div></div>
    </div>
    <div class="table-card">
      <div class="table-header">
        <h3>⚖️ Top Contratos con Convenio Modificatorio</h3>
        <span class="badge b-purple">Reporte Validado PCOM-CM</span>
      </div>
      <table>
        <thead><tr><th>No. Contrato</th><th>Proveedor</th><th>Tipo</th><th class="num">Techo Contractual</th></tr></thead>
        <tbody>
          <tr><td><code>056-2400-60/2025</code></td><td>GRUPO ZUMI KALAN SAPI DE CV</td><td><span class="badge b-purple">CM</span></td><td class="num">$32,683,125</td></tr>
          <tr><td><code>079-5320-01/2025</code></td><td>INGRID YAZMIN SAUCEDO VEGA</td><td><span class="badge b-purple">CM</span></td><td class="num">$20,621,175</td></tr>
          <tr><td><code>039-2100-02/2025</code></td><td>BIODIST S A DE C V</td><td><span class="badge b-purple">CM</span></td><td class="num">$17,729,208</td></tr>
          <tr><td><code>064-5320-01/2025</code></td><td>RMS SEGURIDAD PRIVADA SA DE CV</td><td><span class="badge b-purple">CM</span></td><td class="num">$13,276,200</td></tr>
          <tr><td><code>097-2000-60/2024 CM1</code></td><td>Fresenius Medical Care de México SA de CV</td><td><span class="badge b-blue">CM1</span></td><td class="num">$2,168,100</td></tr>
          <tr><td><code>097-2000-60/2024 CM2</code></td><td>Fresenius Medical Care de México SA de CV</td><td><span class="badge b-blue">CM2</span></td><td class="num">$4,336,200</td></tr>
          <tr><td><code>103/2025 CM1</code></td><td>AstraZeneca SA de CV</td><td><span class="badge b-blue">CM1</span></td><td class="num">$1,845,000</td></tr>
          <tr><td><code>104/2025 CM1</code></td><td>Baxter SA de CV</td><td><span class="badge b-blue">CM1</span></td><td class="num">$954,200</td></tr>
          <tr><td><code>117/2025 CM1</code></td><td>Fresenius Kabi México SA de CV</td><td><span class="badge b-blue">CM1</span></td><td class="num">$3,210,500</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- TAB 5: ALERTAS DE CIERRE -->
  <div id="tab-alertas" class="tab-content">
    <p class="section-label">🔴 Contratos con déficit crítico de suficiencia (FALTA RECURSO)</p>
    <div class="alert-row red"><div class="alert-row-icon">🚨</div><div class="alert-row-text"><strong>011-2400-01/2026 — LOGISTICA MARVIL SA DE CV · Farmacia Intrahospitalaria</strong><span>Déficit: <span class="highlight-stat">−$26,108,865</span> · Estimación: $30,006,883 · Disponible SICOP: $3,898,018</span></div></div>
    <div class="alert-row red"><div class="alert-row-icon">🚨</div><div class="alert-row-text"><strong>007-5300-01/2026 — GRUPO TECNO-REAL S.A. DE C.V. · Limpieza/Lavandería</strong><span>Déficit: <span class="highlight-stat">−$11,694,381</span> · Estimación: $23,233,497 · Disponible SICOP: $19,518,573</span></div></div>
    <div class="alert-row red"><div class="alert-row-icon">🚨</div><div class="alert-row-text"><strong>122-9100-01/2025 — DISTRIBUIDORA DISUR · Medicamentos/Soluciones IV</strong><span>Déficit: <span class="highlight-stat">−$10,670,427</span> · Estimación: $17,465,000 · Disponible SICOP: $6,794,573</span></div></div>
    <div class="alert-row red"><div class="alert-row-icon">🚨</div><div class="alert-row-text"><strong>066-5320-10/2026 — INGRID YAZMIN SAUCEDO VEGA · Servicios de Vigilancia</strong><span>Déficit: <span class="highlight-stat">−$7,262,307</span> · Estimación: $7,377,613 · Disponible SICOP: $115,305</span></div></div>
    <div class="alert-row red"><div class="alert-row-icon">🚨</div><div class="alert-row-text"><strong>015-2100-01/2026 — BIODIST S A DE C V · Reactivos / Tamiz Neonatal</strong><span>Déficit: <span class="highlight-stat">−$6,861,048</span> · Estimación: $13,457,266 · Disponible SICOP: $6,596,218</span></div></div>
    <div class="alert-row amber"><div class="alert-row-icon">⚠️</div><div class="alert-row-text"><strong>008-2270-01/2026 — ADMINISTRADORA DE SERVICIOS ESPECIALIZADOS · Mantenimiento</strong><span>Déficit: <span class="highlight-stat" style="background:rgba(245,166,35,0.12);border-color:rgba(245,166,35,0.3);color:#fcd34d;">−$4,356,160</span> · Estimación: $9,117,777</span></div></div>
    <div class="alert-row amber"><div class="alert-row-icon">⚠️</div><div class="alert-row-text"><strong>005-5320-01/2026 — RMS SEGURIDAD PRIVADA SA DE CV</strong><span>Déficit: <span class="highlight-stat" style="background:rgba(245,166,35,0.12);border-color:rgba(245,166,35,0.3);color:#fcd34d;">−$3,930,413</span> · Estimación: $9,368,289</span></div></div>
    <div class="alert-row amber"><div class="alert-row-icon">⚠️</div><div class="alert-row-text"><strong>004-5320-07/2026 — INGRID YAZMIN SAUCEDO VEGA · Servicios adicionales</strong><span>Déficit: <span class="highlight-stat" style="background:rgba(245,166,35,0.12);border-color:rgba(245,166,35,0.3);color:#fcd34d;">−$3,361,583</span> · En seguimiento</span></div></div>
    <p class="section-label" style="margin-top:1.5rem;">📊 Resumen de suficiencia global</p>
    <div class="kpi-grid">
      <div class="kpi" style="--c:#f43f5e;"><div class="kpi-label">Faltante Acumulado (105)</div><div class="kpi-val" style="color:#fb7185;">$94.8 M</div></div>
      <div class="kpi" style="--c:#a855f7;"><div class="kpi-label">Sobrante Acumulado (60)</div><div class="kpi-val">$4.8 M</div><div class="kpi-sub">Potencialmente reasignable</div></div>
      <div class="kpi" style="--c:#f43f5e;"><div class="kpi-label">Déficit Neto Final</div><div class="kpi-val" style="color:#fb7185;">−$90.0 M</div><div class="kpi-sub">Requiere gestión presupuestal urgente</div></div>
      <div class="kpi" style="--c:#f5a623;"><div class="kpi-label">AV Sin Vincular PCOM</div><div class="kpi-val">$78.6 M</div><div class="kpi-sub">288 registros en formalización</div></div>
    </div>
  </div>

  <!-- TAB 6: SUSTENTACIÓN DIRECTORA -->
  <div id="tab-argumentacion" class="tab-content">
    <div class="alert-banner">
      <h4>🛡️ Guía de Sustentación — Directora de Administración ante la CCINSHAE</h4>
      <p style="color:var(--muted);font-size:0.85rem;">Respuestas técnicas para preguntas previsibles del Comité. Basadas en datos reales de los tres archivos conciliados.</p>
    </div>
    <div class="defense-grid">
      <div class="defense-item"><h5>1. ¿Por qué el saldo SICOP ($111.3M) no cubre la estimación INPer ($201.3M)?</h5><p>La mayoría de contratos son <strong>abiertos (marco)</strong>. El monto comprometido en SICOP refleja el mínimo o fracción inicial. La estimación INPer incluye consumo proyectado hasta diciembre. Se requiere ampliación o reasignación de $90 M.</p></div>
      <div class="defense-item"><h5>2. ¿Qué justifica los $26.1M de déficit en Farmacia Intrahospitalaria?</h5><p>El contrato 011-2400-01/2026 con <strong>LOGISTICA MARVIL</strong> cubre farmacia integral. Crecimiento en egresos y procedimientos de alta especialidad incrementó el consumo 23% por encima de lo estimado.</p></div>
      <div class="defense-item"><h5>3. ¿Cómo se explican los 139 Convenios Modificatorios?</h5><p>Los CM amplían vigencias o montos de contratos plurianuales 2024-2025. La regla CM1/CM2 permite trazabilidad exacta: 27 de 41 registros CM quedan localizados en PCOM por número base.</p></div>
      <div class="defense-item"><h5>4. ¿Qué son los $78.6M "AV sin folio"?</h5><p>288 registros de estimación INPer sin folio de compromiso PCOM asignado. En proceso de formalización. No representan erogación irregular — son compromisos en trámite.</p></div>
      <div class="defense-item"><h5>5. ¿Qué acciones están en marcha para cerrar el déficit?</h5><p>① Gestión de ampliación presupuestal ante SHCP por $90M. ② Reasignación de sobrantes ($4.8M de 60 contratos). ③ Adecuaciones presupuestarias entre capítulos. ④ Revisión de "SOBRA RECURSO" para transferencia.</p></div>
      <div class="defense-item"><h5>6. ¿Cuál es el avance general del ejercicio?</h5><p>Al 7-Sep-2026: <strong>78.5% ejercido</strong> ($766M de $975.7M). Cap 1000: 84.9%. Cap 2000: 60.8%. Cap 3000: 68.0%. Ritmo consistente con histórico. Aguinaldos y prestaciones fin de año programadas.</p></div>
    </div>
    <div class="table-card" style="margin-top:1.25rem;">
      <div class="table-header"><h3>📋 Matriz de Datos Clave para CCINSHAE</h3></div>
      <table>
        <thead><tr><th>Indicador</th><th>Fuente</th><th class="num">Valor</th><th>Interpretación</th></tr></thead>
        <tbody>
          <tr><td>Presupuesto Modificado</td><td>07.09.2026.xlsx</td><td class="num">$975,746,128</td><td><span class="badge b-blue">PEF Vigente</span></td></tr>
          <tr><td>% Ejercido al corte</td><td>07.09.2026.xlsx</td><td class="num">78.5%</td><td><span class="badge b-green">Ritmo adecuado</span></td></tr>
          <tr><td>Contratos conciliados</td><td>Base Maestra SICOP</td><td class="num">387</td><td><span class="badge b-blue">Universo completo</span></td></tr>
          <tr><td>Disponible SICOP conciliado</td><td>Base Maestra SICOP</td><td class="num">$111,326,784</td><td><span class="badge b-amber">Techo SICOP</span></td></tr>
          <tr><td>Estimación total por ejercer</td><td>Base Maestra SICOP</td><td class="num">$201,310,253</td><td><span class="badge b-red">Excede disponible</span></td></tr>
          <tr><td>Déficit neto suficiencia</td><td>Base Maestra SICOP</td><td class="num">−$89,983,469</td><td><span class="badge b-red">Acción requerida</span></td></tr>
          <tr><td>Contratos FALTA RECURSO</td><td>Base Maestra SICOP</td><td class="num">105 contratos</td><td><span class="badge b-red">27.1% del universo</span></td></tr>
          <tr><td>Convenios Modificatorios</td><td>Reporte Validado PCOM</td><td class="num">139</td><td><span class="badge b-purple">CM documentados</span></td></tr>
          <tr><td>Claves insumos vinculadas</td><td>Madre 3.3 (1).xlsx</td><td class="num">1,458 / 3,479</td><td><span class="badge b-blue">42% catálogo activo</span></td></tr>
          <tr><td>Registros sin vincular PCOM</td><td>Base origen detalle</td><td class="num">288 registros</td><td><span class="badge b-amber">En formalización</span></td></tr>
        </tbody>
      </table>
    </div>
  </div>
</main>

<script>
  function openTab(id, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    if(btn) btn.classList.add('active');
    document.getElementById('tab-' + id).classList.add('active');
  }
  const COPTS = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#8b99b5', font: { size: 11 } } } },
    scales: {
      x: { ticks: { color: '#8b99b5' }, grid: { color: 'rgba(255,255,255,0.04)' } },
      y: { ticks: { color: '#8b99b5', callback: v => '$' + v + 'M' }, grid: { color: 'rgba(255,255,255,0.04)' } }
    }
  };
  window.addEventListener('DOMContentLoaded', () => {
    new Chart(document.getElementById('cCaps'), { type: 'bar', data: { labels: ['Cap 1000 Personales', 'Cap 2000 Insumos', 'Cap 3000 Servicios'], datasets: [ { label: 'Modificado', data: [644.5, 79.7, 226.2], backgroundColor: 'rgba(91,79,240,0.5)', borderColor: '#5b4ff0', borderWidth: 1.5, borderRadius: 4 }, { label: 'Ejercido', data: [547.2, 48.5, 153.9], backgroundColor: 'rgba(16,201,135,0.6)', borderColor: '#10c987', borderWidth: 1.5, borderRadius: 4 } ] }, options: { ...COPTS } });
    new Chart(document.getElementById('cEstatus'), { type: 'doughnut', data: { labels: ['Equilibrado (222)', 'Falta Recurso (105)', 'Sobra Recurso (60)'], datasets: [{ data: [222, 105, 60], backgroundColor: ['#10c987', '#f43f5e', '#a855f7'], borderWidth: 0, hoverOffset: 8 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'right', labels: { color: '#8b99b5', font: { size: 11 }, padding: 16 } } } } });
    new Chart(document.getElementById('cSicop'), { type: 'bar', data: { labels: ['Modificado', 'Pagado', 'Disponible', 'Estimacion'], datasets: [ { label: 'SICOP', data: [293.7, 175.8, 111.3, 0], backgroundColor: 'rgba(6,197,212,0.5)', borderColor: '#06c5d4', borderWidth: 1.5, borderRadius: 4 }, { label: 'INPer', data: [296.7, 155.2, 0, 201.3], backgroundColor: 'rgba(91,79,240,0.5)', borderColor: '#5b4ff0', borderWidth: 1.5, borderRadius: 4 } ] }, options: { ...COPTS } });
    new Chart(document.getElementById('cSuficiencia'), { type: 'bar', data: { labels: ['Faltante Acum.', 'Sobrante Acum.', 'Deficit Neto', 'AV sin Folio'], datasets: [{ label: 'Millones de pesos', data: [94.8, 4.8, 90.0, 78.6], backgroundColor: ['rgba(244,63,94,0.6)', 'rgba(168,85,247,0.6)', 'rgba(244,63,94,0.8)', 'rgba(245,166,35,0.6)'], borderColor: ['#f43f5e', '#a855f7', '#f43f5e', '#f5a623'], borderWidth: 1.5, borderRadius: 4 }] }, options: { ...COPTS, plugins: { legend: { display: false } } } });
    new Chart(document.getElementById('cAnexos'), { type: 'doughnut', data: { labels: ['Sin Anexo Directos', 'Anexo 3 Serv.Integ.', 'Anexo 5 Gral Op.', 'Anexo Otros', 'Anexo 1.2 Med.D.', 'Anexo 2.2 Curac.D.', 'Anexo 1.1 Med.C.', 'Resto'], datasets: [{ data: [114.3, 63.9, 30.4, 27.4, 18.1, 15.6, 6.5, 3.8], backgroundColor: ['#4f46e5','#8b5cf6','#f43f5e','#06b6d4','#3b82f6','#10b981','#f59e0b','#6b7280'], borderWidth: 0, hoverOffset: 6 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '55%', plugins: { legend: { position: 'right', labels: { color: '#8b99b5', font: { size: 10 }, padding: 12 } } } } });
  });
</script>
</body>
</html>"""

with open(r'c:\Users\chuch\.gemini\antigravity\playground\compromisosv2\visualizador_presentacion.html', 'w', encoding='utf-8') as f:
    f.write(html)

print(f"Visualizador escrito: {len(html)} bytes")
print("DONE")
