# Documentación Técnica del Frontend — AXIÓN - IOT

**Prototipo:** `v1.1`  
**Stack:** HTML5 Semántico / CSS3 (Variables Globales) / JavaScript Modular (ES6+)  
**Almacenamiento Local:** `localStorage` administrado por `js/axion-cache.js`

---

## 1. Resumen General del Prototipo

El frontend de **AXIÓN - IOT** es una interfaz web industrial minimalista ("Flat Sectioned Layout") diseñada para el monitoreo y configuración de un sistema hidropónico basado en un nodo maestro `ESP32-S3-WROOM-1` (`ESP32_HIDRO_01`).

### Arquitectura de Capas
- **Capa de Presentación (HTML5 + CSS3):** Vistas estructuradas con HTML5 semántico y hojas de estilo modulares basadas en variables CSS globales para tipografía escalable (`--fs-*`), paleta cromática industrial y estados semáforo (**Verde = Normal/Óptimo**, **Naranja = Advertencia**, **Rojo = Crítico/Pausado**).
- **Capa de Persistencia Local (`v1.1/js/axion-cache.js`):** Expone el módulo global `AxionCache` sobre `localStorage` (bajo claves con prefijo `axion_proto_` y `axion_reles_estado`). Centraliza la lectura y escritura de:
  - Umbrales y parámetros técnicos de cada sensor.
  - Estado de los 6 canales de relés.
  - Centro de alertas del header global.
  - Bitácora de auditoría de configuración.
  - Preferencias globales (escala tipográfica).
- **Capa de Reactividad del Dashboard (`v1.1/js/dashboard.js`):** Carga los valores iniciales desde `AxionCache` y escucha el evento personalizado `dashboard:actualizarLecturas` (`document.addEventListener("dashboard:actualizarLecturas", ...)`) para actualizar las tarjetas de sensores, evaluar los umbrales configurados y aplicar las clases semáforo correspondientes en tiempo real.

---

## 2. Mapa de Vistas y Navegación

Todas las vistas comparten un header global con navegación rápida, indicador de estado del sistema y centro de alertas interactivo.

### 2.1 Dashboard Principal (`v1.1/index.html`)
- **Cuadrícula de 6 Tarjetas Clicables:** Cada tarjeta muestra la lectura actual, estado semáforo y redirige a su vista de configuración al hacer clic:
  1. **Conductividad EC / TDS:** Lectura en `µS/cm` y `ppm`.
  2. **pH RS485:** Nivel de acidez/alcalinidad (`pH`).
  3. **Nivel de Agua (LMP633):** Nivel del tanque en la unidad seleccionada (`%`, `cm`, `L`, `kPa`, `MPa`, `mH2O`, `m`).
  4. **Temperatura del Agua (PT100):** Temperatura de la solución nutritiva en `°C`.
  5. **Microclima Ambiental (DHT22):** Temperatura del aire (`°C`) y humedad relativa (`% HR`).
  6. **Nodo Maestro ESP32-S3:** Estado de conectividad Wi-Fi (`RSSI` en `dBm`), firmware y acceso al panel del controlador.
- **Panel de Actuadores / Relés:** Control directo de encendido/apagado para los 6 canales de relés (electrobombas, reflector y canales de reserva).
- **Centro de Alertas (Header):** Desplegable con el listado de alertas recientes, contador de no leídas y acción para marcarlas como leídas.

### 2.2 Módulos de Configuración de Sensores
Cada sensor cuenta con su propia vista de configuración y script dedicado que sincroniza sus campos con `AxionCache`:
- **Microclima Ambiental — DHT22 (`v1.1/views/sensores/temperatura_humedad/temperatura_humedad.html`, `js/temperatura_humedad.js`):**
  - Estado operativo (`Activo` / `Pausado`), intervalo de lectura (`seg`), umbrales mínimo y máximo de temperatura ambiental (`°C`) y humedad relativa (`% HR`).
- **Temperatura de Solución — PT100 (`v1.1/views/sensores/temperatura/temperatura.html`, `js/temperatura.js`):**
  - Estado operativo, frecuencia de muestreo, umbrales mínimo y máximo (`°C`), configuración de conexión RTD MAX31865 (`3_WIRES`, `2_WIRES`, `4_WIRES`) y resistencia de referencia `Rref` (`430 Ω`).
- **Sensor de pH RS485 Modbus (`v1.1/views/sensores/ph/index.html`, `js/ph.js`):**
  - Estado operativo, frecuencia de muestreo, umbrales mínimo y máximo (`pH`), parámetros de comunicación Modbus RTU (`Baudios`: `9600`, `19200`, `115200`; `Slave ID`: `1–247`) y calibración de 3 puntos (`pH 4.00`, `pH 6.86`, `pH 9.18`).
- **Conductividad / TDS (`v1.1/views/sensores/conductividad/index.html`):**
  - Estado operativo, frecuencia de muestreo, umbrales en `µS/cm`, factor de conversión `k` (TDS), compensación térmica (`°C`) y atenuación ADC del ESP32-S3 (`11dB`, `6dB`, `2.5dB`, `0dB`).
