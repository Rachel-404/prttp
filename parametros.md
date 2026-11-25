# Listado Completo de Parámetros Configurables y Mapa de Hardware — AXIÓN - IOT

**Dispositivo Maestro:** `ESP32-S3-WROOM-1 (N16R8)` (`ESP32_HIDRO_01`)  
**Arquitectura de Sincronización 100 % HTTP:** Frontend (`ROLE_ADMIN` + JWT) $\rightarrow$ API REST (Spring Boot) $\rightarrow$ PostgreSQL (`JSONB`) + Auditoría (`auditoria_cambios`) + Cola de Comandos (`comandos_pendientes`) $\leftrightarrow$ ESP32-S3 (`POST /api/v1/iot/telemetria`, `GET /api/v1/iot/comandos`, `POST /api/v1/iot/comandos/{id}/ack` y persistencia en memoria flash **NVS `Preferences`**).  
**Referencia Física de Cableado:** [`elementos/CONEXIONES.md`](elementos/CONEXIONES.md)

---

## 0. Inventario Físico y Mapa de Conexiones en `ESP32-S3-WROOM-1` (Según `/elementos`)

| Módulo / Sensor Físico | Especificación Física en `/elementos` | Terminales en el Dispositivo | Puerto en `ESP32-S3-WROOM-1` | Tipo de Señal / Interfaz |
| :--- | :--- | :--- | :--- | :--- |
| **Sensor de pH** | `DFRobot Gravity pH Meter V2.0` + Electrodo `H-101` (conector BNC, rango $0\text{--}14\text{ pH}$) | `+` (Cable Rojo)<br>`-` (Cable Negro)<br>`A` (Cable Azul) | `3V3`<br>`G`<br>**Puerto `4`** (`GPIO 4`) | Analógica (`ADC1_CH3`, atenuación `11 dB`, alimentar a `3V3`) |
| **Sensor de Conductividad / TDS** | `TDS Meter V1.0` + Sonda impermeable blanca de 2 puntas ($3.3\text{--}5\text{ V}$, rango físico **$0\text{--}1000\text{ ppm}$**, salida $0\text{--}2.3\text{ V}$) | `+` (Cable Rojo)<br>`-` (Cable Negro)<br>`A` (Cable Azul) | `3V3`<br>`G`<br>**Puerto `5`** (`GPIO 5`) | Analógica (`ADC1_CH4`, atenuación `11 dB`, alimentar a `3V3`) |
| **Sensor Temperatura y Humedad** | Módulo `DHT22` (`ASAIR AM2302` en PCB negro con pull-up SMD integrada, $-40\text{ a }80\ ^\circ\text{C}$, $0\text{--}100\%\text{ HR}$) | `+` (Cable Azul)<br>`out` (Cable Verde central)<br>`-` (Cable Amarillo) | `3V3`<br>**Puerto `6`** (`GPIO 6`)<br>`G` | Digital One-Wire |
| **Transmisor de Nivel Sumergible** | `LEEG LMP633-NCN` (Lazo de corriente $4\text{--}20\text{ mA}$, alimentación externa $12\text{--}24\text{ V DC}$) | Rojo (`VCC+` $\rightarrow$ Fuente 12–24V `+`)<br>Azul (`IOUT` $\rightarrow$ Conversor 4–20mA / Shunt $150\ \Omega$) | **Puerto `7`** (`GPIO 7`)<br>`G` | Analógica (`ADC1_CH6`, $0.60\text{--}3.00\text{ V}$ con Shunt $150\ \Omega$) |
| **Sonda Temperatura Agua RTD** | `PT100` Acero Inox. ($100\text{ mm} \times 5\text{ mm}$, cable $3\text{ m}$ con 3 terminales horquilla: 1 Rojo + 2 Azules, rango **$0\text{ a }400\ ^\circ\text{C}$**) + `MAX31865` | `VIN`, `GND`<br>`CS`, `SDI` (`MOSI`), `SCK`, `SDO` (`MISO`) | `3V3`, `G`<br>**Puertos `10`, `11`, `12`, `13`** | Bus Digital SPI (Rojo en `RTD+`, 2 Azules en `RTD-` y `F-`) |
| **Módulo de 4 Relés #1 (Unidad 1)** | `4 RELAY MODULE (1)` (`HW-316`, relés `JQC3F-05VDC-C`, optoacopladores `PC817`, jumper `JD-VCC`) | `VCC`, `GND`<br>`IN1` (`M1`), `IN2` (`M2`), `IN3` (`M3`), `IN4` (`M4`) | `5V`, `G`<br>**Puertos `16`, `17`, `18`, `8`** | Salida Digital Active LOW (Columna Izquierda, Canales 1–4) |
| **Módulo de 4 Relés #2 (Unidad 2)** | `4 RELAY MODULE (2)` (`HW-316`, relés `JQC3F-05VDC-C`, optoacopladores `PC817`, jumper `JD-VCC`) | `VCC`, `GND`<br>`IN1` (`M1`), `IN2` (`M2`), `IN3` (`M3`), `IN4` (`M4`) | `5V`, `G`<br>**Puertos `42`, `41`, `40`, `39`** | Salida Digital Active LOW (Columna Derecha, Canales 5–8) |

