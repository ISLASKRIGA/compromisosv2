import json

with open('data.json', encoding='utf-8') as f:
    d = json.load(f)

gt = d['global_totals']
cv = d['mandatory_control_values']
meta = d['metadata']
ak = d['adquisiciones_kpis']

print('=== GLOBAL TOTALS ===')
print('count_falta:', gt['count_falta'])
print('count_sobra:', gt['count_sobra'])
print('count_equilibrado:', gt['count_equilibrado'])
print('disponible_sicop:', gt['disponible_sicop'])
print('estimacion_inper:', gt['estimacion_inper'])
print('suficiencia_neta:', gt['suficiencia_neta'])
print('sobrante_total:', gt['sobrante_total'])
print('faltante_total:', gt['faltante_total'])
print('modificado_sicop:', gt['modificado_sicop'])
print('modificado_inper:', gt['modificado_inper'])
print('pagado_sicop:', gt['pagado_sicop'])
print('pagado_inper:', gt['pagado_inper'])
print()
print('=== MANDATORY CONTROL ===')
print('disponible_sicop_conciliado:', cv['disponible_sicop_conciliado'])
print('estimacion_inper_conciliado:', cv['estimacion_inper_conciliado'])
print('saldo_suficiencia_conciliado:', cv['saldo_suficiencia_conciliado'])
print('interpretacion:', cv['interpretacion'])
print('at_sin_folio:', cv['at_sin_folio'])
print('av_sin_folio:', cv['av_sin_folio'])
print()
print('=== METADATA ===')
print('total_conciliated_contracts:', meta['total_conciliated_contracts'])
print('total_conciliated_commitments:', meta['total_conciliated_commitments'])
print('total_conciliated_rows:', meta['total_conciliated_rows'])
print('total_unlinked_rows:', meta['total_unlinked_rows'])
print()
print('=== ADQUISICIONES KPIs ===')
print('total_claves_madre_count:', ak['total_claves_madre_count'])
print('monto_total_claves_madre:', ak['monto_total_claves_madre'])
print('contratos_con_metadatos_count:', ak['contratos_con_metadatos_count'])
print('contratos_con_claves_count:', ak['contratos_con_claves_count'])
print('total_claves_vinculadas_count:', ak['total_claves_vinculadas_count'])
print('monto_total_claves_vinculadas:', ak['monto_total_claves_vinculadas'])
print()

contratos = d['contracts']
falta = sorted([c for c in contratos if c['estatus']=='FALTA RECURSO'], key=lambda x: x['suficiencia'])[:10]
print('=== TOP 10 FALTA RECURSO ===')
for c in falta:
    prov = c['proveedor'][:45] if c['proveedor'] else 'N/A'
    print('  ' + c['contrato'] + ': suf=' + str(round(c['suficiencia'],0)) + ' prov=' + prov)

ejercer = sorted([c for c in contratos if c['estimacion_inper']>0], key=lambda x: -x['estimacion_inper'])[:10]
print()
print('=== TOP 10 POR EJERCER (estimacion_inper) ===')
for c in ejercer:
    prov = c['proveedor'][:45] if c['proveedor'] else 'N/A'
    est = round(c['estimacion_inper'], 0)
    print('  ' + c['contrato'] + ': est=' + str(est) + ' prov=' + prov)
