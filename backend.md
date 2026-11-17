# Planificación Técnica del Backend — AXIÓN - IOT

**Directorio:** `hidroponia.backend`  
**Stack Propuesto:** Java 21 LTS · Spring Boot 3.x · PostgreSQL 16 + TimescaleDB · Flyway · Spring Security (JWT) · Eclipse Paho / Spring Integration MQTT · WebSocket (STOMP)  
**Estado:** Documento de planificación para revisión manual (previo a implementación).

---

## 1. Arquitectura General y Stack Tecnológico

El backend actuará como **concentrador central, motor de reglas y API REST/WebSocket** entre el nodo maestro `ESP32-S3-WROOM-1` (`ESP32_HIDRO_01`) y el frontend en React (`hidroponia.frontend`).

| Capa / Componente | Tecnología | Responsabilidad |
| :--- | :--- | :--- |
| **API REST y Seguridad** | Spring Web + Spring Security + JWT | Exponer endpoints por vista y aplicar control de acceso (`Público` vs. `ADMIN`). |
| **Persistencia Relacional** | PostgreSQL 16 + Spring Data JPA | Usuarios, configuración de sensores (`JSONB`), relés, alertas y bitácora. |
| **Series Temporales** | TimescaleDB (Hypertable) | Almacenamiento comprimido de lecturas de sensores y consultas agregadas para gráficas/reportes. |
| **Migraciones de Esquema** | Flyway | Control de versiones SQL reproducible desde el arranque. |
| **Ingesta y Comandos IoT** | MQTT (Broker Mosquitto / EMQX) | Recibir telemetría del ESP32-S3 y enviarle comandos de relés/configuración. |
| **Tiempo Real al Frontend** | WebSocket (STOMP) o SSE | Empujar lecturas nuevas y alertas activas al Dashboard sin recargar. |

---

## 2. Esquema Base de Datos (PostgreSQL + TimescaleDB)

1. **`dispositivos`:** Registro del nodo maestro (`id = 'ESP32_HIDRO_01'`, firmware, último heartbeat, estado Wi-Fi/RSSI, configuración de red/MQTT/LittleFS en `JSONB`, matriz de pinout GPIO en `JSONB`).
2. **`sensor_configuracion`:** Una fila por módulo (`ec`, `ph`, `nivel_agua`, `temp_agua`, `dht22`) con estado `activo`, `frecuencia_seg`, umbrales agronómicos y parámetros técnicos específicos en columna `parametros_tecnicos JSONB` (ej. calibración NIST `4.00/6.86/9.18`, `rref_ohm: 430.0`, `shunt_ohm: 100`, `atenuacion_adc: "11db"`, `k_value: 0.5`).
3. **`telemetria_lecturas` *(Hypertable TimescaleDB)*:**
   - Columnas: `ts TIMESTAMPTZ NOT NULL`, `dispositivo_id VARCHAR`, `ph DOUBLE PRECISION`, `ec_us_cm DOUBLE PRECISION`, `tds_ppm DOUBLE PRECISION`, `temp_agua_c DOUBLE PRECISION`, `temp_amb_c DOUBLE PRECISION`, `hum_amb_pct DOUBLE PRECISION`, `nivel_pct DOUBLE PRECISION`, `nivel_cm DOUBLE PRECISION`, `rssi INTEGER`, `estado_sensores JSONB`.
   - Particionada por `ts` (chunks de 7 días), compresión automática tras 7 días y política de retención configurable (defecto 365 días).
4. **`reles_canales`:** 6 registros (`canal 1..6`, `nombre`, `pin_gpio`, `encendido`, `modo_operacion`, `logica_disparo`).
5. **`alertas`:** `id`, `nivel` (`critico`, `advertencia`, `normal`), `modulo`, `titulo`, `detalle`, `url_destino`, `leida`, `creada_en`.
6. **`auditoria_cambios`:** Registro inmutable (`id`, `fecha_hora`, `modulo`, `parametro`, `valor_anterior`, `valor_nuevo`, `usuario`).
7. **`admin_cuenta` y `sistema_preferencias`:** Credenciales cifradas (BCrypt) del `Administrador Único`, token de recuperación de emergencia, tiempo de expiración de sesión, tema/tipografía global y política de retención/backups.

---

## 3. Separación por Roles y Control de Acceso

En coherencia con `frontend.md` (Sección 2.5):

| Rol | Autenticación | Acceso Permitido | Restricciones |
| :--- | :--- | :--- | :--- |
| **Investigación / Observación** (`PUBLIC`) | **Sin usuario ni contraseña** | Lectura de Dashboard en vivo, gráficas de tendencias, lectura de alertas y exportación de reportes históricos (`CSV`, `XLSX`, `JSON`). | Bloqueado (`401/403`) en cualquier operación `POST`, `PUT`, `PATCH` o `DELETE` sobre sensores, relés, nodo ESP32-S3, backups o configuración. |
| **Administrador Único** (`ROLE_ADMIN`) | **JWT Bearer Token** (`POST /api/v1/auth/login`) | Control total: calibración, umbrales, relés, configuración del ESP32-S3, respaldos manuales/programados, auditoría y cuenta. | Sesión con expiración configurable (defecto 30 min) y trazabilidad obligatoria en `auditoria_cambios`. |

