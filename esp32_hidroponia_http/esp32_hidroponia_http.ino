/**
 * AXIÓN - IOT | Firmware HTTP Unificado para ESP32-S3-WROOM-1 (N16R8)
 * ---------------------------------------------------------------------------
 * Basado en el inventario físico y mapa de conexiones de /elementos/CONEXIONES.md:
 *
 *   1. Sensor de pH (DFRobot Gravity pH Meter V2.0 + Electrodo BNC H-101):
 *      - '+' (Rojo)  -> 3V3
 *      - '-' (Negro) -> G (GND)
 *      - 'A' (Azul)  -> GPIO 4 (ADC1_CH3, Columna Izquierda)
 *
 *   2. Sensor de Conductividad / TDS (TDS Meter V1.0 + Sonda 2 puntas):
 *      - '+' (Rojo)  -> 3V3
 *      - '-' (Negro) -> G (GND)
 *      - 'A' (Azul)  -> GPIO 5 (ADC1_CH4, Columna Izquierda)
 *
 *   3. Sensor Ambiental Temperatura/Humedad (Módulo DHT22 / ASAIR AM2302):
 *      - '+'   (Azul)     -> 3V3
 *      - 'out' (Verde)    -> GPIO 6 (Digital One-Wire, Columna Izquierda)
 *      - '-'   (Amarillo) -> G (GND)
 *
 *   4. Transmisor Sumergible de Nivel (LEEG LMP633-NCN 4-20 mA + Conversor/Shunt 150 Ω):
 *      - Cable Rojo (VCC+) -> Fuente Externa 12V-24V (+)
 *      - Cable Azul (IOUT) -> IN+ Conversor 4-20mA -> Salida OUT a GPIO 7 (ADC1_CH6)
 *
 *   5. Sonda RTD PT100 (3 hilos: 1 terminal Rojo + 2 Azules) + Módulo MAX31865 (SPI):
 *      - VIN -> 3V3 | GND -> G
 *      - CS  -> GPIO 10 | SDI (MOSI) -> GPIO 11 | SCK -> GPIO 12 | SDO (MISO) -> GPIO 13
 *
 *   6. Dos Módulos de 4 Relés HW-316 (JQC3F-05VDC-C, Active LOW con optoacoplador):
 *      - Módulo #1 (Columna Izquierda, VCC->5V, GND->G):
 *          IN1 (M1) -> GPIO 16 | IN2 (M2) -> GPIO 17 | IN3 (M3) -> GPIO 18 | IN4 (M4) -> GPIO 8
 *      - Módulo #2 (Columna Derecha, VCC->5V, GND->G):
 *          IN1 (M1) -> GPIO 42 | IN2 (M2) -> GPIO 41 | IN3 (M3) -> GPIO 40 | IN4 (M4) -> GPIO 39
 *
 * Comunicación bidireccional 100% HTTP (sin Mosquitto / MQTT / BLE):
 *   - POST /api/v1/iot/telemetria        -> Envía lecturas y recibe relés + comandos.
 *   - GET  /api/v1/iot/comandos          -> Polling cada 3 s para relés/comandos.
 *   - POST /api/v1/iot/comandos/{id}/ack -> Confirma ejecución de comando.
 *   - Portal Cautivo Wi-Fi ("AXION_HIDRO_SETUP" en 192.168.4.1) + Memoria NVS.
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <Preferences.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <SPI.h>
#include <math.h>
#include <time.h>

struct LecturaSensores {
  float ph;
  float ecUsCm;
  float tdsPpm;
  float tempAguaC;
  float tempAmbC;
  float humAmbPct;
  float nivelCm;
  float nivelPct;
  bool phOk;
  bool tdsOk;
  bool dhtOk;
  bool pt100Ok;
  bool nivelOk;
};

enum EstadoLedConexion {
  LED_INICIANDO,
  LED_CONECTANDO_WIFI,
  LED_PORTAL_CAUTIVO,
  LED_CONECTADO_OK,
  LED_WIFI_SIN_API,
  LED_SIN_WIFI
};

void iniciarPortalCautivo(const String& motivo = "Sin conexión Wi-Fi o sin respuesta HTTP 200 del Backend");
float leerEcBaseUsCm(float temperaturaAgua, bool pt100Valida, bool* tdsOkOut = nullptr);
void aplicarEstadoRele(int canal, bool encendido, bool forzarLog = false);
void apagarTodosLosReles(const String& motivo);
bool enviarTelemetriaHttp();
void establecerEstadoLed(EstadoLedConexion nuevoEstado);
void actualizarLedEstado();
void destellarLedEnvio();

// ============================================================================
// 1. CONFIGURACIÓN DE RED Y SERVIDOR BACKEND (INICIA LIMPIO; SE GUARDA EN NVS)
// ============================================================================
const char* EP_TELEMETRIA      = "/api/v1/iot/telemetria";
const char* EP_COMANDOS        = "/api/v1/iot/comandos";
const char* DEFAULT_DEVICE_ID  = "ESP32_HIDRO_01";
const char* DEFAULT_DEVICE_KEY = "axion_dev_esp32_key_2026";

const char* PORTAL_AP_SSID            = "AXION_HIDRO_SETUP";
const unsigned long PORTAL_TIMEOUT_MS = 180000; // 3 minutos
const int MAX_FALLOS_HTTP_PORTAL      = 10;     // ~30 s sin recibir HTTP 200 del API -> abre portal

// Cadencia global configurable desde el Nodo Maestro (15 s a 3600 s; defecto 300 s)
unsigned long intervaloTelemetriaMs       = 300000;
const unsigned long INTERVALO_COMANDOS_MS = 3000;

// ============================================================================
// 2. PINOUT FÍSICO SEGÚN elementos/CONEXIONES.md (ESP32-S3-WROOM-1)
// ============================================================================
#define PIN_PH        4   // Gravity pH Meter V2.0 (Puerto A - Cable Azul -> GPIO 4 / ADC1_CH3)
#define PIN_TDS       5   // TDS Meter V1.0        (Puerto A - Cable Azul -> GPIO 5 / ADC1_CH4)
#define PIN_DHT       6   // DHT22 AM2302          (Puerto out - Cable Verde -> GPIO 6)
#define PIN_NIVEL     7   // LMP633-NCN 4-20mA     (Salida OUT Conversor / Shunt -> GPIO 7 / ADC1_CH6)
#define DHTTYPE       DHT22

// Bus SPI para Módulo MAX31865 + Sonda PT100 (3 hilos: 1 Rojo RTD+, 2 Azules RTD-/F-)
#define PIN_PT100_CS  10
#define PIN_PT100_SDI 11  // MOSI
#define PIN_PT100_SCK 12  // CLK
#define PIN_PT100_SDO 13  // MISO

// 2 Módulos HW-316 de 4 Relés cada uno (8 canales totales):
//   Canales 1..4 -> Módulo #1 (Columna Izquierda): GPIO 16, 17, 18, 8
//   Canales 5..8 -> Módulo #2 (Columna Derecha)  : GPIO 42, 41, 40, 39
const int NUM_RELES = 8;
int PINES_RELES[NUM_RELES] = { 16, 17, 18, 8, 42, 41, 40, 39 };
int estadoRelesAplicado[NUM_RELES] = { -1, -1, -1, -1, -1, -1, -1, -1 };
bool RELE_ACTIVO_LOW = true; // true = Active LOW (optoacoplador PC817 estándar en HW-316)
bool modoAutomaticoReles = false;

bool esGpioSeguroEsp32S3(int pin) {
  if (pin < 1 || pin > 48) return false;
  if (pin == 3 || pin == 19 || pin == 20 || pin == 45 || pin == 46) return false;
  if (pin >= 22 && pin <= 37) return false; // 22..25 no existen; 26..32 Flash; 33..37 PSRAM Octal N16R8
  return true;
}

DHT dht(PIN_DHT, DHTTYPE);

// ============================================================================
// 2.1. INDICADOR LED RGB INTEGRADO (ESP32-S3-WROOM-1: RGB_BUILTIN / GPIO 48)
// ============================================================================
// Si tu revisión de placa tiene el LED RGB en GPIO 38 en vez de 48, cambia a: #define PIN_LED_ESTADO 38
#ifdef RGB_BUILTIN
  #define PIN_LED_ESTADO RGB_BUILTIN
#else
  #define PIN_LED_ESTADO 48
#endif

EstadoLedConexion estadoLedActual = LED_INICIANDO;
bool ledInicializado              = false;
unsigned long ultimoCambioLedMs   = 0;
unsigned long finDestelloEnvioMs  = 0;
bool ledParpadeoEncendido         = true;

void escribirLedRgb(uint8_t r, uint8_t g, uint8_t b) {
  #if defined(ESP_ARDUINO_VERSION_MAJOR) && (ESP_ARDUINO_VERSION_MAJOR >= 3)
    rgbLedWrite(PIN_LED_ESTADO, r, g, b);
  #else
    neopixelWrite(PIN_LED_ESTADO, r, g, b);
  #endif
}

void aplicarColorEstadoLed(bool encendido) {
  if (!encendido) {
    escribirLedRgb(0, 0, 0);
    return;
  }
  switch (estadoLedActual) {
    case LED_INICIANDO:       escribirLedRgb(20, 20, 20); break; // Blanco suave fijo
    case LED_CONECTANDO_WIFI: escribirLedRgb(0, 20, 60);  break; // Azul (parpadeo rápido)
    case LED_PORTAL_CAUTIVO:  escribirLedRgb(40, 0, 50);  break; // Violeta/Morado (parpadeo lento)
    case LED_CONECTADO_OK:    escribirLedRgb(0, 40, 0);   break; // Verde fijo
    case LED_WIFI_SIN_API:    escribirLedRgb(55, 25, 0);  break; // Ámbar/Naranja (parpadeo medio)
    case LED_SIN_WIFI:        escribirLedRgb(55, 0, 0);   break; // Rojo (parpadeo)
  }
}

void establecerEstadoLed(EstadoLedConexion nuevoEstado) {
  if (ledInicializado && estadoLedActual == nuevoEstado && finDestelloEnvioMs == 0) return;
  ledInicializado = true;
  estadoLedActual = nuevoEstado;
  ledParpadeoEncendido = true;
  ultimoCambioLedMs = millis();
  if (finDestelloEnvioMs == 0) {
    aplicarColorEstadoLed(true);
  }
}

void destellarLedEnvio() {
  escribirLedRgb(0, 45, 45); // Destello cian breve al enviar telemetría con HTTP 200
  finDestelloEnvioMs = millis() + 180UL;
}

void actualizarLedEstado() {
  unsigned long ahora = millis();
  if (finDestelloEnvioMs != 0) {
    if ((long)(ahora - finDestelloEnvioMs) >= 0) {
      finDestelloEnvioMs = 0;
      aplicarColorEstadoLed(ledParpadeoEncendido);
    }
    return;
  }

  unsigned long intervaloMs = 0;
  switch (estadoLedActual) {
    case LED_CONECTANDO_WIFI: intervaloMs = 250; break;
    case LED_SIN_WIFI:        intervaloMs = 400; break;
    case LED_WIFI_SIN_API:    intervaloMs = 500; break;
    case LED_PORTAL_CAUTIVO:  intervaloMs = 700; break;
    default:                  return; // Estados fijos (INICIANDO, CONECTADO_OK)
  }

  if (ahora - ultimoCambioLedMs >= intervaloMs) {
    ultimoCambioLedMs = ahora;
    ledParpadeoEncendido = !ledParpadeoEncendido;
    aplicarColorEstadoLed(ledParpadeoEncendido);
  }
}

// ============================================================================
// 3. ESTADO INTERNO Y PARÁMETROS CONFIGURABLES PERSISTENTES (NVS)
// ============================================================================
Preferences prefs;
String cfgSsid         = "";
String cfgPass         = "";
String cfgAsignacionIp = "dhcp";
String cfgIpLocal      = "";
String cfgMascara      = "255.255.255.0";
String cfgGateway      = "";
String cfgDns          = "8.8.8.8";
String cfgServerUrl    = "";
String cfgDeviceId     = DEFAULT_DEVICE_ID;
String cfgDeviceKey    = DEFAULT_DEVICE_KEY;

int fallosHttpConsecutivos = 0;
int ultimoCodigoHttp       = 0;

String normalizarServerUrl(String url) {
  url.trim();
  while (url.endsWith("/")) url.remove(url.length() - 1);
  if (url.endsWith("/api/v1/iot")) {
    url.remove(url.length() - 11);
    while (url.endsWith("/")) url.remove(url.length() - 1);
  }
  return url;
}

String construirUrlApi(const char* endpoint) {
  return normalizarServerUrl(cfgServerUrl) + String(endpoint);
}

// Estados de activación por sensor
bool phActivo        = true;
bool ecActivo        = true;
bool dht22Activo     = true;
bool nivelActivo     = true;
bool tempAguaActiva  = true;

// Parámetros DHT22
float dht22OffsetTemp = 0.0f;
float dht22OffsetHum  = 0.0f;

// Parámetros Gravity pH V2.0 (calibración en mV a 25 °C; 1500.0 mV corresponde a pH 7.00)
float phVoltajeNeutro = 1500.0f;  // mV en punto neutro (pH 7.00 / 6.86)
float phVoltajeAcido  = 2032.44f; // mV en punto ácido  (pH 4.00)
float phRefNeutro     = 7.00f;
float phRefAcido      = 4.00f;

// Parámetros TDS V1.0 / EC (Rango físico placa: 0-1000 ppm)
float tdsFactorK    = 1.0f;  // Factor de calibración k
float tdsConvFactor = 0.5f;  // Factor conversión EC -> TDS (kValue: 0.50 NaCl, 0.64-0.70 hidroponía)
float ecCoefAlpha   = 0.02f; // Coeficiente térmico α (%/°C)
float ecTempManual  = 25.0f;
bool  ecAtcActiva   = true;  // compensacionTermica activa/desactivada
bool  ecAtcPt100    = true;  // true = usar PT100, false = usar ecTempManual

// Parámetros Transmisor Sumergible LMP633-NCN (4-20 mA)
float nivelShuntOhm   = 150.0f; // 150 Ω -> 4 mA = 600 mV, 20 mA = 3000 mV (seguro para ADC 3.3V)
float nivelOffsetCm   = 0.0f;
float nivelRangoMaxCm = 204.0f; // Cápsula C203G (20 kPa ≈ 204 cm H2O); C403G ≈ 408 cm; C104G ≈ 1020 cm
float tanqueAlturaCm  = 100.0f; // Altura útil del tanque para porcentaje (0-100%)

// Parámetros PT100 + MAX31865 (3 hilos, rango sonda 0 a 400 °C, α fijo IEC 60751 = 0.00385)
const float PT100_ALPHA_IEC = 0.00385f;
float pt100RrefOhm     = 430.0f;
float pt100OffsetC     = 0.0f;
bool  pt100TresHilos   = true;
bool  pt100Filtro50Hz  = false; // false = 60Hz (por defecto), true = 50Hz
bool  pt100Compensar   = true;  // compensarOtros: proveer temperatura a TDS/EC

unsigned long ultimoEnvioTelemetria  = 0;
unsigned long ultimaConsultaComandos = 0;
unsigned long inicioDesconexionWifi  = 0;

void guardarConfiguracionNvs(
    const String& ssid,
    const String& pass,
    const String& serverUrl,
    const String& devId,
    const String& devKey,
    const String& asignacionIp = "dhcp",
    const String& ipLocal = "",
    const String& mascara = "255.255.255.0",
    const String& gateway = "",
    const String& dns = "8.8.8.8") {
  prefs.begin("axion_cfg", false);
  prefs.putString("wifiSsid", ssid);
  prefs.putString("wifiPass", pass);
  prefs.putString("ipModo", asignacionIp == "estatica" ? "estatica" : "dhcp");
  prefs.putString("ipLocal", ipLocal);
  prefs.putString("ipMask", mascara);
  prefs.putString("ipGw", gateway);
  prefs.putString("ipDns", dns);
  prefs.putString("serverUrl", serverUrl);
  prefs.putString("devId", devId);
  prefs.putString("devKey", devKey);
  prefs.end();
}

void cargarConfiguracionNvs() {
  prefs.begin("axion_cfg", true);
  cfgSsid         = prefs.getString("wifiSsid", "");
  cfgPass         = prefs.getString("wifiPass", "");
  cfgAsignacionIp = prefs.getString("ipModo", "dhcp");
  if (cfgAsignacionIp != "estatica") cfgAsignacionIp = "dhcp";
  cfgIpLocal      = prefs.getString("ipLocal", "");
  cfgMascara      = prefs.getString("ipMask", "255.255.255.0");
  cfgGateway      = prefs.getString("ipGw", "");
  cfgDns          = prefs.getString("ipDns", "8.8.8.8");
  cfgServerUrl    = normalizarServerUrl(prefs.getString("serverUrl", prefs.getString("apiBaseUrl", "")));
  cfgDeviceId     = prefs.getString("devId", DEFAULT_DEVICE_ID);
  cfgDeviceKey    = prefs.getString("devKey", DEFAULT_DEVICE_KEY);
  if (cfgDeviceId.length() == 0) cfgDeviceId = DEFAULT_DEVICE_ID;
  if (cfgDeviceKey.length() == 0) cfgDeviceKey = DEFAULT_DEVICE_KEY;

  phActivo       = prefs.getBool("phActivo", true);
  ecActivo       = prefs.getBool("ecActivo", true);
  dht22Activo    = prefs.getBool("dhtActivo", true);
  nivelActivo    = prefs.getBool("nivActivo", true);
  tempAguaActiva = prefs.getBool("tmpActivo", true);

  dht22OffsetTemp = prefs.getFloat("dhtOffT", 0.0f);
  dht22OffsetHum  = prefs.getFloat("dhtOffH", 0.0f);

  phVoltajeNeutro = prefs.getFloat("phVNeutro", 1500.0f);
  phVoltajeAcido  = prefs.getFloat("phVAcido", 2032.44f);
  phRefNeutro     = prefs.getFloat("phRefN", 7.00f);
  phRefAcido      = prefs.getFloat("phRefA", 4.00f);
  if (fabs(phVoltajeNeutro - phVoltajeAcido) < 10.0f) {
    phVoltajeNeutro = 1500.0f;
    phVoltajeAcido  = 2032.44f;
  }

  tdsConvFactor = prefs.getFloat("tdsKVal", 0.5f);
  tdsFactorK    = prefs.getFloat("tdsFacK", 1.0f);
  ecCoefAlpha   = prefs.getFloat("ecAlpha", 0.02f);
  ecTempManual  = prefs.getFloat("ecTmpMan", 25.0f);
  ecAtcActiva   = prefs.getBool("ecAtcOn", true);
  ecAtcPt100    = prefs.getBool("ecAtcPt", true);
  if (tdsFactorK < 0.1f || tdsFactorK > 5.0f) tdsFactorK = 1.0f;

  nivelShuntOhm   = prefs.getFloat("nivShunt", 150.0f);
  nivelOffsetCm   = prefs.getFloat("nivOffCm", 0.0f);
  nivelRangoMaxCm = prefs.getFloat("nivMaxCm", 204.0f);
  tanqueAlturaCm  = prefs.getFloat("nivAltCm", 100.0f);

  pt100RrefOhm    = prefs.getFloat("ptRref", 430.0f);
  pt100OffsetC    = prefs.getFloat("ptOffC", 0.0f);
  pt100TresHilos  = prefs.getBool("pt3Wire", true);
  pt100Filtro50Hz = prefs.getBool("pt50Hz", false);
  pt100Compensar  = prefs.getBool("ptComp", true);

  RELE_ACTIVO_LOW     = prefs.getBool("relLow", true);
  modoAutomaticoReles = prefs.getBool("relAuto", false);
  for (int i = 0; i < NUM_RELES; i++) {
    String keyPin = "relPin" + String(i + 1);
    int pinGuardado = prefs.getInt(keyPin.c_str(), PINES_RELES[i]);
    if (esGpioSeguroEsp32S3(pinGuardado)) PINES_RELES[i] = pinGuardado;
  }

  long envioSeg = prefs.getLong("envioSeg", 300L);
  if (envioSeg >= 15L && envioSeg <= 3600L) {
    intervaloTelemetriaMs = (unsigned long)envioSeg * 1000UL;
  }
  prefs.end();
}

// ============================================================================
// 4. PORTAL CAUTIVO WI-FI CON DISEÑO AXIÓN - IOT (192.168.4.1)
// ============================================================================
String escaparHtml(const String& raw) {
  String s = raw;
  s.replace("&", "&amp;");
  s.replace("<", "&lt;");
  s.replace(">", "&gt;");
  s.replace("\"", "&quot;");
  s.replace("'", "&#39;");
  return s;
}

String escanearRedesHtml() {
  int redesEncontradas = WiFi.scanNetworks();
  String html = "";
  for (int i = 0; i < redesEncontradas; i++) {
    String nombre = WiFi.SSID(i);
    nombre.trim();
    if (nombre.length() == 0) continue;
    String nombreEsc = escaparHtml(nombre);
    bool abierta = (WiFi.encryptionType(i) == WIFI_AUTH_OPEN);
    int rssi = WiFi.RSSI(i);
    html += "<button type='button' class='red-btn' data-ssid='" + nombreEsc + "' onclick=\"elegirRed(this.getAttribute('data-ssid'))\">"
            "<span class='red-nombre'><strong>" + nombreEsc + "</strong></span>"
            "<span class='red-meta'>" + String(rssi) + " dBm · " + (abierta ? "Abierta" : "Segura") + "</span>"
            "</button>";
  }
  WiFi.scanDelete();
  if (html.length() == 0) {
    html = "<p class='texto-guia'>No se detectaron redes Wi-Fi 2.4 GHz cercanas. Pulsa 'Re-escanear redes'.</p>";
  }
  return html;
}

void iniciarPortalCautivo(const String& motivo) {
  apagarTodosLosReles("Portal cautivo por pérdida de conexión: " + motivo);
  establecerEstadoLed(LED_PORTAL_CAUTIVO);
  Serial.println("\n[PORTAL] Iniciando SoftAP AXIÓN - IOT: " + String(PORTAL_AP_SSID));
  Serial.println("[PORTAL] Motivo: " + motivo);

  WiFi.disconnect(true);
  WiFi.mode(WIFI_AP_STA);
  String listaRedesHtml = escanearRedesHtml();

  WiFi.softAP(PORTAL_AP_SSID);
  IPAddress apIp = WiFi.softAPIP();
  Serial.print("[PORTAL] Conéctate a '" + String(PORTAL_AP_SSID) + "' (red abierta) y abre: http://");
  Serial.println(apIp);

  DNSServer dnsServer;
  dnsServer.start(53, "*", apIp);

  WebServer server(80);
  unsigned long inicioPortal = millis();

  auto enviarFormulario = [&]() {
    String html = "<!DOCTYPE html><html lang='es'><head><meta charset='UTF-8'>"
      "<meta name='viewport' content='width=device-width,initial-scale=1'>"
      "<title>AXIÓN - IOT | Configuración ESP32-S3</title>"
      "<style>"
      ":root{--bg-nav:#111827;--bg-main:#0b1120;--bg-card:#162032;--text:#f8fafc;--muted:#94a3b8;"
      "--border:rgba(148,163,184,0.18);--ok:#16a34a;--ok-h:#15803d;--warn:#f59e0b;--crit:#dc2626;}"
      "*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,-apple-system,sans-serif;"
      "background:var(--bg-main);color:var(--text);font-size:14px;line-height:1.45;}"
      ".navbar{background:var(--bg-nav);border-bottom:1px solid var(--border);padding:14px 20px;"
      "display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;}"
      ".brand{font-size:18px;font-weight:800;letter-spacing:.4px;}"
      ".badge{display:inline-flex;align-items:center;gap:8px;padding:5px 12px;border-radius:999px;"
      "font-size:12px;font-weight:700;background:rgba(245,158,11,0.16);color:#fbbf24;border:1px solid rgba(245,158,11,0.35);}"
      ".dot{width:8px;height:8px;border-radius:50%;background:var(--warn);}"
      ".wrap{max-width:680px;margin:20px auto;padding:0 16px 32px;display:flex;flex-direction:column;gap:18px;}"
      ".alerta{background:rgba(220,38,38,0.15);border:1px solid #991b1b;color:#fee2e2;padding:10px 14px;border-radius:8px;font-size:13px;}"
      ".card{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;box-shadow:0 4px 16px rgba(2,6,23,.28);}"
      ".card-h{padding:14px 18px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;}"
      ".card-h h2{margin:0;font-size:16px;font-weight:700;}"
      ".card-b{padding:16px 18px;display:flex;flex-direction:column;gap:14px;}"
      ".grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;}"
      ".campo{display:flex;flex-direction:column;gap:5px;}"
      "label{font-size:13px;font-weight:600;color:var(--muted);}"
      "input,select{width:100%;padding:9px 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg-main);color:var(--text);font-size:14px;outline:none;}"
      "input:focus,select:focus{border-color:var(--muted);}"
      ".redes{display:flex;flex-direction:column;gap:8px;max-height:200px;overflow-y:auto;}"
      ".red-btn{display:flex;justify-content:space-between;align-items:center;width:100%;padding:9px 12px;border-radius:8px;"
      "border:1px solid var(--border);background:var(--bg-main);color:var(--text);cursor:pointer;text-align:left;font-size:13px;}"
      ".red-btn:hover{border-color:var(--ok);}"
      ".red-meta{color:var(--muted);font-size:12px;}"
      ".texto-guia{color:var(--muted);font-size:12.5px;margin:0;}"
      ".acciones{display:flex;justify-content:flex-end;gap:10px;padding-top:6px;flex-wrap:wrap;}"
      ".btn{border:none;border-radius:8px;padding:10px 16px;font-weight:600;font-size:13.5px;cursor:pointer;}"
      ".btn-sec{background:var(--bg-main);color:var(--text);border:1px solid var(--border);}"
      ".btn-ok{background:var(--ok);color:#fff;}.btn-ok:hover{background:var(--ok-h);}"
      "</style></head><body>"
      "<header class='navbar'><span class='brand'>AXIÓN - IOT · ESP32-S3</span>"
      "<span class='badge'><span class='dot'></span>Portal de Configuración Local</span></header>"
      "<main class='wrap'>"
      "<div class='alerta'><strong>Estado:</strong> " + escaparHtml(motivo) + "</div>"
      "<form method='POST' action='/guardar' style='display:flex;flex-direction:column;gap:18px;'>"
      "<section class='card'><div class='card-h'><h2>1. Red Inalámbrica Wi-Fi 2.4 GHz</h2>"
      "<a href='/escanear' class='btn btn-sec' style='text-decoration:none;padding:6px 12px;font-size:12px;'>Buscar redes Wi-Fi</a></div>"
      "<div class='card-b'><p class='texto-guia'>Redes detectadas por el ESP32-S3:" +
      (cfgSsid.length() > 0 ? " · Última red guardada en NVS: <strong>" + escaparHtml(cfgSsid) + "</strong>" : "") + "</p>"
      "<div class='redes'>" + listaRedesHtml + "</div>"
      "<div class='grid2'>"
      "<div class='campo'><label for='ssid'>SSID de Red Wi-Fi</label><input id='ssid' name='ssid' value='" + escaparHtml(cfgSsid) + "' placeholder='Ej. MiRed_2.4G' required></div>"
      "<div class='campo'><label for='pass'>Contraseña Wi-Fi</label><input id='pass' type='password' name='pass' value='' placeholder='Dejar vacío para mantener actual'></div>"
      "</div>"
      "<div class='campo'><label for='asignacionIp'>Asignación IP</label>"
      "<select id='asignacionIp' name='asignacionIp' onchange='toggleIpEstatica()'>"
      "<option value='dhcp'" + String(cfgAsignacionIp != "estatica" ? " selected" : "") + ">DHCP Automático</option>"
      "<option value='estatica'" + String(cfgAsignacionIp == "estatica" ? " selected" : "") + ">IP Estática</option>"
      "</select></div>"
      "<div id='grupo-ip-estatica' class='grid2'" + String(cfgAsignacionIp == "estatica" ? "" : " style='display:none'") + ">"
      "<div class='campo'><label for='ipLocal'>IP Local</label><input id='ipLocal' name='ipLocal' value='" + escaparHtml(cfgIpLocal) + "' placeholder='192.168.1.120'></div>"
      "<div class='campo'><label for='mascara'>Máscara de Subred</label><input id='mascara' name='mascara' value='" + escaparHtml(cfgMascara.length() > 0 ? cfgMascara : "255.255.255.0") + "' placeholder='255.255.255.0'></div>"
      "<div class='campo'><label for='gateway'>Gateway</label><input id='gateway' name='gateway' value='" + escaparHtml(cfgGateway) + "' placeholder='192.168.1.1'></div>"
      "<div class='campo'><label for='dns'>DNS</label><input id='dns' name='dns' value='" + escaparHtml(cfgDns.length() > 0 ? cfgDns : "8.8.8.8") + "' placeholder='8.8.8.8'></div>"
      "</div></div></section>"
      "<section class='card'><div class='card-h'><h2>2. Conexión HTTP al Servidor Backend</h2></div>"
      "<div class='card-b'>"
      "<div class='campo'><label for='serverUrl'>URL del Servidor Backend</label>"
      "<input id='serverUrl' name='serverUrl' value='" + escaparHtml(cfgServerUrl) + "' placeholder='http://192.168.1.100:8080' required></div>"
      "<div class='grid2'>"
      "<div class='campo'><label for='devId'>Dispositivo ID</label>"
      "<input id='devId' name='devId' value='" + escaparHtml(cfgDeviceId) + "' required></div>"
      "<div class='campo'><label for='devKey'>Device Key</label>"
      "<input id='devKey' type='password' name='devKey' value='' placeholder='Dejar vacío para mantener actual'></div>"
      "</div>"
      "<div class='acciones'><button type='submit' class='btn btn-ok'>Guardar y Conectar al Backend</button></div>"
      "</div></section></form></main>"
      "<script>"
      "function elegirRed(s){document.getElementById('ssid').value=s;document.getElementById('pass').focus();}"
      "function toggleIpEstatica(){"
      "var est=document.getElementById('asignacionIp').value==='estatica';"
      "document.getElementById('grupo-ip-estatica').style.display=est?'grid':'none';"
      "document.getElementById('ipLocal').required=est;"
      "document.getElementById('mascara').required=est;"
      "document.getElementById('gateway').required=est;"
      "}"
      "toggleIpEstatica();"
      "</script>"
      "</body></html>";
    server.send(200, "text/html", html);
  };

  server.on("/", HTTP_GET, enviarFormulario);
  server.on("/escanear", HTTP_GET, [&]() {
    listaRedesHtml = escanearRedesHtml();
    inicioPortal = millis();
    server.sendHeader("Location", "/");
    server.send(302, "text/plain", "");
  });
  server.onNotFound(enviarFormulario);

  server.on("/guardar", HTTP_POST, [&]() {
    String nuevoSsid = server.arg("ssid");
    String nuevoPass = server.arg("pass");
    String nuevaAsig = server.arg("asignacionIp");
    String nuevaIp   = server.arg("ipLocal");
    String nuevaMask = server.arg("mascara");
    String nuevoGw   = server.arg("gateway");
    String nuevoDns  = server.arg("dns");
    String nuevoSrv  = normalizarServerUrl(server.arg("serverUrl"));
    String nuevoId   = server.arg("devId");
    String nuevaKey  = server.arg("devKey");
    nuevoSsid.trim();
    nuevaAsig.trim();
    nuevaIp.trim();
    nuevaMask.trim();
    nuevoGw.trim();
    nuevoDns.trim();
    nuevoId.trim();
    nuevaKey.trim();

    if (nuevoSsid.length() == 0 || nuevoSrv.length() == 0) {
      server.send(400, "text/plain", "SSID y URL del Servidor Backend son obligatorios.");
      return;
    }
    if (nuevaAsig != "estatica") nuevaAsig = "dhcp";
    if (nuevaAsig == "estatica") {
      IPAddress ipTest, maskTest, gwTest, dnsTest;
      if (!ipTest.fromString(nuevaIp) || !maskTest.fromString(nuevaMask) || !gwTest.fromString(nuevoGw)) {
        server.send(400, "text/plain", "IP Local, Máscara de Subred y Gateway deben ser direcciones IPv4 válidas.");
        return;
      }
      if (nuevoDns.length() > 0 && !dnsTest.fromString(nuevoDns)) {
        server.send(400, "text/plain", "La dirección DNS no es una IPv4 válida.");
        return;
      }
      if (nuevoDns.length() == 0) nuevoDns = "8.8.8.8";
    }
    if (nuevoId.length() == 0) nuevoId = DEFAULT_DEVICE_ID;

    String passFinal = nuevoPass.length() > 0 ? nuevoPass : cfgPass;
    String keyFinal  = nuevaKey.length() > 0 ? nuevaKey : cfgDeviceKey;
    guardarConfiguracionNvs(nuevoSsid, passFinal, nuevoSrv, nuevoId, keyFinal,
                            nuevaAsig, nuevaIp, nuevaMask, nuevoGw, nuevoDns);

    String resumenIp = (nuevaAsig == "estatica") ? ("IP Estática <code>" + escaparHtml(nuevaIp) + "</code>") : "DHCP Automático";
    server.send(200, "text/html",
      "<!DOCTYPE html><html lang='es'><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width,initial-scale=1'>"
      "<style>body{font-family:Inter,system-ui,sans-serif;background:#0b1120;color:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px}"
      ".card{background:#162032;border:1px solid rgba(148,163,184,0.18);border-radius:12px;padding:28px;max-width:440px;text-align:center}"
      "h2{color:#22c55e;margin-top:0}p{color:#94a3b8}</style></head><body><div class='card'>"
      "<h2>Configuración Guardada</h2><p>El controlador <strong>" + escaparHtml(nuevoId) +
      "</strong> se conectará a <strong>" + escaparHtml(nuevoSsid) + "</strong> · " + resumenIp + " y enviará lecturas a <code>" +
      escaparHtml(nuevoSrv) + "</code>...</p></div></body></html>");
    delay(1500);
    ESP.restart();
  });

  server.begin();
  while (millis() - inicioPortal < PORTAL_TIMEOUT_MS) {
    dnsServer.processNextRequest();
    server.handleClient();
    actualizarLedEstado();
    delay(10);
  }

  Serial.println("[PORTAL] Tiempo agotado sin cambios. Retornando a operación normal sin reiniciar relés...");
  server.stop();
  dnsServer.stop();
  WiFi.softAPdisconnect(true);
  WiFi.mode(WIFI_STA);
  inicioDesconexionWifi = millis();
  fallosHttpConsecutivos = 0;
  establecerEstadoLed(LED_SIN_WIFI);
}

// ============================================================================
// 5. LECTURA FÍSICA DE LOS 5 SENSORES (GPIO 4, 5, 6, 7 y SPI 10-13)
// ============================================================================

// --- 5.1. Sensor de pH: DFRobot Gravity pH Meter V2.0 + Electrodo H-101 (GPIO 4) ---
float leerVoltajePhMv() {
  long suma = 0;
  for (int i = 0; i < 20; i++) {
    suma += analogReadMilliVolts(PIN_PH);
    delay(10);
  }
  return suma / 20.0f;
}

float leerPHReal(bool& phOkOut) {
  if (!phActivo) {
    phOkOut = false;
    return 0.0f;
  }
  float mV = leerVoltajePhMv();
  if (mV < 50.0f || mV > 3250.0f) {
    phOkOut = false;
    return 0.0f;
  }
  phOkOut = true;
  float diffMv = phVoltajeNeutro - phVoltajeAcido;
  if (fabs(diffMv) < 10.0f) diffMv = -532.44f;
  float diffPh = phRefNeutro - phRefAcido;
  float pendiente = diffPh / diffMv;
  float ph = phRefNeutro + pendiente * (mV - phVoltajeNeutro);
  if (ph < 0.0f) ph = 0.0f;
  if (ph > 14.0f) ph = 14.0f;
  return ph;
}

// --- 5.2. Sensor de Conductividad / TDS: TDS Meter V1.0 (GPIO 5, 0-1000 ppm) ---
float leerEcBaseUsCm(float temperaturaAgua, bool pt100Valida, bool* tdsOkOut) {
  long suma = 0;
  for (int i = 0; i < 20; i++) {
    suma += analogReadMilliVolts(PIN_TDS);
    delay(10);
  }
  float mV = suma / 20.0f;
  if (tdsOkOut != nullptr) {
    *tdsOkOut = (ecActivo && mV <= 2500.0f);
  }
  float voltaje = mV / 1000.0f;
  float tempRef = 25.0f;
  if (ecAtcActiva) {
    tempRef = (ecAtcPt100 && pt100Compensar && pt100Valida) ? temperaturaAgua : ecTempManual;
  }
  float coefComp = 1.0f + ecCoefAlpha * (tempRef - 25.0f);
  if (coefComp < 0.2f) coefComp = 0.2f;
  float voltComp = voltaje / coefComp;
  // Polinomio cúbico DFRobot/Gravity para sonda TDS de 2 electrodos (resultado base en µS/cm)
  float ecBase = 133.42f * pow(voltComp, 3) - 255.86f * pow(voltComp, 2) + 857.39f * voltComp;
  return (ecBase < 0.0f) ? 0.0f : ecBase;
}

void leerEcYTdsReal(float temperaturaAgua, bool pt100Valida, float& ecUsCmOut, float& tdsPpmOut, bool& tdsOkOut) {
  if (!ecActivo) {
    ecUsCmOut = 0.0f;
    tdsPpmOut = 0.0f;
    tdsOkOut  = false;
    return;
  }
  bool okAdc = true;
  float ecCalibrada = leerEcBaseUsCm(temperaturaAgua, pt100Valida, &okAdc) * tdsFactorK;
  if (!okAdc) {
    ecUsCmOut = 0.0f;
    tdsPpmOut = 0.0f;
    tdsOkOut  = false;
    return;
  }
  if (ecCalibrada < 0.0f) ecCalibrada = 0.0f;
  float tds = ecCalibrada * tdsConvFactor;
  if (tds < 0.0f) tds = 0.0f;
  if (tds > 1000.0f) tds = 1000.0f; // Tope físico de la placa TDS Meter V1.0 (0-1000 ppm)
  ecUsCmOut = ecCalibrada;
  tdsPpmOut = tds;
  tdsOkOut  = true;
}

// --- 5.3. Sonda RTD PT100 (3 hilos: 1 Rojo, 2 Azules, 0-400 °C) + MAX31865 SPI (GPIO 10-13) ---
bool leerPT100Max31865(float& tempOutC) {
  if (!tempAguaActiva) {
    tempOutC = ecTempManual;
    return false;
  }

  // Configuración MAX31865 (SPI_MODE1):
  // Bit7=VBIAS(1), Bit5=1-Shot(1), Bit4=3-Wire(1/0), Bit1=FaultClear(1), Bit0=50Hz(1)/60Hz(0)
  uint8_t cfgByte = 0xA2;
  if (pt100TresHilos)  cfgByte |= 0x10;
  if (pt100Filtro50Hz) cfgByte |= 0x01;

  SPI.beginTransaction(SPISettings(1000000, MSBFIRST, SPI_MODE1));
  digitalWrite(PIN_PT100_CS, LOW);
  SPI.transfer(0x80); // Registro de configuración (escritura)
  SPI.transfer(cfgByte);
  digitalWrite(PIN_PT100_CS, HIGH);
  SPI.endTransaction();

  delay(65); // Tiempo de conversión 1-shot del MAX31865

  SPI.beginTransaction(SPISettings(1000000, MSBFIRST, SPI_MODE1));
  digitalWrite(PIN_PT100_CS, LOW);
  SPI.transfer(0x01); // Registro RTD MSB
  uint16_t msb = SPI.transfer(0x00);
  uint16_t lsb = SPI.transfer(0x00);
  digitalWrite(PIN_PT100_CS, HIGH);
  SPI.endTransaction();

  uint16_t rawRtd = ((msb << 8) | lsb) >> 1;
  // Si el bus SPI está desconectado (0x0000 o 0x7FFF) o hay bit de falla
  if (rawRtd == 0 || rawRtd >= 0x7FFF || (lsb & 0x01)) {
    tempOutC = ecTempManual;
    return false;
  }

  float resistencia = ((float)rawRtd * pt100RrefOhm) / 32768.0f;
  // Ecuación Callendar-Van Dusen linealizada IEC 60751 (R0 = 100 Ω, α fijo = 0.00385)
  float temp = ((resistencia / 100.0f) - 1.0f) / PT100_ALPHA_IEC + pt100OffsetC;
  // Rango físico de la sonda PT100 de acero en /elementos: 0 a 400 °C
  if (temp < 0.0f || temp > 400.0f) {
    tempOutC = ecTempManual;
    return false;
  }
  tempOutC = temp;
  return true;
}

// --- 5.4. Transmisor Sumergible LEEG LMP633-NCN (4-20 mA -> GPIO 7) ---
bool leerNivelLmp633(float& nivelCmOut, float& nivelPctOut) {
  if (!nivelActivo) {
    nivelCmOut  = 0.0f;
    nivelPctOut = 0.0f;
    return false;
  }

  long sumaMv = 0;
  for (int i = 0; i < 20; i++) {
    sumaMv += analogReadMilliVolts(PIN_NIVEL);
    delay(5);
  }
  float mV = sumaMv / 20.0f;

  // Corriente del lazo I (mA) = V (mV) / R_shunt (Ω). Con R_shunt = 150 Ω: 4 mA = 600 mV, 20 mA = 3000 mV.
  float shunt = (nivelShuntOhm >= 10.0f) ? nivelShuntOhm : 150.0f;
  float corrienteMa = mV / shunt;

  // Si la corriente es < 3.5 mA, el lazo 4-20 mA está abierto o sin fuente de 12-24V
  if (corrienteMa < 3.5f) {
    nivelCmOut  = 0.0f;
    nivelPctOut = 0.0f;
    return false;
  }

  if (corrienteMa < 4.0f) corrienteMa = 4.0f;
  if (corrienteMa > 20.0f) corrienteMa = 20.0f;

  float fraccion = (corrienteMa - 4.0f) / 16.0f; // 0.0 a 1.0
  float cm = (fraccion * nivelRangoMaxCm) + nivelOffsetCm;
  if (cm < 0.0f) cm = 0.0f;

  float alturaUtil = (tanqueAlturaCm > 1.0f) ? tanqueAlturaCm : nivelRangoMaxCm;
  float pct = (cm / alturaUtil) * 100.0f;
  if (pct < 0.0f) pct = 0.0f;
  if (pct > 100.0f) pct = 100.0f;

  nivelCmOut  = cm;
  nivelPctOut = pct;
  return true;
}

LecturaSensores leerSensores() {
  LecturaSensores l;

  // 1. DHT22 (AM2302) en GPIO 6
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
      Serial.println("[DHT22] Lectura NaN en GPIO 6 - verificar cables +(3V3), out(GPIO 6), -(G)");
    }
  }

  // 2. PT100 + MAX31865 en Bus SPI (GPIO 10, 11, 12, 13)
  l.pt100Ok = leerPT100Max31865(l.tempAguaC);

  // 3. Gravity pH Meter V2.0 + Sonda H-101 en GPIO 4
  l.ph = leerPHReal(l.phOk);

  // 4. TDS Meter V1.0 en GPIO 5 (compensado térmicamente con PT100 o tempManual)
  leerEcYTdsReal(l.tempAguaC, l.pt100Ok, l.ecUsCm, l.tdsPpm, l.tdsOk);

  // 5. Nivel sumergible LMP633-NCN (4-20 mA) en GPIO 7
  l.nivelOk = leerNivelLmp633(l.nivelCm, l.nivelPct);

  return l;
}

// ============================================================================
// 6. CONTROL DE LOS 2 MÓDULOS DE 4 RELÉS (HW-316) Y COMANDOS HTTP
// ============================================================================
const int MAX_HISTORIAL_CMDS = 16;
long historialComandosIds[MAX_HISTORIAL_CMDS] = { 0 };
int idxHistorialCmd = 0;

bool comandoYaEjecutado(long id) {
  if (id <= 0) return false;
  for (int i = 0; i < MAX_HISTORIAL_CMDS; i++) {
    if (historialComandosIds[i] == id) return true;
  }
  return false;
}

void registrarComandoEjecutado(long id) {
  if (id <= 0) return;
  historialComandosIds[idxHistorialCmd] = id;
  idxHistorialCmd = (idxHistorialCmd + 1) % MAX_HISTORIAL_CMDS;
}

void aplicarEstadoRele(int canal, bool encendido, bool forzarLog) {
  if (canal < 1 || canal > NUM_RELES) return;
  int idx = canal - 1;
  int estadoBin = encendido ? 1 : 0;
  int nivelSalida = RELE_ACTIVO_LOW ? (encendido ? LOW : HIGH) : (encendido ? HIGH : LOW);
  digitalWrite(PINES_RELES[idx], nivelSalida);
  if (forzarLog || estadoRelesAplicado[idx] != estadoBin) {
    estadoRelesAplicado[idx] = estadoBin;
    Serial.printf("[RELE %d (Mod#%d-M%d) | GPIO %d] -> %s\n",
                  canal, (idx / 4) + 1, (idx % 4) + 1, PINES_RELES[idx],
                  encendido ? "ENCENDIDO" : "APAGADO");
  }
}

void apagarTodosLosReles(const String& motivo) {
  bool habiaEncendidos = false;
  for (int i = 0; i < NUM_RELES; i++) {
    if (estadoRelesAplicado[i] == 1) {
      habiaEncendidos = true;
      break;
    }
  }
  if (habiaEncendidos) {
    Serial.println("[FAIL-SAFE] Apagando todos los relés (" + motivo + ")");
  }
  for (int i = 1; i <= NUM_RELES; i++) {
    aplicarEstadoRele(i, false, false);
  }
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
  if (comandoId <= 0 || WiFi.status() != WL_CONNECTED || cfgServerUrl.length() == 0) return;

  HTTPClient http;
  String url = construirUrlApi(EP_COMANDOS) + "/" + String(comandoId) + "/ack";
  http.begin(url);
  http.addHeader("X-Device-Key", cfgDeviceKey);
  int code = http.POST("");
  Serial.printf("[ACK] Comando #%ld -> HTTP %d\n", comandoId, code);
  http.end();
}

void escanearYEnviarRedesWifi() {
  if (WiFi.status() != WL_CONNECTED || cfgServerUrl.length() == 0) return;

  Serial.println("[WIFI] Escaneando redes cercanas...");
  int n = WiFi.scanNetworks();

  JsonDocument doc;
  doc["dispositivoId"] = cfgDeviceId;
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
  String url = construirUrlApi("/api/v1/iot/wifi-redes");
  http.begin(url);
  http.setTimeout(5000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", cfgDeviceKey);
  int code = http.POST(jsonBody);
  Serial.printf("[WIFI] %d redes enviadas -> HTTP %d\n", redes.size(), code);
  http.end();
}

bool enviarTelemetriaHttp();

void procesarComandosPendientes(JsonArray comandos) {
  for (JsonObject cmd : comandos) {
    long id = cmd["id"] | 0L;
    const char* tipo = cmd["comando"] | "";
    JsonObject params = cmd["parametros"];

    if (comandoYaEjecutado(id)) {
      confirmarComandoAck(id);
      continue;
    }

    Serial.printf("[CMD #%ld] %s\n", id, tipo);
    registrarComandoEjecutado(id);

    if (strcmp(tipo, "SET_RELE") == 0) {
      int canal = params["canal"] | 0;
      bool encendido = params["encendido"] | false;
      aplicarEstadoRele(canal, encendido, true);
    } else if (strcmp(tipo, "SET_MODO_RELES") == 0) {
      const char* modo = params["modo"] | "manual";
      modoAutomaticoReles = (strcmp(modo, "automatico") == 0);
      prefs.begin("axion_cfg", false);
      prefs.putBool("relAuto", modoAutomaticoReles);
      prefs.end();
      Serial.printf(" -> Modo de relés: %s\n", modoAutomaticoReles ? "AUTOMATICO" : "MANUAL");
    } else if (strcmp(tipo, "CONFIG_PINOUT") == 0) {
      Serial.println(" -> Matriz de Pinout GPIO sincronizada con el controlador.");
    } else if (strcmp(tipo, "CONFIG_RELES_TECNICO") == 0) {
      const char* logica = params["logica"] | "low";
      RELE_ACTIVO_LOW = (strcmp(logica, "low") == 0);
      prefs.begin("axion_cfg", false);
      prefs.putBool("relLow", RELE_ACTIVO_LOW);
      if (params["pines"].is<JsonObject>()) {
        JsonObject pinesObj = params["pines"].as<JsonObject>();
        for (int i = 1; i <= NUM_RELES; i++) {
          String k = String(i);
          if (pinesObj[k].is<const char*>()) {
            String pinTxt = String(pinesObj[k].as<const char*>());
            pinTxt.replace("GPIO", "");
            pinTxt.trim();
            int nuevoPin = pinTxt.toInt();
            if (esGpioSeguroEsp32S3(nuevoPin)) {
              int pinViejo = PINES_RELES[i - 1];
              bool estabaEncendido = (estadoRelesAplicado[i - 1] == 1);
              int nivelSeguro = RELE_ACTIVO_LOW ? (estabaEncendido ? LOW : HIGH) : (estabaEncendido ? HIGH : LOW);
              digitalWrite(nuevoPin, nivelSeguro);
              pinMode(nuevoPin, OUTPUT);
              digitalWrite(nuevoPin, nivelSeguro);
              if (pinViejo != nuevoPin && esGpioSeguroEsp32S3(pinViejo)) {
                pinMode(pinViejo, INPUT);
              }
              PINES_RELES[i - 1] = nuevoPin;
              prefs.putInt(("relPin" + k).c_str(), nuevoPin);
            } else {
              Serial.printf("[ADVERTENCIA] GPIO %d rechazado por estar reservado en ESP32-S3 N16R8.\n", nuevoPin);
            }
          }
        }
      }
      prefs.end();
    } else if (strcmp(tipo, "CONFIG_BUFFER") == 0) {
      long muestreoSeg = params["muestreoSeg"] | (params["envioSeg"] | 300L);
      if (muestreoSeg < 15L) muestreoSeg = 15L;
      if (muestreoSeg > 3600L) muestreoSeg = 3600L;
      intervaloTelemetriaMs = (unsigned long)muestreoSeg * 1000UL;
      prefs.begin("axion_cfg", false);
      prefs.putLong("envioSeg", muestreoSeg);
      prefs.end();
      Serial.printf(" -> Nuevo intervalo de muestreo/envío: %ld s\n", muestreoSeg);
    } else if (strcmp(tipo, "CONFIG_SENSOR") == 0) {
      String modulo = params["modulo"] | "";
      if (params["activo"].is<bool>()) {
        bool act = params["activo"].as<bool>();
        prefs.begin("axion_cfg", false);
        if (modulo == "ph") { phActivo = act; prefs.putBool("phActivo", act); }
        else if (modulo == "ec") { ecActivo = act; prefs.putBool("ecActivo", act); }
        else if (modulo == "dht22") { dht22Activo = act; prefs.putBool("dhtActivo", act); }
        else if (modulo == "nivel_agua") { nivelActivo = act; prefs.putBool("nivActivo", act); }
        else if (modulo == "temp_agua") { tempAguaActiva = act; prefs.putBool("tmpActivo", act); }
        prefs.end();
        Serial.printf(" -> Módulo %s: %s\n", modulo.c_str(), act ? "ACTIVO" : "PAUSADO");
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
      } else if (modulo == "ec" && !p.isNull()) {
        if (p["kValue"].is<float>()) tdsConvFactor = p["kValue"].as<float>();
        if (p["factorCalibracionK"].is<float>()) tdsFactorK = p["factorCalibracionK"].as<float>();
        if (p["coeficienteTermico"].is<float>()) ecCoefAlpha = p["coeficienteTermico"].as<float>();
        if (p["tempManualAtc"].is<float>()) ecTempManual = p["tempManualAtc"].as<float>();
        if (p["compensacionTermica"].is<bool>()) ecAtcActiva = p["compensacionTermica"].as<bool>();
        if (p["sondaTempAsociada"].is<const char*>()) {
          ecAtcPt100 = (String(p["sondaTempAsociada"].as<const char*>()) == "pt100");
        }
        prefs.begin("axion_cfg", false);
        prefs.putFloat("tdsKVal", tdsConvFactor);
        prefs.putFloat("tdsFacK", tdsFactorK);
        prefs.putFloat("ecAlpha", ecCoefAlpha);
        prefs.putFloat("ecTmpMan", ecTempManual);
        prefs.putBool("ecAtcOn", ecAtcActiva);
        prefs.putBool("ecAtcPt", ecAtcPt100);
        prefs.end();
      } else if (modulo == "ph" && !p.isNull()) {
        if (p["calPh686"].is<float>()) phRefNeutro = p["calPh686"].as<float>();
        if (p["calPh400"].is<float>()) phRefAcido = p["calPh400"].as<float>();
        if (p["voltajeNeutroMv"].is<float>()) phVoltajeNeutro = p["voltajeNeutroMv"].as<float>();
        if (p["voltajeAcidoMv"].is<float>()) phVoltajeAcido = p["voltajeAcidoMv"].as<float>();
        prefs.begin("axion_cfg", false);
        prefs.putFloat("phRefN", phRefNeutro);
        prefs.putFloat("phRefA", phRefAcido);
        prefs.putFloat("phVNeutro", phVoltajeNeutro);
        prefs.putFloat("phVAcido", phVoltajeAcido);
        prefs.end();
      } else if (modulo == "nivel_agua" && !p.isNull()) {
        if (p["resistenciaShunt"].is<float>()) nivelShuntOhm = p["resistenciaShunt"].as<float>();
        if (p["offsetCm"].is<float>()) nivelOffsetCm = p["offsetCm"].as<float>();
        if (p["alturaTanqueCm"].is<float>()) tanqueAlturaCm = p["alturaTanqueCm"].as<float>();
        const char* capRaw = p["rangoCapsula"] | (p["rangoNominal"] | "");
        if (strlen(capRaw) > 0) {
          String cap = String(capRaw);
          if (cap == "C403G") nivelRangoMaxCm = 408.0f;
          else if (cap == "C104G") nivelRangoMaxCm = 1020.0f;
          else nivelRangoMaxCm = 204.0f;
        }
        prefs.begin("axion_cfg", false);
        prefs.putFloat("nivShunt", nivelShuntOhm);
        prefs.putFloat("nivOffCm", nivelOffsetCm);
        prefs.putFloat("nivMaxCm", nivelRangoMaxCm);
        prefs.putFloat("nivAltCm", tanqueAlturaCm);
        prefs.end();
      } else if (modulo == "temp_agua" && !p.isNull()) {
        if (p["rrefOhmios"].is<float>()) pt100RrefOhm = p["rrefOhmios"].as<float>();
        if (p["offsetCelsius"].is<float>()) pt100OffsetC = p["offsetCelsius"].as<float>();
        if (p["compensarOtros"].is<bool>()) pt100Compensar = p["compensarOtros"].as<bool>();
        if (p["tipoConexion"].is<const char*>()) {
          pt100TresHilos = (String(p["tipoConexion"].as<const char*>()) == "3_hilos");
        }
        if (p["filtroRed"].is<const char*>()) {
          pt100Filtro50Hz = (String(p["filtroRed"].as<const char*>()) == "50Hz");
        }
        prefs.begin("axion_cfg", false);
        prefs.putFloat("ptRref", pt100RrefOhm);
        prefs.putFloat("ptOffC", pt100OffsetC);
        prefs.putBool("pt3Wire", pt100TresHilos);
        prefs.putBool("pt50Hz", pt100Filtro50Hz);
        prefs.putBool("ptComp", pt100Compensar);
        prefs.end();
      }
    } else if (strcmp(tipo, "ESCANEAR_WIFI") == 0) {
      escanearYEnviarRedesWifi();
    } else if (strcmp(tipo, "CONFIG_CONECTIVIDAD") == 0) {
      const char* nuevoSsid = params["ssid"] | "";
      const char* nuevaPass = params["password"] | (params["wifiPassword"] | "");
      const char* nuevaAsig = params["asignacionIp"] | "";
      const char* nuevaIp   = params["ipLocal"] | "";
      const char* nuevaMask = params["mascara"] | "";
      const char* nuevoGw   = params["gateway"] | "";
      const char* nuevoDns  = params["dns"] | "";
      const char* nuevaUrl  = params["serverUrl"] | "";
      const char* nuevoId   = params["usuario"] | (params["dispositivoId"] | "");
      const char* nuevaKey  = params["passTransporte"] | (params["deviceKey"] | "");

      if (strlen(nuevoSsid) > 0) cfgSsid = String(nuevoSsid);
      if (strlen(nuevaPass) > 0 && strcmp(nuevaPass, "********") != 0) cfgPass = String(nuevaPass);
      if (strlen(nuevaAsig) > 0) cfgAsignacionIp = (strcmp(nuevaAsig, "estatica") == 0) ? "estatica" : "dhcp";
      if (strlen(nuevaIp) > 0) cfgIpLocal = String(nuevaIp);
      if (strlen(nuevaMask) > 0) cfgMascara = String(nuevaMask);
      if (strlen(nuevoGw) > 0) cfgGateway = String(nuevoGw);
      if (strlen(nuevoDns) > 0) cfgDns = String(nuevoDns);
      if (strlen(nuevaKey) > 0 && strcmp(nuevaKey, "********") != 0) cfgDeviceKey = String(nuevaKey);
      if (strlen(nuevaUrl) > 0) cfgServerUrl = normalizarServerUrl(String(nuevaUrl));
      if (strlen(nuevoId) > 0) cfgDeviceId = String(nuevoId);

      guardarConfiguracionNvs(cfgSsid, cfgPass, cfgServerUrl, cfgDeviceId, cfgDeviceKey,
                              cfgAsignacionIp, cfgIpLocal, cfgMascara, cfgGateway, cfgDns);
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
          phRefNeutro     = params["calPhNeutro"] | 7.00f;
          phRefAcido      = params["calPhAcido"]  | 4.00f;
        }
      } else {
        float mVActual = leerVoltajePhMv();
        if (paso == "PUNTO_NEUTRO" || fabs(bufferPh - 6.86f) < 0.25f) {
          if (mVActual > 10.0f) {
            phVoltajeNeutro = mVActual;
            if (bufferPh > 0.0f) phRefNeutro = bufferPh;
          }
        } else if (paso == "SEGUNDO_PUNTO" || bufferPh > 0.0f) {
          if (mVActual > 10.0f) {
            if (bufferPh > 7.5f) {
              phVoltajeAcido = phVoltajeNeutro - (mVActual - phVoltajeNeutro) * ((phRefNeutro - phRefAcido) / (bufferPh - phRefNeutro));
            } else {
              phVoltajeAcido = mVActual;
              if (bufferPh > 0.0f) phRefAcido = bufferPh;
            }
          }
        } else if (paso == "TRES_PUNTOS") {
          if (params["calPh686"].is<float>()) phRefNeutro = params["calPh686"].as<float>();
          if (params["calPh400"].is<float>()) phRefAcido  = params["calPh400"].as<float>();
        }
      }
      if (fabs(phVoltajeNeutro - phVoltajeAcido) < 10.0f) {
        phVoltajeAcido = phVoltajeNeutro + 532.44f;
      }
      prefs.begin("axion_cfg", false);
      prefs.putFloat("phVNeutro", phVoltajeNeutro);
      prefs.putFloat("phVAcido", phVoltajeAcido);
      prefs.putFloat("phRefN", phRefNeutro);
      prefs.putFloat("phRefA", phRefAcido);
      prefs.end();
    } else if (strcmp(tipo, "CALIBRAR_EC") == 0) {
      float patronMsCm = params["solucionPatronMsCm"] | 0.0f;
      float patronUsCm = (patronMsCm > 0.0f) ? (patronMsCm * 1000.0f) : (params["solucionPatronUsCm"] | 0.0f);
      float tempRefCal = 25.0f;
      bool ptOkCal = leerPT100Max31865(tempRefCal);
      float ecBase = leerEcBaseUsCm(tempRefCal, ptOkCal);
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
    } else if (strcmp(tipo, "CALIBRAR_CERO_NIVEL") == 0) {
      if (params["offsetCm"].is<float>()) {
        nivelOffsetCm = params["offsetCm"].as<float>();
      } else if (params["offset_cm"].is<float>()) {
        nivelOffsetCm = params["offset_cm"].as<float>();
      }
      prefs.begin("axion_cfg", false);
      prefs.putFloat("nivOffCm", nivelOffsetCm);
      prefs.end();
      Serial.printf(" -> Punto cero LMP633 registrado: offset=%.1f cm\n", nivelOffsetCm);
    } else if (strcmp(tipo, "FORZAR_SYNC_BUFFER") == 0) {
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

bool enviarTelemetriaHttp() {
  if (WiFi.status() != WL_CONNECTED || cfgServerUrl.length() == 0) return false;

  String tsIso = obtenerTimestampIsoUtc();
  LecturaSensores s = leerSensores();

  JsonDocument doc;
  if (tsIso.length() > 0) {
    doc["ts"] = tsIso;
  }
  doc["dispositivo_id"] = cfgDeviceId;
  doc["fw"]             = "1.1.0-http-real";
  doc["rssi"]           = WiFi.RSSI();

  JsonObject datos = doc["datos"].to<JsonObject>();
  if (phActivo && s.phOk) {
    datos["nivel_ph"] = serialized(String(s.ph, 2));
  } else {
    datos["nivel_ph"] = nullptr;
  }
  if (ecActivo && s.tdsOk) {
    datos["ec_us_cm"] = serialized(String(s.ecUsCm, 1));
    datos["tds_ppm"]  = serialized(String(s.tdsPpm, 1));
  } else {
    datos["ec_us_cm"] = nullptr;
    datos["tds_ppm"]  = nullptr;
  }
  if (tempAguaActiva && s.pt100Ok) {
    datos["temperatura_solucion"] = serialized(String(s.tempAguaC, 2));
  } else {
    datos["temperatura_solucion"] = nullptr;
  }
  if (dht22Activo && s.dhtOk) {
    datos["temperatura_amb"] = serialized(String(s.tempAmbC, 2));
    datos["humedad_amb"]     = serialized(String(s.humAmbPct, 1));
  } else {
    datos["temperatura_amb"] = nullptr;
    datos["humedad_amb"]     = nullptr;
  }
  if (nivelActivo && s.nivelOk) {
    datos["nivel_tanque_cm"]  = serialized(String(s.nivelCm, 1));
    datos["nivel_tanque_pct"] = serialized(String(s.nivelPct, 1));
  } else {
    datos["nivel_tanque_cm"]  = nullptr;
    datos["nivel_tanque_pct"] = nullptr;
  }

  JsonObject estado = doc["estado"].to<JsonObject>();
  estado["dht22"] = !dht22Activo ? "pausado" : (s.dhtOk ? "ok" : "desconectado");
  estado["pt100"] = !tempAguaActiva ? "pausado" : (s.pt100Ok ? "ok" : "desconectado");
  estado["ph"]    = !phActivo ? "pausado" : (s.phOk ? "ok" : "desconectado");
  estado["tds"]   = !ecActivo ? "pausado" : (s.tdsOk ? "ok" : "desconectado");
  estado["nivel"] = !nivelActivo ? "pausado" : (s.nivelOk ? "ok" : "desconectado");

  JsonObject nodo = doc["nodo"].to<JsonObject>();
  nodo["ssid"]         = cfgSsid;
  nodo["asignacionIp"] = cfgAsignacionIp;
  nodo["ipLocal"]      = WiFi.localIP().toString();
  nodo["mascara"]      = WiFi.subnetMask().toString();
  nodo["gateway"]      = WiFi.gatewayIP().toString();
  nodo["dns"]          = WiFi.dnsIP().toString();
  nodo["serverUrl"]    = normalizarServerUrl(cfgServerUrl);
  nodo["envioSeg"]     = (long)(intervaloTelemetriaMs / 1000UL);

  String jsonBody;
  serializeJson(doc, jsonBody);

  HTTPClient http;
  String url = construirUrlApi(EP_TELEMETRIA);
  http.begin(url);
  http.setTimeout(5000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", cfgDeviceKey);

  int httpCode = http.POST(jsonBody);
  ultimoCodigoHttp = httpCode;
  Serial.printf("[POST %s] HTTP %d | pH(G4): %.2f | TDS(G5): %.1f ppm | DHT22(G6): %.1fC/%.1f%% | Nivel(G7): %.1f%% | PT100(SPI): %.1fC\n",
                EP_TELEMETRIA, httpCode, s.ph, s.tdsPpm, s.tempAmbC, s.humAmbPct, s.nivelPct, s.tempAguaC);
  bool ok = (httpCode == 200 || httpCode == 201);
  if (ok) {
    fallosHttpConsecutivos = 0;
    establecerEstadoLed(LED_CONECTADO_OK);
    destellarLedEnvio();
    procesarRespuestaServidor(http.getString());
  } else {
    fallosHttpConsecutivos += 4;
    establecerEstadoLed(WiFi.status() == WL_CONNECTED ? LED_WIFI_SIN_API : LED_SIN_WIFI);
    if (httpCode < 0) {
      Serial.printf("[HTTP POST] Error de conexión a %s: %s\n", url.c_str(), http.errorToString(httpCode).c_str());
    }
  }
  http.end();
  return ok;
}

void consultarComandosHttp() {
  if (WiFi.status() != WL_CONNECTED || cfgServerUrl.length() == 0) return;

  HTTPClient http;
  String url = construirUrlApi(EP_COMANDOS) + "?dispositivoId=" + cfgDeviceId;
  http.begin(url);
  http.setTimeout(4000);
  http.addHeader("X-Device-Key", cfgDeviceKey);

  int httpCode = http.GET();
  ultimoCodigoHttp = httpCode;
  if (httpCode == 200) {
    fallosHttpConsecutivos = 0;
    establecerEstadoLed(LED_CONECTADO_OK);
    procesarRespuestaServidor(http.getString());
  } else {
    fallosHttpConsecutivos++;
    establecerEstadoLed(WiFi.status() == WL_CONNECTED ? LED_WIFI_SIN_API : LED_SIN_WIFI);
    Serial.printf("[HTTP GET] Error %d consultando comandos en %s (fallo %d/%d)\n",
                  httpCode, url.c_str(), fallosHttpConsecutivos, MAX_FALLOS_HTTP_PORTAL);
  }
  http.end();

  if (fallosHttpConsecutivos >= MAX_FALLOS_HTTP_PORTAL) {
    fallosHttpConsecutivos = 0;
    iniciarPortalCautivo("El servidor API no devolvió HTTP 200 · Último código: HTTP " + String(ultimoCodigoHttp) + ".");
  }
}

void asegurarWifi(bool abrirPortalSiFalla) {
  if (cfgSsid.length() == 0 || cfgServerUrl.length() == 0) {
    iniciarPortalCautivo("Sin configuración inicial de red Wi-Fi o URL del servidor Backend.");
    return;
  }

  if (WiFi.status() == WL_CONNECTED) {
    inicioDesconexionWifi = 0;
    return;
  }

  establecerEstadoLed(LED_CONECTANDO_WIFI);
  Serial.printf("Conectando a Wi-Fi '%s' (%s)...", cfgSsid.c_str(), cfgAsignacionIp.c_str());
  WiFi.mode(WIFI_STA);
  if (cfgAsignacionIp == "estatica") {
    IPAddress ip, gw, mask, dns;
    bool dnsOk = (cfgDns.length() > 0 && dns.fromString(cfgDns));
    if (ip.fromString(cfgIpLocal) && gw.fromString(cfgGateway) && mask.fromString(cfgMascara)) {
      if (!dnsOk) dns = IPAddress(8, 8, 8, 8);
      if (!WiFi.config(ip, gw, mask, dns)) {
        Serial.println("\n[Wi-Fi] Advertencia: no se pudo aplicar IP estática, usando DHCP.");
        WiFi.config(INADDR_NONE, INADDR_NONE, INADDR_NONE, INADDR_NONE);
      }
    } else {
      Serial.println("\n[Wi-Fi] Advertencia: parámetros de IP estática inválidos, usando DHCP.");
      WiFi.config(INADDR_NONE, INADDR_NONE, INADDR_NONE, INADDR_NONE);
    }
  } else {
    WiFi.config(INADDR_NONE, INADDR_NONE, INADDR_NONE, INADDR_NONE);
  }
  WiFi.begin(cfgSsid.c_str(), cfgPass.c_str());

  unsigned long inicio = millis();
  unsigned long ultimoPunto = inicio;
  while (WiFi.status() != WL_CONNECTED && millis() - inicio < 20000) {
    actualizarLedEstado();
    if (millis() - ultimoPunto >= 500) {
      ultimoPunto = millis();
      Serial.print(".");
    }
    delay(50);
  }

  if (WiFi.status() == WL_CONNECTED) {
    inicioDesconexionWifi = 0;
    establecerEstadoLed(ultimoCodigoHttp == 200 ? LED_CONECTADO_OK : LED_WIFI_SIN_API);
    Serial.printf("\n[Wi-Fi] Conectado. IP: %s | RSSI: %d dBm\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
    configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  } else {
    apagarTodosLosReles("Sin conexión Wi-Fi");
    establecerEstadoLed(LED_SIN_WIFI);
    Serial.println("\n[Wi-Fi] No se pudo conectar.");
    if (abrirPortalSiFalla) {
      iniciarPortalCautivo("No se pudo conectar a la red Wi-Fi '" + cfgSsid + "'.");
    } else {
      if (inicioDesconexionWifi == 0) inicioDesconexionWifi = millis();
      if (millis() - inicioDesconexionWifi >= 60000UL) {
        iniciarPortalCautivo("Sin conexión Wi-Fi a '" + cfgSsid + "' por más de 60 segundos.");
      }
    }
  }
}

// ============================================================================
// 8. SETUP Y LOOP PRINCIPAL
// ============================================================================
void setup() {
  Serial.begin(115200);
  establecerEstadoLed(LED_INICIANDO);
  analogReadResolution(12);
  analogSetPinAttenuation(PIN_PH, ADC_11db);
  analogSetPinAttenuation(PIN_TDS, ADC_11db);
  analogSetPinAttenuation(PIN_NIVEL, ADC_11db);

  dht.begin();

  pinMode(PIN_PT100_CS, OUTPUT);
  digitalWrite(PIN_PT100_CS, HIGH);
  SPI.begin(PIN_PT100_SCK, PIN_PT100_SDO, PIN_PT100_SDI, PIN_PT100_CS);

  delay(500);
  cargarConfiguracionNvs();

  for (int i = 0; i < NUM_RELES; i++) {
    int nivelInactivo = RELE_ACTIVO_LOW ? HIGH : LOW;
    digitalWrite(PINES_RELES[i], nivelInactivo);
    pinMode(PINES_RELES[i], OUTPUT);
    aplicarEstadoRele(i + 1, false, true);
  }

  asegurarWifi(true);

  if (WiFi.status() == WL_CONNECTED && cfgServerUrl.length() > 0) {
    for (int i = 0; i < 6 && obtenerTimestampIsoUtc().length() == 0; i++) {
      delay(500);
    }
    if (!enviarTelemetriaHttp()) {
      iniciarPortalCautivo("El servidor API no respondió HTTP 200 al envío inicial de sensores · Código: HTTP " + String(ultimoCodigoHttp) + ".");
    }
  }
  ultimoEnvioTelemetria  = millis();
  ultimaConsultaComandos = millis();
}

void loop() {
  actualizarLedEstado();
  asegurarWifi(false);

  unsigned long ahora = millis();
  if (ahora - ultimaConsultaComandos >= INTERVALO_COMANDOS_MS) {
    ultimaConsultaComandos = ahora;
    consultarComandosHttp();
  }

  if (ahora - ultimoEnvioTelemetria >= intervaloTelemetriaMs) {
    ultimoEnvioTelemetria = ahora;
    enviarTelemetriaHttp();
  }
}
