# CONTRATO DE INTEGRACIÓN FRONTEND ↔ BACKEND (AXIÓN - IOT)

**Versión del Contrato:** 1.0.0  
**Prototipo Frontend:** `v2.6.2` (HTML5 / CSS3 / ES6+)  
**Stack Backend Destino:** Java 17+ / Spring Boot 3.x (REST + JPA)  
**Nodo Hardware Objetivo:** ESP32-S3-WROOM-1 N16R8 (`ESP32_HIDRO_01`)

---

## 1. Resumen de Arquitectura y Desacoplamiento

El Frontend de **AXIÓN - IOT** está construido bajo una arquitectura **totalmente desacoplada** de la capa de transporte y persistencia:

1. **Estado Actual (Prototipo Estático Desacoplado):**
   - **`js/axion-simulator.js`**: Emite tramas JSON periódicas cada `3000 ms` mediante el evento estándar del navegador `window.dispatchEvent(new CustomEvent('axion:telemetria', { detail: trama }))`.
   - **`js/axion-cache.js`**: Actúa como adaptador de persistencia temporal sobre `localStorage` (bajo el prefijo `axion_proto_`), manteniendo sincronizadas las configuraciones, el estado de alertas y la bitácora de auditoría entre vistas.
   - **`js/dashboard.js`**: Escucha `axion:telemetria` y evalúa visualmente la semaforización (**Verde = Normal**, **Naranja = Advertencia**, **Rojo = Crítico / Pausado**) comparando la lectura recibida contra los umbrales almacenados en caché.

2. **Transición a Producción con Spring Boot:**
   - Para conectar el Frontend al Backend en Spring Boot, únicamente se reemplaza el origen de datos en `axion-simulator.js` / `axion-cache.js` por llamadas `fetch()` (o suscripción WebSocket/STOMP) hacia los endpoints `/api/v1/...`.
   - **Fuente de Verdad:** El Frontend realiza validaciones y evaluaciones visuales de umbrales únicamente para experiencia de usuario (UI/UX). **Spring Boot es la fuente única de verdad** para persistencia en base de datos, validación de reglas de negocio, recepción de telemetría desde el ESP32-S3, disparo real de alertas y control físico de actuadores.

---

## 2. Glosario de Traducción de Componentes UI (Para el Desarrollador Backend)

La interfaz utiliza controles industriales personalizados para evitar entradas ambiguas. A continuación se especifica el tipo de dato real que el Frontend envía y espera recibir en los DTOs de Java:

| Componente en la UI | Comportamiento Visual | Tipo de Dato Real (JSON / Java DTO) | Ejemplos de Valores Esperados |
| :--- | :--- | :--- | :--- |
| **Controles Stepper (`-` / `+`)** | Botones de incremento/decremento con lectura fija en pantalla (`24 px`, umbrales, etc.). El usuario no escribe texto libre. | Numérico puro (`Integer` o `Double`), **sin** unidades en el valor. | `24`, `18`, `14`, `0.0` |
| **Inputs Numéricos de Umbral / Offset / Calibración** | Campos con sufijo o unidad en la etiqueta HTML (`mS/cm`, `pH`, `cm`, `Ω`). | `Double` o `Integer` en Java (`BigDecimal` opcional para precisión). | `5.50`, `6.50`, `1.00`, `430.0`, `1950` |
| **Switches e Indicadores (`Activo` / `Pausado`, `Encendido` / `Apagado`)** | Botones tipo píldora con color semáforo Verde (`activo`) o Rojo/Gris (`inactivo`/`apagado`). | `Boolean` puro (`true` = Activo / Encendido, `false` = Pausado / Apagado). | `true`, `false` |
| **Selector de Baudios Modbus (`#tec-baud-rate`)** | Desplegable con sufijo visual `bps` en la etiqueta (`9600 bps`). | `Integer` estándar de comunicación serial. | `9600`, `19200`, `115200` |
| **Selector de Hilos PT100 (`#tec-temp-conexion`)** | Desplegable de configuración RTD MAX31865 (`3 hilos`, `2 hilos`, `4 hilos`). | `String` (código normalizado o enum). | `"3_WIRES"` (o `"3_hilos"`), `"2_WIRES"`, `"4_WIRES"` |
| **Selector de Atenuación ADC (`#tec-ec-atenuacion`)** | Desplegable técnico de ganancia interna del ESP32-S3 (`11 dB (Rango 150-2450 mV)`). | `String` de código de atenuación. | `"11dB"`, `"6dB"`, `"2.5dB"`, `"0dB"` |
| **Selector de Unidad de Nivel (`#unidad-principal-na`)** | Desplegable de unidades hidrostáticas y volumétricas. | `String` simbólico corto (sin corchetes). | `"pct"`, `"cm"`, `"L"`, `"kPa"`, `"MPa"`, `"mH2O"`, `"m"` |
| **Timestamps y Fechas** | Mostrados en formato local legible (`16/11/2026 19:45:12`). | `String` en formato **ISO 8601 UTC** (`Instant` / `OffsetDateTime` en Java). | `"2026-11-16T14:30:00Z"` |

