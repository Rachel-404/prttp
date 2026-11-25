/**
 * AXIÓN - IOT | Test Individual: Módulo DHT22 (ASAIR AM2302)
 * Conexión física según elementos/CONEXIONES.md:
 *   - Puerto '+'   (Cable Azul)     -> Puerto 3V3 del ESP32-S3
 *   - Puerto 'out' (Cable Verde)    -> Puerto 6 (GPIO 6, Columna Izquierda)
 *   - Puerto '-'   (Cable Amarillo) -> Puerto G (GND) del ESP32-S3
 */

#include <DHT.h>

#define PIN_DHT 6
#define DHTTYPE DHT22

DHT dht(PIN_DHT, DHTTYPE);

void setup() {
  Serial.begin(115200);
  dht.begin();
  delay(2000);
  Serial.println("=== ESP32-S3 Hidroponia: Test Módulo DHT22 (AM2302 en GPIO 6) ===");
}

void loop() {
  float humedad = dht.readHumidity();
  float tempAmb = dht.readTemperature();

  if (isnan(humedad) || isnan(tempAmb)) {
    Serial.println("[ERROR] No se pudo leer el DHT22. Verifica: '+' -> 3V3 | 'out' -> GPIO 6 | '-' -> G.");
  } else {
    Serial.printf("Temp Ambiente: %.2f °C | Humedad Relativa: %.2f %%\n", tempAmb, humedad);
  }

  delay(2000);
}
