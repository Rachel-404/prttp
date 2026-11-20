-- ============================================================================
-- AXIÓN - IOT | Cola de comandos HTTP para comunicación Backend -> ESP32-S3
-- ============================================================================

CREATE TABLE comandos_pendientes (
    id BIGSERIAL PRIMARY KEY,
    dispositivo_id VARCHAR(64) NOT NULL REFERENCES dispositivos(id),
    comando VARCHAR(64) NOT NULL,
    parametros JSONB NOT NULL DEFAULT '{}'::jsonb,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    entregado_en TIMESTAMPTZ
);

CREATE INDEX idx_comandos_disp_estado ON comandos_pendientes (dispositivo_id, estado, creado_en ASC);
