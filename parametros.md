# Listado Completo de Parámetros Configurables por Módulo — AXIÓN - IOT

**Dispositivo Maestro:** `ESP32-S3-WROOM-1` (`ESP32_HIDRO_01`)  
**Arquitectura de Sincronización:** Frontend (`ROLE_ADMIN` + JWT) $\rightarrow$ API REST (Spring Boot) $\rightarrow$ PostgreSQL (`JSONB`) + Auditoría (`auditoria_cambios`) $\rightarrow$ `MqttCommandPublisher` (`axion/hidroponia/comandos` vía Mosquitto) $\rightarrow$ ESP32-S3 (aplicación en tiempo real y persistencia en **LittleFS**).

---

## 1. Nodo Maestro `ESP32-S3-WROOM-1` (`ESP32_HIDRO_01`)

* **Tabla en BD:** `dispositivos`
* **Endpoints REST (`ROLE_ADMIN`):**
  * `GET /api/v1/nodo-maestro/{dispositivoId}`
  * `PUT /api/v1/nodo-maestro/{dispositivoId}/conectividad`
  * `PUT /api/v1/nodo-maestro/{dispositivoId}/buffer`
  * `PUT /api/v1/nodo-maestro/{dispositivoId}/pinout`
  * `POST /api/v1/nodo-maestro/{dispositivoId}/sincronizar`

| Categoría | Parámetro | Tipo de Dato | Valores / Restricciones | Propósito Técnico |
| :--- | :--- | :--- | :--- | :--- |
| **Conectividad** | Configuración Wi-Fi (SSID / contraseña) | `String` | Credenciales de red local | Conexión del nodo maestro a la red local. |
| **Conectividad** | Configuración BLE | `Object` / `Boolean` | Habilitación / parámetros BLE | Aprovisionamiento y enlace local por Bluetooth Low Energy. |
| **Conectividad** | Dirección IP | `String` | IPv4 estática o DHCP | Direccionamiento de red del controlador. |
| **Conectividad** | Broker MQTT (URL, puertos, credenciales) | `Object` | Puertos `1883` / `9001` (TLS en producción) | Enlace bidireccional con `axion_mosquitto` para telemetría y comandos. |
| **Buffer Offline** | Frecuencias globales (`envioSeg`) | `Number` | Segundos (usado por Watchdog: desconexión tras $3 \times \text{envioSeg}$) | Controla la cadencia global de muestreo y envío de tramas. |
| **Buffer Offline** | Tamaño de partición LittleFS | `Number` | Espacio reservado en flash | Almacenamiento local de tramas y configuración ante cortes de red o energía. |
| **Buffer Offline** | Formato de lote | `String` | `"CBOR"` / `"CSV"` | Codificación de tramas almacenadas en el buffer offline. |
| **Buffer Offline** | Política de cola | `String` | `"FIFO"` | Descarte/envío ordenado (*First-In, First-Out*) cuando el buffer se llena. |
| **Hardware** | Matriz de pinout GPIO | `JSONB` | Pines válidos sin colisiones | Asignación lógica de pines del ESP32-S3 (validada por el backend antes de guardar). |
| **Acción Directa** | Sincronización de buffer | Comando (`POST`) | Ejecución inmediata | Ordena al ESP32-S3 volcar de inmediato las tramas pendientes en LittleFS. |
| **Seguridad** | Token físico de emergencia | `String` | Regenerable vía API | Recuperación de acceso de la cuenta del Administrador Único. |

---

## 2. Conductividad Eléctrica y TDS (`ec` / `ec_tds`)

* **Tabla en BD:** `sensor_configuracion` (módulo `ec`, columna `parametros_tecnicos JSONB`)
* **Endpoints REST (`ROLE_ADMIN`):**
  * `GET /api/v1/sensores/ec`
  * `PUT /api/v1/sensores/ec/control`
  * `PUT /api/v1/sensores/ec/tecnico`
  * `POST /api/v1/sensores/ec/calibrar`