---

## 1. Nodo Maestro `ESP32-S3-WROOM-1` (`ESP32_HIDRO_01`)

* **Tabla en BD:** `dispositivos`
* **Endpoints REST (`ROLE_ADMIN`):**
  * `GET /api/v1/nodo-maestro/{dispositivoId}`
  * `PUT /api/v1/nodo-maestro/{dispositivoId}/conectividad`
  * `PUT /api/v1/nodo-maestro/{dispositivoId}/buffer`
  * `PUT /api/v1/nodo-maestro/{dispositivoId}/pinout`
  * `POST /api/v1/nodo-maestro/{dispositivoId}/sincronizar`

| Categoría | Parámetro (JSON / API) | Tipo de Dato | Valores / Restricciones | Propósito Técnico |
| :--- | :--- | :--- | :--- | :--- |
| **Conectividad** | `ssid`, `wifiPassword` | `String` | Red Wi-Fi 2.4 GHz o Portal Cautivo `AXION_HIDRO_SETUP` (`192.168.4.1`) | Conexión inalámbrica del ESP32-S3 a la red local y persistencia en NVS. |
| **Dirección IP** | `asignacionIp`, `ipLocal`, `mascara`, `gateway`, `dns` | `String` | `"dhcp"` (por defecto) o `"estatica"` | Direccionamiento IPv4 del controlador en la LAN. |
| **Transporte HTTP** | `protocolo`, `brokerUrl`, `endpoint`, `usuario`, `passTransporte` | `String` | `"http"`, `http://<IP_BACKEND>:8080`, `/api/v1/iot/telemetria`, Header `X-Device-Key` | Enlace HTTP bidireccional entre el ESP32-S3 y Spring Boot. |
| **Temporización** | `muestreoSeg`, `envioSeg` | `Number` | `15` a `3600` s (persistido en NVS) | Frecuencia global de lectura de sensores y envío inmediato por HTTP. |
| **Hardware** | `pinout` | `JSONB` | Puertos `4, 5, 6, 7, 10..13, 16..18, 8, 42..39` | Matriz de asignación de pines verificada sin colisiones con Flash (`26–32`) ni PSRAM (`35–37`). |
| **Acción Directa** | `FORZAR_SYNC_BUFFER` | Comando (`POST`) | Ejecución inmediata | Ordena al ESP32-S3 realizar una lectura y envío HTTP inmediato. |

---

## 2. Sensor de pH (`ph` — `DFRobot Gravity pH Meter V2.0` + Electrodo `H-101` en Puerto `4`)

