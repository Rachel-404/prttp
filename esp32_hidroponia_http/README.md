# Firmware HTTP para ESP32-S3-WROOM-1 — AXIÓN - IOT

Firmware unificado en Arduino C++ (`v1.1.0-http-real`) para el microcontrolador **ESP32-S3-WROOM-1 (N16R8: 16 MB Flash, 8 MB Octal PSRAM)**, sincronizado al 100 % con los componentes físicos de [`../elementos/`](../elementos/), el mapa de cableado de [`../elementos/CONEXIONES.md`](../elementos/CONEXIONES.md) y los contratos REST de [`../backend.md`](../backend.md) y [`../frontend.md`](../frontend.md).

---

## 1. Inventario de Hardware y Mapa de Conexiones (`ESP32-S3-WROOM-1`)

| Dispositivo Físico (`/elementos`) | Terminal / Cable del Sensor | Puerto en `ESP32-S3-WROOM-1` | Interfaz / Notas Técnicas |
| :--- | :--- | :--- | :--- |
| **Sensor de pH Industrial (`DFRobot SEN0169-V2`: `Gravity pH Meter V2.0` + Electrodo `H-101 / FIT0348`)** | `+` (Cable Rojo)<br>`-` (Cable Negro)<br>`A` (Cable Azul) | `3V3`<br>`G`<br>**`4`** (`GPIO 4`) | Analógica (`ADC1_CH3`, atenuación `11 dB`, 0–14 pH, `1500.0 mV` = `pH 7.00`, detección de fallo eléctrico `< 50 mV` o `> 3250 mV`) |
| **Sensor de Conductividad / TDS (`TDS Meter V1.0` + Sonda Blanca 2 puntas)** | `+` (Cable Rojo)<br>`-` (Cable Negro)<br>`A` (Cable Azul) | `3V3`<br>`G`<br>**`5`** (`GPIO 5`) | Analógica (`ADC1_CH4`, salida 0–2.3 V, tope físico `0–1000 ppm` en TDS, `EC` calculada de forma independiente sin truncamiento artificial) |
| **Sensor Temperatura y Humedad (`Módulo DHT22 / ASAIR AM2302`)** | `+` (Cable Azul)<br>`out` (Cable Verde central)<br>`-` (Cable Amarillo) | `3V3`<br>**`6`** (`GPIO 6`)<br>`G` | Digital One-Wire (`-40 a 80 °C`, `0–100 % HR`, resistencia pull-up SMD integrada en PCB) |
| **Transmisor de Nivel Sumergible (`LEEG LMP633-NCN` 4–20 mA)** | Rojo (`VCC+` → Fuente 12–24 V `+`)<br>Azul (`IOUT` → Conversor / Shunt `150 Ω`) | **`7`** (`GPIO 7`)<br>`G` | Analógica (`ADC1_CH6`, $4\text{--}20\text{ mA} \rightarrow 0.6\text{--}3.0\text{ V}$ con `150 Ω`, detección de lazo abierto `< 3.5 mA`) |
| **Sonda RTD `PT100` (3 hilos: 1 Horquilla Roja + 2 Azules, 0–400 °C) + `MAX31865`** | `VIN`, `GND`<br>`CS`, `SDI`, `SCK`, `SDO` | `3V3`, `G`<br>**`10`**, **`11`**, **`12`**, **`13`** | Bus Digital SPI (`SPI_MODE1`, 3 hilos: Rojo en `RTD+`, 2 Azules en `RTD-`/`F-`, $R_{\text{ref}} = 430.0\ \Omega$, $\alpha = 0.00385$ IEC 60751) |
| **Módulo de 4 Relés #1 (`HW-316` - Unidad 1, Columna Izquierda)** | `VCC` → `5V`, `GND` → `G`<br>`IN1` (`M1`), `IN2` (`M2`), `IN3` (`M3`), `IN4` (`M4`) | **`16`**, **`17`**, **`18`**, **`8`** | Salidas Digitales Active LOW (`JQC3F-05VDC-C`, Canales 1 a 4) |
| **Módulo de 4 Relés #2 (`HW-316` - Unidad 2, Columna Derecha)** | `VCC` → `5V`, `GND` → `G`<br>`IN1` (`M1`), `IN2` (`M2`), `IN3` (`M3`), `IN4` (`M4`) | **`42`**, **`41`**, **`40`**, **`39`** | Salidas Digitales Active LOW (`JQC3F-05VDC-C`, Canales 5 a 8) |