---

## 3. Especificación de Endpoints REST Requeridos (Spring Boot Controllers)

Todos los endpoints deben responder con `Content-Type: application/json` y habilitar CORS para el origen del Frontend durante desarrollo y despliegue.

| Método HTTP | Ruta del Endpoint | Descripción Funcional | Códigos HTTP Esperados |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/telemetria/actual` | Retorna la última trama de telemetría recibida del controlador ESP32-S3 para renderizar el Dashboard en tiempo real. | `200 OK`, `204 No Content`, `503 Service Unavailable` |
| `GET` | `/api/v1/telemetria/historico` | Consulta series de tiempo filtradas por query params: `?desde=ISO8601&hasta=ISO8601&sensor=ph,ec&intervalo=1h`. Alimenta gráficas y exportaciones CSV/XLSX/JSON. | `200 OK`, `400 Bad Request` |
| `GET` | `/api/v1/configuracion/{dispositivoId}` | Obtiene la configuración vigente del nodo: umbrales de sensores, baudios/Slave ID Modbus, factor `k` del TDS, shunt `100 Ω` y `offset_cm` del LMP633, hilos/`Rref` PT100 y estado de los 6 relés. | `200 OK`, `404 Not Found` |
| `POST` | `/api/v1/configuracion/{dispositivoId}` | Persiste los parámetros enviados desde los formularios del Frontend, sincroniza cambios con el ESP32-S3 e inserta automáticamente registros en `bitacora_auditoria` por cada parámetro modificado. | `200 OK`, `400 Bad Request`, `422 Unprocessable Entity` |
| `POST` | `/api/v1/actuadores/rele` | Conmuta el estado (`encendido: true/false`) de uno de los 6 canales de relés (electrobombas / reflector / reserva) y registra la acción. | `200 OK`, `400 Bad Request`, `409 Conflict` |
| `GET` | `/api/v1/alertas` | Lista las alertas generadas por el motor de reglas del Backend para el Centro de Alertas del Header Global (orden descendente por fecha). | `200 OK` |
| `PATCH` | `/api/v1/alertas/{id}/leer` | Marca una alerta individual como leída (`leida: true`) y retorna el nuevo conteo de alertas pendientes (o `PATCH /api/v1/alertas/leer-todas`). | `200 OK`, `404 Not Found` |
| `GET` | `/api/v1/auditoria` | Retorna el historial de cambios de configuración con filtro opcional `?modulo=...` para la sección "Bitácora de Auditoría de Configuración". | `200 OK` |

---

## 4. Contratos JSON Exactos (Payloads de Entrada y Salida)

### 4.1 Payload de Telemetría (`ESP32-S3 → Spring Boot → Frontend`)

Corresponde a la respuesta de `GET /api/v1/telemetria/actual` y al mensaje emitido por WebSocket o `axion:telemetria`. **El Frontend depende estrictamente de estos nombres de clave:**

```json
{
  "ts": "2026-11-16T14:30:00Z",          // Timestamp ISO 8601 UTC de la muestra en el nodo
  "dispositivo_id": "ESP32_HIDRO_01",    // Identificador único del controlador maestro
  "fw": "1.0.3",                         // Versión de firmware reportada por el ESP32-S3
  "datos": {
    "temperatura_amb": 24.5,             // Sensor DHT22 (°C)
    "humedad_amb": 65.2,                 // Sensor DHT22 (% HR)
    "temperatura_solucion": 21.8,        // Sonda RTD PT100 / MAX31865 (°C)
    "nivel_ph": 6.25,                    // Sensor pH RS485 Modbus (pH)
    "tds_ppm": 550.0,                    // Sensor EC / TDS (ppm; EC = tds_ppm / k)
    "nivel_tanque_cm": 125.5             // Transmisor hidrostático LMP633 (cm)
  },
  "estado": {                            // Estado de salud por periférico: "ok" | "error" | "pausado"
    "dht22": "ok",
    "pt100": "ok",
    "ph": "ok",
    "tds": "ok",
    "nivel": "ok"
  },
  "rssi": -61                            // Intensidad de señal Wi-Fi en dBm
}
```

### 4.2 Payload de Configuración de Sensores y Hardware (`Frontend ↔ Spring Boot DTO`)

Corresponde al cuerpo enviado en `POST /api/v1/configuracion/{dispositivoId}` y retornado por `GET /api/v1/configuracion/{dispositivoId}`:

```json
{
  "dispositivo_id": "ESP32_HIDRO_01",
  "ec_tds": {
    "activo": true,                      // Boolean: estado operativo del sensor
    "frecuencia_seg": 10,                // Integer: intervalo de lectura en segundos
    "min_us_cm": 800,                    // Integer: umbral mínimo en µS/cm
    "max_us_cm": 1800,                   // Integer: umbral máximo en µS/cm
    "factor_k": 1.00,                    // Double: factor de calibración de celda (k)
    "atenuacion_adc": "11dB",            // String: "11dB" | "6dB" | "2.5dB" | "0dB"
    "fuente_atc": "pt100",               // String: "pt100" | "sen0708" | "fijo25"
    "temp_manual_c": 25.0                // Double: usada solo si fuente_atc == "fijo25"
  },
  "ph_rs485": {
    "activo": true,
    "frecuencia_seg": 10,
    "min_ph": 5.50,                      // Double: umbral ácido mínimo
    "max_ph": 6.50,                      // Double: umbral alcalino máximo
    "slave_id": 1,                       // Integer: dirección Modbus RTU (1 - 247)
    "baud": 9600,                        // Integer: 9600 | 19200 | 115200
    "calibracion_3_puntos": {            // Valores ADC crudos de referencia por buffer
      "ph_4_01": 1950,
      "ph_7_00": 1500,
      "ph_10_01": 1050
    }
  },
  "nivel_lmp633": {
    "activo": true,
    "frecuencia_seg": 10,
    "unidad_principal": "pct",           // String: "pct" | "cm" | "L" | "kPa" | "MPa" | "mH2O" | "m"
    "min_cm": 15.0,                      // Double: nivel mínimo crítico (protección de bomba)
    "max_cm": 90.0,                      // Double: nivel máximo de alerta
    "shunt_ohmios": 100,                 // Integer: resistencia shunt 100 Ω (0.4 - 2.0 V ADC)
    "offset_cm": 0.0                     // Double: offset de calibración física sobre el fondo
  },
  "temperatura_pt100": {
    "activo": true,
    "frecuencia_seg": 10,
    "min_c": 18.0,                       // Double: temperatura mínima del agua (°C)
    "max_c": 24.0,                       // Double: temperatura máxima del agua (°C)
    "compensar_otros": true,             // Boolean: proveer temperatura ATC a EC y pH
    "wires": "3_WIRES",                  // String: "3_WIRES" | "2_WIRES" | "4_WIRES"
    "rref": 430.0                        // Double: resistencia de referencia MAX31865 (Ω)
  },
  "dht22": {
    "activo": true,
    "frecuencia_seg": 10,
    "temp_min_c": 18.0,
    "temp_max_c": 28.0,
    "hum_min_pct": 50.0,
    "hum_max_pct": 80.0
  },
  "reles": [
    { "canal": 1, "nombre": "Electrobomba 1 (Recirculación Principal)", "encendido": false },
    { "canal": 2, "nombre": "Electrobomba 2 (Dosificación / Oxigenación)", "encendido": false },
    { "canal": 3, "nombre": "Electrobomba 3 (Llenado / Auxiliar)", "encendido": false },
    { "canal": 4, "nombre": "Reflector (Iluminación del Cultivo)", "encendido": false },
    { "canal": 5, "nombre": "Canal Reserva 1 (Disponible)", "encendido": false },
    { "canal": 6, "nombre": "Canal Reserva 2 (Disponible)", "encendido": false }
  ]
}
```

### 4.3 Payload de Comando de Actuador (`POST /api/v1/actuadores/rele`)

```json
{
  "dispositivo_id": "ESP32_HIDRO_01",
  "canal": 1,
  "encendido": true
}
```

### 4.4 Payload de Alertas y Auditoría (`GET /api/v1/alertas` y `GET /api/v1/auditoria`)

```json
// Elemento de GET /api/v1/alertas
{
  "id": "alerta-1",
  "nivel": "critico",                    // "critico" | "advertencia" | "normal"
  "titulo": "pH RS485 fuera de umbral",
  "detalle": "Lectura: 6.85 pH (Máx: 6.50 pH)",
  "ts": "2026-11-16T19:45:00Z",
  "leida": false,
  "modulo_origen": "ph_rs485"            // Permite al Frontend mapear la ruta de redirección
}
```

```json
// Elemento de GET /api/v1/auditoria
{
  "id": 42,
  "ts": "2026-11-16T19:45:12Z",
  "modulo": "pH RS485",
  "parametro": "Umbral Máximo de pH",
  "valor_anterior": "6.50 pH",
  "valor_nuevo": "6.80 pH",
  "responsable": "Administrador Único"
}
```

---

## 5. Modelo de Datos Recomendado (Entidades JPA / Tablas Relacionales)

### Justificación Técnica del Modelo Relacional

En un sistema IoT de monitoreo agrícola y científico, **las tablas no deben existir aisladas ni sin llaves foráneas (`FOREIGN KEY`)**:
- **Integridad Referencial:** Cada lectura de telemetría, alerta o cambio de configuración pertenece obligatoriamente a un controlador físico (`dispositivo_id`). Sin esta relación, es imposible escalar a múltiples reservorios/invernaderos, validar si una lectura corresponde a la última configuración aplicada o purgar/archivar datos de un nodo de forma consistente.
- **Trazabilidad Científica (RF-PUB / CU-17):** Al relacionar `lecturas_telemetria` y `bitacora_auditoria` con `dispositivos`, un investigador puede correlacionar exactamente en qué instante se modificó un factor `k` o un `offset_cm` y cómo afectó las series históricas posteriores.

### Esquema Relacional Minimalista (4 Entidades Principales + Alertas)

```text
dispositivos (1) ──────────┬──────── (1) configuracion_dispositivo
                           ├──────── (N) lecturas_telemetria
                           ├──────── (N) bitacora_auditoria
                           └──────── (N) alertas_sistema
