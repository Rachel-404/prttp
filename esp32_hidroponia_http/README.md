# Firmware HTTP para ESP32-S3 — AXIÓN - IOT

Sketch listo para cargar en tu **ESP32-S3-WROOM-1** usando **Arduino IDE** (o PlatformIO) para comunicarse 100% por HTTP con el backend Spring Boot.

## Requisitos en Arduino IDE
1. Soporte de placas **esp32 by Espressif Systems** instalado en el Gestor de Placas.
2. Librería **ArduinoJson** (v7.x) instalada desde el Gestor de Bibliotecas.

## Qué debes editar antes de cargar
En [esp32_hidroponia_http.ino](esp32_hidroponia_http.ino):
1. `WIFI_SSID` y `WIFI_PASSWORD`: nombre y contraseña de tu red Wi-Fi.
2. `API_IOT_BASE`:
   * **En red local:** usa la IP local de tu PC donde corre Spring Boot (ejemplo: `http://192.168.1.50:8080/api/v1/iot`). **Nunca uses `localhost`** porque `localhost` para el ESP32 es el propio ESP32.
   * **En la nube:** usa la URL de tu servidor (`https://tu-servidor.com/api/v1/iot`).
3. `DEVICE_KEY`: debe coincidir con `IOT_DEVICE_KEY` en `hidroponia.backend/.env` (por defecto `axion_dev_esp32_key_2026`).
4. `MODO_SIMULACION`: déjalo en `true` para probar la comunicación de extremo a extremo sin sensores físicos conectados; cámbialo a `false` cuando integres las lecturas reales en `leerSensores()`.
