# Documentación Técnica del Frontend — AXIÓN - IOT

**Directorio:** `hidroponia.frontend`  
**Versión:** `1.1.0`  
**Stack Implementado:** React 18 · Vite 6 · React Router DOM 6 · Chart.js 4 (empaquetado local para operación offline en LAN) · CSS3 con Variables Globales

---

## 1. Arquitectura General del Frontend

La interfaz web de **AXIÓN - IOT** es una SPA en React con diseño minimalista de secciones planas (*Flat Sectioned Layout*) conectada en tiempo real al backend Spring Boot (`http://localhost:8080/api/v1` o `VITE_API_BASE_URL`) mediante `src/services/apiClient.js` y el contexto global `src/context/AxionContext.jsx`.

### Capas Principales
* **Enrutamiento y Protección (`src/App.jsx`):**
  * Rutas públicas (Modo Investigación / Consulta sin credenciales): `/` (Dashboard), `/reportes` (Historial, Exportación Excel y Contraste Manual vs. IoT) y `/login`.
  * Rutas protegidas (`<RutaAdmin>` con JWT Bearer Token): `/sensores/ph`, `/sensores/ec`, `/sensores/nivel-temperatura`, `/sensores/temperatura-humedad`, `/reles`, `/nodo-maestro` y `/configuracion`.
* **Estado Global y Polling HTTP (`src/context/AxionContext.jsx`):**
  * Gestiona la sesión JWT (`axion_sesion_activa`), validación de expiración de token, tema (`oscuro`/`claro`/`sistema`), escala tipográfica (`--font-size-title`, `--font-size-subtitle`, `--font-size-base`) y visibilidad de la barra lateral.
  * Realiza polling eficiente a `GET /api/v1/dashboard/resumen` cada `5 s`, emitiendo el evento `dashboard:actualizarLecturas` con el resumen completo (evitando peticiones redundantes) y `axion:telemetria` únicamente cuando llega una lectura nueva (`ultimaLectura.id`).
* **Gráficas Offline (`src/main.jsx` + `chart.js/auto`):**
  * `Chart.js` se importa directamente desde el paquete local `npm` y se expone en `window.Chart`, eliminando dependencias de CDN externos para garantizar el funcionamiento en redes locales (LAN) de invernaderos sin acceso a Internet.
* **Layout Responsivo (`src/components/Layout.jsx`, `Navbar.jsx`, `Sidebar.jsx`):**
  * Grid CSS `250px minmax(0, 1fr)` / `0px minmax(0, 1fr)` al colapsar la barra lateral, selector de tema y centro de alertas interactivo en el header.

---

## 2. Mapa de Vistas y Funcionalidades

### 2.1 Dashboard Principal (`src/pages/Dashboard.jsx`, `controllers/dashboard.js`, `dashboard_charts.js`)
* **6 Tarjetas en Tiempo Real:**
  1. **Conductividad Eléctrica / TDS (`TDS Meter V1.0`):** Lectura en `µS/cm`, estimación de `TDS (ppm)` e indicador de compensación térmica (`ATC PT100` / `Fijo`).
  2. **pH (`DFRobot SEN0169-V2`: `Gravity V2.0` + `H-101`):** Lectura en `pH` por entrada analógica `ADC1 · GPIO 4`.
  3. **Nivel de Agua (`LEEG LMP633-NCN`):** Conversión consistente según unidad principal (`%`, `cm` desde `nivelCm`, `L` desde `capacidadLitros`, `kPa`, `MPa`, `mH2O`, `m`) y volumen estimado en litros.
  4. **Temperatura del Agua (`PT100` 3 hilos + `MAX31865`):** Lectura en `°C` y estado de compensación externa.
  5. **Microclima Ambiental (`DHT22 / AM2302`):** Temperatura del aire (`°C`) y humedad relativa (`% HR`).
  6. **Microcontrolador `ESP32-S3`:** Estado de red, `SSID`, `RSSI (dBm)`, alimentación, consumo y cadencia HTTP en memoria NVS.
* **Estado de Equipos y Actuadores:** Visualización en vivo de los **8 canales de relé** (`Módulo #1` canales 1–4 y `Módulo #2` canales 5–8).
* **Tendencia Rápida (Últimas 24 horas):** Gráfica `Chart.js` con filtro por variable e intervalo de fecha/hora, actualizada automáticamente cuando ingresa nueva telemetría.

### 2.2 Configuración de Sensores *(Exclusivo `ROLE_ADMIN`)*
* **Sensor de pH (`SensorPh.jsx`, `controllers/ph.js`):**
  * Umbrales `0.00–14.00 pH`, frecuencia de muestreo (`300–3600 s`), calibración analógica en 2 puntos (`pH 7.00` + `4.00`/`10.00`) y ajuste directo de voltajes (`voltajeNeutroMv: 1500.0 mV`, `voltajeAcidoMv: 2032.44 mV` enviados como `paso: "VOLTAJES_MV"`), canal `GPIO4_ADC1` y atenuación `11db`. *(Sin parámetros obsoletos RS485 Modbus).*
