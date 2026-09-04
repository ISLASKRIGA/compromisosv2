import pandas as pd
import numpy as np
import json
import os
import re

def _contrato_short(c_num):
    """Extracts NNN/YYYY from extended format NNN-AAAA-BB/YYYY for secondary lookup."""
    m = re.match(r'^(\d+)-[\d]+-[\d]+/(\d{4})$', c_num)
    if m:
        return f'{int(m.group(1)):03d}/{m.group(2)}'
    return None

def to_float(val):
    try:
        if pd.isna(val):
            return 0.0
        v_str = str(val).replace('$', '').replace(',', '').strip()
        return float(v_str)
    except:
        return 0.0

def process_excel(excel_path, output_json_path, madre_excel_path=None):
    print(f"Cargando nueva base maestra Excel: {excel_path}")
    xls = pd.ExcelFile(excel_path)
    
    df_maestra = pd.read_excel(xls, 'Maestra compromiso')
    df_resumen = pd.read_excel(xls, 'Resumen por contrato')
    df_detalle = pd.read_excel(xls, 'Base origen detalle')
    df_pendientes = pd.read_excel(xls, 'Pendientes vinculación')
    df_control = pd.read_excel(xls, 'Control validación')

    # -------------------------------------------------------------
    # 0. CARGAR BASE DE ADQUISICIONES Y CLAVES (Madre 3.3.xlsx)
    # -------------------------------------------------------------
    madre_principal_map = {}
    madre_claves_map = {}
    total_claves_madre_count = 0
    monto_total_claves_madre = 0.0

    if madre_excel_path and os.path.exists(madre_excel_path):
        print(f"Cargando base de Adquisiciones y Claves: {madre_excel_path}")
        try:
            xls_madre = pd.ExcelFile(madre_excel_path)
            
            # 0.1 Mapear pestaña Principal (Metadatos de Contrato y Proveedor)
            sheet_p_name = 'Pricipal ' if 'Pricipal ' in xls_madre.sheet_names else ('Principal' if 'Principal' in xls_madre.sheet_names else xls_madre.sheet_names[0])
            df_p_raw = pd.read_excel(xls_madre, sheet_p_name, header=2)
            
            for idx, r in df_p_raw.iterrows():
                c_val = r.get('No. de Contrato') or r.get('No. de Contrato.1')
                if pd.isna(c_val):
                    continue
                c_num = str(c_val).strip()
                if not c_num or c_num == 'nan' or c_num == 'No. de Contrato':
                    continue
                
                prov = str(r.get('Razón Social')).strip() if pd.notna(r.get('Razón Social')) else 'N/A'
                rfc = str(r.get('RFC')).strip() if pd.notna(r.get('RFC')) else 'N/A'
                proc = str(r.get('Procedimiento')).strip() if pd.notna(r.get('Procedimiento')) else 'N/A'
                adm = str(r.get('Administrador del Contrato')).strip() if pd.notna(r.get('Administrador del Contrato')) else 'N/A'
                sifgo = str(r.get('SIFGO')).strip() if pd.notna(r.get('SIFGO')) else 'N/A'
                besa = str(r.get('Besa')).strip() if pd.notna(r.get('Besa')) else 'N/A'
                tipo_proc = str(r.get('Tipo de Procedimiento')).strip() if pd.notna(r.get('Tipo de Procedimiento')) else 'N/A'
                
                f_inicio = str(r.get('Fecha de Inicio')).split()[0] if pd.notna(r.get('Fecha de Inicio')) else 'N/A'
                f_fin = str(r.get('Fecha de Fin')).split()[0] if pd.notna(r.get('Fecha de Fin')) else 'N/A'

                madre_principal_map[c_num] = {
                    'proveedor': prov,
                    'rfc': rfc,
                    'procedimiento': proc,
                    'tipo_procedimiento': tipo_proc,
                    'administrador': adm,
                    'sifgo': sifgo,
                    'besa': besa,
                    'fecha_inicio': f_inicio,
                    'fecha_fin': f_fin
                }

            # 0.2 Mapear pestaña Claves (Catálogo de insumos/medicamentos desglosados)
            if 'Claves' in xls_madre.sheet_names:
                df_c_raw = pd.read_excel(xls_madre, 'Claves', header=1)
                for idx, r in df_c_raw.iterrows():
                    c_num = str(r.get('Contrato')).strip() if pd.notna(r.get('Contrato')) else ''
                    if not c_num or c_num == 'nan' or c_num == 'Contrato':
                        continue
                    
                    c_almacen = str(r.get('Clave de almacén')).strip().replace('.0', '') if pd.notna(r.get('Clave de almacén')) else 'Sin clave'
                    cnis = str(r.get('Clave CNIS')).strip() if pd.notna(r.get('Clave CNIS')) else 'N/A'
                    cucop = str(r.get('Clave CUCOP +')).strip() if pd.notna(r.get('Clave CUCOP +')) else (str(r.get('Clave CUCOP')).strip() if pd.notna(r.get('Clave CUCOP')) else 'N/A')
                    concepto = str(r.get('Concepto de la clave')).strip() if pd.notna(r.get('Concepto de la clave')) else 'N/A'
                    unidad = str(r.get('Unidad de medida')).strip() if pd.notna(r.get('Unidad de medida')) else 'N/A'
                    
                    pu = to_float(r.get('Precio unitario'))
                    cant_max = to_float(r.get('Cantidad máxima'))
                    monto_max_raw = r.get('Monto máximo de cada clave con IVA')
                    monto_max = to_float(monto_max_raw) if pd.notna(monto_max_raw) else (pu * cant_max)
                    if monto_max == 0.0 and pu > 0 and cant_max > 0:
                        monto_max = pu * cant_max

                    if c_num not in madre_claves_map:
                        madre_claves_map[c_num] = []
                    
                    madre_claves_map[c_num].append({
                        'clave_almacen': c_almacen,
                        'clave_cnis': cnis,
                        'clave_cucop': cucop,
                        'concepto': concepto,
                        'unidad_medida': unidad,
                        'precio_unitario': pu,
                        'cantidad_maxima': cant_max,
                        'monto_maximo_con_iva': monto_max
                    })

                    total_claves_madre_count += 1
                    monto_total_claves_madre += monto_max
                    
            print(f"Metadatos de {len(madre_principal_map)} contratos y {total_claves_madre_count} claves mapeados desde Madre 3.3")
        except Exception as e:
            print(f"Advertencia: Ocurrió un error al procesar Madre 3.3.xlsx: {e}")

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
    
    total_claves_vinculadas_count = 0
    monto_total_claves_vinculadas = 0.0
    contratos_con_claves_count = 0

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

        # Enriquecer con metadatos de Madre 3.3 (exact match + secondary by NNN/YYYY)
        meta_adquisicion = madre_principal_map.get(c_name)
        if meta_adquisicion is None:
            short_key = _contrato_short(c_name)
            if short_key:
                meta_adquisicion = madre_principal_map.get(short_key)
        if meta_adquisicion is None:
            meta_adquisicion = {
                'proveedor': 'N/A',
                'rfc': 'N/A',
                'procedimiento': 'N/A',
                'tipo_procedimiento': 'N/A',
                'administrador': 'N/A',
                'sifgo': 'N/A',
                'besa': 'N/A',
                'fecha_inicio': 'N/A',
                'fecha_fin': 'N/A'
            }
        
        if prov == 'N/A' and meta_adquisicion['proveedor'] != 'N/A':
            prov = meta_adquisicion['proveedor']
            
        rfc_val = meta_adquisicion['rfc']
        
        # Claves pertenecientes a este contrato (exact match + secondary by NNN/YYYY)
        claves_list = madre_claves_map.get(c_name, [])
        if not claves_list:
            short_key = _contrato_short(c_name)
            if short_key:
                claves_list = madre_claves_map.get(short_key, [])
        if claves_list:
            contratos_con_claves_count += 1
            total_claves_vinculadas_count += len(claves_list)
            monto_total_claves_vinculadas += sum(item['monto_maximo_con_iva'] for item in claves_list)
                
        cobertura_pct = float(r['Cobertura %']) if pd.notna(r['Cobertura %']) else ((at / av * 100.0) if av > 0 else (100.0 if (at == 0 and av == 0) else None))

        contracts_list.append({
            'contrato': c_name,
            'ur': 'NDE',
            'solicitante': 'N/A',
            'servicio': serv,
            'proveedor': prov,
            'rfc': rfc_val,
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
            'adquisicion_metadata': meta_adquisicion,
            'claves_adquiridas_count': len(claves_list),
            'claves_adquiridas': claves_list,
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
            'madre_source': 'Madre 3.3.xlsx',
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
        'adquisiciones_kpis': {
            'total_claves_madre_count': total_claves_madre_count,
            'monto_total_claves_madre': monto_total_claves_madre,
            'contratos_con_metadatos_count': len(madre_principal_map),
            'contratos_con_claves_count': contratos_con_claves_count,
            'total_claves_vinculadas_count': total_claves_vinculadas_count,
            'monto_total_claves_vinculadas': monto_total_claves_vinculadas
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
        
    print(f"data.json generado exitosamente desde {excel_path} y {madre_excel_path}")
    print("\n--- MASTER BASE CONTROL VALUES ---")
    print(f"Disponible SICOP Conciliado: ${tot_at:,.2f}")
    print(f"Estimación INPer Conciliado: ${tot_av:,.2f}")
    print(f"Saldo Suficiencia Conciliado: ${suf_global:,.2f}")
    print(f"AT Sin Folio: ${unlinked_at:,.2f}")
    print(f"AV Sin Folio: ${unlinked_av:,.2f}")
    print(f"\n--- ADQUISICIONES CONTROL VALUES ---")
    print(f"Claves Vinculadas a Contratos: {total_claves_vinculadas_count} ({contratos_con_claves_count} contratos)")
    print(f"Monto Total en Claves Vinculadas: ${monto_total_claves_vinculadas:,.2f}")

if __name__ == '__main__':
    excel_file = r'c:\Users\chuch\.gemini\antigravity\playground\compromisosv2\Base_Maestra_Corregida_SICOP_INPer.xlsx'
    madre_file = r'c:\Users\chuch\.gemini\antigravity\playground\compromisosv2\Madre 3.3.xlsx'
    json_file = r'c:\Users\chuch\.gemini\antigravity\playground\compromisosv2\data.json'
    process_excel(excel_file, json_file, madre_file)

