/**
 * AXIÓN - IOT | Test Individual: Transmisor de Nivel Sumergible LEEG LMP633-NCN (4-20 mA)
 * Conexión física según elementos/CONEXIONES.md:
 *   - Cable Rojo (VCC+) -> Positivo (+) de Fuente Externa 12V-24V DC
 *   - Cable Azul (IOUT) -> Entrada I+ del Conversor 4-20mA (o resistencia Shunt 150 Ω a G)
 *   - Negativo (-) Fuente 12V-24V -> I- / GND del Conversor unido al puerto G del ESP32-S3
 *   - Salida OUT (0-3.3V) del Conversor -> Puerto 7 (GPIO 7 / ADC1_CH6, Columna Izquierda)
 */

#define PIN_NIVEL 7

float resistenciaShuntOhm = 150.0f; // 150 Ω -> 4 mA = 600 mV, 20 mA = 3000 mV
float rangoMaximoCapsulaCm = 204.0f; // C203G: 20 kPa ≈ 204 cm H2O
float offsetMecanicoCm = 0.0f;
float alturaUtilTanqueCm = 100.0f;

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  analogSetPinAttenuation(PIN_NIVEL, ADC_11db);
  delay(1000);
  Serial.println("=== Test Individual: Transmisor de Nivel Sumergible LMP633-NCN (GPIO 7) ===");
}

void loop() {
  long sumaMv = 0;
  for (int i = 0; i < 20; i++) {
    sumaMv += analogReadMilliVolts(PIN_NIVEL);
    delay(10);
  }
  float mV = sumaMv / 20.0f;
  float corrienteMa = mV / resistenciaShuntOhm;

  if (corrienteMa < 3.5f) {
    Serial.printf("GPIO 7 | %.1f mV (%.2f mA) -> [ADVERTENCIA] Lazo 4-20 mA abierto o fuente 12-24V apagada.\n",
                  mV, corrienteMa);
  } else {
    float maClamped = corrienteMa;
    if (maClamped < 4.0f) maClamped = 4.0f;
    if (maClamped > 20.0f) maClamped = 20.0f;
    float nivelCm = ((maClamped - 4.0f) / 16.0f) * rangoMaximoCapsulaCm + offsetMecanicoCm;
    if (nivelCm < 0.0f) nivelCm = 0.0f;
    float nivelPct = (nivelCm / alturaUtilTanqueCm) * 100.0f;
    if (nivelPct > 100.0f) nivelPct = 100.0f;

    Serial.printf("GPIO 7 | %.1f mV | Corriente: %.2f mA | Nivel: %.1f cm (%.1f %%)\n",
                  mV, corrienteMa, nivelCm, nivelPct);
  }

  delay(2000);
}