```

1. **`dispositivos`** (Entidad raíz del controlador ESP32-S3)
   - `id` (`VARCHAR(64)`, **PK** — ej. `"ESP32_HIDRO_01"`)
   - `nombre` (`VARCHAR(100)`, `NOT NULL`)
   - `ip_actual` (`VARCHAR(45)`)
   - `firmware` (`VARCHAR(20)`)
   - `en_linea` (`BOOLEAN`, `DEFAULT false`)
   - `rssi` (`INTEGER`)
   - `ultima_conexion` (`TIMESTAMP WITH TIME ZONE`)

2. **`configuracion_dispositivo`** (Relación **1:1** con `dispositivos`)
   - `id` (`BIGINT` / `SERIAL`, **PK**)
   - `dispositivo_id` (`VARCHAR(64)`, **FK → `dispositivos.id`**, `UNIQUE`, `NOT NULL`)
   - `parametros_sensores_json` (`JSONB` o columnas tipadas para umbrales, `baud`, `slave_id`, `factor_k`, `atenuacion_adc`, `shunt_ohmios`, `offset_cm`, `wires`, `rref`, calibración 3 puntos)
   - `estado_reles_json` (`JSONB` o tabla hija `canales_rele` con `canal`, `nombre`, `encendido`)
   - `actualizado_en` (`TIMESTAMP WITH TIME ZONE`, `NOT NULL`)

3. **`lecturas_telemetria`** (Relación **N:1** con `dispositivos` — Series de tiempo)
   - `id` (`BIGINT`, **PK**)
   - `dispositivo_id` (`VARCHAR(64)`, **FK → `dispositivos.id`**, `NOT NULL`)
   - `ts` (`TIMESTAMP WITH TIME ZONE`, `NOT NULL`) — *Índice compuesto `(dispositivo_id, ts DESC)` para consultas rápidas de rango histórico y retención.*
   - `temperatura_amb` (`DOUBLE PRECISION`)
   - `humedad_amb` (`DOUBLE PRECISION`)
   - `temperatura_solucion` (`DOUBLE PRECISION`)
   - `nivel_ph` (`DOUBLE PRECISION`)
   - `tds_ppm` (`DOUBLE PRECISION`)
   - `nivel_tanque_cm` (`DOUBLE PRECISION`)
   - `estado_sensores_json` (`JSONB` — mapa `dht22`, `pt100`, `ph`, `tds`, `nivel`)
   - `rssi` (`INTEGER`)

4. **`bitacora_auditoria` y `alertas_sistema`** (Relación **N:1** con `dispositivos`)
   - **`bitacora_auditoria`**:
     - `id` (`BIGINT`, **PK**)
     - `dispositivo_id` (`VARCHAR(64)`, **FK → `dispositivos.id`**, `NOT NULL`)
     - `ts` (`TIMESTAMP WITH TIME ZONE`, `NOT NULL`)
     - `modulo` (`VARCHAR(60)`, `NOT NULL`)
     - `parametro` (`VARCHAR(100)`, `NOT NULL`)
     - `valor_anterior` (`VARCHAR(120)`, `NOT NULL`)
     - `valor_nuevo` (`VARCHAR(120)`, `NOT NULL`)
     - `responsable` (`VARCHAR(80)`, `NOT NULL`)
   - **`alertas_sistema`**:
     - `id` (`BIGINT`, **PK**)
     - `dispositivo_id` (`VARCHAR(64)`, **FK → `dispositivos.id`**, `NOT NULL`)
     - `ts` (`TIMESTAMP WITH TIME ZONE`, `NOT NULL`)
     - `nivel` (`VARCHAR(20)`, `NOT NULL` — `"critico"`, `"advertencia"`, `"normal"`)
     - `titulo` (`VARCHAR(120)`, `NOT NULL`)
     - `detalle` (`VARCHAR(255)`, `NOT NULL`)
     - `modulo_origen` (`VARCHAR(40)`, `NOT NULL`)
     - `leida` (`BOOLEAN`, `DEFAULT false`, `NOT NULL`)