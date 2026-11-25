/**
 * AXIÓN - IOT | Test Individual: Dos Módulos de 4 Relés HW-316 (8 Canales Totales)
 * Conexión física según elementos/CONEXIONES.md:
 *   - Módulo de 4 Relés #1 (Columna Izquierda del ESP32-S3, VCC -> 5V, GND -> G):
 *       IN1 (M1) -> GPIO 16 | IN2 (M2) -> GPIO 17 | IN3 (M3) -> GPIO 18 | IN4 (M4) -> GPIO 8
 *   - Módulo de 4 Relés #2 (Columna Derecha del ESP32-S3, VCC -> 5V, GND -> G):
 *       IN1 (M1) -> GPIO 42 | IN2 (M2) -> GPIO 41 | IN3 (M3) -> GPIO 40 | IN4 (M4) -> GPIO 39
 *   - Lógica de disparo: Active LOW (LOW = Encendido / clic, HIGH = Apagado)
 */

const int NUM_RELES = 8;
const int pinesRelay[NUM_RELES] = {
  16, 17, 18, 8,   // Módulo #1 (IN1..IN4 - Columna Izquierda)
  42, 41, 40, 39   // Módulo #2 (IN1..IN4 - Columna Derecha)
};

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("=== Test Individual: 2x Módulos de 4 Relés HW-316 (8 Canales) ===");

  for (int i = 0; i < NUM_RELES; i++) {
    pinMode(pinesRelay[i], OUTPUT);
    digitalWrite(pinesRelay[i], HIGH); // Inicia apagado (Active LOW)
  }
}

void loop() {
  for (int i = 0; i < NUM_RELES; i++) {
    int modulo = (i / 4) + 1;
    int bornera = (i % 4) + 1;
    Serial.printf("Activando Canal %d [Módulo #%d - M%d | GPIO %d]...\n", i + 1, modulo, bornera, pinesRelay[i]);
    digitalWrite(pinesRelay[i], LOW);  // Enciende (LED D5..D8 encendido)
    delay(1200);

    Serial.printf("Apagando Canal %d [Módulo #%d - M%d | GPIO %d]...\n", i + 1, modulo, bornera, pinesRelay[i]);
    digitalWrite(pinesRelay[i], HIGH); // Apaga
    delay(800);
  }
}
