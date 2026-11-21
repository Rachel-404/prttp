-- ============================================================================
-- AXIÓN - IOT | Actualiza configuración de transporte del nodo maestro a HTTP
-- ============================================================================

UPDATE dispositivos
SET config_red_mqtt = jsonb_set(
        jsonb_set(
            jsonb_set(
                jsonb_set(
                    jsonb_set(config_red_mqtt, '{protocolo}', '"http"'::jsonb, true),
                    '{puerto}', '8080'::jsonb, true
                ),
                '{brokerUrl}', '"http://localhost:8080"'::jsonb, true
            ),
            '{endpoint}', '"/api/v1/iot/telemetria"'::jsonb, true
        ),
        '{habilitarTls}', 'false'::jsonb, true
    ),
    actualizado_en = NOW()
WHERE id = 'ESP32_HIDRO_01'
  AND COALESCE(config_red_mqtt->>'protocolo', '') <> 'http';
