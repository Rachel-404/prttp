/**
 * AXIÓN - IOT | Test Individual: Sonda RTD PT100 (3 hilos) + Módulo MAX31865 (SPI)
 * Conexión física según elementos/CONEXIONES.md:
 *   - Sonda PT100 (cable 3 m con 3 terminales horquilla):
 *       1x Terminal Horquilla ROJA  -> Bornera RTD+ (o F+) del MAX31865
 *       2x Terminales Horquilla AZULES -> Borneras RTD- y F- del MAX31865
 *   - Módulo MAX31865 -> ESP32-S3-WROOM-1 (Columna Izquierda):
 *       VIN -> 3V3 | GND -> G | CS -> GPIO 10 | SDI (MOSI) -> GPIO 11 | SCK -> GPIO 12 | SDO (MISO) -> GPIO 13
 */

#include <SPI.h>

#define PIN_PT100_CS  10
#define PIN_PT100_SDI 11
#define PIN_PT100_SCK 12
#define PIN_PT100_SDO 13

float rrefOhmios = 430.0f;   // Resistencia de referencia Rref del MAX31865 para PT100
float alphaPt100 = 0.00385f; // Coeficiente IEC 60751

void setup() {
  Serial.begin(115200);
  pinMode(PIN_PT100_CS, OUTPUT);
  digitalWrite(PIN_PT100_CS, HIGH);
  SPI.begin(PIN_PT100_SCK, PIN_PT100_SDO, PIN_PT100_SDI, PIN_PT100_CS);
  delay(1000);
  Serial.println("=== Test Individual: Sonda RTD PT100 (3 hilos) + MAX31865 SPI (GPIO 10-13) ===");
}

void loop() {
  // Configuración MAX31865 en SPI_MODE1: 3 hilos, 60 Hz (0xB2: VBIAS=ON, 1-shot, 3-wire, 60Hz)
  SPI.beginTransaction(SPISettings(1000000, MSBFIRST, SPI_MODE1));
  digitalWrite(PIN_PT100_CS, LOW);
  SPI.transfer(0x80);
  SPI.transfer(0xB2);
  digitalWrite(PIN_PT100_CS, HIGH);
  SPI.endTransaction();
  delay(65);

  SPI.beginTransaction(SPISettings(1000000, MSBFIRST, SPI_MODE1));
  digitalWrite(PIN_PT100_CS, LOW);
  SPI.transfer(0x01);
  uint16_t msb = SPI.transfer(0x00);
  uint16_t lsb = SPI.transfer(0x00);
  digitalWrite(PIN_PT100_CS, HIGH);
  SPI.endTransaction();

  uint16_t rawRtd = ((msb << 8) | lsb) >> 1;
  if (rawRtd == 0 || rawRtd >= 0x7FFF || (lsb & 0x01)) {
    Serial.println("[ADVERTENCIA] MAX31865 sin respuesta o circuito abierto en PT100. Verifica SPI (GPIO 10-13) y borneras RTD+/RTD-/F-.");
  } else {
    float resistencia = ((float)rawRtd * rrefOhmios) / 32768.0f;
    float tempC = ((resistencia / 100.0f) - 1.0f) / alphaPt100;
    Serial.printf("SPI (GPIO 10-13) | Resistencia PT100: %.2f Ω | Temperatura Agua: %.2f °C\n",
                  resistencia, tempC);
  }

  delay(2000);
}
