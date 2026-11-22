-- ============================================================================
-- AXIÓN - IOT | Alinea pinout, red y sensores con el prototipo físico en protoboard
-- ============================================================================

UPDATE dispositivos
SET firmware = '1.1.0-http-real',
    config_red_mqtt = jsonb_set(
        jsonb_set(
            jsonb_set(
                jsonb_set(
                    jsonb_set(
                        jsonb_set(config_red_mqtt, '{ssid}', '"AXION_LAB_HIDROPONIA"'::jsonb, true),
                        '{protocolo}', '"http"'::jsonb, true
                    ),
                    '{puerto}', '8080'::jsonb, true
                ),
                '{brokerUrl}', '"http://localhost:8080"'::jsonb, true
            ),
            '{endpoint}', '"/api/v1/iot/telemetria"'::jsonb, true
        ),
        '{ipLocal}', '"192.168.1.100"'::jsonb, true
    ),
    pinout = '[
      {"gpio":"GPIO 4","interfaz":"ADC1_CH3","modulo":"Sensor pH DFRobot Gravity V2.0","estado":"Normal"},
      {"gpio":"GPIO 5","interfaz":"ADC1_CH4","modulo":"Sensor EC / TDS V1.0","estado":"Normal"},
      {"gpio":"GPIO 6","interfaz":"Digital 1-Wire","modulo":"DHT22 Microclima Ambiental","estado":"Normal"},
      {"gpio":"GPIO 10, 11, 12, 13","interfaz":"Bus SPI","modulo":"PT100 MAX31865 (Pendiente)","estado":"Pendiente"},
      {"gpio":"GPIO 14, 15, 16, 17","interfaz":"Salida Digital","modulo":"Módulo Relay 4 Canales HW-316","estado":"Normal"}
    ]'::jsonb,
    actualizado_en = NOW()
WHERE id = 'ESP32_HIDRO_01';

UPDATE sensor_configuracion
SET frecuencia_seg = 300,
    actualizado_en = NOW()
WHERE frecuencia_seg < 300;

UPDATE sensor_configuracion
SET parametros_tecnicos = jsonb_set(
        jsonb_set(
            jsonb_set(
                jsonb_set(
                    jsonb_set(
                        jsonb_set(parametros_tecnicos, '{pinGpio}', '"GPIO 6"'::jsonb, true),
                        '{resistenciaPullUp}', '"externa_10k"'::jsonb, true
                    ),
                    '{tempMin}', '18.0'::jsonb, true
                ),
                '{tempMax}', '28.0'::jsonb, true
            ),
            '{offsetTemperatura}', '0.0'::jsonb, true
        ),
        '{offsetHumedad}', '0.0'::jsonb, true
    ),
    actualizado_en = NOW()
WHERE modulo = 'dht22';

UPDATE sensor_configuracion
SET parametros_tecnicos = jsonb_set(parametros_tecnicos, '{gpioAdc}', '"GPIO5_ADC1"'::jsonb, true),
    actualizado_en = NOW()
WHERE modulo = 'ec';

UPDATE sensor_configuracion
SET nombre = 'Sensor de pH Industrial (DFRobot V2.0)',
    parametros_tecnicos = jsonb_set(parametros_tecnicos, '{gpioAdc}', '"GPIO4_ADC1"'::jsonb, true),
    actualizado_en = NOW()
WHERE modulo = 'ph';

UPDATE reles_canales SET pin_gpio = 'GPIO 14', actualizado_en = NOW() WHERE canal = 1;
UPDATE reles_canales SET pin_gpio = 'GPIO 15', actualizado_en = NOW() WHERE canal = 2;
UPDATE reles_canales SET pin_gpio = 'GPIO 16', actualizado_en = NOW() WHERE canal = 3;
UPDATE reles_canales SET pin_gpio = 'GPIO 17', actualizado_en = NOW() WHERE canal = 4;
UPDATE reles_canales SET pin_gpio = 'GPIO 18', actualizado_en = NOW() WHERE canal = 5;
UPDATE reles_canales SET pin_gpio = 'GPIO 21', actualizado_en = NOW() WHERE canal = 6;
