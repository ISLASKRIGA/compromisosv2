# compromisosv2 — Visualizador Ejecutivo de Conciliación Financiera SICOP vs. INPer

Tablero ejecutivo interactivo de conciliación financiera desarrollado para el **Instituto Nacional de Perinatología (INPer)**. El sistema contrasta y concilia los importes fidedignos de **SICOP** contra las capturas manuales de **INPer**, operando exclusivamente con la pestaña `Base de datos origen`.

---

## 📊 Hallazgos Financieros Principales

- **Recurso Disponible SICOP (AT)**: `$389,230,812.83`
- **Estimación INPer por Ejercer (AV)**: `$279,907,546.86`
- **Suficiencia Neta Global (Disponible − Estimación)**: **`+$109,323,265.97`** (🟢 **SOBRA RECURSO**)

### Clasificación Ejecutiva por Contrato (624 Contratos Analizados)
- 🟢 **SOBRA RECURSO** (131 contratos): Excedente bruto acumulado de **`$231,851,249.29`**
- 🟡 **EQUILIBRADO** (247 contratos): Balance ajustado a **`$0.00`** (Disponible = Estimación)
- 🔴 **FALTA RECURSO** (246 contratos): Insuficiencia bruta acumulada de **`-$122,527,983.32`**

---

## 🚀 Características del Visualizador

1. **Jerarquía Presupuestal Multinivel (Drill-Down 3 Niveles)**:
   - **Nivel 1 (Ejecutivo)**: Consolidado por Número de Contrato.
   - **Nivel 2 (Conciliación)**: Desglose por Compromisos (`Contrato + Folio`).
   - **Nivel 3 (Detalle)**: Desglose informativo de partidas presupuestales de SICOP (UR, PTDA, Clave Programática `F-FN-SF-RG-AI-PP`, bien/servicio).
2. **Conclusión Ejecutiva Automatizada**:
   - Diagnóstico dinámico en lenguaje financiero que responde si el disponible en SICOP alcanza para cubrir lo que falta por ejercer en INPer.
3. **Pánel de Auditoría y Control de Calidad**:
   - Módulo de *"Registros que requieren revisión"* identificando compromisos solo en SICOP, compromisos solo en INPer y variaciones extremas mayores a $1,000,000.
4. **Filtros e Interactividad en Tiempo Real**:
   - Búsqueda por texto (Contrato, Proveedor, Servicio, UR, Folio).
   - Filtrado por Estatus (`Sobra Recurso`, `Equilibrado`, `Falta Recurso`).
   - Ajuste dinámico de tolerancia ($\pm \$0.01$).
   - Exportación de la tabla vista a archivo **CSV**.

---

## 📂 Estructura del Proyecto

```text
compromisosv2/
├── data_processor.py      # Script de extracción, forward-fill y agregación jerárquica
├── data.json              # Base de datos procesada y estructurada
├── index.html             # Interfaz web del tablero ejecutivo
├── styles.css             # Estilos Vanilla CSS con estética dark executive
├── app.js                 # Lógica interactiva, gráficas Chart.js y tabla multinivel
└── Pruebareporteejecutivo_validado_PCOM_CORREGIDO_DESGLOSE (2).xlsx # Fuente original
```

---

## ⚙️ Ejecución Local

1. Re-procesar los datos desde el archivo Excel (opcional):
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