* **Tabla en BD:** `sensor_configuracion` (módulo `ph`, columna `parametros_tecnicos JSONB`)
* **Conexión física:** Electrodo `H-101` al conector BNC superior $\rightarrow$ Placa `Gravity pH Meter V2.0` (`+` a `3V3`, `-` a `G`, `A` al **Puerto `4` / `ADC1_CH3`**).
* **Endpoints REST (`ROLE_ADMIN`):**
  * `GET /api/v1/sensores/ph`
  * `PUT /api/v1/sensores/ph/control`
  * `PUT /api/v1/sensores/ph/tecnico`
  * `POST /api/v1/sensores/ph/calibrar`

| Categoría | Parámetro (JSON / API) | Tipo de Dato | Valores / Defecto | Propósito Técnico |
| :--- | :--- | :--- | :--- | :--- |
| **Operativo** | `activo` | `Boolean` | `true` (Activo) / `false` (Pausado) | Habilita o pausa la lectura analógica en `GPIO 4` y sus alertas. |
| **Operativo** | `frecuenciaSeg` | `Number` | `300`, `600`, `900`, `1800`, `3600` s (defecto `300` s) | Intervalo de muestreo del sensor de pH. |
| **Umbrales** | `minNormal` / `maxNormal` | `Number` | `5.50` a `6.50` pH (rango del electrodo `H-101`: $0.00\text{ a }14.00\text{ pH}$) | Banda óptima de acidez de la solución nutritiva. |
| **Hardware ADC** | `gpioAdc`, `atenuacionAdc` | `String` | `"GPIO4_ADC1"` (Puerto `4`), `"11db"` | Canal analógico `ADC1_CH3` con `analogReadMilliVolts(4)` y atenuación de $11\text{ dB}$. |
| **Calibración mV** | `voltajeNeutroMv`, `voltajeAcidoMv` | `Number` | $1500.0\text{ mV}$ (neutro), $2032.44\text{ mV}$ (ácido) | Voltajes medidos en el ADC del ESP32-S3 y persistidos en NVS (`phVNeutro`, `phVAcido`). |
| **Calibración NIST** | `calPh400`, `calPh686`, `calPh918`, `estandar` | `Number` / `String` | `4.00` (ácido), `6.86` (neutro), `9.18` (alcalino), `"NIST"` | Puntos de referencia de soluciones buffer para calcular la pendiente lineal $\text{mV} \rightarrow \text{pH}$. |

---

## 3. Conductividad Eléctrica y TDS (`ec` — `TDS Meter V1.0` en Puerto `5`)

* **Tabla en BD:** `sensor_configuracion` (módulo `ec`, columna `parametros_tecnicos JSONB`)
* **Conexión física:** Sonda impermeable blanca de 2 puntas al conector blanco de 2 pines $\rightarrow$ Placa `TDS Meter V1.0` (`+` a `3V3`, `-` a `G`, `A` al **Puerto `5` / `ADC1_CH4`**).
* **Endpoints REST (`ROLE_ADMIN`):**
  * `GET /api/v1/sensores/ec`
  * `PUT /api/v1/sensores/ec/control`
  * `PUT /api/v1/sensores/ec/tecnico`
  * `POST /api/v1/sensores/ec/calibrar`

