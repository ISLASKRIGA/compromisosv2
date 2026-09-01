# Base Maestra Corregida — Visualizador Ejecutivo de Conciliación SICOP vs. INPer (`compromisosv2`)

Tablero ejecutivo interactivo de conciliación financiera desarrollado para el **Instituto Nacional de Perinatología (INPer)**, operando con la nueva base maestra oficial **`Base_Maestra_Corregida_SICOP_INPer.xlsx`**.

---

## 📊 Valores de Control Oficiales (Base Maestra - Universo Conciliado)

- **Disponible SICOP Real (AT Conciliado)**: **`$111,326,783.74`**
- **Estimación INPer por Ejercer (AV Conciliado)**: **`$201,310,252.66`**
- **Saldo Real de Suficiencia Conciliado**: **`-$89,983,468.92`**
- **Conclusión Ejecutiva Oficial**: 🔴 **FALTA RECURSO POR $89,983,468.92**

---

## 📌 Recursos Pendientes de Vinculación (Registros sin Folio de Compromiso G)

- **AT sin folio de compromiso**: **`$1,193,384.26`**
- **AV sin folio de compromiso**: **`$78,597,294.20`**
- **Registros sin folio**: **288**

---

## 🚀 Estructura de Pestañas Procesadas de la Base Maestra

1. **`Resumen por contrato`**: 387 contratos procesados y consolidados.
2. **`Maestra compromiso`**: 410 compromisos individuales vinculados.
3. **`Base origen detalle`**: 1,628 partidas desglosadas con detalle de clave programática (`F-FN-SF-RG-AI-PP-PTDA`).
4. **`Pendientes vinculación`**: 288 registros huérfanos presentados en un pánel independiente.
5. **`Control validación`**: Indicadores de control de validación institucional.

---

## ⚙️ Ejecución Local

1. Regenerar la base de datos JSON desde la base maestra:
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
