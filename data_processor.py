import pandas as pd
import numpy as np
import json
import os

def process_excel(excel_path, output_json_path):
    print(f"Cargando archivo Excel: {excel_path}")
    df = pd.read_excel(excel_path, sheet_name='Base de datos origen')
    
    # Mapeo explícito de columnas
    col_no = df.columns[0]        # A: No.
    col_ur = df.columns[1]        # B: UR
    col_solicitante = df.columns[2] # C: Área solicitante
    col_servicio = df.columns[3] # D: Descripción del bien o servicio
    col_con_contrato = df.columns[4] # E: Con contrato / Sin contrato
    col_contrato = df.columns[5] # F: No. de contrato
    col_folio = df.columns[6]    # G: FOLIO DEL COMPROMISO
    col_anexo = df.columns[7]    # H: Número de anexo
    col_proveedor = df.columns[8] # I: Proveedor
    col_rfc = df.columns[9]      # J: RFC
    col_ptda = df.columns[18]    # S: PTDA
    
    # Componentes de clave presupuestal
    col_f = df.columns[12]   # M: F
    col_fn = df.columns[13]  # N: FN
    col_sf = df.columns[14]  # O: SF
    col_rg = df.columns[15]  # P: RG
    col_ai = df.columns[16]  # Q: AI
    col_pp = df.columns[17]  # R: PP
    
    # Importes financieros
    col_ak = df.columns[36] # AK: Monto modificado SICOP
    col_al = df.columns[37] # AL: Monto modificado INPer
    col_ao = df.columns[40] # AO: Monto pagado SICOP
    col_ap = df.columns[41] # AP: Monto pagado INPer
    col_at = df.columns[45] # AT: Recurso disponible / por ejercer SICOP
    col_av = df.columns[47] # AV: Estimación INPer del monto por ejercer
    col_obs = df.columns[50] # AY: Observaciones

    total_rows = len(df)
    
    # Guardar estado raw para auditoría
    df['row_id'] = range(1, total_rows + 1)
    df['raw_contrato'] = df[col_contrato]
    df['raw_folio'] = df[col_folio]
    
    # Forward-fill de Contrato y Folio para asociar sub-filas de partidas
    df['contrato_clean'] = df[col_contrato].ffill().astype(str).str.strip()
    df['folio_clean'] = df[col_folio].ffill().astype(str).str.strip().str.replace(r'\.0$', '', regex=True)
    
    # Limpieza de textos metadatos
    df['ur_clean'] = df[col_ur].ffill().fillna('N/A').astype(str).str.strip()
    df['servicio_clean'] = df[col_servicio].ffill().fillna('N/A').astype(str).str.strip()
    df['proveedor_clean'] = df[col_proveedor].ffill().fillna('N/A').astype(str).str.strip()
    df['rfc_clean'] = df[col_rfc].ffill().fillna('N/A').astype(str).str.strip()
    df['solicitante_clean'] = df[col_solicitante].ffill().fillna('N/A').astype(str).str.strip()
    
    # Limpieza de importes numéricos
    for c in [col_ak, col_al, col_ao, col_ap, col_at, col_av]:
        df[c] = pd.to_numeric(df[c], errors='coerce').fillna(0.0)

    # -------------------------------------------------------------
    # 1. GENERACIÓN DE PARTIDAS (Nivel 3 - Detalle)
    # -------------------------------------------------------------
    partidas_by_key = {}
    for idx, r in df.iterrows():
        key = (r['contrato_clean'], r['folio_clean'])
        if key not in partidas_by_key:
            partidas_by_key[key] = []
        
        clave_prog = f"{r[col_f]}-{r[col_fn]}-{r[col_sf]}-{r[col_rg]}-{r[col_ai]}-{r[col_pp]}" if pd.notna(r[col_f]) else "N/A"
        
        partidas_by_key[key].append({
            'row_id': int(r['row_id']),
            'no': str(r[col_no]) if pd.notna(r[col_no]) else 'N/A',
            'ptda': str(r[col_ptda]) if pd.notna(r[col_ptda]) else 'N/A',
            'clave_programatica': clave_prog,
            'bien_servicio': str(r[col_servicio]) if pd.notna(r[col_servicio]) else 'N/A',
            'modificado_sicop': float(r[col_ak]),
            'modificado_inper': float(r[col_al]),
            'pagado_sicop': float(r[col_ao]),
            'pagado_inper': float(r[col_ap]),
            'disponible_sicop': float(r[col_at]),
            'estimacion_inper': float(r[col_av]),
            'observaciones': str(r[col_obs]) if pd.notna(r[col_obs]) else ''
        })

    # -------------------------------------------------------------
    # 2. AGREGACIÓN DE COMPROMISOS (Nivel 2 - Conciliación)
    # -------------------------------------------------------------
    commitment_grp = df.groupby(['contrato_clean', 'folio_clean'], as_index=False).agg(
        ur=('ur_clean', 'first'),
        solicitante=('solicitante_clean', 'first'),
        servicio=('servicio_clean', 'first'),
        proveedor=('proveedor_clean', 'first'),
        rfc=('rfc_clean', 'first'),
        partidas_count=('row_id', 'count'),
        modificado_sicop=(col_ak, 'sum'),
        modificado_inper=(col_al, 'sum'),
        pagado_sicop=(col_ao, 'sum'),
        pagado_inper=(col_ap, 'sum'),
        disponible_sicop=(col_at, 'sum'),
        estimacion_inper=(col_av, 'sum')
    )

    commitments_by_contract = {}
    for idx, r in commitment_grp.iterrows():
        c_name = r['contrato_clean']
        f_name = r['folio_clean']
        if c_name not in commitments_by_contract:
            commitments_by_contract[c_name] = []
        
        ak = float(r['modificado_sicop'])
        al = float(r['modificado_inper'])
        ao = float(r['pagado_sicop'])
        ap = float(r['pagado_inper'])
        at = float(r['disponible_sicop'])
        av = float(r['estimacion_inper'])
        
        dif_mod = ak - al
        dif_pag = ao - ap
        suf = at - av
        
        TOL = 0.01
        estatus = "SOBRA RECURSO" if suf > TOL else ("FALTA RECURSO" if suf < -TOL else "EQUILIBRADO")
        
        commitments_by_contract[c_name].append({
            'folio': f_name,
            'ur': str(r['ur']),
            'solicitante': str(r['solicitante']),
            'servicio': str(r['servicio']),
            'proveedor': str(r['proveedor']),
            'rfc': str(r['rfc']),
            'partidas_count': int(r['partidas_count']),
            'modificado_sicop': ak,
            'modificado_inper': al,
            'dif_modificado': dif_mod,
            'pagado_sicop': ao,
            'pagado_inper': ap,
            'dif_pagado': dif_pag,
            'disponible_sicop': at,
            'estimacion_inper': av,
            'suficiencia': suf,
            'estatus': estatus,
            'partidas': partidas_by_key.get((c_name, f_name), [])
        })

    # -------------------------------------------------------------
    # 3. AGREGACIÓN DE CONTRATOS (Nivel 1 - Ejecutivo)
    # -------------------------------------------------------------
    contract_grp = commitment_grp.groupby('contrato_clean', as_index=False).agg(
        ur=('ur', 'first'),
        solicitante=('solicitante', 'first'),
        servicio=('servicio', 'first'),
        proveedor=('proveedor', 'first'),
        rfc=('rfc', 'first'),
        folios_count=('folio_clean', 'count'),
        partidas_count=('partidas_count', 'sum'),
        modificado_sicop=('modificado_sicop', 'sum'),
        modificado_inper=('modificado_inper', 'sum'),
        pagado_sicop=('pagado_sicop', 'sum'),
        pagado_inper=('pagado_inper', 'sum'),
        disponible_sicop=('disponible_sicop', 'sum'),
        estimacion_inper=('estimacion_inper', 'sum')
    )

    contracts_list = []
    TOL = 0.01
    sobrante_global = 0.0
    faltante_global = 0.0
    count_sobra = 0
    count_equilibrado = 0
    count_falta = 0

    for idx, r in contract_grp.iterrows():
        c_name = r['contrato_clean']
        ak = float(r['modificado_sicop'])
        al = float(r['modificado_inper'])
        ao = float(r['pagado_sicop'])
        ap = float(r['pagado_inper'])
        at = float(r['disponible_sicop'])
        av = float(r['estimacion_inper'])
        
        dif_mod = ak - al
        dif_pag = ao - ap
        suf = at - av
        
        if suf > TOL:
            estatus = "SOBRA RECURSO"
            sobrante_global += suf
            count_sobra += 1
        elif suf < -TOL:
            estatus = "FALTA RECURSO"
            faltante_global += abs(suf)
            count_falta += 1
        else:
            estatus = "EQUILIBRADO"
            count_equilibrado += 1
            
        cobertura_pct = (at / av * 100.0) if av > 0 else (100.0 if (at == 0 and av == 0) else None)
        
        contracts_list.append({
            'contrato': c_name,
            'ur': str(r['ur']),
            'solicitante': str(r['solicitante']),
            'servicio': str(r['servicio']),
            'proveedor': str(r['proveedor']),
            'rfc': str(r['rfc']),
            'folios_count': int(r['folios_count']),
            'partidas_count': int(r['partidas_count']),
            'modificado_sicop': ak,
            'modificado_inper': al,
            'dif_modificado': dif_mod,
            'pagado_sicop': ao,
            'pagado_inper': ap,
            'dif_pagado': dif_pag,
            'disponible_sicop': at,
            'estimacion_inper': av,
            'suficiencia': suf,
            'estatus': estatus,
            'cobertura_pct': cobertura_pct,
            'compromisos': commitments_by_contract.get(c_name, [])
        })

    # -------------------------------------------------------------
    # 4. AUDITORÍA Y CONTROL DE CALIDAD
    # -------------------------------------------------------------
    audit_raw_missing_contrato = df[df['raw_contrato'].isna()][['row_id', 'folio_clean', col_ptda, col_ak]].to_dict(orient='records')
    audit_raw_missing_folio = df[df['raw_folio'].isna()][['row_id', 'contrato_clean', col_ptda, col_ak]].to_dict(orient='records')
    audit_sin_contrato = contract_grp[contract_grp['contrato_clean'].str.upper() == 'SIN CONTRATO'].to_dict(orient='records')
    
    # Compromisos en SICOP sin INPer
    sicop_only = commitment_grp[(commitment_grp['modificado_sicop'] > 0) & (commitment_grp['modificado_inper'] == 0) & (commitment_grp['estimacion_inper'] == 0)].to_dict(orient='records')
    # Compromisos en INPer sin SICOP
    inper_only = commitment_grp[(commitment_grp['modificado_inper'] > 0) & (commitment_grp['modificado_sicop'] == 0)].to_dict(orient='records')
    # Contratos con múltiples folios
    multi_folio_contracts = contract_grp[contract_grp['folios_count'] > 1].to_dict(orient='records')
    # Folios con múltiples partidas
    multi_partida_folios = commitment_grp[commitment_grp['partidas_count'] > 1].to_dict(orient='records')
    # Variaciones extremas (> $1,000,000)
    extreme_variances = [c for c in contracts_list if abs(c['suficiencia']) >= 1000000.0 or abs(c['dif_modificado']) >= 1000000.0]

    # Totales globales
    tot_ak = sum(c['modificado_sicop'] for c in contracts_list)
    tot_al = sum(c['modificado_inper'] for c in contracts_list)
    tot_ao = sum(c['pagado_sicop'] for c in contracts_list)
    tot_ap = sum(c['pagado_inper'] for c in contracts_list)
    tot_at = sum(c['disponible_sicop'] for c in contracts_list)
    tot_av = sum(c['estimacion_inper'] for c in contracts_list)
    suficiencia_neta = tot_at - tot_av

    dataset = {
        'metadata': {
            'total_rows': total_rows,
            'total_contracts': len(contracts_list),
            'total_commitments': len(commitment_grp),
            'total_partidas': total_rows
        },
        'global_totals': {
            'modificado_sicop': tot_ak,
            'modificado_inper': tot_al,
            'dif_modificado': tot_ak - tot_al,
            'pagado_sicop': tot_ao,
            'pagado_inper': tot_ap,
            'dif_pagado': tot_ao - tot_ap,
            'disponible_sicop': tot_at,
            'estimacion_inper': tot_av,
            'suficiencia_neta': suficiencia_neta,
            'sobrante_total': sobrante_global,
            'faltante_total': faltante_global,
            'count_sobra': count_sobra,
            'count_equilibrado': count_equilibrado,
            'count_falta': count_falta
        },
        'contracts': contracts_list,
        'audit': {
            'count_raw_missing_contrato': len(audit_raw_missing_contrato),
            'count_raw_missing_folio': len(audit_raw_missing_folio),
            'count_sin_contrato': len(audit_sin_contrato),
            'count_sicop_only': len(sicop_only),
            'count_inper_only': len(inper_only),
            'count_multi_folio_contracts': len(multi_folio_contracts),
            'count_multi_partida_folios': len(multi_partida_folios),
            'count_extreme_variances': len(extreme_variances),
            'sicop_only_summary': [{'contrato': str(r['contrato_clean']), 'folio': str(r['folio_clean']), 'disponible_sicop': float(r['disponible_sicop'])} for r in sicop_only],
            'inper_only_summary': [{'contrato': str(r['contrato_clean']), 'folio': str(r['folio_clean']), 'estimacion_inper': float(r['estimacion_inper'])} for r in inper_only],
            'extreme_variances_summary': [{'contrato': c['contrato'], 'proveedor': c['proveedor'], 'suficiencia': c['suficiencia'], 'estatus': c['estatus']} for c in extreme_variances]
        }
    }

    with open(output_json_path, 'w', encoding='utf-8') as f:
        json.dump(dataset, f, ensure_ascii=False, indent=2)
        
    print(f"data.json generado exitosamente en {output_json_path}")
    print(f"Contratos procesados: {len(contracts_list)}")
    print(f"Compromisos procesados: {len(commitment_grp)}")

if __name__ == '__main__':
    excel_file = r'c:\Users\chuch\.gemini\antigravity\playground\compromisosv2\Pruebareporteejecutivo_validado_PCOM_CORREGIDO_DESGLOSE (2).xlsx'
    json_file = r'c:\Users\chuch\.gemini\antigravity\playground\compromisosv2\data.json'
    process_excel(excel_file, json_file)