* **Sensor de EC / TDS (`SensorEc.jsx`, `controllers/ec.js`):**
  * Umbrales sincronizados `EC` (`0.00–2.00 mS/cm`) y `TDS` (`0–1000 ppm`, límite físico del `TDS Meter V1.0`), compensación térmica ATC (`PT100` o manual `25.0 °C`), calibración con solución patrón, `GPIO5_ADC1`, `11db`, `factorCalibracionK`, `kValue` (`0.50`) y `coeficienteTermico` (`0.02`).
* **Sensores Físicos del Agua (`SensorNivelTemperatura.jsx`, `controllers/nivel-agua.js`, `temperatura.js`):**
  * **Nivel de Agua (`LMP633-NCN`):** Unidad principal (`pct`, `cm`, `L`, `kPa`, `MPa`, `mH2O`, `m`), umbrales en `cm`, calibración de punto cero (`offsetCm`), cápsula (`C203G`, `C403G`, `C104G`), resistencia shunt (`150 Ω`, rango seguro `10–165 Ω`) y pin `GPIO7`.
  * **Temperatura del Agua (`PT100` 3 hilos):** Umbrales `0.0–400.0 °C`, enlace ATC, offset térmico (`-20 a +20 °C`), conexión `3_hilos`, `GPIO10`, `rrefOhmios: 430.0 Ω` y filtro `60Hz`/`50Hz`. *(Coeficiente $\alpha = 0.00385$ fijo por norma IEC 60751).*
* **Microclima Ambiental (`SensorTemperaturaHumedad.jsx`, `controllers/temperatura_humedad.js`):**
  * Umbrales de temperatura (`-40 a 80 °C`) y humedad (`0–100 %`), offsets de calibración, pin digital `GPIO 6` y resistencia pull-up.

### 2.3 Control de Equipos y Relés (`Reles.jsx`, `controllers/reles.js`) *(Exclusivo `ROLE_ADMIN`)*
* Control individual de los **8 canales** (2× `HW-316`), edición de nombres, selector de modo global (`Manual` / `Automático`) y configuración técnica de pines GPIO (`16, 17, 18, 8` y `42, 41, 40, 39`) con lógica Active LOW/HIGH.
* Validación preventiva en cliente que bloquea pines reservados del `ESP32-S3-WROOM-1 (N16R8)` (`0, 3, 19, 20, 22–37, 45, 46`) y duplicados antes de enviar al backend.

### 2.4 Controlador Maestro ESP32-S3 (`NodoMaestro.jsx`, `controllers/nodo_maestro.js`) *(Exclusivo `ROLE_ADMIN`)*
* Métricas de salud (Red/RSSI, Alimentación/Consumo, Firmware, PSRAM).
* Escaneo remoto de redes Wi-Fi cercanas (`POST /wifi/escanear` + polling con limpieza de `setInterval` al desmontar), configuración Wi-Fi/IP/HTTP/Device Key, cadencia de muestreo HTTP en NVS (`15–3600 s`), botón de lectura inmediata y matriz interactiva **Pinout Manager** con validador de colisiones. *(Sin controles obsoletos de BLE, MQTT ni LittleFS).*

### 2.5 Reportes, Contraste y Respaldos (`Reportes.jsx`, `controllers/reportes.js`, `public/views/reportes/*.html`)
* **Historial y Exportación *(Público)*:** Gráfica multi-variable con doble eje para EC, agrupación temporal (`crudo`, `5m`, `15m`, `1h`, `1d`), tabla paginada, exportación Excel `.xlsx` desde PostgreSQL y herramienta de **Contraste Manual vs. IoT** (Diferencia Media, RMSE y concordancia Bland-Altman con CSV de laboratorio).
* **Respaldos Automáticos y Retención *(Admin)*:** Configuración de correo/Drive, política de retención, indicador dinámico con conteo real de lecturas activas en PostgreSQL (`totalLecturasActivas`) y ejecución manual de respaldos/depuración.

### 2.6 Configuración General y Auditoría (`ConfiguracionGeneral.jsx`, `controllers/configuracion.js`) *(Exclusivo `ROLE_ADMIN`)*
* Gestión de perfil administrativo, expiración de sesión JWT, cambio de contraseña, regeneración de token de recuperación de emergencia, apariencia/tipografía global y **Bitácora de Auditoría** con filtro alineado a los módulos reales del hardware y exportación CSV.

---

## 3. Comandos de Desarrollo y Compilación

```bash
cd hidroponia.frontend
npm install
npm run dev     # Servidor de desarrollo Vite (http://localhost:5173)
npm run build   # Empaquetado de producción en dist/ (con Chart.js local offline)
```
