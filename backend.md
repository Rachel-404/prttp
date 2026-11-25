# Documentación Técnica del Backend — AXIÓN - IOT

**Directorio:** `hidroponia.backend`  
**Versión:** `1.1.0`  
**Stack Implementado:** Java 21 LTS · Spring Boot 3.4.3 · Spring Data JPA · PostgreSQL · Spring Security (JWT `jjwt 0.12.6`) · Apache POI (`SXSSFWorkbook` streaming XLSX)  
**Transporte IoT:** 100 % HTTP REST (`X-Device-Key`) con cola persistente de comandos y confirmación `/ack`.

---

## 1. Arquitectura General y Stack Tecnológico

El backend actúa como **API REST central, evaluador de alertas, motor de control automático de relés y cola de comandos HTTP** entre el nodo maestro `ESP32-S3-WROOM-1` (`ESP32_HIDRO_01`) y la aplicación React (`hidroponia.frontend`).

| Capa / Componente | Tecnología Implementada | Responsabilidad |
| :--- | :--- | :--- |
| **API REST y Seguridad** | Spring Web + Spring Security + JWT (`HMAC-SHA256`) | Endpoints REST por vista con separación estricta `PUBLIC` (consulta/investigación) vs. `ROLE_ADMIN`. |
| **Persistencia Relacional** | PostgreSQL + Spring Data JPA (`schema.sql` idempotente) | Configuración de sensores (`JSONB`), 8 canales de relés, lecturas históricas, alertas, auditoría y cola de comandos. |
| **Ingesta y Comandos IoT** | HTTP REST (`/api/v1/iot/**`) + `X-Device-Key` | Recibe telemetría del `ESP32-S3`, entrega comandos pendientes/no confirmados y procesa confirmaciones `/ack`. |
| **Exportación y Respaldos** | Apache POI (`SXSSFWorkbook` streaming) + CSV | Exportación eficiente en memoria sin riesgo de OOM y generación de respaldos reales en `respaldos_locales/`. |
| **Tareas Programadas** | Spring `@Scheduled` (`ScheduledTasksService`) | Watchdog dinámico de conectividad ($\max(60\text{ s}, 3 \times \text{envioSeg})$) y retención con archivado previo. |

---

## 2. Esquema de Base de Datos (`schema.sql` Idempotente)

El esquema se inicializa de forma segura con `CREATE TABLE IF NOT EXISTS` y datos semilla con `ON CONFLICT DO NOTHING` (sin destruir datos entre reinicios; `axion.db.drop-on-shutdown=false` por defecto en `DatabaseShutdownCleanup`):

1. **`dispositivos`:** Registro del controlador `ESP32_HIDRO_01` (firmware `1.1.0-http-real`, conectividad, `rssi`, `ultimo_heartbeat`, configuración Wi-Fi/HTTP y `deviceKey` en `config_red_mqtt JSONB`, cadencia `muestreoSeg`/`envioSeg` en `config_buffer JSONB` y matriz `pinout JSONB`).
2. **`sensor_configuracion`:** 5 módulos reales (`ph`, `ec`, `dht22`, `nivel_agua`, `temp_agua`) con `activo`, `frecuencia_seg`, `min_normal`, `max_normal` y `parametros_tecnicos JSONB` depurados de parámetros obsoletos (sin RS485 Modbus ni `coeficienteAlpha`).
3. **`telemetria_lecturas`:** Clave primaria `id BIGSERIAL PRIMARY KEY`, `ts TIMESTAMPTZ`, `dispositivo_id`, lecturas (`ph`, `ec_us_cm`, `tds_ppm`, `temp_agua_c`, `temp_amb_c`, `hum_amb_pct`, `nivel_pct`, `nivel_cm`, `rssi`) y `estado_sensores JSONB`. Los sensores en estado distinto a `"ok"` se almacenan como `NULL`.
4. **`reles_canales`:** **8 canales físicos** (`CHECK (canal BETWEEN 1 AND 8)`) correspondientes a los **2× Módulos de 4 Relés `HW-316`** (`GPIO 16, 17, 18, 8` y `GPIO 42, 41, 40, 39`), `encendido`, `modo_operacion` (`manual`/`automatico`) y `logica_disparo` (`low`/`high`).
5. **`alertas`:** Registro de alertas (`critico`, `advertencia`, `normal`) con deduplicación por módulo y nivel no leído.
6. **`auditoria_cambios`:** Bitácora persistente de cambios (`fecha_hora`, `modulo`, `parametro`, `valor_anterior`, `valor_nuevo`, `usuario`).
7. **`admin_cuenta`:** Cuenta del Administrador Único con `password_hash` (`BCrypt`), `token_recuperacion` cifrado con `BCrypt` (generado aleatoriamente en `AdminSeedRunner` si no se define `ADMIN_RECOVERY_TOKEN`), `expiracion_minutos` y `token_version` para revocación inmediata de JWT.
8. **`sistema_preferencias`:** Tema visual, escala tipográfica (`title_px`, `subtitle_px`, `base_px`), política de retención y configuración de respaldos.
9. **`comandos_pendientes`:** Cola HTTP (`PENDIENTE` → `ENTREGADO` → `EJECUTADO`) con reentrega automática de comandos `ENTREGADO` sin `/ack` dentro de una ventana de 30 minutos.

