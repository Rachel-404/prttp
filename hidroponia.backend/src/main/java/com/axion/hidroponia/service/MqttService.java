package com.axion.hidroponia.service;

import com.axion.hidroponia.model.Dispositivo;
import com.axion.hidroponia.model.SensorConfiguracion;
import com.axion.hidroponia.model.TelemetriaLectura;
import com.axion.hidroponia.repository.DispositivoRepository;
import com.axion.hidroponia.repository.SensorConfiguracionRepository;
import com.axion.hidroponia.repository.TelemetriaLecturaRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.eclipse.paho.client.mqttv3.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
public class MqttService {

    private static final Logger log = LoggerFactory.getLogger(MqttService.class);

    private final boolean enabled;
    private final String brokerUrl;
    private final String clientId;
    private final String username;
    private final String password;
    private final String topicTelemetria;
    private final String topicComandos;

    private final ObjectMapper objectMapper;
    private final DispositivoRepository dispositivoRepo;
    private final SensorConfiguracionRepository sensorRepo;
    private final TelemetriaLecturaRepository telemetriaRepo;
    private final AlertEvaluationService alertEvaluationService;
    private final SimpMessagingTemplate messagingTemplate;

    private MqttClient mqttClient;

    public MqttService(
            @Value("${axion.mqtt.enabled:true}") boolean enabled,
            @Value("${axion.mqtt.broker-url:tcp://localhost:1883}") String brokerUrl,
            @Value("${axion.mqtt.client-id:axion_springboot_backend}") String clientId,
            @Value("${axion.mqtt.username:}") String username,
            @Value("${axion.mqtt.password:}") String password,
            @Value("${axion.mqtt.topic-telemetria:axion/hidroponia/telemetria}") String topicTelemetria,
            @Value("${axion.mqtt.topic-comandos:axion/hidroponia/comandos}") String topicComandos,
            ObjectMapper objectMapper,
            DispositivoRepository dispositivoRepo,
            SensorConfiguracionRepository sensorRepo,
            TelemetriaLecturaRepository telemetriaRepo,
            AlertEvaluationService alertEvaluationService,
            SimpMessagingTemplate messagingTemplate) {
        this.enabled = enabled;
        this.brokerUrl = brokerUrl;
        this.clientId = clientId;
        this.username = username;
        this.password = password;
        this.topicTelemetria = topicTelemetria;
        this.topicComandos = topicComandos;
        this.objectMapper = objectMapper;
        this.dispositivoRepo = dispositivoRepo;
        this.sensorRepo = sensorRepo;
        this.telemetriaRepo = telemetriaRepo;
        this.alertEvaluationService = alertEvaluationService;
        this.messagingTemplate = messagingTemplate;
    }

    @PostConstruct
    public void conectar() {
        if (!enabled) {
            log.info("MQTT deshabilitado por configuración.");
            return;
        }
        try {
            mqttClient = new MqttClient(brokerUrl, clientId);
            MqttConnectOptions opts = new MqttConnectOptions();
            opts.setAutomaticReconnect(true);
            opts.setCleanSession(true);
            opts.setConnectionTimeout(5);
            if (username != null && !username.isBlank()) {
                opts.setUserName(username);
            }
            if (password != null && !password.isBlank()) {
                opts.setPassword(password.toCharArray());
            }

            mqttClient.setCallback(new MqttCallbackExtended() {
                @Override
                public void connectComplete(boolean reconnect, String serverURI) {
                    log.info("Conectado al broker MQTT: {}", serverURI);
                    try {
                        mqttClient.subscribe(topicTelemetria, 1);
                    } catch (MqttException e) {
                        log.warn("No se pudo suscribir a {}: {}", topicTelemetria, e.getMessage());
                    }
                }

                @Override
                public void connectionLost(Throwable cause) {
                    log.warn("Conexión MQTT perdida: {}", cause.getMessage());
                }

                @Override
                public void messageArrived(String topic, MqttMessage message) {
                    procesarTramaTelemetria(new String(message.getPayload(), StandardCharsets.UTF_8));
                }

                @Override
                public void deliveryComplete(IMqttDeliveryToken token) {
                }
            });

            mqttClient.connect(opts);
            mqttClient.subscribe(topicTelemetria, 1);
        } catch (Exception e) {
            log.warn("Broker MQTT no disponible al iniciar ({}): {}", brokerUrl, e.getMessage());
        }
    }