---

## 4. Endpoints y Contratos Agrupados por Vistas del Frontend

### 4.1 Vista: Login y Recuperación (`Login.jsx`)
* `POST /api/v1/auth/login` *(Público)* — Valida correo y contraseña del Administrador Único; retorna `{ token, rol, correo, expiraEnSeg }`.
* `POST /api/v1/auth/recuperar` *(Público)* — Valida el token físico de emergencia del ESP32-S3 y actualiza la contraseña con BCrypt.
* `POST /api/v1/auth/logout` *(Admin)* — Invalida el token actual (lista negra o rotación de versión de token).

### 4.2 Vista: Dashboard Principal (`Dashboard.jsx`)
* `GET /api/v1/dashboard/resumen` *(Público)* — Devuelve última lectura de telemetría, umbrales vigentes para evaluar semáforo (`Normal`, `Advertencia`, `Crítico`, `Pausado`), estado de los 6 relés y salud del ESP32-S3.
* `GET /api/v1/dashboard/tendencias?variable={ph|ec|temp_agua|temp_ambiente|humedad_ambiente|nivel_agua}&inicio=...&fin=...` *(Público)* — Consulta TimescaleDB (`time_bucket`) para devolver la serie individual de las últimas 24 h o intervalo seleccionado.
* `GET /api/v1/alertas` *(Público)* — Lista alertas recientes para el dropdown del header.
* `PATCH /api/v1/alertas/{id}/leer` y `PATCH /api/v1/alertas/leer-todas` *(Admin)* — Marca alertas como leídas.

### 4.3 Vistas: Configuración de Sensores *(Exclusivo `ROLE_ADMIN`)*
* `GET /api/v1/sensores/{modulo}` — Obtiene configuración operativa y técnica (`ph`, `ec`, `nivel_agua`, `temp_agua`, `dht22`).
* `PUT /api/v1/sensores/{modulo}/control` — Actualiza estado (`activo`), frecuencia de lectura (`dht22 >= 2 s`) y umbrales mínimos/máximos.
* `PUT /api/v1/sensores/{modulo}/tecnico` — Actualiza parámetros de hardware (`uart`, `baudRate`, `slaveId`, `atenuacionAdc`, `kValue`, `rrefOhmios`, `tipoConexion`, `resistenciaShunt`, `offset_cm`, etc.).
* `POST /api/v1/sensores/ph/calibrar` — Registra calibración con juego de tampones **NIST (`4.00`, `6.86`, `9.18`)** y envía comando de calibración al ESP32-S3.
* `POST /api/v1/sensores/ec/calibrar` — Registra calibración con solución patrón (`1.41` o `2.77 mS/cm`) y actualiza el factor `k`.
* `POST /api/v1/sensores/nivel_agua/cero` — Registra calibración de punto cero / offset mecánico del tanque.

### 4.4 Vista: Control de Equipos y Relés (`Reles.jsx`) *(Exclusivo `ROLE_ADMIN`)*
* `GET /api/v1/reles` — Lista estado de los 6 canales, pines GPIO asignados, modo (`manual` / `automatico`) y lógica de disparo (`low` / `high`).
* `PATCH /api/v1/reles/{canal}/estado` — Enciende/apaga un relé (rechaza con `409 Conflict` si el modo global está en `automatico`) y publica orden MQTT al ESP32-S3.
* `PUT /api/v1/reles/modo` — Cambia entre `manual` y `automatico`.
* `PUT /api/v1/reles/tecnico` — Actualiza pines GPIO y lógica de disparo.

### 4.5 Vista: Nodo Maestro ESP32-S3 (`NodoMaestro.jsx`) *(Exclusivo `ROLE_ADMIN`)*
* `GET /api/v1/nodo-maestro/{dispositivoId}` — Métricas de salud (RSSI, consumo, PSRAM, tramas en buffer LittleFS) y configuración actual.
* `PUT /api/v1/nodo-maestro/{dispositivoId}/conectividad` — Guarda configuración Wi-Fi, BLE, IP y broker MQTT.
* `PUT /api/v1/nodo-maestro/{dispositivoId}/buffer` — Guarda frecuencias globales, tamaño de partición LittleFS, lote CBOR/CSV y política FIFO.
* `PUT /api/v1/nodo-maestro/{dispositivoId}/pinout` — Valida que no haya colisiones de pines GPIO y guarda la matriz de asignación.
* `POST /api/v1/nodo-maestro/{dispositivoId}/sincronizar` — Envía comando MQTT al ESP32-S3 para volcar inmediatamente el buffer offline pendiente.