| Categoría | Parámetro (JSON / API) | Tipo de Dato | Valores / Defecto | Propósito Técnico |
| :--- | :--- | :--- | :--- | :--- |
| **Operativo** | `activo` | `Boolean` | `true` / `false` | Habilita o pausa la lectura analógica en `GPIO 5`. |
| **Operativo** | `frecuenciaSeg` | `Number` | `300` a `3600` s (defecto `300` s) | Intervalo de muestreo del sensor EC/TDS. |
| **Umbrales EC** | `minNormal` / `maxNormal` (`ecMinMs`, `ecMaxMs`) | `Number` | `800` a `1800` $\mu\text{S/cm}$ (`0.80` a `1.80` mS/cm) | Rango óptimo de conductividad (límite físico de `TDS Meter V1.0`: $2000\ \mu\text{S/cm}$ con $K=0.5$). |
| **Umbrales TDS** | `tdsMin` / `tdsMax` | `Number` | `400` a `900` ppm (rango físico de la placa: **$0\text{ a }1000\text{ ppm}$**) | Rango óptimo de sólidos disueltos totales en la solución nutritiva. |
| **Conversión** | `kValue` | `Number` | `0.50` por defecto (`0.10` a `1.00`) | Factor de conversión $\text{TDS (ppm)} = \text{EC (}\mu\text{S/cm)} \times K_{\text{value}}$. |
| **Calibración** | `factorCalibracionK`, `solucionPatronMsCm` | `Number` | `1.00` por defecto (`0.10` a `5.00`), patrón ej. `1.41` mS/cm | Factor multiplicador $k$ ajustado con solución patrón y guardado en NVS (`tdsFacK`). |
| **Compensación ATC** | `compensacionTermica`, `sondaTempAsociada`, `tempManualAtc`, `coeficienteTermico` | `Boolean` / `String` / `Number` | `true`, `"pt100"` o `"fijo25"` ($25.0\ ^\circ\text{C}$), $\alpha = 0.02\ / ^\circ\text{C}$ | Corrige el voltaje por temperatura: $V_{25} = V / [1 + \alpha (T - 25.0)]$. |
| **Hardware ADC** | `gpioAdc`, `atenuacionAdc` | `String` | `"GPIO5_ADC1"` (Puerto `5`), `"11db"` | Lectura analógica $0\text{--}2.3\text{ V}$ en `ADC1_CH4`. |

---

## 4. Microclima Ambiental (`dht22` — Módulo `DHT22 / ASAIR AM2302` en Puerto `6`)

* **Tabla en BD:** `sensor_configuracion` (módulo `dht22`, columna `parametros_tecnicos JSONB`)
* **Conexión física:** `+` (Cable Azul) a `3V3`, `out` (Cable Verde central) al **Puerto `6` (`GPIO 6`)**, `-` (Cable Amarillo) a `G`.
* **Endpoints REST (`ROLE_ADMIN`):**
  * `GET /api/v1/sensores/dht22`
  * `PUT /api/v1/sensores/dht22/control`
  * `PUT /api/v1/sensores/dht22/tecnico`

| Categoría | Parámetro (JSON / API) | Tipo de Dato | Valores / Defecto | Propósito Técnico |
| :--- | :--- | :--- | :--- | :--- |
| **Operativo** | `activo`, `frecuenciaSeg` | `Boolean` / `Number` | `true`, `300` a `3600` s (defecto `300` s) | Habilita o pausa la lectura digital One-Wire en `GPIO 6`. |
| **Umbrales Temp.** | `minNormal` / `maxNormal` (`tempMin`, `tempMax`) | `Number` | $18.0$ a $28.0\ ^\circ\text{C}$ (rango físico AM2302: $-40\text{ a }80\ ^\circ\text{C}$, $\pm 0.5\ ^\circ\text{C}$) | Límites de temperatura ambiente del cultivo. |
| **Umbrales Hum.** | `humMin` / `humMax` | `Number` | $50$ a $80\%\text{ HR}$ (rango físico AM2302: $0\text{ a }100\%\text{ HR}$, $\pm 2\%\text{ HR}$) | Límites de humedad relativa del aire. |
| **Calibración** | `offsetTemperatura`, `offsetHumedad` | `Number` | `0.0` °C (`-20` a `+20`), `0.0` % (`-30` a `+30`) | Compensación de desviación sumada en el ESP32-S3 y guardada en NVS (`dhtOffT`, `dhtOffH`). |
| **Hardware** | `pinGpio`, `resistenciaPullUp` | `String` | `"GPIO 6"` (Puerto `6`), `"externa_10k"` | El módulo en PCB negro ya incorpora la resistencia pull-up SMD soldada en placa. |

---

## 5. Nivel de Agua del Tanque (`nivel_agua` — `LEEG LMP633-NCN` en Puerto `7`)

