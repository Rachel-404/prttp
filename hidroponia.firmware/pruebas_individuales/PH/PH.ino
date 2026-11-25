/**
 * AXIÓN - IOT | Test Individual: Sensor de pH (DFRobot Gravity pH Meter V2.0 + Sonda H-101 BNC)
 * Conexión física según elementos/CONEXIONES.md:
 *   - Sonda H-101 pH electrode -> Conector BNC superior de la placa Gravity pH Meter V2.0
 *   - Puerto '+' (Cable Rojo)  -> Puerto 3V3 del ESP32-S3
 *   - Puerto '-' (Cable Negro) -> Puerto G (GND) del ESP32-S3
 *   - Puerto 'A' (Cable Azul)  -> Puerto 4 (GPIO 4 / ADC1_CH3, Columna Izquierda)
 */

#define PIN_PH 4

// Voltajes de calibración en mV a 25 °C (ajustables con soluciones buffer pH 7.00 / 6.86 y pH 4.00)
float voltajeNeutro = 1500.0f;  // mV en solución neutra (pH 7.00 en DFRobot Gravity V2.0)
float voltajeAcido  = 2032.44f; // mV en solución ácida  (pH 4.00)
float phRefNeutro   = 7.00f;
float phRefAcido    = 4.00f;

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  analogSetPinAttenuation(PIN_PH, ADC_11db);
  delay(1000);
  Serial.println("=== Test Individual: DFRobot Gravity pH Meter V2.0 + Sonda H-101 (GPIO 4) ===");
}

float leerMilivoltiosPH() {
  long suma = 0;
  for (int i = 0; i < 20; i++) {
    suma += analogReadMilliVolts(PIN_PH);
    delay(20);
  }
  return suma / 20.0f;
}

void loop() {
  float voltaje_mV = leerMilivoltiosPH();
  if (voltaje_mV < 50.0f || voltaje_mV > 3250.0f) {
    Serial.printf("GPIO 4 | Voltaje: %.1f mV -> [ADVERTENCIA] Sonda desconectada o fuera de rango eléctrico.\n", voltaje_mV);
    delay(2000);
    return;
  }

  float diffMv = voltajeNeutro - voltajeAcido;
  if (fabs(diffMv) < 10.0f) diffMv = -532.44f;
  float pendiente = (phRefNeutro - phRefAcido) / diffMv;
  float valorPH = phRefNeutro + pendiente * (voltaje_mV - voltajeNeutro);
  if (valorPH < 0.0f) valorPH = 0.0f;
  if (valorPH > 14.0f) valorPH = 14.0f;

  Serial.printf("GPIO 4 | Voltaje: %.1f mV | pH: %.2f\n", voltaje_mV, valorPH);
  delay(2000);
}
