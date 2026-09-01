# PROMPT — VISUALIZADOR EJECUTIVO DE CONCILIACIÓN SICOP vs. INPer (`compromisosv2`)

Tablero ejecutivo interactivo de conciliación financiera desarrollado para el **Instituto Nacional de Perinatología (INPer)**, operando exclusivamente con la pestaña `Base de datos origen` del archivo de Excel.

---

## 📊 Valores de Control Obligatorios (Universo Conciliado)

- **Disponible SICOP Conciliado (AT)**: **`$388,037,428.57`**
- **Estimación INPer por Ejercer Conciliado (AV)**: **`$201,310,252.66`**
- **Saldo de Suficiencia Conciliado**: **`+$186,727,175.91`**
- **Conclusión Ejecutiva de Suficiencia**: 🟢 **SOBRA RECURSO POR $186,727,175.91**

---

## 📌 Recursos Pendientes de Vinculación (Registros sin Folio de Compromiso G)

Los importes de registros que no cuentan con folio de compromiso (G) no se mezclan con el saldo contractual conciliado. Se presentan en una sección independiente:

- **AT sin folio de compromiso**: **`$1,193,384.26`**
- **AV sin folio de compromiso**: **`$78,597,294.20`**

---

## 🚀 Reglas Funcionales Implementadas

1. **Herencia de Contrato (Regla del Bloque)**:
   - Si una fila tiene folio de compromiso en la columna `G` pero `F` está vacío, hereda automáticamente el contrato `F` del bloque al que pertenece.
2. **Jerarquía Presupuestal Multinivel (Drill-Down 3 Niveles)**:
   - **Nivel 1 (Ejecutivo)**: Resumen consolidado por Número de Contrato.
   - **Nivel 2 (Conciliación)**: Desglose por Compromisos (`Contrato + Folio`).
   - **Nivel 3 (Detalle)**: Desglose de partidas presupuestales de SICOP sin alterar los totales consolidados.
3. **Control de Calidad y Registro de Excepciones**:
   - Pánel de auditoría dedicando secciones a Caso A (Contrato sin compromiso), Caso B (Registro sin contrato ni compromiso) y discrepancias superiores a $1,000,000.

---

## ⚙️ Ejecución Local

1. Generar la base de datos JSON con validación de valores de control:
   ```bash
   python data_processor.py
   ```

2. Iniciar el servidor web local:
   ```bash
   python -m http.server 8080
   ```

3. Abrir en el navegador:
   ```text
   http://localhost:8080
   ```
