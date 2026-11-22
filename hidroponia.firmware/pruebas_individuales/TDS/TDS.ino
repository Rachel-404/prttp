#define PIN_TDS 5 // Pin ADC1 seguro para Wi-Fi

void setup() {
  Serial.begin(115200);
  analogReadResolution(12); // Resolución de 12 bits (0 a 4095)
  delay(1000);
  Serial.println("=== Test Individual: Sensor TDS V1.0 ===");
}

// Lee 20 muestras y promedia para evitar lecturas erráticas
float leerVoltajeTDS() {
  long suma = 0;
  for (int i = 0; i < 20; i++) {
    suma += analogRead(PIN_TDS);
    delay(10);
  }
  return (suma / 20.0) * (3.3 / 4095.0);
}

void loop() {
  float voltaje = leerVoltajeTDS();

  // Fórmula estándar de conversión a ppm (asumiendo agua a 25 °C)
  float tds_ppm = (133.42 * pow(voltaje, 3) - 255.86 * pow(voltaje, 2) + 857.39 * voltaje) * 0.5;
  if (tds_ppm < 0) tds_ppm = 0;

  Serial.printf("Voltaje: %.3f V | Conductividad (TDS): %.1f ppm\n", voltaje, tds_ppm);

  delay(2000);
}