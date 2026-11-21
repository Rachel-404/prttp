-- ============================================================================
-- AXIÓN - IOT | Datos de ejemplo de telemetría (intervalos de 5 min a 1 hora)
-- ============================================================================
-- Incluye:
--   1) Ráfaga reciente cada 5 minutos (última hora) -> mínimo permitido (300 s)
--   2) Serie horaria (cada 1 hora en las últimas 24 h) -> máximo permitido (3600 s)
--   3) Serie de ayer/anteayer cada 1 hora para probar filtros de rango de fechas

INSERT INTO telemetria_lecturas (
    ts, dispositivo_id, ph, ec_us_cm, tds_ppm, temp_agua_c, temp_amb_c, hum_amb_pct, nivel_pct, nivel_cm, rssi, estado_sensores
) VALUES
-- Días previos (intervalo 1 hora / 3600 s)
(NOW() - INTERVAL '48 hours', 'ESP32_HIDRO_01', 5.92, 1140, 570.0, 20.6, 21.8, 68.0, 89.0, 86.0, -61, '{"dht22":"ok","pt100":"ok","ph":"ok","tds":"ok","nivel":"ok"}'::jsonb),
(NOW() - INTERVAL '47 hours', 'ESP32_HIDRO_01', 5.95, 1150, 575.0, 20.8, 22.1, 67.2, 89.0, 86.0, -60, '{"dht22":"ok","pt100":"ok","ph":"ok","tds":"ok","nivel":"ok"}'::jsonb),
(NOW() - INTERVAL '46 hours', 'ESP32_HIDRO_01', 5.98, 1165, 582.5, 21.0, 22.8, 65.5, 88.5, 85.5, -59, '{"dht22":"ok","pt100":"ok","ph":"ok","tds":"ok","nivel":"ok"}'::jsonb),
(NOW() - INTERVAL '36 hours', 'ESP32_HIDRO_01', 6.02, 1190, 595.0, 21.5, 24.4, 62.0, 88.0, 85.0, -58, '{"dht22":"ok","pt100":"ok","ph":"ok","tds":"ok","nivel":"ok"}'::jsonb),
(NOW() - INTERVAL '24 hours', 'ESP32_HIDRO_01', 6.06, 1215, 607.5, 21.3, 23.6, 64.0, 87.0, 84.2, -59, '{"dht22":"ok","pt100":"ok","ph":"ok","tds":"ok","nivel":"ok"}'::jsonb),

-- Últimas horas (intervalo 1 hora / 3600 s)
(NOW() - INTERVAL '6 hours',  'ESP32_HIDRO_01', 6.10, 1230, 615.0, 21.6, 24.2, 62.5, 86.0, 83.4, -57, '{"dht22":"ok","pt100":"ok","ph":"ok","tds":"ok","nivel":"ok"}'::jsonb),
(NOW() - INTERVAL '5 hours',  'ESP32_HIDRO_01', 6.14, 1245, 622.5, 21.8, 24.8, 61.0, 85.5, 83.0, -56, '{"dht22":"ok","pt100":"ok","ph":"ok","tds":"ok","nivel":"ok"}'::jsonb),
(NOW() - INTERVAL '3 hours',  'ESP32_HIDRO_01', 6.18, 1260, 630.0, 22.0, 25.3, 60.2, 85.0, 82.6, -56, '{"dht22":"ok","pt100":"ok","ph":"ok","tds":"ok","nivel":"ok"}'::jsonb),
(NOW() - INTERVAL '1 hour',   'ESP32_HIDRO_01', 6.16, 1255, 627.5, 21.9, 24.9, 61.4, 84.8, 82.4, -55, '{"dht22":"ok","pt100":"ok","ph":"ok","tds":"ok","nivel":"ok"}'::jsonb),

-- Última hora (intervalo mínimo de 5 minutos / 300 s)
(NOW() - INTERVAL '55 minutes', 'ESP32_HIDRO_01', 6.15, 1250, 625.0, 21.8, 24.7, 61.8, 84.7, 82.3, -55, '{"dht22":"ok","pt100":"ok","ph":"ok","tds":"ok","nivel":"ok"}'::jsonb),
(NOW() - INTERVAL '50 minutes', 'ESP32_HIDRO_01', 6.14, 1248, 624.0, 21.8, 24.6, 62.0, 84.7, 82.3, -55, '{"dht22":"ok","pt100":"ok","ph":"ok","tds":"ok","nivel":"ok"}'::jsonb),
(NOW() - INTERVAL '45 minutes', 'ESP32_HIDRO_01', 6.13, 1245, 622.5, 21.7, 24.5, 62.3, 84.6, 82.2, -54, '{"dht22":"ok","pt100":"ok","ph":"ok","tds":"ok","nivel":"ok"}'::jsonb),
(NOW() - INTERVAL '40 minutes', 'ESP32_HIDRO_01', 6.12, 1242, 621.0, 21.7, 24.4, 62.5, 84.6, 82.2, -54, '{"dht22":"ok","pt100":"ok","ph":"ok","tds":"ok","nivel":"ok"}'::jsonb),
(NOW() - INTERVAL '35 minutes', 'ESP32_HIDRO_01', 6.11, 1240, 620.0, 21.6, 24.3, 62.8, 84.5, 82.1, -55, '{"dht22":"ok","pt100":"ok","ph":"ok","tds":"ok","nivel":"ok"}'::jsonb),
(NOW() - INTERVAL '30 minutes', 'ESP32_HIDRO_01', 6.12, 1244, 622.0, 21.6, 24.2, 63.0, 84.5, 82.1, -55, '{"dht22":"ok","pt100":"ok","ph":"ok","tds":"ok","nivel":"ok"}'::jsonb),
(NOW() - INTERVAL '25 minutes', 'ESP32_HIDRO_01', 6.14, 1252, 626.0, 21.5, 24.1, 63.2, 84.4, 82.0, -54, '{"dht22":"ok","pt100":"ok","ph":"ok","tds":"ok","nivel":"ok"}'::jsonb),
(NOW() - INTERVAL '20 minutes', 'ESP32_HIDRO_01', 6.16, 1260, 630.0, 21.5, 24.0, 63.5, 84.4, 82.0, -54, '{"dht22":"ok","pt100":"ok","ph":"ok","tds":"ok","nivel":"ok"}'::jsonb),
(NOW() - INTERVAL '15 minutes', 'ESP32_HIDRO_01', 6.18, 1268, 634.0, 21.4, 23.9, 63.8, 84.3, 81.9, -53, '{"dht22":"ok","pt100":"ok","ph":"ok","tds":"ok","nivel":"ok"}'::jsonb),
(NOW() - INTERVAL '10 minutes', 'ESP32_HIDRO_01', 6.19, 1272, 636.0, 21.4, 23.8, 64.0, 84.3, 81.9, -53, '{"dht22":"ok","pt100":"ok","ph":"ok","tds":"ok","nivel":"ok"}'::jsonb),
(NOW() - INTERVAL '5 minutes',  'ESP32_HIDRO_01', 6.20, 1275, 637.5, 21.4, 23.7, 64.2, 84.2, 81.8, -53, '{"dht22":"ok","pt100":"ok","ph":"ok","tds":"ok","nivel":"ok"}'::jsonb);
