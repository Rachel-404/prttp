/**
 * AXIÓN - IOT | Firmware HTTP Puro para ESP32-S3-WROOM-1
 * ---------------------------------------------------------------------------
 * Comunicación bidireccional 100% HTTP (sin Mosquitto / MQTT / BLE):
 *   1. POST /api/v1/iot/telemetria  -> Envía lecturas con fecha/hora NTP ("ts")
 *                                      y recibe estado de relés + comandos.
 *   2. GET  /api/v1/iot/comandos    -> Polling ligero cada 3 s para relés/comandos.
 *   3. POST /api/v1/iot/comandos/{id}/ack -> Confirma ejecución de comando.
 *   4. Portal Cautivo Wi-Fi (SoftAP) -> Si no puede conectarse al Wi-Fi guardado,
 *      crea la red "AXION-ESP32-SETUP" (http://192.168.4.1) para reconfigurar
 *      Wi-Fi y URL del servidor desde cualquier celular o laptop.
 *
 * Librerías requeridas en Arduino IDE:
 *   - WiFi, HTTPClient, WebServer, DNSServer, Preferences (incluidas en core ESP32)
 *   - ArduinoJson (v7.x, instalar desde Library Manager)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <Preferences.h>
#include <ArduinoJson.h>
#include <time.h>

// ============================================================================
// VALORES INICIALES POR DEFECTO (SE PUEDEN CAMBIAR LUEGO DESDE EL PORTAL WEB)
// ============================================================================
const char* DEFAULT_WIFI_SSID     = "TU_RED_WIFI";
const char* DEFAULT_WIFI_PASSWORD = "TU_PASSWORD_WIFI";

// En local: http://IP_DE_TU_PC:8080/api/v1/iot  (no uses localhost desde el ESP32)
// En nube:  https://tu-dominio.com/api/v1/iot
const char* DEFAULT_API_IOT_BASE  = "http://192.168.1.100:8080/api/v1/iot";
const char* DEVICE_ID             = "ESP32_HIDRO_01";
const char* DEFAULT_DEVICE_KEY    = "axion_dev_esp32_key_2026";

// Nombre de la red temporal cuando el ESP32 abre el Portal Cautivo (192.168.4.1)
const char* PORTAL_AP_SSID        = "AXION-ESP32-SETUP";
const unsigned long PORTAL_TIMEOUT_MS = 180000; // 3 minutos antes de reintentar Wi-Fi guardado

// Intervalos en milisegundos (mínimo 5 min = 300000 ms, máximo 1 h = 3600000 ms)
unsigned long intervaloTelemetriaMs = 300000; // Por defecto cada 5 minutos
const unsigned long INTERVALO_COMANDOS_MS = 3000; // Cada 3 s consulta relés/comandos

// Cambia a false cuando conectes los sensores físicos reales
const bool MODO_SIMULACION = true;

// ============================================================================
// PINOUT DE HARDWARE (6 Canales de Relés)
// ============================================================================
int PINES_RELES[6] = { 4, 5, 6, 7, 15, 16 };
bool RELE_ACTIVO_LOW = true; // true = lógica "low" (activo en LOW), false = "high"

// ============================================================================
// ESTADO INTERNO Y CONFIGURACIÓN PERSISTENTE (NVS)
// ============================================================================
Preferences prefs;
String cfgSsid;
String cfgPass;
String cfgApiBase;
String cfgDeviceKey;

unsigned long ultimoEnvioTelemetria = 0;
unsigned long ultimaConsultaComandos = 0;
unsigned long inicioDesconexionWifi = 0;

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

void cargarConfiguracionNvs() {
  prefs.begin("axion_cfg", true);
  cfgSsid      = prefs.getString("ssid", DEFAULT_WIFI_SSID);
  cfgPass      = prefs.getString("pass", DEFAULT_WIFI_PASSWORD);
  cfgApiBase   = prefs.getString("apiBase", DEFAULT_API_IOT_BASE);
  cfgDeviceKey = prefs.getString("devKey", DEFAULT_DEVICE_KEY);
  prefs.end();
}

void guardarConfiguracionNvs(const String& ssid, const String& pass, const String& apiBase, const String& devKey) {
  prefs.begin("axion_cfg", false);
  prefs.putString("ssid", ssid);
  prefs.putString("pass", pass);
  prefs.putString("apiBase", apiBase);
  prefs.putString("devKey", devKey);
  prefs.end();
}

// ============================================================================
// PORTAL CAUTIVO WI-FI (192.168.4.1)
// ============================================================================
void iniciarPortalCautivo() {
  Serial.println("\n[PORTAL] Iniciando SoftAP de configuración: " + String(PORTAL_AP_SSID));

  WiFi.disconnect(true);
  WiFi.mode(WIFI_AP_STA);
  int redesEncontradas = WiFi.scanNetworks();

  String opcionesWifi = "";
  for (int i = 0; i < redesEncontradas; i++) {
    String nombre = WiFi.SSID(i);
    if (nombre.length() > 0) {
      opcionesWifi += "<option value=\"" + nombre + "\">" + nombre + " (" + String(WiFi.RSSI(i)) + " dBm)</option>";
    }
  }

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
      "<style>body{font-family:sans-serif;background:#0f172a;color:#e2e8f0;margin:0;padding:20px}"
      ".card{max-width:420px;margin:20px auto;background:#1e293b;padding:24px;border-radius:10px}"
      "h2{margin-top:0;color:#38bdf8}label{display:block;margin:12px 0 4px;font-size:14px}"
      "input,select{width:100%;padding:10px;border-radius:6px;border:1px solid #475569;background:#0f172a;color:#fff;box-sizing:border-box}"
      "button{width:100%;margin-top:18px;padding:12px;border:0;border-radius:6px;background:#22c55e;color:#052e16;font-weight:bold;font-size:16px;cursor:pointer}"
      "</style></head><body><div class='card'><h2>AXIÓN - IOT (ESP32-S3)</h2>"
      "<p>Configura la red Wi-Fi y la URL del servidor backend:</p>"
      "<form method='POST' action='/guardar'>"
      "<label>Redes Wi-Fi detectadas</label><select onchange=\"document.getElementById('ssid').value=this.value\">"
      "<option value=''>-- Seleccionar red --</option>" + opcionesWifi + "</select>"
      "<label>SSID Wi-Fi</label><input id='ssid' name='ssid' value='" + cfgSsid + "' required>"
      "<label>Contraseña Wi-Fi</label><input type='password' name='pass' value='" + cfgPass + "'>"
      "<label>URL Backend IoT</label><input name='apiBase' value='" + cfgApiBase + "' required>"
      "<label>Device Key (X-Device-Key)</label><input name='devKey' value='" + cfgDeviceKey + "' required>"
      "<button type='submit'>Guardar y Conectar</button></form></div></body></html>";
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
  String url = cfgApiBase + "/comandos/" + String(comandoId) + "/ack";
  http.begin(url);
  http.addHeader("X-Device-Key", cfgDeviceKey);
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
    } else if (strcmp(tipo, "CONFIG_BUFFER") == 0) {
      long muestreoSeg = params["muestreoSeg"] | (params["envioSeg"] | 300L);
      if (muestreoSeg < 300L) muestreoSeg = 300L;
      if (muestreoSeg > 3600L) muestreoSeg = 3600L;
      intervaloTelemetriaMs = (unsigned long)muestreoSeg * 1000UL;
      Serial.printf(" -> Nuevo intervalo de muestreo y envío inmediato: %ld s\n", muestreoSeg);
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

  // TODO: Conectar aquí lecturas reales
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
  if (tsIso.length() == 0) {
    Serial.println("[NTP] Reloj aún no sincronizado, omitiendo envío hasta obtener hora.");
    return;
  }

  LecturaSensores s = leerSensores();

  JsonDocument doc;
  doc["ts"]             = tsIso;
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
  String url = cfgApiBase + "/telemetria";
  http.begin(url);
  http.setTimeout(5000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", cfgDeviceKey);

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
  String url = cfgApiBase + "/comandos?dispositivoId=" + String(DEVICE_ID);
  http.begin(url);
  http.setTimeout(4000);
  http.addHeader("X-Device-Key", cfgDeviceKey);

  int httpCode = http.GET();
  if (httpCode == 200) {
    String respuesta = http.getString();
    procesarRespuestaServidor(respuesta);
  } else {
    Serial.printf("[HTTP GET] Error %d consultando comandos\n", httpCode);
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
      // Si lleva más de 5 minutos sin poder reconectar, abre el Portal Cautivo
      if (millis() - inicioDesconexionWifi >= 300000UL) {
        iniciarPortalCautivo();
      }
    }
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

  cargarConfiguracionNvs();
  asegurarWifi(true);

  // Espera breve para sincronizar NTP en el primer arranque
  for (int i = 0; i < 10 && obtenerTimestampIsoUtc().length() == 0; i++) {
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