* **Tabla en BD:** `sensor_configuracion` (módulo `nivel_agua`, columna `parametros_tecnicos JSONB`)
* **Conexión física:** Cable Rojo (`VCC+`) a Fuente Externa $12\text{--}24\text{ V DC}$ `+`; Cable Azul (`IOUT`) a entrada `I+` del Conversor $4\text{--}20\text{ mA}$ (o nodo con resistencia Shunt de $150\ \Omega$ a `G`) $\rightarrow$ Salida `OUT` al **Puerto `7` (`GPIO 7 / ADC1_CH6`)**.
* **Endpoints REST (`ROLE_ADMIN`):**
  * `GET /api/v1/sensores/nivel_agua`
  * `PUT /api/v1/sensores/nivel_agua/control`
  * `PUT /api/v1/sensores/nivel_agua/tecnico`
  * `POST /api/v1/sensores/nivel_agua/cero`

| Categoría | Parámetro (JSON / API) | Tipo de Dato | Valores / Defecto | Propósito Técnico |
| :--- | :--- | :--- | :--- | :--- |
| **Operativo** | `activo`, `frecuenciaSeg` | `Boolean` / `Number` | `true`, `300` a `3600` s (defecto `300` s) | Habilita o pausa la medición hidrostática en `GPIO 7`. |
| **Visualización** | `unidadPrincipal` | `String` | `"pct"`, `"cm"`, `"L"`, `"kPa"`, `"MPa"`, `"mH2O"`, `"m"` | Unidad principal mostrada en el Dashboard. |
| **Umbrales** | `minNormal` / `maxNormal` (`nivelMinCm`, `nivelMaxCm`) | `Number` | `15.0` a `90.0` cm (o `20%` a `90%`) | Límites de nivel mínimo crítico y nivel máximo del reservorio. |
| **Hardware Lazo** | `rangoCapsula` (`rangoNominal`) | `String` | `"C203G"` ($20\text{ kPa} \approx 204\text{ cm}$), `"C403G"` ($408\text{ cm}$), `"C104G"` ($1020\text{ cm}$) | Escala de presión hidrostática del transmisor sumergible `LMP633-NCN`. |
| **Hardware ADC** | `pinAdc420`, `resistenciaShunt` | `String` / `Number` | `"GPIO7"` (Puerto `7`), $150\ \Omega$ (rango seguro $10\text{--}165\ \Omega$) | Convierte $4\text{--}20\text{ mA}$ en $0.60\text{--}3.00\text{ V}$ ($\le 3.3\text{ V}$); detecta cable desconectado si $I < 3.5\text{ mA}$. |
| **Calibración** | `offsetCm` (`offset_cm`) | `Number` | `0.0` cm | Offset mecánico de punto cero para compensar la altura de suspensión sobre el fondo. |

---

## 6. Temperatura del Agua (`temp_agua` — Sonda `PT100` 3 Hilos + `MAX31865` en Puertos `10–13`)

* **Tabla en BD:** `sensor_configuracion` (módulo `temp_agua`, columna `parametros_tecnicos JSONB`)
* **Conexión física:** Sonda `PT100` de acero inoxidable ($100\text{ mm} \times 5\text{ mm}$, cable $3\text{ m}$, rango **$0\text{ a }400\ ^\circ\text{C}$**: **1 terminal horquilla Rojo** en `RTD+` y **2 terminales horquilla Azules** en `RTD-` y `F-`) $\rightarrow$ Módulo `MAX31865` por Bus SPI: **`CS` = Puerto `10`**, **`SDI` = Puerto `11`**, **`SCK` = Puerto `12`**, **`SDO` = Puerto `13`**.
* **Endpoints REST (`ROLE_ADMIN`):**
  * `GET /api/v1/sensores/temp_agua`
  * `PUT /api/v1/sensores/temp_agua/control`
  * `PUT /api/v1/sensores/temp_agua/tecnico`

