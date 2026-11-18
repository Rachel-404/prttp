-- ============================================================================
-- AXIÓN - IOT | Esquema inicial PostgreSQL + TimescaleDB (Flyway V1)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 1. Dispositivos (Nodo Maestro ESP32-S3)
CREATE TABLE dispositivos (
    id VARCHAR(64) PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    firmware VARCHAR(32) NOT NULL DEFAULT '1.0.3',
    conectado BOOLEAN NOT NULL DEFAULT TRUE,
    rssi INTEGER DEFAULT -58,
    alimentacion VARCHAR(64) DEFAULT '5V USB-C',
    consumo_ma INTEGER DEFAULT 160,
    psram_ocupada_pct INTEGER DEFAULT 12,
    buffer_tramas INTEGER DEFAULT 0,
    ultimo_heartbeat TIMESTAMPTZ,
    config_red_mqtt JSONB NOT NULL DEFAULT '{}'::jsonb,
    config_buffer JSONB NOT NULL DEFAULT '{}'::jsonb,
    pinout JSONB NOT NULL DEFAULT '[]'::jsonb,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Configuración de Sensores (ec, ph, nivel_agua, temp_agua, dht22)
CREATE TABLE sensor_configuracion (
    modulo VARCHAR(32) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    frecuencia_seg INTEGER NOT NULL DEFAULT 10,
    min_normal DOUBLE PRECISION,
    max_normal DOUBLE PRECISION,
    parametros_tecnicos JSONB NOT NULL DEFAULT '{}'::jsonb,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Telemetría (Series Temporales - Hypertable TimescaleDB)
CREATE TABLE telemetria_lecturas (
    id BIGSERIAL,
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
    estado_sensores JSONB NOT NULL DEFAULT '{}'::jsonb,
    PRIMARY KEY (id, ts)
);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
        PERFORM create_hypertable('telemetria_lecturas', 'ts', if_not_exists => TRUE, chunk_time_interval => INTERVAL '7 days');
    END IF;
END $$;

CREATE INDEX idx_telemetria_disp_ts ON telemetria_lecturas (dispositivo_id, ts DESC);

-- 4. Control de Equipos / Relés (6 Canales)
CREATE TABLE reles_canales (
    canal INTEGER PRIMARY KEY CHECK (canal BETWEEN 1 AND 6),
    nombre VARCHAR(120) NOT NULL,
    pin_gpio VARCHAR(32) NOT NULL,
    encendido BOOLEAN NOT NULL DEFAULT FALSE,
    modo_operacion VARCHAR(20) NOT NULL DEFAULT 'manual',
    logica_disparo VARCHAR(10) NOT NULL DEFAULT 'low',
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Alertas del Sistema
CREATE TABLE alertas (
    id BIGSERIAL PRIMARY KEY,
    nivel VARCHAR(20) NOT NULL,
    modulo VARCHAR(64) NOT NULL,
    titulo VARCHAR(160) NOT NULL,
    detalle VARCHAR(320) NOT NULL,
    url_destino VARCHAR(160) DEFAULT '/',
    leida BOOLEAN NOT NULL DEFAULT FALSE,
    creada_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alertas_leida_fecha ON alertas (leida, creada_en DESC);

-- 6. Bitácora Inmutable de Auditoría
CREATE TABLE auditoria_cambios (
    id BIGSERIAL PRIMARY KEY,
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modulo VARCHAR(80) NOT NULL,
    parametro VARCHAR(120) NOT NULL,
    valor_anterior VARCHAR(200),
    valor_nuevo VARCHAR(200),
    usuario VARCHAR(80) NOT NULL DEFAULT 'Administrador Único'
);

CREATE INDEX idx_auditoria_modulo_fecha ON auditoria_cambios (modulo, fecha_hora DESC);

-- 7. Cuenta del Administrador Único
CREATE TABLE admin_cuenta (
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
CREATE TABLE sistema_preferencias (
    id INTEGER PRIMARY KEY DEFAULT 1,
    tema VARCHAR(20) NOT NULL DEFAULT 'oscuro',
    title_px INTEGER NOT NULL DEFAULT 24,
    subtitle_px INTEGER NOT NULL DEFAULT 18,
    base_px INTEGER NOT NULL DEFAULT 14,
    backup_frecuencia VARCHAR(20) NOT NULL DEFAULT 'diario',
    backup_formato VARCHAR(20) NOT NULL DEFAULT 'zip',
    dias_retencion INTEGER NOT NULL DEFAULT 365,
    accion_vencimiento VARCHAR(20) NOT NULL DEFAULT 'archivar',
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- DATOS SEMILLA INICIALES
-- ============================================================================

INSERT INTO dispositivos (id, nombre, firmware, conectado, rssi, ultimo_heartbeat, config_red_mqtt, config_buffer, pinout)
VALUES (
    'ESP32_HIDRO_01',
    'Nodo Maestro ESP32-S3-WROOM-1',
    '1.0.3',
    TRUE,
    -58,
    NOW(),
    '{"ssid":"AXION_LAB_HIDROPONIA","bleActivo":true,"asignacionIp":"dhcp","ipLocal":"192.168.1.120","mascara":"255.255.255.0","gateway":"192.168.1.1","dns":"8.8.8.8","protocolo":"mqtt","puerto":8883,"brokerUrl":"mqtts://broker.axion-iot.local","endpoint":"axion/hidroponia/telemetria","usuario":"esp32_nodo_01","habilitarTls":true}'::jsonb,
    '{"muestreoSeg":2,"envioSeg":10,"particionMb":10,"formatoBuffer":"cbor","loteTramas":50,"politicaDesbordamiento":"fifo"}'::jsonb,
    '[{"gpio":"GPIO 1","interfaz":"ADC1_CH0","modulo":"Sensor EC / TDS","estado":"Normal"},{"gpio":"GPIO 2","interfaz":"ADC1_CH1","modulo":"Nivel LMP633 (Shunt 100 Ω)","estado":"Normal"},{"gpio":"GPIO 4","interfaz":"1-Wire","modulo":"DHT22 Microclima","estado":"Normal"},{"gpio":"GPIO 5","interfaz":"SPI CS","modulo":"PT100 MAX31865","estado":"Normal"},{"gpio":"GPIO 17/18/21","interfaz":"UART1 RS485","modulo":"Sensor pH Modbus RTU","estado":"Normal"}]'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO sensor_configuracion (modulo, nombre, activo, frecuencia_seg, min_normal, max_normal, parametros_tecnicos) VALUES
('ec', 'Conductividad Eléctrica (EC / TDS)', TRUE, 10, 800, 1800, '{"ecMinMs":0.8,"ecMaxMs":1.8,"tdsMin":400,"tdsMax":900,"sondaTempAsociada":"pt100","coeficienteTermico":0.02,"tempManualAtc":25.0,"factorCalibracionK":1.0,"kValue":0.5,"atenuacionAdc":"11db"}'::jsonb),
('ph', 'Sensor de pH RS485 Modbus', TRUE, 10, 5.5, 6.5, '{"tempMax":24.0,"baudRate":9600,"slaveId":1,"calPh400":4.00,"calPh686":6.86,"calPh918":9.18,"estandar":"NIST"}'::jsonb),
('nivel_agua', 'Nivel de Agua (LMP633)', TRUE, 10, 20, 90, '{"unidadPrincipal":"pct","nivelMinCm":15,"nivelMaxCm":90,"resistenciaShunt":100,"offsetCm":0.0,"rangoCapsula":"C203G","litros":350}'::jsonb),
('temp_agua', 'Temperatura del Agua (PT100)', TRUE, 10, 18.0, 24.0, '{"compensarOtros":true,"tipoConexion":"3_hilos","rrefOhmios":430.0,"filtroRed":"60Hz"}'::jsonb),
('dht22', 'Microclima Ambiental (DHT22)', TRUE, 10, 18.0, 28.0, '{"humMin":50.0,"humMax":80.0}'::jsonb)
ON CONFLICT (modulo) DO NOTHING;

INSERT INTO reles_canales (canal, nombre, pin_gpio, encendido) VALUES
(1, 'Electrobomba 1 (Recirculación Principal)', 'GPIO 4', FALSE),
(2, 'Electrobomba 2 (Dosificación / Oxigenación)', 'GPIO 5', FALSE),
(3, 'Electrobomba 3 (Llenado / Auxiliar)', 'GPIO 6', FALSE),
(4, 'Reflector (Iluminación del Cultivo)', 'GPIO 7', FALSE),
(5, 'Canal Reserva 1 (Disponible)', 'GPIO 15', FALSE),
(6, 'Canal Reserva 2 (Disponible)', 'GPIO 16', FALSE)
ON CONFLICT (canal) DO NOTHING;

INSERT INTO sistema_preferencias (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

INSERT INTO alertas (nivel, modulo, titulo, detalle, url_destino, leida) VALUES
('critico', 'ph', 'pH RS485 fuera de umbral', 'Lectura: 6.85 pH (Máx: 6.50 pH)', '/sensores/ph', FALSE),
('advertencia', 'temp_agua', 'Desconexión temporal PT100', 'Resistencia fuera de rango (Circuito abierto)', '/sensores/nivel-temperatura?tab=temperatura', FALSE),
('normal', 'nodo_maestro', 'Sincronización Buffer Offline', '142 tramas enviadas tras reconexión Wi-Fi', '/nodo-maestro', TRUE);

INSERT INTO telemetria_lecturas (ts, dispositivo_id, ph, ec_us_cm, tds_ppm, temp_agua_c, temp_amb_c, hum_amb_pct, nivel_pct, nivel_cm, rssi, estado_sensores) VALUES
(NOW() - INTERVAL '4 hours', 'ESP32_HIDRO_01', 6.05, 1180, 590, 21.2, 23.4, 62.0, 88, 128.0, -60, '{"dht22":"ok","pt100":"ok","ph":"ok","tds":"ok","nivel":"ok"}'::jsonb),
(NOW() - INTERVAL '2 hours', 'ESP32_HIDRO_01', 6.08, 1210, 605, 21.4, 24.1, 64.5, 86, 126.5, -59, '{"dht22":"ok","pt100":"ok","ph":"ok","tds":"ok","nivel":"ok"}'::jsonb),
(NOW(), 'ESP32_HIDRO_01', 6.10, 1200, 600, 21.5, 24.5, 65.2, 85, 125.5, -58, '{"dht22":"ok","pt100":"ok","ph":"ok","tds":"ok","nivel":"ok"}'::jsonb);