| Categoría | Parámetro (JSON / API) | Tipo de Dato | Valores / Defecto | Propósito Técnico |
| :--- | :--- | :--- | :--- | :--- |
| **Operativo** | `activo` | `Boolean` | `true` (Activo) / `false` (Pausado) | Habilita o pausa las lecturas del sensor y su evaluación semáforo. |
| **Operativo** | `frecuencia_seg` | `Number` | Ej. `10` s | Intervalo de muestreo del sensor EC/TDS. |
| **Umbrales** | `min_us_cm` / `max_us_cm` | `Number` | Ej. `800` a `1800` $\mu\text{S/cm}$ (y equivalentes en `ppm`) | Límites agronómicos para alertas (`Normal`, `Advertencia` con margen del $5\%$, `Crítico`). |
| **Conversión** | `factor_conversion_tds` / `k_value` | `Number` | `0.50` (NaCl por defecto), `0.64–0.70` (hidroponía) | Conversión de EC a TDS: $\text{TDS} = \text{EC} \times 1000 \times K_{\text{value}}$. |
| **Calibración** | `factor_calibracion_k` | `Number` | `1.00` por defecto | Factor de corrección ajustado tras calibrar con solución patrón de $1.41\text{ mS/cm}$ o $2.77\text{ mS/cm}$. |
| **Compensación** | `temp_compensacion_c` | `Number` | $25.0\ ^\circ\text{C}$ | Temperatura de referencia para compensación térmica automática (ATC). |
| **Compensación** | `coeficiente_termico` | `Number` | $\alpha = 0.02\ / ^\circ\text{C}$ | Pendiente de compensación térmica de la conductividad. |
| **Hardware ADC** | `atenuacion_adc` / `atenuacionAdc` | `String` | `"11db"` (recomendado), `"6db"`, `"2.5db"`, `"0db"` | Rango de entrada del ADC del ESP32-S3 (`"11db"` evita saturación hasta $\sim 2.3\text{ V}$). |

---

## 3. Sensor de pH (`ph` — RS485 Modbus / Sonda)

* **Tabla en BD:** `sensor_configuracion` (módulo `ph`, columna `parametros_tecnicos JSONB`)
* **Endpoints REST (`ROLE_ADMIN`):**
  * `GET /api/v1/sensores/ph`
  * `PUT /api/v1/sensores/ph/control`
  * `PUT /api/v1/sensores/ph/tecnico`
  * `POST /api/v1/sensores/ph/calibrar`

| Categoría | Parámetro (JSON / API) | Tipo de Dato | Valores / Defecto | Propósito Técnico |
| :--- | :--- | :--- | :--- | :--- |
| **Operativo** | `activo` | `Boolean` | `true` / `false` | Habilita o pausa la lectura de acidez/alcalinidad. |
| **Operativo** | `frecuencia_seg` | `Number` | Ej. `10` s | Intervalo de muestreo del sensor de pH. |
| **Umbrales** | `min` / `max` | `Number` | Ej. `5.5` a `6.5` (rango sensor: $0.00$ a $14.00\text{ pH}$) | Banda óptima de pH del cultivo y disparo de alertas. |
| **Modbus RTU** | `uart` | `Number` / `String` | Puerto UART del ESP32-S3 | Interfaz serie asignada al transceptor RS485. |
| **Modbus RTU** | `baud_rate` / `baudRate` | `Number` | `9600` (defecto), `19200`, `115200` | Velocidad de comunicación Modbus RTU (trama `8-N-1`). |
| **Modbus RTU** | `slave_id` / `slaveId` | `Number` | `1` a `247` (defecto `1`) | Dirección del esclavo Modbus de la sonda de pH. |
| **Calibración NIST** | `cal_ph400` | `Number` | `4.00` (sobre rojo — ácido) | Punto ácido de calibración NIST/DIN (2 o 3 puntos). |
| **Calibración NIST** | `cal_ph686` | `Number` | `6.86` (sobre verde — neutro) | Punto neutro obligatorio del estándar NIST/DIN (no mezclar con estándar USA `7.00`). |
| **Calibración NIST** | `cal_ph918` | `Number` | `9.18` (sobre azul — alcalino) | Punto alcalino de calibración NIST/DIN (2 o 3 puntos). |

---

## 4. Temperatura de la Solución Nutritiva (`temp_agua` / `temperatura_agua` — PT100 + MAX31865)

