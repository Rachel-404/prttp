# Documentación Técnica del Frontend — AXIÓN - IOT

**Prototipo:** `v1.1`  
**Stack:** HTML5 Semántico / CSS3 (Variables Globales) / JavaScript Modular (ES6+)  
**Almacenamiento Local:** `localStorage` administrado por `js/axion-cache.js`

---

## 1. Resumen General del Prototipo

El frontend de **AXIÓN - IOT** es una interfaz web industrial minimalista ("Flat Sectioned Layout") diseñada para el monitoreo y configuración de un sistema hidropónico basado en un nodo maestro `ESP32-S3-WROOM-1` (`ESP32_HIDRO_01`). Incorpora un modelo de acceso donde el **Administrador** posee credenciales exclusivas para parametrización técnica y control del hardware, mientras que los roles de **Investigación / Observación** disponen de acceso libre sin credenciales para visualización del dashboard y exportación de reportes.

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
  - Estado operativo (`Activo` / `Pausado`), intervalo de lectura (`seg`, mínimo técnico recomendado de **2 segundos / 0.5 Hz** según datasheet Aosong AM2302 para evitar autocalentamiento parásito y errores de checksum), umbrales mínimo y máximo de temperatura ambiental (`°C`, rango sensor: -40 a 80 °C, precisión ±0.5 °C) y humedad relativa (`% HR`, rango sensor: 0 a 100% HR, precisión ±2% HR).
- **Temperatura de Solución — PT100 (`v1.1/views/sensores/temperatura/temperatura.html`, `js/temperatura.js`):**
  - Estado operativo, frecuencia de muestreo, umbrales mínimo y máximo (`°C`, rango RTD IEC 60751: -200 a 850 °C), configuración de conexión RTD MAX31865 (`3_hilos` [estándar], `2_hilos`, `4_hilos`), resistencia de referencia `Rref` de alta precisión (**430.0 Ω** con tolerancia ≤ 0.1% requerida por Analog Devices para PT100), coeficiente de platino $\alpha = 0.00385\ \Omega/\Omega/^\circ\text{C}$ y filtro de red configurable (`50Hz` / `60Hz`).
- **Sensor de pH RS485 Modbus (`v1.1/views/sensores/ph/index.html`, `js/ph.js`):**
  - Estado operativo, frecuencia de muestreo, umbrales mínimo y máximo (`pH`, rango completo: 0.00 a 14.00), parámetros de comunicación Modbus RTU (`Baudios`: `9600` [defecto], `19200`, `115200`; `Slave ID`: `1–247`, trama 8-N-1) y calibración con tampones del **estándar NIST / DIN** (sobres en polvo: verde `pH 6.86`, rojo `pH 4.00`, azul `pH 9.18`):
    - Calibración guiada de 2 puntos: punto neutro `pH 6.86` + segundo punto `pH 4.00` (ácido) o `pH 9.18` (alcalino).
    - Calibración de 3 puntos: `pH 4.00`, `pH 6.86`, `pH 9.18`.
    - Todo el flujo usa un único juego de tampones: mezclar NIST (6.86) con USA (7.00 / 4.01 / 10.01) introduce un sesgo de hasta 0.14 pH.
- **Conductividad / TDS (`v1.1/views/sensores/ec/index.html`, `js/ec.js`):**
  - Estado operativo, frecuencia de muestreo, umbrales en `µS/cm` y `ppm`, factor de conversión TDS `K_value` (`TDS = EC × 1000 × K_value`; `0.50` base NaCl por defecto, `0.64–0.70` para soluciones nutritivas hidropónicas), factor de calibración de la sonda `k` (`1.00` por defecto, ajustado tras calibrar con solución estándar `1.41 mS/cm`), compensación térmica automática (ATC: referencia `25.0 °C`, coeficiente `α = 0.02 / °C`) y atenuación ADC del ESP32-S3 (`11db` recomendado; `6db`, `2.5db` y `0db` saturan con la salida de la sonda de hasta ~2.3 V).
- **Nivel de Agua — LMP633 (`v1.1/views/sensores/nivel-agua/index.html`, `v1.1/views/sensores/nivel-temperatura/index.html`, `js/nivel-agua.js`):**
  - Estado operativo, frecuencia de muestreo, unidad principal de visualización (`%`, `cm`, `L`, `kPa`, `MPa`, `mH2O`, `m`), rango nominal de cápsula (ej. `C203G`: 0 a 20 kPa / 2.04 mH2O para tanques hidropónicos), umbrales mínimo/máximo, referencia de hardware **Shunt de 100 Ω (0.4 – 2.0 V) protegido para ADC del ESP32-S3** (diseño seguro que previene la sobretensión destructiva de 5.0 V que ocasionaría un shunt de 250 Ω y opera en la zona de mayor linealidad del conversor) y **Offset mecánico de calibración (cm)** (`#offset_cm` para compensar la altura de suspensión sobre el fondo del tanque).

### 2.3 Nodo Maestro ESP32-S3 (`v1.1/views/nodo-maestro/index.html`, `js/nodo_maestro.js`)
- Muestra información de red, identificador del dispositivo (`ESP32_HIDRO_01`), versión de firmware, intensidad de señal (`RSSI`) y parámetros generales del controlador.