> [!IMPORTANT]
> **Protección de pines en `ESP32-S3-WROOM-1 (N16R8)`:** El firmware valida mediante `esGpioSeguroEsp32S3()` cualquier reasignación remota de relés y rechaza automáticamente pines reservados por Strapping (`0, 3, 45, 46`), USB nativo (`19, 20`), SPI Flash (`26–32`) y PSRAM Octal (`33–37`). Además, precarga el nivel lógico inactivo (`HIGH` en Active LOW) antes de `pinMode(..., OUTPUT)` para evitar pulsos accidentales en bombas o reflectores.

---

## 2. Requisitos en Arduino IDE

1. Instalar el paquete de placas **esp32 by Espressif Systems** y seleccionar **`ESP32S3 Dev Module`** (Flash `16 MB`, PSRAM `OPI PSRAM`).
2. Instalar las librerías desde el Gestor de Bibliotecas:
   * **ArduinoJson** (`v7.x`)
   * **DHT sensor library** (Adafruit) + **Adafruit Unified Sensor**
   * *(Las librerías `WiFi`, `HTTPClient`, `WebServer`, `DNSServer`, `Preferences` y `SPI` vienen incluidas en el core de ESP32).*
3. **No es necesario crear `secrets.h`:** El firmware arranca con las credenciales de red y servidor limpias. Al encender sin configuración (o si pierde Wi-Fi o el backend deja de responder `HTTP 200`), abre automáticamente el **Portal Cautivo AXIÓN - IOT** (`AXION_HIDRO_SETUP` en `http://192.168.4.1`) para configurar desde el navegador:
   * Red Wi-Fi 2.4 GHz (con escaneo de redes cercanas y botón de re-escaneo) y contraseña
   * **Asignación IP**: `DHCP Automático` o `IP Estática` (`IP Local`, `Máscara de Subred`, `Gateway` y `DNS`)
   * URL del Servidor Backend (ej. `http://192.168.1.100:8080`)
   * `Dispositivo ID` (`ESP32_HIDRO_01`) y `Device Key` (`X-Device-Key`)
   *(Los endpoints `/api/v1/iot/telemetria` y `/api/v1/iot/comandos` son fijos en el firmware y solo cambia la URL base del servidor).*

---

## 3. Arquitectura de Comunicación 100 % HTTP REST y NVS

El firmware no utiliza MQTT, BLE ni LittleFS; toda la comunicación es **HTTP REST autenticado con `X-Device-Key`** y la configuración se persiste en memoria flash no volátil (**NVS `Preferences`**):

1. **`POST /api/v1/iot/telemetria`** *(cadencia configurable de `15` a `3600 s`, defecto `300 s`)*:
   * Envía las lecturas reales junto con timestamp UTC (`ts` vía NTP), `rssi` y el mapa `estado` (`ok`, `pausado`, `desconectado`).
   * Si un sensor está pausado o presenta fallo eléctrico/desconexión, el firmware envía `null` en sus campos de `datos` para evitar contaminar gráficas históricas y reportes Excel con ceros falsos.
2. **`GET /api/v1/iot/comandos?dispositivoId=ESP32_HIDRO_01`** *(polling cada `3 s`)* y **`POST /api/v1/iot/comandos/{id}/ack`**:
   * Sincroniza los **8 canales de relé** sin generar spam en UART (solo registra en Serial cuando un canal cambia de estado).
   * Mantiene un historial circular de los últimos 16 IDs ejecutados para garantizar **idempotencia** ante reentregas del backend por cortes de red.
   * Comandos soportados:
     * `SET_RELE`, `SET_MODO_RELES`, `CONFIG_RELES_TECNICO`
     * `CONFIG_SENSOR`, `CONFIG_TECNICA_SENSOR`, `CONFIG_BUFFER`, `CONFIG_CONECTIVIDAD`, `CONFIG_PINOUT`
     * `CALIBRAR_PH` (`PUNTO_NEUTRO`, `SEGUNDO_PUNTO`, `VOLTAJES_MV` con referencia neutra `7.00 pH` a `1500.0 mV`), `CALIBRAR_EC`, `CALIBRAR_CERO_NIVEL`
     * `ESCANEAR_WIFI` (reporta redes mediante `POST /api/v1/iot/wifi-redes`) y `FORZAR_SYNC_BUFFER` (lectura y envío HTTP inmediato).