| Categoría | Parámetro (JSON / API) | Tipo de Dato | Valores / Defecto | Propósito Técnico |
| :--- | :--- | :--- | :--- | :--- |
| **Operativo** | `activo`, `frecuenciaSeg` | `Boolean` / `Number` | `true`, `300` a `3600` s (defecto `300` s) | Habilita o pausa la lectura SPI del módulo `MAX31865`. |
| **Umbrales** | `minNormal` / `maxNormal` | `Number` | $18.0$ a $24.0\ ^\circ\text{C}$ (rango físico de la sonda en `/elementos`: **$0\text{ a }400\ ^\circ\text{C}$**) | Límites térmicos óptimos para oxigenación radicular de la solución nutritiva. |
| **Enlace ATC** | `compensarOtros` | `Boolean` | `true` / `false` | Permite que la lectura de la `PT100` alimente la compensación térmica del sensor `TDS`. |
| **Hardware RTD** | `tipoConexion`, `pinCs`, `rrefOhmios`, `filtroRed` | `String` / `Number` | `"3_hilos"`, `"GPIO10"`, $430.0\ \Omega$, `"60Hz"` / `"50Hz"` | Configuración para los 3 terminales horquilla (1 Rojo + 2 Azules) y resistencia de referencia del `MAX31865`. |
| **Calibración** | `offsetCelsius` | `Number` | `0.0` °C (`-20.0` a `+20.0` °C) | Ajuste de desviación térmica aplicado en el ESP32-S3 y persistido en NVS (`ptOffC`). |

---

## 7. Actuadores y Relés (`reles_canales` — 2 Módulos `HW-316` de 4 Relés = 8 Canales Físicos)

* **Tabla en BD:** `reles_canales`
* **Endpoints REST (`ROLE_ADMIN`):**
  * `GET /api/v1/reles`
  * `PATCH /api/v1/reles/{canal}/estado`
  * `PATCH /api/v1/reles/{canal}/nombre`
  * `PUT /api/v1/reles/modo`
  * `PUT /api/v1/reles/tecnico`

| Categoría | Parámetro (JSON / API) | Tipo de Dato | Valores / Defecto | Propósito Técnico |
| :--- | :--- | :--- | :--- | :--- |
| **Control Global** | `modoOperacion` | `String` | `"manual"` / `"automatico"` | En `"automatico"` el backend bloquea el encendido manual con `409 Conflict`. |
| **Identificación** | `canal`, `nombre` | `Number` / `String` | Canales `1..8` (UI, Backend y Firmware ESP32-S3) | Identificador del canal y nombre del equipo asignado (electrobombas, reflector, reservas). |
| **Estado** | `encendido` | `Boolean` | `false` (Apagado) / `true` (Encendido) | Estado conmutado en las borneras `COM` y `NO` (Normalmente Abierto) de cada relé `M1..M4`. |
| **Pines Módulo #1** | `pinGpio` (Canales 1 a 4 — Columna Izquierda) | `String` | Canal 1 (`IN1`/`M1`): `"GPIO 16"`<br>Canal 2 (`IN2`/`M2`): `"GPIO 17"`<br>Canal 3 (`IN3`/`M3`): `"GPIO 18"`<br>Canal 4 (`IN4`/`M4`): `"GPIO 8"` | Pines digitales de la columna izquierda del `ESP32-S3` conectados al `4 RELAY MODULE (1)`. |
| **Pines Módulo #2** | `pinGpio` (Canales 5 a 8 — Columna Derecha) | `String` | Canal 5 (`IN1`/`M1`): `"GPIO 42"`<br>Canal 6 (`IN2`/`M2`): `"GPIO 41"`<br>Canal 7 (`IN3`/`M3`): `"GPIO 40"`<br>Canal 8 (`IN4`/`M4`): `"GPIO 39"` | Pines digitales de la columna derecha del `ESP32-S3` conectados al `4 RELAY MODULE (2)`. |
| **Hardware Disparo** | `logicaDisparo` | `String` | `"low"` (Active LOW por defecto) / `"high"` | Los módulos `HW-316` con optoacoplador `PC817` activan la bobina con nivel `LOW` (`0 V`). |

