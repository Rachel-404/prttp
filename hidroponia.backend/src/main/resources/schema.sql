-- ============================================================================
-- AXIÓN - IOT | Esquema idempotente y datos semilla (PostgreSQL)
-- Preserva los datos históricos, calibraciones y bitácora entre reinicios.
-- ============================================================================

-- 1. Dispositivos (Controlador Maestro ESP32-S3)
CREATE TABLE IF NOT EXISTS dispositivos (
    id VARCHAR(64) PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    firmware VARCHAR(32) NOT NULL DEFAULT '1.1.0-http-real',
    conectado BOOLEAN NOT NULL DEFAULT TRUE,
    rssi INTEGER DEFAULT -58,
    alimentacion VARCHAR(64) DEFAULT '5V USB-C',
    consumo_ma INTEGER DEFAULT 160,
    psram_ocupada_pct INTEGER DEFAULT 12,
    buffer_tramas INTEGER DEFAULT 0,
    ultimo_heartbeat TIMESTAMPTZ,
    config_red JSONB NOT NULL DEFAULT '{}'::jsonb,
    config_buffer JSONB NOT NULL DEFAULT '{}'::jsonb,
    pinout JSONB NOT NULL DEFAULT '[]'::jsonb,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Configuración de Sensores (ec, ph, nivel_agua, temp_agua, dht22)
CREATE TABLE IF NOT EXISTS sensor_configuracion (
    modulo VARCHAR(32) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    min_normal DOUBLE PRECISION,
    max_normal DOUBLE PRECISION,
    parametros_tecnicos JSONB NOT NULL DEFAULT '{}'::jsonb,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE sensor_configuracion DROP COLUMN IF EXISTS frecuencia_seg;

-- 3. Telemetría (Series Temporales)
CREATE TABLE IF NOT EXISTS telemetria_lecturas (
    id BIGSERIAL PRIMARY KEY,
    ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    dispositivo_id VARCHAR(64) NOT NULL REFERENCES dispositivos(id),
    ph DOUBLE PRECISION,
    ec_us_cm DOUBLE PRECISION,
    tds_ppm DOUBLE PRECISION,
    temp_agua_c DOUBLE PRECISION,
    temp_amb_c DOUBLE PRECISION,
    hum_amb_pct DOUBLE PRECISION,
    nivel_pct DOUBLE PRECISION,
    nivel_cm DOUBLE PRECISION,
    rssi INTEGER,
    estado_sensores JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_telemetria_disp_ts ON telemetria_lecturas (dispositivo_id, ts DESC);

-- 4. Control de Equipos / Relés (8 Canales: 2x Módulos HW-316 de 4 Relés)
CREATE TABLE IF NOT EXISTS reles_canales (
    canal INTEGER PRIMARY KEY CHECK (canal BETWEEN 1 AND 8),
    nombre VARCHAR(120) NOT NULL,
    pin_gpio VARCHAR(32) NOT NULL,
    encendido BOOLEAN NOT NULL DEFAULT FALSE,
    modo_operacion VARCHAR(20) NOT NULL DEFAULT 'manual',
    logica_disparo VARCHAR(10) NOT NULL DEFAULT 'low',
    regla_auto JSONB NOT NULL DEFAULT '{}'::jsonb,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE reles_canales DROP CONSTRAINT IF EXISTS reles_canales_canal_check;
ALTER TABLE reles_canales ADD CONSTRAINT reles_canales_canal_check CHECK (canal BETWEEN 1 AND 8);
ALTER TABLE reles_canales ADD COLUMN IF NOT EXISTS regla_auto JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 5. Alertas del Sistema
CREATE TABLE IF NOT EXISTS alertas (
    id BIGSERIAL PRIMARY KEY,
    nivel VARCHAR(20) NOT NULL,
    modulo VARCHAR(64) NOT NULL,
    titulo VARCHAR(160) NOT NULL,
    detalle VARCHAR(320) NOT NULL,
    url_destino VARCHAR(160) DEFAULT '/',
    leida BOOLEAN NOT NULL DEFAULT FALSE,
    creada_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alertas_leida_fecha ON alertas (leida, creada_en DESC);

-- 6. Bitácora Inmutable de Auditoría
CREATE TABLE IF NOT EXISTS auditoria_cambios (
    id BIGSERIAL PRIMARY KEY,
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modulo VARCHAR(80) NOT NULL,
    parametro VARCHAR(120) NOT NULL,
    valor_anterior VARCHAR(200),
    valor_nuevo VARCHAR(200),
    usuario VARCHAR(80) NOT NULL DEFAULT 'Administrador Único'
);

CREATE INDEX IF NOT EXISTS idx_auditoria_modulo_fecha ON auditoria_cambios (modulo, fecha_hora DESC);

-- 7. Cuenta del Administrador Único
CREATE TABLE IF NOT EXISTS admin_cuenta (
    id INTEGER PRIMARY KEY DEFAULT 1,
    correo VARCHAR(160) NOT NULL UNIQUE,
    password_hash VARCHAR(200) NOT NULL,
    nombre_visible VARCHAR(120) NOT NULL DEFAULT 'Ing. Soporte Principal',
    expiracion_minutos INTEGER NOT NULL DEFAULT 30,
    token_recuperacion VARCHAR(120),
    token_version INTEGER NOT NULL DEFAULT 1,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Preferencias Globales y Política de Respaldos
CREATE TABLE IF NOT EXISTS sistema_preferencias (
    id INTEGER PRIMARY KEY DEFAULT 1,
    tema VARCHAR(20) NOT NULL DEFAULT 'oscuro',
    title_px INTEGER NOT NULL DEFAULT 24,
    subtitle_px INTEGER NOT NULL DEFAULT 18,
    base_px INTEGER NOT NULL DEFAULT 14,
    backup_frecuencia VARCHAR(20) NOT NULL DEFAULT 'diario',
    backup_formato VARCHAR(20) NOT NULL DEFAULT 'zip',
    dias_retencion INTEGER NOT NULL DEFAULT 365,
    accion_vencimiento VARCHAR(20) NOT NULL DEFAULT 'archivar',
    config_respaldos JSONB NOT NULL DEFAULT '{
        "correo": {
            "activo": false,
            "correo": "admin@universidad.edu",
            "frecuencia": "semanal",
            "formato": "xlsx"
        },
        "drive": {
            "conectado": false,
            "cuenta": "admin@universidad.edu",
            "ruta": "/AXION-IOT/Respaldos_Hidroponia/",
            "frecuencia": "24h",
            "ultimoRespaldo": "Sin respaldos registrados"
        }
    }'::jsonb,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Cola de Comandos HTTP (Backend -> ESP32-S3)
CREATE TABLE IF NOT EXISTS comandos_pendientes (
    id BIGSERIAL PRIMARY KEY,
    dispositivo_id VARCHAR(64) NOT NULL REFERENCES dispositivos(id),
    comando VARCHAR(64) NOT NULL,
    parametros JSONB NOT NULL DEFAULT '{}'::jsonb,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    entregado_en TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_comandos_disp_estado ON comandos_pendientes (dispositivo_id, estado, creado_en ASC);

-- ============================================================================
-- DATOS SEMILLA INICIALES (IDEMPOTENTES)
-- ============================================================================

INSERT INTO dispositivos (id, nombre, firmware, conectado, rssi, ultimo_heartbeat, config_red, config_buffer, pinout)
VALUES (
    'ESP32_HIDRO_01',
    'Nodo Maestro ESP32-S3-WROOM-1',
    '1.1.0-http-real',
    FALSE,
    NULL,
    NULL,
    '{"ssid":"","asignacionIp":"dhcp","ipLocal":"","mascara":"255.255.255.0","gateway":"","dns":"8.8.8.8","protocolo":"http","serverUrl":"http://localhost:8080","usuario":"ESP32_HIDRO_01"}'::jsonb,
    '{"muestreoSeg":300,"envioSeg":300}'::jsonb,
    '[
      {"gpio":"GPIO 4","interfaz":"ADC1_CH3","modulo":"Sensor de pH Industrial","estado":"Normal"},
      {"gpio":"GPIO 5","interfaz":"ADC1_CH4","modulo":"Sensor EC / TDS","estado":"Normal"},
      {"gpio":"GPIO 6","interfaz":"Digital 1-Wire","modulo":"DHT22 Microclima Ambiental","estado":"Normal"},
      {"gpio":"GPIO 7","interfaz":"ADC1_CH6","modulo":"Nivel Sumergible LMP633","estado":"Normal"},
      {"gpio":"GPIO 10, 11, 12, 13","interfaz":"Bus SPI","modulo":"Sonda PT100 + MAX31865","estado":"Normal"},
      {"gpio":"GPIO 16, 17, 18, 8","interfaz":"Salida Digital","modulo":"Módulo 4 Relés #1 HW-316","estado":"Normal"},
      {"gpio":"GPIO 42, 41, 40, 39","interfaz":"Salida Digital","modulo":"Módulo 4 Relés #2 HW-316","estado":"Normal"}
    ]'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO sensor_configuracion (modulo, nombre, activo, min_normal, max_normal, parametros_tecnicos) VALUES
('ec', 'Conductividad Eléctrica', TRUE, 800, 1800, '{"ecMinMs":0.8,"ecMaxMs":1.8,"tdsMin":400,"tdsMax":900,"sondaTempAsociada":"pt100","coeficienteTermico":0.02,"tempManualAtc":25.0,"factorCalibracionK":1.0,"kValue":0.5,"gpioAdc":"GPIO5_ADC1","atenuacionAdc":"11db"}'::jsonb),
('ph', 'Sensor de pH Industrial', TRUE, 5.5, 6.5, '{"gpioAdc":"GPIO4_ADC1","atenuacionAdc":"11db","voltajeNeutroMv":1500.0,"voltajeAcidoMv":2032.44,"calPh400":4.00,"calPh686":7.00,"calPh918":9.18,"estandar":"NIST"}'::jsonb),
('nivel_agua', 'Nivel de Agua', TRUE, 20, 90, '{"unidadPrincipal":"pct","nivelMinCm":15,"nivelMaxCm":90,"resistenciaShunt":150,"offsetCm":0.0,"rangoCapsula":"C203G","pinAdc420":"GPIO7","litros":350}'::jsonb),
('temp_agua', 'Temperatura del Agua', TRUE, 18.0, 24.0, '{"compensarOtros":true,"tipoConexion":"3_hilos","pinCs":"GPIO10","rrefOhmios":430.0,"filtroRed":"60Hz","offsetCelsius":0.0}'::jsonb),
('dht22', 'Microclima Ambiental', TRUE, 18.0, 28.0, '{"pinGpio":"GPIO 6","resistenciaPullUp":"externa_10k","tempMin":18.0,"tempMax":28.0,"humMin":50.0,"humMax":80.0,"offsetTemperatura":0.0,"offsetHumedad":0.0}'::jsonb)
ON CONFLICT (modulo) DO NOTHING;

INSERT INTO reles_canales (canal, nombre, pin_gpio, encendido) VALUES
(1, 'Electrobomba 1', 'GPIO 16', FALSE),
(2, 'Electrobomba 2', 'GPIO 17', FALSE),
(3, 'Electrobomba 3', 'GPIO 18', FALSE),
(4, 'Reflector', 'GPIO 8', FALSE),
(5, 'Canal Reserva 1', 'GPIO 42', FALSE),
(6, 'Canal Reserva 2', 'GPIO 41', FALSE),
(7, 'Canal Reserva 3', 'GPIO 40', FALSE),
(8, 'Canal Reserva 4', 'GPIO 39', FALSE)
ON CONFLICT (canal) DO NOTHING;

INSERT INTO sistema_preferencias (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