---

## 3. Control de Acceso y Seguridad

| Rol | Autenticación | Acceso Permitido | Restricciones y Controles |
| :--- | :--- | :--- | :--- |
| **Investigación / Consulta** (`PUBLIC`) | Sin credenciales | `GET /dashboard/**`, `GET /alertas`, `GET /configuracion/apariencia`, `GET /reportes/historial`, `GET /reportes/exportar`, `POST /auth/login`, `POST /auth/recuperar`, `POST /auth/logout`. | Cualquier ruta restante bajo `/api/v1/**` devuelve `403 Forbidden`. |
| **Administrador Único** (`ROLE_ADMIN`) | `Authorization: Bearer <JWT>` | Configuración de sensores, calibraciones, control de los 8 relés, nodo maestro ESP32-S3, respaldos, cuenta y auditoría. | Clave JWT derivada con `SHA-256` si es `< 32` bytes; revocación por `token_version`. |
| **Controlador `ESP32-S3`** (`IoT`) | Cabecera `X-Device-Key` | `POST /iot/telemetria`, `GET /iot/comandos`, `POST /iot/comandos/{id}/ack`, `POST /iot/wifi-redes`. | Comparación en tiempo constante (`MessageDigest.isEqual`) contra `axion.iot.device-key` y contra la `deviceKey` actualizada en `dispositivos`. |

---

## 4. Endpoints REST Implementados

### 4.1 Autenticación (`AuthController`)
* `POST /api/v1/auth/login` — Valida credenciales `BCrypt` y emite JWT con expiración configurable.
* `POST /api/v1/auth/recuperar` — Valida el token de recuperación (`BCrypt` / tiempo constante), actualiza la contraseña y rota `token_version`.
* `POST /api/v1/auth/logout` — Incrementa `token_version` para invalidar el JWT activo.

### 4.2 Dashboard y Alertas (`DashboardController`, `AlertaController`)
* `GET /api/v1/dashboard/resumen?dispositivoId=ESP32_HIDRO_01` — Estado del dispositivo, última lectura, 5 sensores y 8 relés.
* `GET /api/v1/dashboard/tendencias?variable=...&inicio=...&fin=...` — Serie temporal filtrada por `estado_sensores = "ok"` (excluye ceros falsos de sensores pausados o en error).
* `GET /api/v1/alertas` *(Público)*, `PATCH /api/v1/alertas/{id}/leer` y `PATCH /api/v1/alertas/leer-todas` *(Admin)*.

### 4.3 Sensores (`SensorController` — `ROLE_ADMIN`)
* `GET /api/v1/sensores/{modulo}` (`ph`, `ec`, `dht22`, `nivel_agua`, `temp_agua`).
* `PUT /api/v1/sensores/{modulo}/control` — Valida frecuencias (`2–3600 s` en `dht22`, `15–3600 s` en el resto), límites físicos del hardware (`0–14 pH`, `0–2000 µS/cm`, `0–400 °C` PT100, `-40 a 80 °C` DHT22, `0–100 %` nivel) y coherencia `minNormal < maxNormal` incluso en actualizaciones parciales.
* `PUT /api/v1/sensores/{modulo}/tecnico` — Purga automáticamente claves obsoletas (`uart`, `baudRate`, `slaveId`, `coeficienteAlpha`) y encola `CONFIG_TECNICA_SENSOR`.
* `POST /api/v1/sensores/ph/calibrar`, `POST /api/v1/sensores/ec/calibrar`, `POST /api/v1/sensores/nivel_agua/cero`.