### 4.6 Vista: Reportes, Exportación y Respaldos (`Reportes.jsx`)
* `GET /api/v1/reportes/historial?inicio=...&fin=...&variables=...&intervalo=...&page=0&size=8` *(Público)* — Consulta paginada y serie agregada para la gráfica histórica de investigadores.
* `GET /api/v1/reportes/exportar?formato={csv|xlsx|json}&inicio=...&fin=...&variables=...` *(Público)* — Genera y transmite en streaming el archivo descargable (`Apache POI` para XLSX, `OpenCSV`/streaming para CSV, Jackson para JSON).
* `GET /api/v1/respaldos/politica` y `PUT /api/v1/respaldos/politica` *(Admin)* — Lee y actualiza la política de retención (días, frecuencia y formato `.zip`/`.json`).
* `POST /api/v1/respaldos/ejecutar` y `POST /api/v1/respaldos/depurar` *(Admin)* — Dispara manualmente un respaldo o depuración inmediata.

### 4.7 Vista: Configuración General y Auditoría (`ConfiguracionGeneral.jsx`) *(Exclusivo `ROLE_ADMIN`)*
* `GET /api/v1/configuracion/cuenta` y `PUT /api/v1/configuracion/cuenta` — Actualiza nombre visible, correo de alertas, expiración de sesión y cambio de contraseña.
* `POST /api/v1/configuracion/regenerar-token` — Genera un nuevo token de emergencia.
* `GET /api/v1/configuracion/apariencia` y `PUT /api/v1/configuracion/apariencia` — Persiste tema y escala tipográfica (`titlePx`, `subtitlePx`, `basePx`).
* `GET /api/v1/auditoria?modulo=...&page=0&size=10` — Consulta la bitácora inmutable de cambios.

---

## 5. Funciones Propias del Backend (Servicios Internos y Segundo Plano)

Estas funciones **no pertenecen a una vista específica**, sino que operan de forma autónoma en el servidor Spring Boot:

1. **Ingesta MQTT (`MqttTelemetryListener`):**
   - Suscrito al tópico `axion/hidroponia/telemetria` (y tópicos de estado/LWT del ESP32-S3).
   - Valida el payload JSON, calcula valores derivados si faltan (ej. `tds_ppm = ec_us_cm * k_value`) y persiste la lectura en la hypertable `telemetria_lecturas`.
   - Actualiza `ultimo_heartbeat` y `rssi` del dispositivo `ESP32_HIDRO_01`.
2. **Motor de Evaluación de Umbrales y Alertas (`AlertEvaluationService`):**
   - Por cada trama recibida, compara los valores contra los límites configurados en `sensor_configuracion` (respetando el margen de advertencia del 5 %).
   - Si un sensor entra en estado `Advertencia` o `Crítico` (o reporta error de hardware como circuito abierto en PT100 o `< 3.5 mA` en LMP633), crea una alerta evitando duplicados consecutivos (*cooldown*) y opcionalmente notifica por correo al `correoAlertas` del administrador.
3. **Despachador de Comandos IoT (`MqttCommandPublisher`):**
   - Publica mensajes JSON hacia el ESP32-S3 (`axion/hidroponia/comandos`) cada vez que el Administrador cambia un relé, calibra un sensor, modifica frecuencias/umbrales o solicita sincronización de buffer.
4. **Difusión en Tiempo Real (`WebSocket / STOMP`):**
   - Emite cada nueva trama validada al tópico `/topic/telemetria` y cada alerta nueva a `/topic/alertas`, permitiendo que el frontend actualice el Dashboard al instante tanto para investigadores como para el administrador.
5. **Watchdog de Conectividad del ESP32-S3 (`@Scheduled`):**
   - Verifica periódicamente (ej. cada 30 s) si `ESP32_HIDRO_01` dejó de reportar por más de $3 \times \text{envioSeg}$; en ese caso marca el nodo como desconectado y registra una alerta de pérdida de enlace.
6. **Planificador de Respaldos y Retención (`@Scheduled`):**
   - Ejecuta la exportación comprimida automática (`.zip` / `.json`) según la frecuencia configurada (`diario`, `semanal`, `mensual`).
   - Sincroniza la política de retención de TimescaleDB (`drop_chunks` / `retention_policy`) según `diasRetencion`.
7. **Interceptor / Servicio de Auditoría (`AuditService`):**
   - Registra automáticamente en `auditoria_cambios` el valor anterior, el valor nuevo, la fecha/hora y el usuario (`Administrador Único`) ante cualquier modificación en endpoints protegidos.

---

## 6. Criterios de Evaluación Manual antes de Crear el Código

Para validar este plan antes de iniciar la implementación en `hidroponia.backend`:
1. Confirmar si el transporte en tiempo real del backend hacia el ESP32-S3 será **exclusivamente MQTT** (Mosquitto) o si también habrá endpoints HTTP de respaldo para el microcontrolador.
2. Confirmar si se requiere **envío real de correos SMTP** para alertas críticas o solo registro en pantalla.
3. Confirmar si la extensión **TimescaleDB** estará disponible en el PostgreSQL del entorno de despliegue (Docker / servidor local) o si se usará PostgreSQL estándar con particionamiento nativo por rango de fechas.
