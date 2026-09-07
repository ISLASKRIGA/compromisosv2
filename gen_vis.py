# Generador de visualizador
import json, openpyxl, re, os

FOLDER = r'c:\Users\chuch\.gemini\antigravity\playground\compromisosv2'
wb_ppto = openpyxl.load_workbook(os.path.join(FOLDER, '07.09.2026.xlsx'), read_only=True)
rows_ppto = list(wb_ppto['Table 1'].iter_rows(values_only=True))

def to_f(v):
    if v is None: return 0.0
    s = str(v).split('\n')[0].replace('$','').replace(',','').strip()
    try: return float(s)
    except: return 0.0

presupuesto_og = []
current_og = None
current_desc = ''
for r in rows_ppto:
    if r[0] and r[1] is None and '.-' in str(r[0]):
        m = re.match(r'^(\d{5})\.-(.+)', str(r[0]))
        if m:
            current_og = m.group(1)
            current_desc = m.group(2).strip()
    elif r[3] and 'Total' in str(r[3]) and current_og:
        presupuesto_og.append({
            'partida': current_og,
            'descripcion': current_desc,
            'modificado': to_f(r[12]),
            'ejercido': to_f(r[15]),
            'disponible': to_f(r[16])
        })
        current_og = None

caps = {'1000': {'mod': 0.0, 'ej': 0.0, 'disp': 0.0},
        '2000': {'mod': 0.0, 'ej': 0.0, 'disp': 0.0},
        '3000': {'mod': 0.0, 'ej': 0.0, 'disp': 0.0}}

for og in presupuesto_og:
    c = og['partida'][:1] + '000'
    if c in caps:
        caps[c]['mod'] += og['modificado']
        caps[c]['ej'] += og['ejercido']
        caps[c]['disp'] += og['disponible']

with open(os.path.join(FOLDER, 'datos_vinculacion.json'), 'r', encoding='utf-8') as f:
    contratos = json.load(f)

dashboard_data = {
    'totales_presupuesto': {
        'total_modificado': sum(og['modificado'] for og in presupuesto_og),
        'total_ejercido': sum(og['ejercido'] for og in presupuesto_og),
        'total_disponible': sum(og['disponible'] for og in presupuesto_og),
        'capitulos': caps,
        'objetos_gasto': presupuesto_og
    },
    'contratos': contratos
}

json_str = json.dumps(dashboard_data, ensure_ascii=False)
js_file = os.path.join(FOLDER, 'dashboard_data.js')
with open(js_file, 'w', encoding='utf-8') as f:
    f.write('const DASHBOARD_DATA = ' + json_str + ';\n')

print('dashboard_data.js generado correctamente.')