### 4.4 Control de Relés (`ReleController` — `ROLE_ADMIN`)
* `GET /api/v1/reles` — Lista los 8 canales ordenados (`1..8`).
* `PATCH /api/v1/reles/{canal}/estado` — Conmuta el canal y encola `SET_RELE` (rechaza con `409 Conflict` si está en modo `automatico`).
* `PATCH /api/v1/reles/{canal}/nombre` y `PUT /api/v1/reles/modo` (`manual` / `automatico`, encola `SET_MODO_RELES`).
* `PUT /api/v1/reles/tecnico` — Valida que cada pin sea un GPIO válido y seguro del `ESP32-S3-WROOM-1 (N16R8)` (bloquea `0, 3, 19, 20, 22–37, 45, 46` y duplicados) y encola `CONFIG_RELES_TECNICO`.

### 4.5 Nodo Maestro ESP32-S3 (`NodoMaestroController` — `ROLE_ADMIN`)
* `GET /api/v1/nodo-maestro/{dispositivoId}` — Devuelve una copia saneada (sin exponer `password`, `wifiPassword`, `passTransporte` ni `deviceKey` y sin mutar la entidad JPA).
* `PUT /api/v1/nodo-maestro/{dispositivoId}/conectividad` — Persiste `deviceKey` en BD (sincronizado con `IotHttpController`) y encola `CONFIG_CONECTIVIDAD`.
* `POST /api/v1/nodo-maestro/{dispositivoId}/wifi/escanear` y `GET /api/v1/nodo-maestro/{dispositivoId}/wifi/redes`.
* `PUT /api/v1/nodo-maestro/{dispositivoId}/buffer` — Actualiza cadencia HTTP (`15–3600 s`) en NVS (`CONFIG_BUFFER`).
* `PUT /api/v1/nodo-maestro/{dispositivoId}/pinout` y `POST /api/v1/nodo-maestro/{dispositivoId}/sincronizar`.

### 4.6 Reportes, Respaldos y Configuración (`ReporteController`, `ConfiguracionController`)
* `GET /api/v1/reportes/historial` *(Público)* y `GET /api/v1/reportes/exportar` *(Público, streaming XLSX con `SXSSFWorkbook`)*.
* `GET /api/v1/respaldos/politica` *(incluye `totalLecturasActivas` reales de PostgreSQL)*, `PUT /api/v1/respaldos/politica`, `POST /api/v1/respaldos/ejecutar` *(genera archivo `.xlsx`/`.csv` real en `respaldos_locales/`)* y `POST /api/v1/respaldos/depurar`.
* `GET/PUT /api/v1/configuracion/cuenta`, `POST /api/v1/configuracion/regenerar-token`, `GET/PUT /api/v1/configuracion/apariencia`.
* `GET /api/v1/auditoria?modulo=...` y `GET /api/v1/auditoria/exportar` *(búsqueda flexible insensible a mayúsculas por módulo)*.

---

## 5. Servicios Internos y Tareas en Segundo Plano

1. **Ingesta y Control Automático (`TelemetryService`):** Al recibir `POST /api/v1/iot/telemetria`, filtra lecturas según `estado_sensores`, persiste en PostgreSQL, actualiza heartbeat/RSSI, dispara `AlertEvaluationService` y, si los relés están en `modoOperacion = "automatico"`, evalúa los umbrales de `pH`, `EC`, `temperatura` y `nivel` para conmutar automáticamente los canales y encolar `SET_RELE`.
2. **Evaluación de Alertas (`AlertEvaluationService`):** Evalúa márgenes del 5 % (advertencia) y fuera de rango (crítico) para todos los sensores activos cuyo estado sea `"ok"`.
3. **Cola Confiable de Comandos (`DeviceCommandService`):** Entrega comandos `PENDIENTE` y reentrega comandos `ENTREGADO` sin confirmación `/ack` dentro de los últimos 30 minutos.
4. **Watchdog y Retención (`ScheduledTasksService`):**
   * Cada `15 s` verifica conectividad con umbral dinámico $\max(60\text{ s}, 3 \times \text{envioSeg})$.
   * Diario a las `02:00 AM`, si `accionVencimiento = "archivar"`, exporta un respaldo `.xlsx` en `respaldos_locales/` antes de purgar registros vencidos.