3. **Portal Cautivo Wi-Fi (`AXION_HIDRO_SETUP`)**:
   * Si no logra conectarse al Wi-Fi al arrancar (o tras 60 segundos sin conexión, o sin respuesta `HTTP 200` del backend), habilita un punto de acceso abierto **`AXION_HIDRO_SETUP`** (sin contraseña) en **`http://192.168.4.1`**.
   * Escapa entidades HTML contra XSS, **no expone** la contraseña Wi-Fi ni el `X-Device-Key` actuales en el formulario HTML y aplica **fail-safe**: apaga los 8 relés físicamente al perder Wi-Fi o comunicación HTTP con el backend, y si vence el timeout de 3 minutos sin cambios, regresa a `loop()` para reintentar reconectar.

---

## 4. Indicador LED RGB de Estados de Conexión

El firmware utiliza el **LED RGB integrado** de la placa `ESP32-S3-WROOM-1` (`RGB_BUILTIN` / `GPIO 48`) mediante `rgbLedWrite()` nativo del core de ESP32 (sin librerías externas) para mostrar el estado de conectividad en tiempo real:

| Estado de conexión | Color y patrón | Significado |
| :--- | :--- | :--- |
| **Iniciando** | **Blanco fijo** (suave) | Arranque inicial, cargando NVS, sensores y relés. |
| **Conectando Wi-Fi** | **Azul parpadeando rápido** (`250 ms`) | Intentando conectarse a la red Wi-Fi configurada. |
| **Portal Cautivo activo** | **Morado / Violeta parpadeando lento** (`700 ms`) | Red abierta `AXION_HIDRO_SETUP` activa en `http://192.168.4.1` esperando configuración. |
| **Conectado OK** | **Verde fijo** | Conectado al Wi-Fi y recibiendo `HTTP 200` del backend. |
| **Envío de telemetría** | **Destello Cian breve** (`180 ms`) → vuelve a Verde | Confirmación visual de que un `POST /api/v1/iot/telemetria` recibió `HTTP 200`. |
| **Wi-Fi OK, API sin respuesta** | **Ámbar / Naranja parpadeando** (`500 ms`) | Conectado al Wi-Fi, pero el backend no responde `HTTP 200` (contando fallos antes de abrir el portal). |
| **Sin Wi-Fi** | **Rojo parpadeando** (`400 ms`) | Se perdió la conexión Wi-Fi y está reintentando reconectar. |

> [!NOTE]
> Si tu revisión específica de la placa `ESP32-S3-DevKitC-1` tiene el LED RGB en el **`GPIO 38`** en lugar del **`GPIO 48`**, cambia la definición `#define PIN_LED_ESTADO RGB_BUILTIN` por `#define PIN_LED_ESTADO 38` en `esp32_hidroponia_http.ino`.

---

## 5. Sketches de Pruebas Individuales de Hardware

Para probar cada periférico de forma aislada antes de cargar el firmware principal, utiliza los sketches en [`../hidroponia.firmware/pruebas_individuales/`](../hidroponia.firmware/pruebas_individuales/):
* `PH/PH.ino` (`GPIO 4` — `DFRobot Gravity pH V2.0` + `H-101`)
* `TDS/TDS.ino` (`GPIO 5` — `TDS Meter V1.0`)
* `DHT22/DHT22.ino` (`GPIO 6` — `AM2302`)
* `NIVEL_LMP633/NIVEL_LMP633.ino` (`GPIO 7` — `LMP633-NCN` 4–20 mA)
* `PT100_MAX31865/PT100_MAX31865.ino` (`SPI GPIO 10–13` — `PT100` 3 hilos + `MAX31865`)
* `RELAY/RELAY.ino` (`GPIO 16, 17, 18, 8` y `42, 41, 40, 39` — 2× `HW-316`, 8 canales)
