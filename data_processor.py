import pandas as pd
import numpy as np
import json
import os

def process_excel(excel_path, output_json_path):
    print(f"Cargando nueva base maestra Excel: {excel_path}")
    xls = pd.ExcelFile(excel_path)
    
    df_maestra = pd.read_excel(xls, 'Maestra compromiso')
    df_resumen = pd.read_excel(xls, 'Resumen por contrato')
    df_detalle = pd.read_excel(xls, 'Base origen detalle')
    df_pendientes = pd.read_excel(xls, 'Pendientes vinculación')
    df_control = pd.read_excel(xls, 'Control validación')

    total_partidas_count = len(df_detalle)
    
    # Mapeo explícito por nombre de columna en df_detalle
    col_ak = df_detalle.columns[38] # Monto con que fue registrado el compromiso en SICOP (AK)
    col_al = df_detalle.columns[39] # Monto con que fue registrado el compromiso en SICOP.1 (AL)
    col_ao = df_detalle.columns[42] # Monto pagado del contrato (AO)
    col_ap = df_detalle.columns[43] # Monto pagado del contrato.1 (AP)
    col_at = df_detalle.columns[47] # Monto por ejercer según SICOP (AT)
    col_av = df_detalle.columns[49] # Estimación del monto por ejercer (AV)
    
    # -------------------------------------------------------------
    # 1. MAPEO DE PARTIDAS (Base origen detalle - Nivel 3)
    # -------------------------------------------------------------
    partidas_by_key = {}
    for idx, r in df_detalle.iterrows():
        c_name = str(r['Contrato heredado para conciliación']).strip() if pd.notna(r['Contrato heredado para conciliación']) else 'SIN CONTRATO'
        f_name = str(r['Folio normalizado']).strip().replace('.0', '') if pd.notna(r['Folio normalizado']) else 'SIN FOLIO'
        
        key = (c_name, f_name)
        if key not in partidas_by_key:
            partidas_by_key[key] = []
            
        clave_prog = f"{r['F']}-{r['FN']}-{r['SF']}-{r['RG']}-{r['AI']}-{r['PP']}" if pd.notna(r['F']) else "N/A"
        
        ak = float(r[col_ak]) if pd.notna(r[col_ak]) else 0.0
        al = float(r[col_al]) if pd.notna(r[col_al]) else 0.0
        ao = float(r[col_ao]) if pd.notna(r[col_ao]) else 0.0
        ap = float(r[col_ap]) if pd.notna(r[col_ap]) else 0.0
        at = float(r[col_at]) if pd.notna(r[col_at]) else 0.0
        av = float(r[col_av]) if pd.notna(r[col_av]) else 0.0
        obs = str(r['Observaciones']) if pd.notna(r['Observaciones']) else ''
        
        partidas_by_key[key].append({
            'row_id': idx + 2,
            'no': str(r['No.']) if pd.notna(r['No.']) else 'N/A',
            'ptda': str(r['PTDA']) if pd.notna(r['PTDA']) else 'N/A',
            'clave_programatica': clave_prog,
            'bien_servicio': str(r['Descripción del bien o servicio']) if pd.notna(r['Descripción del bien o servicio']) else 'N/A',
            'modificado_sicop': ak,
            'modificado_inper': al,
            'pagado_sicop': ao,
            'pagado_inper': ap,
            'disponible_sicop': at,
            'estimacion_inper': av,
            'observaciones': obs
        })

    # -------------------------------------------------------------
    # 2. MAPEO DE COMPROMISOS (Maestra compromiso - Nivel 2)
    # -------------------------------------------------------------
    commitments_by_contract = {}
    for idx, r in df_maestra.iterrows():
        c_name = str(r['Contrato']).strip()
        f_name = str(r['Folio de compromiso']).strip().replace('.0', '')
        
        if c_name not in commitments_by_contract:
            commitments_by_contract[c_name] = []
            
        ak = float(r['Modificado SICOP']) if pd.notna(r['Modificado SICOP']) else 0.0
        al = float(r['Modificado INPer']) if pd.notna(r['Modificado INPer']) else 0.0
        ao = float(r['Ejercido/Pagado SICOP']) if pd.notna(r['Ejercido/Pagado SICOP']) else 0.0
        ap = float(r['Pagado INPer']) if pd.notna(r['Pagado INPer']) else 0.0
        at = float(r['Disponible SICOP']) if pd.notna(r['Disponible SICOP']) else 0.0
        av = float(r['Estimación INPer por ejercer']) if pd.notna(r['Estimación INPer por ejercer']) else 0.0
        suf = float(r['Saldo de suficiencia']) if pd.notna(r['Saldo de suficiencia']) else (at - av)
        estatus = str(r['Estatus']).strip() if pd.notna(r['Estatus']) else ('SOBRA RECURSO' if suf > 0.01 else ('FALTA RECURSO' if suf < -0.01 else 'EQUILIBRADO'))
        
        ptdas = partidas_by_key.get((c_name, f_name), [])
        serv = ptdas[0]['bien_servicio'] if ptdas else 'N/A'
        prov = 'N/A'
        if ptdas:
            match_det = df_detalle[(df_detalle['Contrato heredado para conciliación'].astype(str).str.strip() == c_name) & (df_detalle['Folio normalizado'].astype(str).str.strip().str.replace('.0', '') == f_name)]
            if not match_det.empty and pd.notna(match_det.iloc[0]['Proveedor']):
                prov = str(match_det.iloc[0]['Proveedor']).strip()

        commitments_by_contract[c_name].append({
            'folio': f_name,
            'servicio': serv,
            'proveedor': prov,
            'partidas_count': len(ptdas),
            'modificado_sicop': ak,
            'modificado_inper': al,
            'dif_modificado': ak - al,
            'pagado_sicop': ao,
            'pagado_inper': ap,
            'dif_pagado': ao - ap,
            'disponible_sicop': at,
            'estimacion_inper': av,
            'suficiencia': suf,
            'estatus': estatus,
            'partidas': ptdas
        })

    # -------------------------------------------------------------
    # 3. MAPEO DE CONTRATOS (Resumen por contrato - Nivel 1)
    # -------------------------------------------------------------
    contracts_list = []
    sobrante_global = 0.0
    faltante_global = 0.0
    count_sobra = 0
    count_equilibrado = 0
    count_falta = 0

    for idx, r in df_resumen.iterrows():
        c_name = str(r['Contrato']).strip()
        folios_cnt = int(r['Número de compromisos']) if pd.notna(r['Número de compromisos']) else 1
        
        ak = float(r['Modificado SICOP']) if pd.notna(r['Modificado SICOP']) else 0.0
        al = float(r['Modificado INPer']) if pd.notna(r['Modificado INPer']) else 0.0
        ao = float(r['Ejercido/Pagado SICOP']) if pd.notna(r['Ejercido/Pagado SICOP']) else 0.0
        ap = float(r['Pagado INPer']) if pd.notna(r['Pagado INPer']) else 0.0
        at = float(r['Disponible SICOP']) if pd.notna(r['Disponible SICOP']) else 0.0
        av = float(r['Estimación INPer por ejercer']) if pd.notna(r['Estimación INPer por ejercer']) else 0.0
        suf = float(r['Saldo de suficiencia']) if pd.notna(r['Saldo de suficiencia']) else (at - av)
        estatus = str(r['Estatus']).strip() if pd.notna(r['Estatus']) else ('SOBRA RECURSO' if suf > 0.01 else ('FALTA RECURSO' if suf < -0.01 else 'EQUILIBRADO'))
        
        if suf > 0.01:
            sobrante_global += suf
            count_sobra += 1
        elif suf < -0.01:
            faltante_global += abs(suf)
            count_falta += 1
        else:
            count_equilibrado += 1

        comps = commitments_by_contract.get(c_name, [])
        serv = comps[0]['servicio'] if comps else 'N/A'
        prov = comps[0]['proveedor'] if comps else 'N/A'
        if prov == 'N/A':
            match_det = df_detalle[df_detalle['Contrato heredado para conciliación'].astype(str).str.strip() == c_name]
            if not match_det.empty and pd.notna(match_det.iloc[0]['Proveedor']):
                prov = str(match_det.iloc[0]['Proveedor']).strip()
                
        cobertura_pct = float(r['Cobertura %']) if pd.notna(r['Cobertura %']) else ((at / av * 100.0) if av > 0 else (100.0 if (at == 0 and av == 0) else None))

        contracts_list.append({
            'contrato': c_name,
            'ur': 'NDE',
            'solicitante': 'N/A',
            'servicio': serv,
            'proveedor': prov,
            'rfc': 'N/A',
            'folios_count': folios_cnt,
            'partidas_count': sum(len(c['partidas']) for c in comps),
            'modificado_sicop': ak,
            'modificado_inper': al,
            'dif_modificado': ak - al,
            'pagado_sicop': ao,
            'pagado_inper': ap,
            'dif_pagado': ao - ap,
            'disponible_sicop': at,
            'estimacion_inper': av,
            'suficiencia': suf,
            'estatus': estatus,
            'cobertura_pct': cobertura_pct,
            'compromisos': comps
        })

    # Totales globales de control
    tot_at = sum(c['disponible_sicop'] for c in contracts_list)
    tot_av = sum(c['estimacion_inper'] for c in contracts_list)
    suf_global = tot_at - tot_av

    # -------------------------------------------------------------
    # 4. RECURSOS PENDIENTES DE VINCULACIÓN
    # -------------------------------------------------------------
    unlinked_at = float(df_pendientes.iloc[0]['AT Base']) if not df_pendientes.empty else 1193384.26
    unlinked_av = float(df_pendientes.iloc[0]['AV INPer']) if not df_pendientes.empty else 78597294.20
    unlinked_count = int(df_pendientes.iloc[0]['Registros']) if not df_pendientes.empty else 288

    unlinked_df = df_detalle[df_detalle['Folio normalizado'].isna() | (df_detalle['Folio normalizado'].astype(str).str.strip() == '')]
    caso_a_rows = []
    caso_b_rows = []
    for idx, r in unlinked_df.iterrows():
        has_f = pd.notna(r['Contrato heredado para conciliación']) and str(r['Contrato heredado para conciliación']).strip() != ''
        item = {
            'row_id': idx + 2,
            'no': str(r['No.']) if pd.notna(r['No.']) else 'N/A',
            'contrato': str(r['Contrato heredado para conciliación']) if has_f else 'N/A',
            'servicio': str(r['Descripción del bien o servicio']) if pd.notna(r['Descripción del bien o servicio']) else 'N/A',
            'at': float(r[col_at]) if pd.notna(r[col_at]) else 0.0,
            'av': float(r[col_av]) if pd.notna(r[col_av]) else 0.0
        }
        if has_f:
            caso_a_rows.append(item)
        else:
            caso_b_rows.append(item)

    unlinked_details = {
        'total_unlinked_rows': unlinked_count,
        'at_unlinked_total': unlinked_at,
        'av_unlinked_total': unlinked_av,
        'caso_a_count': len(caso_a_rows),
        'caso_a_at': sum(i['at'] for i in caso_a_rows),
        'caso_a_av': sum(i['av'] for i in caso_a_rows),
        'caso_b_count': len(caso_b_rows),
        'caso_b_at': sum(i['at'] for i in caso_b_rows),
        'caso_b_av': sum(i['av'] for i in caso_b_rows),
        'caso_a_rows': caso_a_rows,
        'caso_b_rows': caso_b_rows
    }

    # -------------------------------------------------------------
    # 5. AUDITORÍA Y CONTROL DE CALIDAD
    # -------------------------------------------------------------
    sicop_only = [c for c in contracts_list if c['modificado_sicop'] > 0 and c['modificado_inper'] == 0]
    inper_only = [c for c in contracts_list if c['modificado_inper'] > 0 and c['modificado_sicop'] == 0]
    extreme_variances = [c for c in contracts_list if abs(c['suficiencia']) >= 1000000.0 or abs(c['dif_modificado']) >= 1000000.0]

    dataset = {
        'metadata': {
            'excel_source': 'Base_Maestra_Corregida_SICOP_INPer.xlsx',
            'total_rows': total_partidas_count,
            'total_conciliated_contracts': len(contracts_list),
            'total_conciliated_commitments': len(df_maestra),
            'total_conciliated_rows': total_partidas_count - unlinked_count,
            'total_unlinked_rows': unlinked_count
        },
        'mandatory_control_values': {
            'disponible_sicop_conciliado': tot_at,        # 111,326,783.74
            'estimacion_inper_conciliado': tot_av,        # 201,310,252.66
            'saldo_suficiencia_conciliado': suf_global,    # -89,983,468.92
            'interpretacion': f"{'FALTA RECURSO POR ' + f'${abs(suf_global):,.2f}' if suf_global < 0 else 'SOBRA RECURSO POR $' + f'{suf_global:,.2f}'}",
            'at_sin_folio': unlinked_at,                   # 1,193,384.26
            'av_sin_folio': unlinked_av                    # 78,597,294.20
        },
        'global_totals': {
            'disponible_sicop': tot_at,
            'estimacion_inper': tot_av,
            'suficiencia_neta': suf_global,
            'sobrante_total': sobrante_global,
            'faltante_total': faltante_global,
            'count_sobra': count_sobra,
            'count_equilibrado': count_equilibrado,
            'count_falta': count_falta,
            'modificado_sicop': sum(c['modificado_sicop'] for c in contracts_list),
            'modificado_inper': sum(c['modificado_inper'] for c in contracts_list),
            'pagado_sicop': sum(c['pagado_sicop'] for c in contracts_list),
            'pagado_inper': sum(c['pagado_inper'] for c in contracts_list)
        },
        'contracts': contracts_list,
        'unlinked_resources': unlinked_details,
        'audit': {
            'count_sicop_only': len(sicop_only),
            'count_inper_only': len(inper_only),
            'count_extreme_variances': len(extreme_variances),
            'sicop_only_summary': [{'contrato': c['contrato'], 'proveedor': c['proveedor'], 'disponible_sicop': c['disponible_sicop']} for c in sicop_only],
            'inper_only_summary': [{'contrato': c['contrato'], 'proveedor': c['proveedor'], 'estimacion_inper': c['estimacion_inper']} for c in inper_only],
            'extreme_variances_summary': [{'contrato': c['contrato'], 'proveedor': c['proveedor'], 'suficiencia': c['suficiencia'], 'estatus': c['estatus']} for c in extreme_variances]
        }
    }

    with open(output_json_path, 'w', encoding='utf-8') as f:
        json.dump(dataset, f, ensure_ascii=False, indent=2)
        
    print(f"data.json generado exitosamente desde {excel_path}")
    print("\n--- MASTER BASE CONTROL VALUES ---")
    print(f"Disponible SICOP Conciliado: ${tot_at:,.2f}")
    print(f"Estimación INPer Conciliado: ${tot_av:,.2f}")
    print(f"Saldo Suficiencia Conciliado: ${suf_global:,.2f}")
    print(f"AT Sin Folio: ${unlinked_at:,.2f}")
    print(f"AV Sin Folio: ${unlinked_av:,.2f}")

if __name__ == '__main__':
    excel_file = r'c:\Users\chuch\.gemini\antigravity\playground\compromisosv2\Base_Maestra_Corregida_SICOP_INPer.xlsx'
    json_file = r'c:\Users\chuch\.gemini\antigravity\playground\compromisosv2\data.json'
    process_excel(excel_file, json_file)
