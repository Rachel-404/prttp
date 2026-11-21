# Firmware HTTP para ESP32-S3 — AXIÓN - IOT

Sketch listo para cargar en tu **ESP32-S3-WROOM-1** usando **Arduino IDE** (o PlatformIO) para comunicarse 100% por HTTP con el backend Spring Boot.

## Requisitos en Arduino IDE
1. Soporte de placas **esp32 by Espressif Systems** instalado en el Gestor de Placas.
2. Librería **ArduinoJson** (v7.x) instalada desde el Gestor de Bibliotecas. *(Las demás librerías —`WiFi`, `HTTPClient`, `WebServer`, `DNSServer`, `Preferences`— ya vienen incluidas).*

## Conexión a Internet sin depender del Backend (Portal Cautivo)
1. El ESP32 guarda su red Wi-Fi y la URL del backend en memoria flash (`Preferences`).
2. Si al encender **no logra conectarse** (o si lleva más de 5 minutos sin Wi-Fi), crea automáticamente la red temporal **`AXION-ESP32-SETUP`**.
3. Conéctate desde tu celular o laptop a **`AXION-ESP32-SETUP`** y abre **`http://192.168.4.1`** para elegir la nueva red Wi-Fi, escribir la contraseña y guardar la URL del backend.
4. *(Opcional)* También puedes editar los valores iniciales `DEFAULT_WIFI_SSID`, `DEFAULT_WIFI_PASSWORD`, `DEFAULT_API_IOT_BASE` y `DEFAULT_DEVICE_KEY` directamente en [esp32_hidroponia_http.ino](esp32_hidroponia_http.ino) antes de compilar.
