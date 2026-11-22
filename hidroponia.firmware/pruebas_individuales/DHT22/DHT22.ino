#include <DHT.h>

#define PIN_DHT 6
#define DHTTYPE DHT22

DHT dht(PIN_DHT, DHTTYPE);

void setup() {
  Serial.begin(115200);
  dht.begin();
  delay(2000);
  Serial.println("=== ESP32-S3 Hidroponia: DHT22 Fisico Iniciado ===");
}

void loop() {
  float humedad = dht.readHumidity();
  float tempAmb = dht.readTemperature();

  if (isnan(humedad) || isnan(tempAmb)) {
    Serial.println("Error leyendo DHT22. Verifica los cables en 3V3, GND y GPIO 6.");
  } else {
    Serial.printf("Temp Ambiente: %.2f °C | Humedad: %.2f %%\n", tempAmb, humedad);
  }

  delay(2000);
}