* **Tabla en BD:** `sensor_configuracion` (módulo `temp_agua`, columna `parametros_tecnicos JSONB`)
* **Endpoints REST (`ROLE_ADMIN`):**
  * `GET /api/v1/sensores/temp_agua`
  * `PUT /api/v1/sensores/temp_agua/control`
  * `PUT /api/v1/sensores/temp_agua/tecnico`

| Categoría | Parámetro (JSON / API) | Tipo de Dato | Valores / Defecto | Propósito Técnico |
| :--- | :--- | :--- | :--- | :--- |
| **Operativo** | `activo` | `Boolean` | `true` / `false` | Habilita o pausa las lecturas de temperatura de la solución. |
| **Operativo** | `frecuencia_seg` | `Number` | Ej. `10` s | Intervalo de muestreo de la sonda PT100. |
| **Umbrales** | `min_c` / `max_c` | `Number` | Ej. $18.0$ a $24.0\ ^\circ\text{C}$ (rango RTD IEC 60751: $-200$ a $850\ ^\circ\text{C}$) | Límites térmicos de la solución nutritiva (alerta crítica ante circuito abierto en PT100). |
| **Hardware RTD** | `conexion` / `tipoConexion` | `String` | `"3_hilos"` (estándar), `"2_hilos"`, `"4_hilos"` | Configuración de cableado RTD en el amplificador MAX31865. |
| **Hardware RTD** | `rref_ohm` / `rrefOhmios` | `Number` | $430.0\ \Omega$ (tolerancia $\le 0.1\%$) | Resistencia de referencia de precisión del módulo MAX31865 para PT100. |
| **Constante RTD** | Coeficiente de platino ($\alpha$) | `Number` | $\alpha = 0.00385\ \Omega/\Omega/^\circ\text{C}$ | Coeficiente térmico estándar IEC 60751 de la sonda PT100. |
| **Filtrado** | `filtro_red` | `String` | `"50Hz"` / `"60Hz"` | Filtro digital del MAX31865 para rechazo de ruido de la red eléctrica. |

---

## 5. Microclima Ambiental (`dht22` / `ambiente_dht22`)

* **Tabla en BD:** `sensor_configuracion` (módulo `dht22`, columna `parametros_tecnicos JSONB`)
* **Endpoints REST (`ROLE_ADMIN`):**
  * `GET /api/v1/sensores/dht22`
  * `PUT /api/v1/sensores/dht22/control`
  * `PUT /api/v1/sensores/dht22/tecnico`

| Categoría | Parámetro (JSON / API) | Tipo de Dato | Valores / Defecto | Propósito Técnico |
| :--- | :--- | :--- | :--- | :--- |
| **Operativo** | `activo` | `Boolean` | `true` / `false` | Habilita o pausa la lectura ambiental. |
| **Operativo** | `frecuencia_seg` | `Number` | $\ge 2\text{ s}$ ($0.5\text{ Hz}$ mínimo técnico; ej. `10` s) | Intervalo de muestreo validado según datasheet Aosong AM2302 para evitar autocalentamiento y errores de checksum. |
| **Umbrales Temp.** | `temp_min_c` / `temp_max_c` | `Number` | Ej. $18.0$ a $28.0\ ^\circ\text{C}$ (rango: $-40$ a $80\ ^\circ\text{C}$, $\pm 0.5\ ^\circ\text{C}$) | Límites de temperatura del aire del entorno del cultivo. |
| **Umbrales Hum.** | `hum_min_pct` / `hum_max_pct` | `Number` | Ej. $50.0$ a $80.0\%\text{ HR}$ (rango: $0$ a $100\%\text{ HR}$, $\pm 2\%\text{ HR}$) | Límites de humedad relativa ambiental. |

---

## 6. Nivel de Agua del Tanque (`nivel_agua` — Sensor Hidrostático LMP633)

* **Tabla en BD:** `sensor_configuracion` (módulo `nivel_agua`, columna `parametros_tecnicos JSONB`)
* **Endpoints REST (`ROLE_ADMIN`):**
  * `GET /api/v1/sensores/nivel_agua`
  * `PUT /api/v1/sensores/nivel_agua/control`
  * `PUT /api/v1/sensores/nivel_agua/tecnico`
  * `POST /api/v1/sensores/nivel_agua/cero`