    @PreDestroy
    public void desconectar() {
        if (mqttClient != null && mqttClient.isConnected()) {
            try {
                mqttClient.disconnect();
                mqttClient.close();
            } catch (MqttException ignored) {
            }
        }
    }

    public void procesarTramaTelemetria(String payloadJson) {
        try {
            Map<String, Object> trama = objectMapper.readValue(payloadJson, new TypeReference<>() {});
            String dispositivoId = String.valueOf(trama.getOrDefault("dispositivo_id", "ESP32_HIDRO_01"));

            @SuppressWarnings("unchecked")
            Map<String, Object> datos = (Map<String, Object>) trama.getOrDefault("datos", Map.of());
            @SuppressWarnings("unchecked")
            Map<String, Object> estado = (Map<String, Object>) trama.getOrDefault("estado", Map.of());

            TelemetriaLectura lectura = new TelemetriaLectura();
            lectura.setTs(OffsetDateTime.now());
            lectura.setDispositivoId(dispositivoId);
            lectura.setPh(toDouble(datos.get("nivel_ph")));
            lectura.setEcUsCm(toDouble(datos.get("ec_us_cm")));
            lectura.setTdsPpm(toDouble(datos.get("tds_ppm")));
            if (lectura.getEcUsCm() == null && lectura.getTdsPpm() != null) {
                double k = obtenerKValueEc();
                lectura.setEcUsCm(Math.round((lectura.getTdsPpm() / k) * 100.0) / 100.0);
            } else if (lectura.getTdsPpm() == null && lectura.getEcUsCm() != null) {
                lectura.setTdsPpm(Math.round(lectura.getEcUsCm() * obtenerKValueEc() * 100.0) / 100.0);
            }
            lectura.setTempAguaC(toDouble(datos.get("temperatura_solucion")));
            lectura.setTempAmbC(toDouble(datos.get("temperatura_amb")));
            lectura.setHumAmbPct(toDouble(datos.get("humedad_amb")));
            lectura.setNivelCm(toDouble(datos.get("nivel_tanque_cm")));
            lectura.setNivelPct(toDouble(datos.getOrDefault("nivel_tanque_pct", 85.0)));
            lectura.setRssi(trama.get("rssi") instanceof Number n ? n.intValue() : -60);
            lectura.setEstadoSensores(estado);

            TelemetriaLectura guardada = telemetriaRepo.save(lectura);

            dispositivoRepo.findById(dispositivoId).ifPresent(disp -> {
                disp.setConectado(true);
                disp.setRssi(guardada.getRssi());
                disp.setUltimoHeartbeat(OffsetDateTime.now());
                disp.setActualizadoEn(OffsetDateTime.now());
                dispositivoRepo.save(disp);
            });

            alertEvaluationService.evaluarYNotificar(guardada);
            messagingTemplate.convertAndSend("/topic/telemetria", guardada);
        } catch (Exception e) {
            log.warn("Error procesando trama MQTT: {}", e.getMessage());
        }
    }

    public void publicarComando(String tipoComando, Map<String, Object> parametros) {
        if (mqttClient == null || !mqttClient.isConnected()) {
            log.debug("Comando {} encolado/omitido (MQTT desconectado).", tipoComando);
            return;
        }
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("ts", OffsetDateTime.now().toString());
            payload.put("comando", tipoComando);
            payload.put("parametros", parametros);
            byte[] bytes = objectMapper.writeValueAsBytes(payload);
            MqttMessage msg = new MqttMessage(bytes);
            msg.setQos(1);
            mqttClient.publish(topicComandos, msg);
        } catch (Exception e) {
            log.warn("No se pudo publicar comando MQTT {}: {}", tipoComando, e.getMessage());
        }
    }

    private double obtenerKValueEc() {
        return sensorRepo.findById("ec")
                .map(SensorConfiguracion::getParametrosTecnicos)
                .map(p -> toDouble(p.get("kValue")))
                .filter(v -> v != null && v > 0)
                .orElse(0.5);
    }

    private Double toDouble(Object obj) {
        return obj instanceof Number n ? n.doubleValue() : null;
    }
}
