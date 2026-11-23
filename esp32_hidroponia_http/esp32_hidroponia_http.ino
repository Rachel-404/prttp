/**
 * AXIÓN - IOT | Firmware HTTP Unificado para ESP32-S3-WROOM-1
 * ---------------------------------------------------------------------------
 * Comunicación bidireccional 100% HTTP (sin Mosquitto / MQTT / BLE):
 *   1. POST /api/v1/iot/telemetria        -> Envía lecturas y recibe relés + comandos.
 *   2. GET  /api/v1/iot/comandos          -> Polling cada 3 s para relés/comandos.
 *   3. POST /api/v1/iot/comandos/{id}/ack -> Confirma ejecución de comando.
 *   4. Portal Cautivo Wi-Fi ("AXION_HIDRO_SETUP" en 192.168.4.1) + Memoria NVS.
 *
 * Pinout físico en protoboard:
 *   - pH DFRobot V2.0 : GPIO 4 (ADC1)
 *   - TDS V1.0        : GPIO 5 (ADC1)
 *   - DHT22           : GPIO 6 (1-Wire Digital)
 *   - PT100 MAX31865  : GPIO 10, 11, 12, 13 (SPI - pendiente módulo)
 *   - Relay HW-316    : GPIO 14, 15, 16, 17 (Canales 1..4) + 18, 21 (Reserva)
 *
 * Librerías requeridas en Arduino IDE:
 *   - ArduinoJson (v7.x)
 *   - DHT sensor library (Adafruit) + Adafruit Unified Sensor
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <Preferences.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <time.h>

#if __has_include("secrets.h")
  #include "secrets.h"
#endif

#ifndef SECRET_WIFI_SSID
  #define SECRET_WIFI_SSID "TU_RED_WIFI"
#endif
#ifndef SECRET_WIFI_PASSWORD
  #define SECRET_WIFI_PASSWORD "TU_PASSWORD_WIFI"
#endif
#ifndef SECRET_API_IOT_BASE
  #define SECRET_API_IOT_BASE "http://192.168.1.100:8080/api/v1/iot"
#endif
#ifndef SECRET_DEVICE_KEY
  #define SECRET_DEVICE_KEY "axion_dev_esp32_key_2026"
#endif

// ============================================================================
// 1. CONFIGURACIÓN DE RED Y SERVIDOR BACKEND
// ============================================================================
const char* DEFAULT_WIFI_SSID     = SECRET_WIFI_SSID;
const char* DEFAULT_WIFI_PASSWORD = SECRET_WIFI_PASSWORD;
const char* DEFAULT_API_IOT_BASE  = SECRET_API_IOT_BASE;
const char* DEVICE_ID             = "ESP32_HIDRO_01";
const char* DEFAULT_DEVICE_KEY    = SECRET_DEVICE_KEY;

const char* PORTAL_AP_SSID            = "AXION_HIDRO_SETUP";
const unsigned long PORTAL_TIMEOUT_MS = 180000; // 3 minutos

// Cambia a true solo si quieres enviar datos simulados sin sensores conectados
const bool MODO_SIMULACION = false;

// 15 s para pruebas en protoboard (ajustable vía CONFIG_BUFFER entre 15 s y 3600 s)
unsigned long intervaloTelemetriaMs       = 15000;
const unsigned long INTERVALO_COMANDOS_MS = 3000;

// ============================================================================
// 2. PINOUT DE HARDWARE EN PROTOBOARD (ESP32-S3-WROOM-1)
// ============================================================================
#define PIN_PH   4
#define PIN_TDS  5
#define PIN_DHT  6
#define DHTTYPE  DHT22

// Canales 1..4 = Módulo Relay 4 Canales HW-316 | Canales 5..6 = Reserva
int PINES_RELES[6] = { 14, 15, 16, 17, 18, 21 };
bool RELE_ACTIVO_LOW = true; // true = lógica "low" (Active LOW), false = "high"

DHT dht(PIN_DHT, DHTTYPE);

// ============================================================================
// 3. ESTADO INTERNO Y CONFIGURACIÓN PERSISTENTE (NVS)
// ============================================================================
Preferences prefs;
String cfgSsid;
String cfgPass;
String cfgApiBase;
String cfgDeviceKey;

bool dht22Activo      = true;
float dht22OffsetTemp = 0.0f;
float dht22OffsetHum  = 0.0f;

float phVoltajeNeutro = 1500.0f;
float phVoltajeAcido  = 2032.44f;
float tdsFactorK      = 1.0f;
float tdsConvFactor   = 0.5f;

unsigned long ultimoEnvioTelemetria  = 0;
unsigned long ultimaConsultaComandos = 0;
unsigned long inicioDesconexionWifi  = 0;

struct LecturaSensores {
  float ph;
  float ecUsCm;
  float tdsPpm;
  float tempAguaC;
  float tempAmbC;
  float humAmbPct;
  float nivelCm;
  float nivelPct;
  bool dhtOk;
};

void guardarConfiguracionNvs(const String& ssid, const String& pass, const String& apiBase, const String& devKey) {
  prefs.begin("axion_cfg", false);
  prefs.putString("wifiSsid", ssid);
  prefs.putString("wifiPass", pass);
  prefs.putString("apiBaseUrl", apiBase);
  prefs.putString("devKey", devKey);
  prefs.putString("ssid", ssid);
  prefs.putString("pass", pass);
  prefs.putString("apiBase", apiBase);
  prefs.end();
}

void cargarConfiguracionNvs() {
  prefs.begin("axion_cfg", true);
  cfgSsid      = prefs.getString("wifiSsid", prefs.getString("ssid", ""));
  cfgPass      = prefs.getString("wifiPass", prefs.getString("pass", ""));
  cfgApiBase   = prefs.getString("apiBaseUrl", prefs.getString("apiBase", ""));
  cfgDeviceKey = prefs.getString("devKey", "");
  dht22Activo     = prefs.getBool("dhtActivo", true);
  dht22OffsetTemp = prefs.getFloat("dhtOffT", 0.0f);
  dht22OffsetHum  = prefs.getFloat("dhtOffH", 0.0f);
  phVoltajeNeutro = prefs.getFloat("phVNeutro", 1500.0f);
  phVoltajeAcido  = prefs.getFloat("phVAcido", 2032.44f);
  if (fabs(phVoltajeNeutro - phVoltajeAcido) < 10.0f) {
    phVoltajeNeutro = 1500.0f;
    phVoltajeAcido  = 2032.44f;
  }
  tdsConvFactor   = prefs.getFloat("tdsKVal", 0.5f);
  tdsFactorK      = prefs.getFloat("tdsFacK", 1.0f);
  if (tdsFactorK < 0.1f || tdsFactorK > 5.0f) {
    tdsFactorK = 1.0f;
  }
  long envioSeg   = prefs.getLong("envioSeg", 15L);
  if (envioSeg >= 15L && envioSeg <= 3600L) {
    intervaloTelemetriaMs = (unsigned long)envioSeg * 1000UL;
  }
  prefs.end();

  bool faltoInicializar = (cfgSsid.length() == 0 || cfgApiBase.length() == 0);
  if (cfgSsid.length() == 0) cfgSsid = DEFAULT_WIFI_SSID;
  if (cfgPass.length() == 0 && String(DEFAULT_WIFI_PASSWORD).length() > 0) cfgPass = DEFAULT_WIFI_PASSWORD;
  if (cfgApiBase.length() == 0) cfgApiBase = DEFAULT_API_IOT_BASE;
  if (cfgDeviceKey.length() == 0) cfgDeviceKey = DEFAULT_DEVICE_KEY;

  if (faltoInicializar) {
    guardarConfiguracionNvs(cfgSsid, cfgPass, cfgApiBase, cfgDeviceKey);
  }
}

// ============================================================================
// 4. PORTAL CAUTIVO WI-FI (192.168.4.1)
// ============================================================================
void iniciarPortalCautivo() {
  Serial.println("\n[PORTAL] Iniciando SoftAP de configuración: " + String(PORTAL_AP_SSID));

  WiFi.disconnect(true);
  WiFi.mode(WIFI_AP_STA);
  int redesEncontradas = WiFi.scanNetworks();

  String listaRedesHtml = "";
  for (int i = 0; i < redesEncontradas; i++) {
    String nombre = WiFi.SSID(i);
    if (nombre.length() > 0) {
      String nombreEsc = nombre;
      nombreEsc.replace("'", "\\'");
      nombreEsc.replace("<", "&lt;");
      bool abierta = (WiFi.encryptionType(i) == WIFI_AUTH_OPEN);
      listaRedesHtml += "<button type='button' class='red-btn' onclick=\"elegirRed('" + nombreEsc + "')\">"
                        "<span>" + nombreEsc + "</span>"
                        "<small>" + String(WiFi.RSSI(i)) + " dBm " + (abierta ? "Abierta" : "Segura") + "</small>"
                        "</button>";
    }
  }
  WiFi.scanDelete();

  WiFi.softAP(PORTAL_AP_SSID);
  IPAddress apIp = WiFi.softAPIP();
  Serial.print("[PORTAL] Conéctate a '" + String(PORTAL_AP_SSID) + "' y abre: http://");
  Serial.println(apIp);

  DNSServer dnsServer;
  dnsServer.start(53, "*", apIp);

  WebServer server(80);
  unsigned long inicioPortal = millis();

  auto enviarFormulario = [&]() {
    String html = "<!DOCTYPE html><html lang='es'><head><meta charset='UTF-8'>"
      "<meta name='viewport' content='width=device-width,initial-scale=1'>"
      "<title>AXION - Configurar Wi-Fi ESP32</title>"
      "<style>body{font-family:sans-serif;background:#0f172a;color:#e2e8f0;margin:0;padding:16px}"
      ".card{max-width:440px;margin:16px auto;background:#1e293b;padding:22px;border-radius:10px}"
      "h2{margin-top:0;color:#38bdf8}label{display:block;margin:12px 0 4px;font-size:14px}"
      "input{width:100%;padding:10px;border-radius:6px;border:1px solid #475569;background:#0f172a;color:#fff;box-sizing:border-box}"
      ".redes{display:flex;flex-direction:column;gap:6px;max-height:170px;overflow-y:auto;margin-bottom:8px}"
      ".red-btn{display:flex;justify-content:space-between;align-items:center;width:100%;padding:9px 10px;border-radius:6px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;cursor:pointer;text-align:left}"
      ".red-btn:hover{border-color:#38bdf8}"
      "button[type=submit]{width:100%;margin-top:18px;padding:12px;border:0;border-radius:6px;background:#22c55e;color:#052e16;font-weight:bold;font-size:16px;cursor:pointer}"
      "</style></head><body><div class='card'><h2>AXIÓN - IOT (ESP32-S3)</h2>"
      "<p>Selecciona una red Wi-Fi e ingresa la contraseña y URL/IP del backend:</p>"
      "<div class='redes'>" + (listaRedesHtml.length() > 0 ? listaRedesHtml : "<small>No se detectaron redes cercanas</small>") + "</div>"
      "<form method='POST' action='/guardar'>"
      "<label>SSID Wi-Fi</label><input id='ssid' name='ssid' value='" + cfgSsid + "' required>"
      "<label>Contraseña Wi-Fi</label><input id='pass' type='password' name='pass' value='" + cfgPass + "'>"
      "<label>URL/IP Backend IoT (ej. http://192.168.1.50:8080/api/v1/iot)</label><input name='apiBase' value='" + cfgApiBase + "' required>"
      "<label>Device Key (X-Device-Key)</label><input name='devKey' value='" + cfgDeviceKey + "' required>"
      "<button type='submit'>Guardar y Conectar</button></form>"
      "<script>function elegirRed(s){document.getElementById('ssid').value=s;document.getElementById('pass').focus();}</script>"
      "</div></body></html>";
    server.send(200, "text/html", html);
  };

  server.on("/", HTTP_GET, enviarFormulario);
  server.onNotFound(enviarFormulario);

  server.on("/guardar", HTTP_POST, [&]() {
    String nuevoSsid = server.arg("ssid");
    String nuevoPass = server.arg("pass");
    String nuevaApi  = server.arg("apiBase");
    String nuevaKey  = server.arg("devKey");
    nuevoSsid.trim();
    nuevaApi.trim();
    nuevaKey.trim();

    if (nuevoSsid.length() == 0 || nuevaApi.length() == 0) {
      server.send(400, "text/plain", "SSID y URL Backend son obligatorios.");
      return;
    }

    while (nuevaApi.endsWith("/")) nuevaApi.remove(nuevaApi.length() - 1);
    if (!nuevaApi.endsWith("/api/v1/iot")) {
      nuevaApi += "/api/v1/iot";
    }

    guardarConfiguracionNvs(nuevoSsid, nuevoPass, nuevaApi, nuevaKey);
    server.send(200, "text/html",
      "<html><body style='font-family:sans-serif;background:#0f172a;color:#fff;text-align:center;padding:40px'>"
      "<h2>Configuración guardada</h2><p>Reiniciando ESP32-S3 para conectarse a <b>" + nuevoSsid + "</b>...</p></body></html>");
    delay(1500);
    ESP.restart();
  });

  server.begin();
  while (millis() - inicioPortal < PORTAL_TIMEOUT_MS) {
    dnsServer.processNextRequest();
    server.handleClient();
    delay(10);
  }

  Serial.println("[PORTAL] Tiempo agotado sin cambios. Reintentando conexión Wi-Fi...");
  server.stop();
  dnsServer.stop();
  WiFi.softAPdisconnect(true);
  ESP.restart();
}

// ============================================================================
// 5. LECTURA REAL DE SENSORES (DHT22, pH, TDS)
// ============================================================================
float leerVoltajePhMv() {
  long suma = 0;
  for (int i = 0; i < 15; i++) {
    suma += analogReadMilliVolts(PIN_PH);
    delay(10);
  }
  return suma / 15.0f;
}

float leerPHReal() {
  float mV = leerVoltajePhMv();
  float diff = phVoltajeNeutro - phVoltajeAcido;
  if (fabs(diff) < 10.0f) diff = -532.44f;
  float pendiente = (7.0f - 4.0f) / diff;
  return 7.0f + pendiente * (mV - phVoltajeNeutro);
}

float leerEcBaseUsCm(float temperaturaAgua) {
  long suma = 0;
  for (int i = 0; i < 15; i++) {
    suma += analogReadMilliVolts(PIN_TDS);
    delay(10);
  }
  float voltaje = (suma / 15.0f) / 1000.0f;
  float coefComp = 1.0f + 0.02f * (temperaturaAgua - 25.0f);
  float voltComp = voltaje / coefComp;
  float ecBase = 133.42f * pow(voltComp, 3) - 255.86f * pow(voltComp, 2) + 857.39f * voltComp;
  return (ecBase < 0.0f) ? 0.0f : ecBase;
}

float leerTDSReal(float temperaturaAgua) {
  float ecBase = leerEcBaseUsCm(temperaturaAgua);
  float tds = ecBase * tdsConvFactor * tdsFactorK;
  return (tds < 0.0f) ? 0.0f : tds;
}

LecturaSensores leerSensores() {
  LecturaSensores l;
  if (MODO_SIMULACION) {
    l.ph        = 6.10f + (random(-15, 16) / 100.0f);
    l.ecUsCm    = 1220.0f + random(-30, 31);
    l.tdsPpm    = l.ecUsCm * tdsConvFactor;
    l.tempAguaC = 21.5f + (random(-5, 6) / 10.0f);
    l.tempAmbC  = 24.0f + (random(-10, 11) / 10.0f);
    l.humAmbPct = 63.0f + (random(-20, 21) / 10.0f);
    l.nivelCm   = 82.0f;
    l.nivelPct  = 85.0f;
    l.dhtOk     = true;
    return l;
  }

  // Lectura física real del DHT22 en GPIO 6
  if (!dht22Activo) {
    l.dhtOk     = false;
    l.tempAmbC  = 0.0f;
    l.humAmbPct = 0.0f;
  } else {
    float tAmb = dht.readTemperature();
    float hAmb = dht.readHumidity();
    l.dhtOk = !isnan(tAmb) && !isnan(hAmb);
    if (l.dhtOk) {
      l.tempAmbC = tAmb + dht22OffsetTemp;
      float humAjustada = hAmb + dht22OffsetHum;
      if (humAjustada < 0.0f) humAjustada = 0.0f;
      if (humAjustada > 100.0f) humAjustada = 100.0f;
      l.humAmbPct = humAjustada;
    } else {
      l.tempAmbC  = 0.0f;
      l.humAmbPct = 0.0f;
      Serial.println("[DHT22] Lectura NaN en GPIO 6 - revisar conexion 3.3V/GND/DATA");
    }
  }

  l.tempAguaC = 25.0f; // Valor base hasta conectar MAX31865 + PT100 (GPIO 10-13)
  l.ph        = leerPHReal();
  l.tdsPpm    = leerTDSReal(l.tempAguaC);
  l.ecUsCm    = (tdsConvFactor > 0.0f) ? (l.tdsPpm / tdsConvFactor) : 0.0f;
  l.nivelCm   = 0.0f;  // Pendiente transmisor de nivel
  l.nivelPct  = 0.0f;
  return l;
}

// ============================================================================
// 6. CONTROL DE RELÉS Y COMANDOS DEL BACKEND
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
  String url = cfgApiBase + "/comandos/" + String(comandoId) + "/ack";
  http.begin(url);
  http.addHeader("X-Device-Key", cfgDeviceKey);
  int code = http.POST("");
  Serial.printf("[ACK] Comando #%ld -> HTTP %d\n", comandoId, code);
  http.end();
}

void escanearYEnviarRedesWifi() {
  if (WiFi.status() != WL_CONNECTED) return;

  Serial.println("[WIFI] Escaneando redes cercanas...");
  int n = WiFi.scanNetworks();

  JsonDocument doc;
  doc["dispositivoId"] = DEVICE_ID;
  JsonArray redes = doc["redes"].to<JsonArray>();

  for (int i = 0; i < n; i++) {
    String ssid = WiFi.SSID(i);
    ssid.trim();
    if (ssid.length() == 0) continue;

    bool duplicada = false;
    for (JsonObject existente : redes) {
      if (String(existente["ssid"] | "") == ssid) {
        duplicada = true;
        break;
      }
    }
    if (duplicada) continue;

    bool abierta = (WiFi.encryptionType(i) == WIFI_AUTH_OPEN);
    JsonObject item = redes.add<JsonObject>();
    item["ssid"]      = ssid;
    item["rssi"]      = WiFi.RSSI(i);
    item["seguridad"] = abierta ? "Abierta" : "WPA/WPA2";
    item["segura"]    = !abierta;
  }
  WiFi.scanDelete();

  String jsonBody;
  serializeJson(doc, jsonBody);

  HTTPClient http;
  String url = cfgApiBase + "/wifi-redes";
  http.begin(url);
  http.setTimeout(5000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", cfgDeviceKey);
  int code = http.POST(jsonBody);
  Serial.printf("[WIFI] %d redes enviadas -> HTTP %d\n", redes.size(), code);
  http.end();
}

void enviarTelemetriaHttp();

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
    } else if (strcmp(tipo, "CONFIG_BUFFER") == 0) {
      long muestreoSeg = params["muestreoSeg"] | (params["envioSeg"] | 300L);
      if (muestreoSeg < 15L) muestreoSeg = 15L;
      if (muestreoSeg > 3600L) muestreoSeg = 3600L;
      intervaloTelemetriaMs = (unsigned long)muestreoSeg * 1000UL;
      prefs.begin("axion_cfg", false);
      prefs.putLong("envioSeg", muestreoSeg);
      prefs.end();
      Serial.printf(" -> Nuevo intervalo de envío: %ld s\n", muestreoSeg);
    } else if (strcmp(tipo, "CONFIG_SENSOR") == 0) {
      String modulo = params["modulo"] | "";
      JsonObject cfg = params["config"];
      if (modulo == "dht22" && !cfg.isNull()) {
        if (cfg["activo"].is<bool>()) {
          dht22Activo = cfg["activo"].as<bool>();
          prefs.begin("axion_cfg", false);
          prefs.putBool("dhtActivo", dht22Activo);
          prefs.end();
        }
        Serial.printf(" -> DHT22 %s\n", dht22Activo ? "ACTIVO" : "PAUSADO");
      } else {
        Serial.printf(" -> Configuración aplicada para módulo: %s\n", modulo.c_str());
      }
    } else if (strcmp(tipo, "CONFIG_TECNICA_SENSOR") == 0) {
      String modulo = params["modulo"] | "";
      JsonObject p = params["parametros"];
      if (modulo == "dht22" && !p.isNull()) {
        if (p["offsetTemperatura"].is<float>()) dht22OffsetTemp = p["offsetTemperatura"].as<float>();
        if (p["offsetHumedad"].is<float>()) dht22OffsetHum = p["offsetHumedad"].as<float>();
        prefs.begin("axion_cfg", false);
        prefs.putFloat("dhtOffT", dht22OffsetTemp);
        prefs.putFloat("dhtOffH", dht22OffsetHum);
        prefs.end();
        Serial.printf(" -> DHT22 offsets: T=%.1f C, H=%.1f %%\n", dht22OffsetTemp, dht22OffsetHum);
      } else if (modulo == "ec" && !p.isNull()) {
        bool actualizado = false;
        if (p["kValue"].is<float>()) {
          tdsConvFactor = p["kValue"].as<float>();
          actualizado = true;
        } else if (p["k_value"].is<float>()) {
          tdsConvFactor = p["k_value"].as<float>();
          actualizado = true;
        }
        if (p["factorCalibracionK"].is<float>()) {
          tdsFactorK = p["factorCalibracionK"].as<float>();
          actualizado = true;
        }
        if (actualizado) {
          prefs.begin("axion_cfg", false);
          prefs.putFloat("tdsKVal", tdsConvFactor);
          prefs.putFloat("tdsFacK", tdsFactorK);
          prefs.end();
        }
        Serial.printf(" -> EC actualizado: kValue=%.2f, factorK=%.2f\n", tdsConvFactor, tdsFactorK);
      } else if (modulo == "ph" && !p.isNull()) {
        bool actualizadoPh = false;
        if (p["voltajeNeutroMv"].is<float>()) {
          float vN = p["voltajeNeutroMv"].as<float>();
          if (vN > 0.0f) {
            phVoltajeNeutro = vN;
            actualizadoPh = true;
          }
        }
        if (p["voltajeAcidoMv"].is<float>()) {
          float vA = p["voltajeAcidoMv"].as<float>();
          if (vA > 0.0f) {
            phVoltajeAcido = vA;
            actualizadoPh = true;
          }
        }
        if (actualizadoPh && fabs(phVoltajeNeutro - phVoltajeAcido) >= 10.0f) {
          prefs.begin("axion_cfg", false);
          prefs.putFloat("phVNeutro", phVoltajeNeutro);
          prefs.putFloat("phVAcido", phVoltajeAcido);
          prefs.end();
        }
        Serial.printf(" -> pH actualizado: V_neutro=%.2f mV, V_acido=%.2f mV\n", phVoltajeNeutro, phVoltajeAcido);
      } else {
        Serial.printf(" -> Configuración técnica aplicada para módulo: %s\n", modulo.c_str());
      }
    } else if (strcmp(tipo, "ESCANEAR_WIFI") == 0) {
      escanearYEnviarRedesWifi();
    } else if (strcmp(tipo, "CONFIG_CONECTIVIDAD") == 0) {
      const char* nuevoSsid = params["ssid"] | "";
      const char* nuevaPass = params["password"] | (params["wifiPassword"] | "");
      const char* nuevaUrl  = params["brokerUrl"] | "";
      const char* nuevaKey  = params["passTransporte"] | (params["deviceKey"] | "");

      if (strlen(nuevoSsid) > 0) {
        cfgSsid = String(nuevoSsid);
      }
      if (strlen(nuevaPass) > 0 && strcmp(nuevaPass, "********") != 0) {
        cfgPass = String(nuevaPass);
      }
      if (strlen(nuevaKey) > 0 && strcmp(nuevaKey, "********") != 0) {
        cfgDeviceKey = String(nuevaKey);
      }
      if (strlen(nuevaUrl) > 0) {
        String base = String(nuevaUrl);
        while (base.endsWith("/")) base.remove(base.length() - 1);
        cfgApiBase = base.endsWith("/api/v1/iot") ? base : (base + "/api/v1/iot");
      }

      guardarConfiguracionNvs(cfgSsid, cfgPass, cfgApiBase, cfgDeviceKey);
      Serial.printf(" -> Conectividad guardada en NVS: SSID=%s | API=%s\n", cfgSsid.c_str(), cfgApiBase.c_str());
      confirmarComandoAck(id);
      delay(500);
      ESP.restart();
      return;
    } else if (strcmp(tipo, "CALIBRAR_PH") == 0) {
      String paso = params["paso"] | "";
      float bufferPh = params["bufferPh"] | 0.0f;
      if (paso == "VOLTAJES_MV" || (params["voltajeNeutroMv"].is<float>() && params["voltajeAcidoMv"].is<float>())) {
        float vN = params["voltajeNeutroMv"] | phVoltajeNeutro;
        float vA = params["voltajeAcidoMv"] | phVoltajeAcido;
        if (vN > 0.0f && vA > 0.0f && fabs(vN - vA) >= 10.0f) {
          phVoltajeNeutro = vN;
          phVoltajeAcido  = vA;
        }
      } else {
        float mVActual = leerVoltajePhMv();
        if (paso == "PUNTO_NEUTRO" || fabs(bufferPh - 7.0f) < 0.2f) {
          if (mVActual > 10.0f) {
            phVoltajeNeutro = mVActual;
          } else {
            Serial.printf(" -> [pH] Lectura ADC demasiado baja (%.2f mV); revisa GPIO %d.\n", mVActual, PIN_PH);
          }
        } else if (paso == "SEGUNDO_PUNTO" || bufferPh > 0.0f) {
          if (mVActual > 10.0f) {
            if (bufferPh > 7.5f) {
              phVoltajeAcido = phVoltajeNeutro - (mVActual - phVoltajeNeutro) * (3.0f / (bufferPh - 7.0f));
            } else {
              phVoltajeAcido = mVActual;
            }
          } else {
            Serial.printf(" -> [pH] Lectura ADC demasiado baja (%.2f mV); revisa GPIO %d.\n", mVActual, PIN_PH);
          }
        }
      }
      if (fabs(phVoltajeNeutro - phVoltajeAcido) < 10.0f) {
        phVoltajeAcido = phVoltajeNeutro + 532.44f;
      }
      prefs.begin("axion_cfg", false);
      prefs.putFloat("phVNeutro", phVoltajeNeutro);
      prefs.putFloat("phVAcido", phVoltajeAcido);
      prefs.end();
      Serial.printf(" -> pH calibrado y guardado en NVS: V_neutro(7.0)=%.2f mV | V_acido(4.0)=%.2f mV\n",
                    phVoltajeNeutro, phVoltajeAcido);
    } else if (strcmp(tipo, "CALIBRAR_EC") == 0) {
      float patronMsCm = params["solucionPatronMsCm"] | 0.0f;
      float patronUsCm = (patronMsCm > 0.0f) ? (patronMsCm * 1000.0f) : (params["solucionPatronUsCm"] | 0.0f);
      float ecBase = leerEcBaseUsCm(25.0f);
      if (patronUsCm > 0.0f && ecBase > 1.0f) {
        float nuevoK = patronUsCm / ecBase;
        if (nuevoK < 0.1f) nuevoK = 0.1f;
        if (nuevoK > 5.0f) nuevoK = 5.0f;
        tdsFactorK = nuevoK;
      } else if (params["factorCalibracionK"].is<float>()) {
        float kParam = params["factorCalibracionK"].as<float>();
        if (kParam >= 0.1f && kParam <= 5.0f) tdsFactorK = kParam;
      }
      prefs.begin("axion_cfg", false);
      prefs.putFloat("tdsFacK", tdsFactorK);
      prefs.end();
      Serial.printf(" -> EC/TDS calibrado y guardado en NVS: patron=%.1f uS/cm | ecBase=%.1f uS/cm | tdsFactorK=%.3f\n",
                    patronUsCm, ecBase, tdsFactorK);
    } else if (strcmp(tipo, "CALIBRAR_CERO_NIVEL") == 0) {
      Serial.println(" -> Registrando punto cero de nivel...");
    } else if (strcmp(tipo, "FORZAR_SYNC_BUFFER") == 0) {
      Serial.println(" -> Sincronización forzada solicitada por el servidor. Enviando telemetría ahora...");
      confirmarComandoAck(id);
      enviarTelemetriaHttp();
      ultimoEnvioTelemetria = millis();
      continue;
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
// 7. COMUNICACIÓN HTTP CON EL BACKEND
// ============================================================================
String obtenerTimestampIsoUtc() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo, 2000)) {
    return "";
  }
  char buf[25];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(buf);
}

void enviarTelemetriaHttp() {
  if (WiFi.status() != WL_CONNECTED) return;

  String tsIso = obtenerTimestampIsoUtc();
  LecturaSensores s = leerSensores();

  JsonDocument doc;
  if (tsIso.length() > 0) {
    doc["ts"] = tsIso;
  }
  doc["dispositivo_id"] = DEVICE_ID;
  doc["fw"]             = "1.1.0-http-real";
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
  estado["dht22"] = !dht22Activo ? "pausado" : (s.dhtOk ? "ok" : "error");
  estado["pt100"] = MODO_SIMULACION ? "ok" : "pendiente";
  estado["ph"]    = "ok";
  estado["tds"]   = "ok";
  estado["nivel"] = MODO_SIMULACION ? "ok" : "pendiente";

  String jsonBody;
  serializeJson(doc, jsonBody);

  HTTPClient http;
  String url = cfgApiBase + "/telemetria";
  http.begin(url);
  http.setTimeout(5000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", cfgDeviceKey);

  int httpCode = http.POST(jsonBody);
  Serial.printf("[POST /telemetria] HTTP %d | DHT22(%s): %.1f C, %.1f %% | pH: %.2f | TDS: %.1f ppm\n",
                httpCode,
                !dht22Activo ? "PAUSA" : (s.dhtOk ? "OK" : "ERR"),
                s.tempAmbC,
                s.humAmbPct,
                s.ph,
                s.tdsPpm);
  if (httpCode == 200 || httpCode == 201) {
    procesarRespuestaServidor(http.getString());
  } else if (httpCode < 0) {
    Serial.printf("[HTTP POST] Error de conexión a %s: %s\n", url.c_str(), http.errorToString(httpCode).c_str());
  }
  http.end();
}

void consultarComandosHttp() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = cfgApiBase + "/comandos?dispositivoId=" + String(DEVICE_ID);
  http.begin(url);
  http.setTimeout(4000);
  http.addHeader("X-Device-Key", cfgDeviceKey);

  int httpCode = http.GET();
  if (httpCode == 200) {
    procesarRespuestaServidor(http.getString());
  } else {
    Serial.printf("[HTTP GET] Error %d consultando comandos en %s\n", httpCode, url.c_str());
  }
  http.end();
}

void asegurarWifi(bool abrirPortalSiFalla) {
  if (WiFi.status() == WL_CONNECTED) {
    inicioDesconexionWifi = 0;
    return;
  }

  if (cfgSsid.length() == 0 || cfgSsid == "TU_RED_WIFI") {
    if (abrirPortalSiFalla) iniciarPortalCautivo();
    return;
  }

  Serial.printf("Conectando a Wi-Fi '%s'...", cfgSsid.c_str());
  WiFi.mode(WIFI_STA);
  WiFi.begin(cfgSsid.c_str(), cfgPass.c_str());

  unsigned long inicio = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - inicio < 20000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    inicioDesconexionWifi = 0;
    Serial.printf("\n[Wi-Fi] Conectado. IP: %s | RSSI: %d dBm\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
    configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  } else {
    Serial.println("\n[Wi-Fi] No se pudo conectar.");
    if (abrirPortalSiFalla) {
      iniciarPortalCautivo();
    } else {
      if (inicioDesconexionWifi == 0) inicioDesconexionWifi = millis();
      if (millis() - inicioDesconexionWifi >= 300000UL) {
        iniciarPortalCautivo();
      }
    }
  }
}

// ============================================================================
// 8. SETUP Y LOOP
// ============================================================================
void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  dht.begin();
  delay(500);

  for (int i = 0; i < 6; i++) {
    pinMode(PINES_RELES[i], OUTPUT);
    aplicarEstadoRele(i + 1, false);
  }

  cargarConfiguracionNvs();
  asegurarWifi(true);

  // Espera breve para sincronizar NTP en el primer arranque (el backend respalda si no hay NTP)
  for (int i = 0; i < 6 && obtenerTimestampIsoUtc().length() == 0; i++) {
    delay(500);
  }

  enviarTelemetriaHttp();
  ultimoEnvioTelemetria = millis();
  ultimaConsultaComandos = millis();
}

void loop() {
  asegurarWifi(false);

  unsigned long ahora = millis();

  if (ahora - ultimoEnvioTelemetria >= intervaloTelemetriaMs) {
    ultimoEnvioTelemetria = ahora;
    enviarTelemetriaHttp();
  }

  if (ahora - ultimaConsultaComandos >= INTERVALO_COMANDOS_MS) {
    ultimaConsultaComandos = ahora;
    consultarComandosHttp();
  }

  delay(50);
}
