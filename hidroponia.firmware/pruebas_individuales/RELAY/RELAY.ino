// Pines digitales seguros para los 4 canales del Relay
const int pinesRelay[4] = {14, 15, 16, 17};

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("=== Test Individual: Modulo Relay 4 Canales ===");

  for (int i = 0; i < 4; i++) {
    pinMode(pinesRelay[i], OUTPUT);
    digitalWrite(pinesRelay[i], HIGH); // Inicia apagado (lógica inversa)
  }
}

void loop() {
  for (int i = 0; i < 4; i++) {
    Serial.printf("Activando Relay %d (GPIO %d)...\n", i + 1, pinesRelay[i]);
    digitalWrite(pinesRelay[i], LOW);  // Enciende (debe sonar "clic")
    delay(1500);

    Serial.printf("Apagando Relay %d...\n", i + 1);
    digitalWrite(pinesRelay[i], HIGH); // Apaga
    delay(1000);
  }
}