- **Nivel de Agua — LMP633 (`v1.1/views/sensores/nivel-agua/nivel-agua.html`, `js/nivel-agua.js`):**
  - Estado operativo, frecuencia de muestreo, unidad principal de visualización, altura del tanque, umbrales mínimo/máximo, referencia de hardware `Shunt de 100 Ω (0.4 – 2.0 V) protegido para ADC` y `Offset de calibración (cm)` (`#offset_cm`).

### 2.3 Nodo Maestro ESP32-S3 (`v1.1/views/nodo-maestro/index.html`, `js/nodo_maestro.js`)
- Muestra información de red, identificador del dispositivo (`ESP32_HIDRO_01`), versión de firmware, intensidad de señal (`RSSI`) y parámetros generales del controlador.

### 2.4 Reportes, Respaldos y Bitácora (`v1.1/views/reportes/reportes.html`, `js/reportes.js`)
- Visualización y exportación de históricos (`CSV`, `XLSX`, `JSON`), gestión de respaldos de configuración, políticas de retención de datos y tabla de **Bitácora de Auditoría de Configuración** filtrable por módulo.

### 2.5 Seguridad y Configuración Global (`v1.1/views/configuracion/configuracion.html`, `js/configuracion.js`, `v1.1/views/login/`)
- Inicio de sesión y recuperación de acceso sin placeholders sugestivos.
- Ajuste global de escala tipográfica (`--fs-base` en `px`) persistido en caché y aplicado dinámicamente a todas las vistas.

---

## 3. Guía de Componentes UI y Tipos de Datos que Manejan

La interfaz utiliza controles personalizados para garantizar entradas limpias y tipadas en JavaScript:

| Componente UI | Funcionamiento Visual | Tipo de Dato en JS | Ejemplos |
| :--- | :--- | :--- | :--- |
| **Controles Stepper (`-` / `+`)** | Botones de incremento/decremento junto a un valor numérico (umbrales, offsets, escala de fuente). | `Number` (`Float` o `Integer`), sin unidades en el valor. | `24`, `0.0`, `6.50`, `430.0` |
| **Interruptores / Badges de Estado** | Botones tipo píldora (`Activo` / `Pausado`, `Encendido` / `Apagado`) con color semáforo. | `Boolean` (`true` = Activo/Encendido, `false` = Pausado/Apagado). | `true`, `false` |
| **Selectores Técnicos** | Listas desplegables `<select>` para parámetros de hardware y unidades. | `Number` (baudios) o `String` (códigos normalizados). | `9600`, `"11dB"`, `"3_WIRES"`, `"pct"` |

---

## 4. Estructura Exacta de los Objetos JSON en el Frontend

### 4.1 Objeto de Telemetría (`axion:telemetria` / `dashboard:actualizarLecturas`)
Estructura de trama que consume `dashboard.js` para actualizar las tarjetas y evaluar la semaforización:

```json
{
  "ts": "2026-11-16T14:30:00Z",
  "dispositivo_id": "ESP32_HIDRO_01",
  "fw": "1.0.3",
  "datos": {
    "temperatura_amb": 24.5,
    "humedad_amb": 65.2,
    "temperatura_solucion": 21.8,
    "nivel_ph": 6.25,
    "tds_ppm": 550.0,
    "nivel_tanque_cm": 125.5
  },
  "estado": {
    "dht22": "ok",
    "pt100": "ok",
    "ph": "ok",
    "tds": "ok",
    "nivel": "ok"
  },
  "rssi": -61
}
```

### 4.2 Objeto Maestro de Configuración en Caché (`AxionCache`) y Bitácora
Estructura almacenada en `localStorage` por `axion-cache.js` para la configuración de sensores, relés y registros de auditoría:

```json
{
  "dispositivo_id": "ESP32_HIDRO_01",
  "ec_tds": {
    "activo": true,
    "frecuencia_seg": 10,
    "min_us_cm": 800,
    "max_us_cm": 1800,
    "factor_k": 0.5,
    "temp_compensacion_c": 25.0,
    "atenuacion_adc": "11dB"
  },
  "ph": {
    "activo": true,
    "frecuencia_seg": 10,
    "min": 5.5,
    "max": 6.5,
    "baud_rate": 9600,
    "slave_id": 1,
    "calibracion": {
      "p4": 4.0,
      "p7": 6.86,
      "p9": 9.18
    }
  },
  "nivel_agua": {
    "activo": true,
    "frecuencia_seg": 15,
    "unidad": "cm",
    "shunt_ohm": 100,
    "offset_cm": 0.0,
    "min": 30.0,
    "max": 180.0
  },
  "temperatura_agua": {
    "activo": true,
    "frecuencia_seg": 10,
    "min_c": 18.0,
    "max_c": 24.0,
    "conexion": "3_WIRES",
    "rref_ohm": 430.0
  },
  "ambiente_dht22": {
    "activo": true,
    "frecuencia_seg": 10,
    "temp_min_c": 18.0,
    "temp_max_c": 28.0,
    "hum_min_pct": 50.0,
    "hum_max_pct": 75.0
  },
  "reles": [
    { "canal": 1, "nombre": "Bomba Principal", "encendido": true }
  ],
  "bitacora_auditoria": [
    {
      "ts": "2026-11-16T14:30:00Z",
      "modulo": "Nivel de Agua",
      "parametro": "offset_cm",
      "valor_anterior": 0.0,
      "valor_nuevo": 1.5
    }
  ]
}
```
