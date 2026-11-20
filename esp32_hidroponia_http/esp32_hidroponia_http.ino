/**
 * AXIÓN - IOT | Firmware HTTP Puro para ESP32-S3-WROOM-1
 * ---------------------------------------------------------------------------
 * Comunicación bidireccional 100% HTTP (sin Mosquitto / MQTT):
 *   1. POST /api/v1/iot/telemetria  -> Envía lecturas de sensores y recibe
 *                                      estado de relés + comandos pendientes.
 *   2. GET  /api/v1/iot/comandos    -> Polling ligero cada 3 s para comandos.
 *   3. POST /api/v1/iot/comandos/{id}/ack -> Confirma ejecución de comando.
 *
 * Librerías requeridas en Arduino IDE:
 *   - WiFi, HTTPClient (incluidas en el core ESP32 de Espressif)
 *   - ArduinoJson (v7.x, instalar desde Library Manager)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ============================================================================
// CONFIGURACIÓN DE RED Y BACKEND (EDITAR SEGÚN TU ENTORNO)
// ============================================================================
const char* WIFI_SSID     = "TU_RED_WIFI";
const char* WIFI_PASSWORD = "TU_PASSWORD_WIFI";

// En local: http://IP_DE_TU_PC:8080/api/v1/iot  (no uses localhost desde el ESP32)
// En nube:  https://tu-dominio.com/api/v1/iot
const char* API_IOT_BASE  = "http://192.168.1.100:8080/api/v1/iot";
const char* DEVICE_ID     = "ESP32_HIDRO_01";
const char* DEVICE_KEY    = "axion_dev_esp32_key_2026";

// Intervalos en milisegundos
const unsigned long INTERVALO_TELEMETRIA_MS = 10000; // Cada 10 s envía sensores
const unsigned long INTERVALO_COMANDOS_MS   = 3000;  // Cada 3 s consulta relés/comandos

// Cambia a false cuando conectes los sensores físicos reales
const bool MODO_SIMULACION = true;

// ============================================================================
// PINOUT DE HARDWARE (Coincide con V1__init_schema.sql)
// ============================================================================
// Sensores:
//   - EC / TDS:     GPIO 1 (ADC1_CH0)
//   - Nivel LMP633: GPIO 2 (ADC1_CH1, Shunt 100 Ohm)
//   - DHT22:        GPIO 4 (1-Wire) -> nota: comparte número por defecto en seed; ajusta si usas relé 1 en otro GPIO
//   - PT100 CS:     GPIO 5 (SPI CS)
//   - pH RS485:     GPIO 17/18/21 (UART1)
//
// 6 Canales de Relés (ajustables desde Pinout / Relés Técnico):
int PINES_RELES[6] = { 4, 5, 6, 7, 15, 16 };
bool RELE_ACTIVO_LOW = true; // true = lógica "low" (activo en LOW), false = "high"

// ============================================================================
// ESTADO INTERNO
// ============================================================================
unsigned long ultimoEnvioTelemetria = 0;
unsigned long ultimaConsultaComandos = 0;

struct LecturaSensores {
  float ph;
  float ecUsCm;
  float tdsPpm;
  float tempAguaC;
  float tempAmbC;
  float humAmbPct;
  float nivelCm;
  float nivelPct;
};

// ============================================================================
// CONTROL DE RELÉS
// ============================================================================
void aplicarEstadoRele(int canal, bool encendido) {
  if (canal < 1 || canal > 6) return;
  int idx = canal - 1;
  int nivelSalida = RELE_ACTIVO_LOW ? (encendido ? LOW : HIGH) : (encendido ? HIGH : LOW);
  digitalWrite(PINES_RELES[idx], nivelSalida);
  Serial.printf("[RELE %d | GPIO %d] -> %s\n", canal, PINES_RELES[idx], encendido ? "ENCENDIDO" : "APAGADO");
}

void sincronizarRelesDesdeJson(JsonArray reles) {
  for (JsonObject r : reles) {
    int canal = r["canal"] | 0;
    bool encendido = r["encendido"] | false;
    const char* logica = r["logicaDisparo"] | "low";
    RELE_ACTIVO_LOW = (strcmp(logica, "low") == 0);
    aplicarEstadoRele(canal, encendido);
  }
}

void confirmarComandoAck(long comandoId) {
  if (comandoId <= 0 || WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(API_IOT_BASE) + "/comandos/" + String(comandoId) + "/ack";
  http.begin(url);
  http.addHeader("X-Device-Key", DEVICE_KEY);
  int code = http.POST("");
  Serial.printf("[ACK] Comando #%ld -> HTTP %d\n", comandoId, code);
  http.end();
}

void procesarComandosPendientes(JsonArray comandos) {
  for (JsonObject cmd : comandos) {
    long id = cmd["id"] | 0L;
    const char* tipo = cmd["comando"] | "";
    JsonObject params = cmd["parametros"];

    Serial.printf("[CMD #%ld] %s\n", id, tipo);

    if (strcmp(tipo, "SET_RELE") == 0) {
      int canal = params["canal"] | 0;
      bool encendido = params["encendido"] | false;
      aplicarEstadoRele(canal, encendido);
    } else if (strcmp(tipo, "CONFIG_RELES_TECNICO") == 0) {
      const char* logica = params["logica"] | "low";
      RELE_ACTIVO_LOW = (strcmp(logica, "low") == 0);
    } else if (strcmp(tipo, "CALIBRAR_PH") == 0) {
      Serial.println(" -> Ejecutando calibración de pH NIST...");
    } else if (strcmp(tipo, "CALIBRAR_EC") == 0) {
      Serial.println(" -> Ejecutando calibración de EC...");
    } else if (strcmp(tipo, "CALIBRAR_CERO_NIVEL") == 0) {
      Serial.println(" -> Registrando punto cero de nivel...");
    } else if (strcmp(tipo, "FORZAR_SYNC_BUFFER") == 0) {
      Serial.println(" -> Sincronización forzada solicitada por el servidor.");
    }

    confirmarComandoAck(id);
  }
}

void procesarRespuestaServidor(const String& payload) {
  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, payload);
  if (err) {
    Serial.printf("[JSON] Error al parsear respuesta: %s\n", err.c_str());
    return;
  }

  if (doc["reles"].is<JsonArray>()) {
    sincronizarRelesDesdeJson(doc["reles"].as<JsonArray>());
  }
  if (doc["comandosPendientes"].is<JsonArray>()) {
    procesarComandosPendientes(doc["comandosPendientes"].as<JsonArray>());
  }
}

// ============================================================================
// LECTURA DE SENSORES (REEMPLAZAR CON TUS LIBRERÍAS EN PRODUCCIÓN)
// ============================================================================
LecturaSensores leerSensores() {
  LecturaSensores l;
  if (MODO_SIMULACION) {
    // Valores simulados realistas para pruebas sin hardware conectado
    l.ph        = 6.10f + (random(-15, 16) / 100.0f);
    l.ecUsCm    = 1220.0f + random(-30, 31);
    l.tdsPpm    = l.ecUsCm * 0.5f;
    l.tempAguaC = 21.5f + (random(-5, 6) / 10.0f);
    l.tempAmbC  = 24.0f + (random(-10, 11) / 10.0f);
    l.humAmbPct = 63.0f + (random(-20, 21) / 10.0f);
    l.nivelCm   = 82.0f;
    l.nivelPct  = 85.0f;
    return l;
  }

  // TODO: Conectar aquí lecturas reales:
  // - EC: analogReadMilliVolts(1) con compensación térmica
  // - Nivel LMP633: analogReadMilliVolts(2) (0.4V - 2.0V sobre shunt 100 Ohm)
  // - DHT22: dht.readTemperature() / dht.readHumidity()
  // - PT100 MAX31865: thermo.temperature(100.0, 430.0)
  // - pH RS485 Modbus: lectura registro Modbus RTU
  l.ph = 6.0f;
  l.ecUsCm = 1200.0f;
  l.tdsPpm = 600.0f;
  l.tempAguaC = 21.0f;
  l.tempAmbC = 24.0f;
  l.humAmbPct = 60.0f;
  l.nivelCm = 80.0f;
  l.nivelPct = 80.0f;
  return l;
}

// ============================================================================
// COMUNICACIÓN HTTP CON EL BACKEND
// ============================================================================
void enviarTelemetriaHttp() {
  if (WiFi.status() != WL_CONNECTED) return;

  LecturaSensores s = leerSensores();

  JsonDocument doc;
  doc["dispositivo_id"] = DEVICE_ID;
  doc["fw"]             = "1.0.3-http";
  doc["rssi"]           = WiFi.RSSI();

  JsonObject datos = doc["datos"].to<JsonObject>();
  datos["nivel_ph"]             = serialized(String(s.ph, 2));
  datos["ec_us_cm"]             = serialized(String(s.ecUsCm, 1));
  datos["tds_ppm"]              = serialized(String(s.tdsPpm, 1));
  datos["temperatura_solucion"] = serialized(String(s.tempAguaC, 2));
  datos["temperatura_amb"]      = serialized(String(s.tempAmbC, 2));
  datos["humedad_amb"]          = serialized(String(s.humAmbPct, 1));
  datos["nivel_tanque_cm"]      = serialized(String(s.nivelCm, 1));
  datos["nivel_tanque_pct"]     = serialized(String(s.nivelPct, 1));

  JsonObject estado = doc["estado"].to<JsonObject>();
  estado["dht22"] = "ok";
  estado["pt100"] = "ok";
  estado["ph"]    = "ok";
  estado["tds"]   = "ok";
  estado["nivel"] = "ok";

  String jsonBody;
  serializeJson(doc, jsonBody);

  HTTPClient http;
  String url = String(API_IOT_BASE) + "/telemetria";
  http.begin(url);
  http.setTimeout(5000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_KEY);

  int httpCode = http.POST(jsonBody);
  if (httpCode == 200) {
    String respuesta = http.getString();
    Serial.println("[HTTP POST] Telemetría enviada correctamente.");
    procesarRespuestaServidor(respuesta);
  } else {
    Serial.printf("[HTTP POST] Error %d: %s\n", httpCode, http.errorToString(httpCode).c_str());
  }
  http.end();
}

void consultarComandosHttp() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(API_IOT_BASE) + "/comandos?dispositivoId=" + String(DEVICE_ID);
  http.begin(url);
  http.setTimeout(4000);
  http.addHeader("X-Device-Key", DEVICE_KEY);

  int httpCode = http.GET();
  if (httpCode == 200) {
    String respuesta = http.getString();
    procesarRespuestaServidor(respuesta);
  } else {
    Serial.printf("[HTTP GET] Error %d consultando comandos\n", httpCode);
  }
  http.end();
}

void asegurarWifi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.printf("Conectando a Wi-Fi '%s'...", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long inicio = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - inicio < 15000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[Wi-Fi] Conectado. IP: %s | RSSI: %d dBm\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
  } else {
    Serial.println("\n[Wi-Fi] No se pudo conectar, reintentando luego.");
  }
}

// ============================================================================
// SETUP Y LOOP
// ============================================================================
void setup() {
  Serial.begin(115200);
  delay(500);

  for (int i = 0; i < 6; i++) {
    pinMode(PINES_RELES[i], OUTPUT);
    aplicarEstadoRele(i + 1, false);
  }

  asegurarWifi();
  enviarTelemetriaHttp();
  ultimoEnvioTelemetria = millis();
  ultimaConsultaComandos = millis();
}

void loop() {
  asegurarWifi();

  unsigned long ahora = millis();

  if (ahora - ultimoEnvioTelemetria >= INTERVALO_TELEMETRIA_MS) {
    ultimoEnvioTelemetria = ahora;
    enviarTelemetriaHttp();
  }

  if (ahora - ultimaConsultaComandos >= INTERVALO_COMANDOS_MS) {
    ultimaConsultaComandos = ahora;
    consultarComandosHttp();
  }

  delay(50);
}
