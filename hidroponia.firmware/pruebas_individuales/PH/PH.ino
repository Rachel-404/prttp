#define PIN_PH 4 // Pin ADC1 seguro para Wi-Fi

// Valores de calibración de fábrica para DFRobot Gravity pH V2.0 (en mV a 25°C)
// Más adelante podrás ajustarlos usando soluciones buffer pH 7.0 y pH 4.0
float voltajeNeutro = 1500.0;  // Voltaje esperado en pH 7.0
float voltajeAcido  = 2032.44; // Voltaje esperado en pH 4.0

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  delay(1000);
  Serial.println("=== Test Individual: Sensor de pH Industrial (DFRobot V2.0) ===");
}

// Promedia 20 muestras en milivoltios calibrados para obtener una lectura estable
float leerMilivoltiosPH() {
  long suma = 0;
  for (int i = 0; i < 20; i++) {
    suma += analogReadMilliVolts(PIN_PH);
    delay(20);
  }
  return suma / 20.0;
}

void loop() {
  float voltaje_mV = leerMilivoltiosPH();

  // Ecuación lineal de conversión mV -> pH (2 puntos: pH 7.0 y pH 4.0)
  float pendiente = (7.0 - 4.0) / (voltajeNeutro - voltajeAcido);
  float valorPH = 7.0 + pendiente * (voltaje_mV - voltajeNeutro);

  Serial.printf("Voltaje: %.1f mV | pH estimado: %.2f\n", voltaje_mV, valorPH);

  delay(2000);
}