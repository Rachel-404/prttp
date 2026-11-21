-- ============================================================================
-- AXIÓN - IOT | Ajuste de frecuencia mínima de muestreo/envío a 300 s (5 min)
-- ============================================================================

UPDATE dispositivos
SET config_buffer = jsonb_set(
        jsonb_set(config_buffer, '{muestreoSeg}', '300'::jsonb, true),
        '{envioSeg}', '300'::jsonb, true
    ),
    actualizado_en = NOW()
WHERE id = 'ESP32_HIDRO_01'
  AND (
      COALESCE((config_buffer->>'muestreoSeg')::int, 0) < 300
      OR COALESCE((config_buffer->>'envioSeg')::int, 0) < 300
  );