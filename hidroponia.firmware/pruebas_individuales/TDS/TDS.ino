/**
 * AXIÓN - IOT | Test Individual: Sensor de Conductividad / TDS (TDS Meter V1.0)
 * Conexión física según elementos/CONEXIONES.md:
 *   - Sonda impermeable blanca (2 puntas) -> Conector blanco de 2 pines en la placa TDS Meter V1.0
 *   - Puerto '+' (Cable Rojo)             -> Puerto 3V3 del ESP32-S3
 *   - Puerto '-' (Cable Negro)            -> Puerto G (GND) del ESP32-S3
 *   - Puerto 'A' (Cable Azul)             -> Puerto 5 (GPIO 5 / ADC1_CH4, Columna Izquierda)
 */

#define PIN_TDS 5

float tempAguaC    = 25.0f; // Temperatura de referencia ATC (°C)
float kValueConversion = 0.5f; // Factor conversión EC -> TDS (0.50 estándar)
float factorCalibK = 1.0f;

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  analogSetPinAttenuation(PIN_TDS, ADC_11db);
  delay(1000);
  Serial.println("=== Test Individual: Sensor TDS Meter V1.0 (GPIO 5) ===");
}

float leerVoltajeTDS() {
  long sumaMv = 0;
  for (int i = 0; i < 20; i++) {
    sumaMv += analogReadMilliVolts(PIN_TDS);
    delay(10);
  }
  return (sumaMv / 20.0f) / 1000.0f;
}

void loop() {
  float voltaje = leerVoltajeTDS();

  // Compensación térmica a 25 °C (α = 2.0 %/°C)
  float coefComp = 1.0f + 0.02f * (tempAguaC - 25.0f);
  float voltComp = voltaje / coefComp;

  float ec_us_cm = (133.42f * pow(voltComp, 3) - 255.86f * pow(voltComp, 2) + 857.39f * voltComp) * factorCalibK;
  if (ec_us_cm < 0.0f) ec_us_cm = 0.0f;
  float tds_ppm = ec_us_cm * kValueConversion;

  Serial.printf("GPIO 5 | Voltaje: %.3f V | EC: %.1f uS/cm | TDS: %.1f ppm\n", voltaje, ec_us_cm, tds_ppm);
  delay(2000);
}