---

## 8. Referencia de Payload JSON Consolidado (Backend $\leftrightarrow$ ESP32-S3)

```json
{
  "dispositivo_id": "ESP32_HIDRO_01",
  "fw": "1.1.0-http-real",
  "conectividad_http": {
    "ssid": "AXION_LAB_HIDROPONIA",
    "protocolo": "http",
    "brokerUrl": "http://192.168.1.100:8080",
    "endpoint": "/api/v1/iot/telemetria",
    "muestreoSeg": 300,
    "envioSeg": 300
  },
  "sensores": {
    "ph": {
      "activo": true,
      "frecuenciaSeg": 300,
      "minNormal": 5.5,
      "maxNormal": 6.5,
      "gpioAdc": "GPIO4_ADC1",
      "atenuacionAdc": "11db",
      "voltajeNeutroMv": 1500.0,
      "voltajeAcidoMv": 2032.44,
      "calPh400": 4.00,
      "calPh686": 6.86,
      "calPh918": 9.18,
      "estandar": "NIST"
    },
    "ec": {
      "activo": true,
      "frecuenciaSeg": 300,
      "minNormal": 800,
      "maxNormal": 1800,
      "ecMinMs": 0.8,
      "ecMaxMs": 1.8,
      "tdsMin": 400,
      "tdsMax": 900,
      "gpioAdc": "GPIO5_ADC1",
      "atenuacionAdc": "11db",
      "factorCalibracionK": 1.0,
      "kValue": 0.5,
      "sondaTempAsociada": "pt100",
      "tempManualAtc": 25.0,
      "coeficienteTermico": 0.02
    },
    "dht22": {
      "activo": true,
      "frecuenciaSeg": 300,
      "pinGpio": "GPIO 6",
      "resistenciaPullUp": "externa_10k",
      "tempMin": 18.0,
      "tempMax": 28.0,
      "humMin": 50.0,
      "humMax": 80.0,
      "offsetTemperatura": 0.0,
      "offsetHumedad": 0.0
    },
    "nivel_agua": {
      "activo": true,
      "frecuenciaSeg": 300,
      "pinAdc420": "GPIO7",
      "rangoCapsula": "C203G",
      "resistenciaShunt": 150,
      "unidadPrincipal": "pct",
      "nivelMinCm": 15.0,
      "nivelMaxCm": 90.0,
      "offsetCm": 0.0
    },
    "temp_agua": {
      "activo": true,
      "frecuenciaSeg": 300,
      "minNormal": 18.0,
      "maxNormal": 24.0,
      "compensarOtros": true,
      "tipoConexion": "3_hilos",
      "pinCs": "GPIO10",
      "rrefOhmios": 430.0,
      "filtroRed": "60Hz",
      "offsetCelsius": 0.0
    }
  },
  "reles": {
    "modoOperacion": "manual",
    "logicaDisparo": "low",
    "canales": [
      { "canal": 1, "nombre": "Electrobomba 1", "pinGpio": "GPIO 16", "encendido": false },
      { "canal": 2, "nombre": "Electrobomba 2", "pinGpio": "GPIO 17", "encendido": false },
      { "canal": 3, "nombre": "Electrobomba 3", "pinGpio": "GPIO 18", "encendido": false },
      { "canal": 4, "nombre": "Reflector", "pinGpio": "GPIO 8", "encendido": false },
      { "canal": 5, "nombre": "Canal Reserva 1 (Módulo #2 - M1)", "pinGpio": "GPIO 42", "encendido": false },
      { "canal": 6, "nombre": "Canal Reserva 2 (Módulo #2 - M2)", "pinGpio": "GPIO 41", "encendido": false },
      { "canal": 7, "nombre": "Canal Reserva 3 (Módulo #2 - M3)", "pinGpio": "GPIO 40", "encendido": false },
      { "canal": 8, "nombre": "Canal Reserva 4 (Módulo #2 - M4)", "pinGpio": "GPIO 39", "encendido": false }
    ]
  }
}
```