### 2.4 Reportes, Respaldos y Bitácora (`v1.1/views/reportes/reportes.html`, `js/reportes.js`)
- Visualización y exportación de históricos (`CSV`, `XLSX`, `JSON`), gestión de respaldos de configuración, políticas de retención de datos y tabla de **Bitácora de Auditoría de Configuración** filtrable por módulo.

### 2.5 Modelo de Roles y Control de Acceso
El sistema implementa un modelo de acceso diferenciado según el tipo de interacción con la plataforma:
- **Administrador (Administrador Único — Con Credenciales):**
  - **Autenticación obligatoria:** Único rol con credenciales de acceso (correo y contraseña gestionados en `v1.1/login.html` y `v1.1/views/configuracion/configuracion.html`).
  - **Permisos y responsabilidades exclusivas:**
    - **Configuración de Sensores:** Parametrización agronómica (umbrales de alerta mínimo/máximo), calibración en 2 y 3 puntos, compensaciones térmicas, factores $k$, offsets y opciones de hardware (atenuación ADC, shunt, filtros de red y buses RS485).
    - **Configuración del ESP32-S3:** Gestión de red Wi-Fi, broker MQTT, tiempos de muestreo y envío de telemetría.
    - **Configuración General:** Accionamiento y control de los 6 canales de relés, políticas de retención, respaldos/backups, seguridad de la cuenta y ajuste de tipografía.
    - **Trazabilidad:** Todas las modificaciones realizadas quedan registradas en la **Bitácora de Auditoría** bajo el usuario `"Administrador Único"`.
- **Roles de Investigación y Consulta (Investigador / Observador / Estudiante — Sin Credenciales):**
  - **Acceso abierto / de libre consulta:** No requieren usuario ni contraseña para ingresar al sistema.
  - **Permisos y capacidades:**
    - **Observación del Dashboard:** Acceso en tiempo real al panel principal (`v1.1/index.html`), gráficas de tendencias históricas, telemetría en vivo y estados semáforo del cultivo.
    - **Generación y Exportación de Reportes:** Consulta de datos históricos y exportación completa de la información recolectada en formatos analíticos (`CSV`, `XLSX`, `JSON`) desde `v1.1/views/reportes/reportes.html` para sus investigaciones científicas y experimentación académica.
  - **Restricción de seguridad:** No cuentan con permisos de edición, calibración, modificación de umbrales ni control de actuadores/relés.

### 2.6 Seguridad y Configuración Global (`v1.1/views/configuracion/configuracion.html`, `js/configuracion.js`, `v1.1/login.html`)
- Inicio de sesión del Administrador y recuperación de acceso de emergencia mediante token de hardware.
- Ajuste global de escala tipográfica (`--fs-base` en `px`) persistido en caché y aplicado dinámicamente a todas las vistas.

---

## 3. Guía de Componentes UI y Tipos de Datos que Manejan

La interfaz utiliza controles personalizados para garantizar entradas limpias y tipadas en JavaScript:

| Componente UI | Funcionamiento Visual | Tipo de Dato en JS | Ejemplos |
| :--- | :--- | :--- | :--- |
| **Controles Stepper (`-` / `+`)** | Botones de incremento/decremento junto a un valor numérico (umbrales, offsets, escala de fuente). | `Number` (`Float` o `Integer`), sin unidades en el valor. | `24`, `0.0`, `6.50`, `430.0` |
| **Interruptores / Badges de Estado** | Botones tipo píldora (`Activo` / `Pausado`, `Encendido` / `Apagado`) con color semáforo. | `Boolean` (`true` = Activo/Encendido, `false` = Pausado/Apagado). | `true`, `false` |
| **Selectores Técnicos** | Listas desplegables `<select>` para parámetros de hardware y unidades. | `Number` (baudios) o `String` (códigos normalizados). | `9600`, `"11db"`, `"3_hilos"`, `"pct"` |

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
    "factor_conversion_tds": 0.5,
    "factor_calibracion_k": 1.0,
    "temp_compensacion_c": 25.0,
    "coeficiente_termico": 0.02,
    "atenuacion_adc": "11db"
  },
  "ph": {
    "activo": true,
    "frecuencia_seg": 10,
    "min": 5.5,
    "max": 6.5,
    "baud_rate": 9600,
    "slave_id": 1,
    "calibracion": {
      "cal_ph400": 4.00,
      "cal_ph686": 6.86,
      "cal_ph918": 9.18
    }
  },
  "nivel_agua": {
    "activo": true,
    "frecuencia_seg": 10,
    "unidad": "pct",
    "shunt_ohm": 100,
    "offset_cm": 0.0,
    "min_cm": 15.0,
    "max_cm": 90.0
  },
  "temperatura_agua": {
    "activo": true,
    "frecuencia_seg": 10,
    "min_c": 18.0,
    "max_c": 24.0,
    "conexion": "3_hilos",
    "rref_ohm": 430.0,
    "filtro_red": "60Hz"
  },
  "ambiente_dht22": {
    "activo": true,
    "frecuencia_seg": 10,
    "temp_min_c": 18.0,
    "temp_max_c": 28.0,
    "hum_min_pct": 50.0,
    "hum_max_pct": 80.0
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