| Categoría | Parámetro (JSON / API) | Tipo de Dato | Valores / Defecto | Propósito Técnico |
| :--- | :--- | :--- | :--- | :--- |
| **Operativo** | `activo` | `Boolean` | `true` / `false` | Habilita o pausa la medición de nivel del tanque. |
| **Operativo** | `frecuencia_seg` | `Number` | Ej. `10` s | Intervalo de muestreo del sensor hidrostático. |
| **Umbrales** | `min_cm` / `max_cm` | `Number` | Ej. `15.0` a `90.0` cm | Límites de nivel bajo/alto (alerta crítica de hardware si la corriente cae $< 3.5\text{ mA}$). |
| **Visualización** | `unidad` | `String` | `"pct"`, `"cm"`, `"L"`, `"kPa"`, `"MPa"`, `"mH2O"`, `"m"` | Unidad principal de visualización y conversión de lectura. |
| **Hardware** | Rango nominal de cápsula | `String` / `Number` | Ej. `C203G` ($0$ a $20\text{ kPa}$ / $2.04\text{ mH}_2\text{O}$) | Escala física del transductor sumergible LMP633. |
| **Hardware ADC** | `shunt_ohm` / `resistenciaShunt` | `Number` | $100\ \Omega$ | Resistencia shunt que convierte $4\text{--}20\text{ mA}$ en $0.4\text{--}2.0\text{ V}$ seguros para el ADC del ESP32-S3. |
| **Calibración** | `offset_cm` | `Number` | `0.0` cm por defecto | Offset mecánico de punto cero para compensar la altura de suspensión sobre el fondo del tanque. |

---

## 7. Actuadores y Relés (`reles_canales` — 6 Canales)

* **Tabla en BD:** `reles_canales` (6 registros: `canal 1..6` para electrobombas, reflector y canales de reserva)
* **Endpoints REST (`ROLE_ADMIN`):**
  * `GET /api/v1/reles`
  * `PATCH /api/v1/reles/{canal}/estado`
  * `PUT /api/v1/reles/modo`
  * `PUT /api/v1/reles/tecnico`

| Categoría | Parámetro (JSON / API) | Tipo de Dato | Valores / Defecto | Propósito Técnico |
| :--- | :--- | :--- | :--- | :--- |
| **Control Global** | `modo_operacion` | `String` | `"manual"` / `"automatico"` | Define si el control es manual o automático (en `"automatico"` el backend rechaza `PATCH .../estado` con `409 Conflict`). |
| **Identificación** | `canal` / `nombre` | `Number` / `String` | `1..6` (ej. `"Bomba Principal"`) | Identificador del canal y etiqueta operativa del actuador. |
| **Estado** | `encendido` | `Boolean` | `true` (Encendido) / `false` (Apagado) | Orden directa de activación/desactivación enviada por MQTT al ESP32-S3. |
| **Hardware** | `pin_gpio` | `Number` | Pin digital seguro del ESP32-S3 | Pin GPIO físico asignado a cada canal de relé. |
| **Hardware** | `logica_disparo` | `String` | `"low"` / `"high"` | Polaridad eléctrica del módulo relé (`"low"` para módulos con optoacoplador Active LOW). |

---

## 8. Referencia de Payload JSON Consolidado de Configuración

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
    "uart": 2,
    "baud_rate": 9600,
    "slave_id": 1,
    "calibracion": {
      "cal_ph400": 4.00,
      "cal_ph686": 6.86,
      "cal_ph918": 9.18
    }
  },
  "temperatura_agua": {
    "activo": true,
    "frecuencia_seg": 10,
    "min_c": 18.0,
    "max_c": 24.0,
    "conexion": "3_hilos",
    "rref_ohm": 430.0,
    "coeficiente_platino": 0.00385,
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
  "nivel_agua": {
    "activo": true,
    "frecuencia_seg": 10,
    "unidad": "pct",
    "capsula": "C203G",
    "shunt_ohm": 100,
    "offset_cm": 0.0,
    "min_cm": 15.0,
    "max_cm": 90.0
  },
  "reles": {
    "modo_operacion": "manual",
    "canales": [
      {
        "canal": 1,
        "nombre": "Bomba Principal",
        "pin_gpio": 14,
        "logica_disparo": "low",
        "encendido": true
      }
    ]
  }
}
```