package com.axion.hidroponia.controller;

import com.axion.hidroponia.model.Dispositivo;
import com.axion.hidroponia.repository.DispositivoRepository;
import com.axion.hidroponia.service.AuditService;
import com.axion.hidroponia.service.MqttService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/nodo-maestro")
public class NodoMaestroController {

    private final DispositivoRepository dispositivoRepo;
    private final AuditService auditService;
    private final MqttService mqttService;

    public NodoMaestroController(
            DispositivoRepository dispositivoRepo,
            AuditService auditService,
            MqttService mqttService) {
        this.dispositivoRepo = dispositivoRepo;
        this.auditService = auditService;
        this.mqttService = mqttService;
    }

    @GetMapping("/{dispositivoId}")
    public Dispositivo obtener(@PathVariable String dispositivoId) {
        return dispositivoRepo.findById(dispositivoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dispositivo no encontrado"));
    }

    @PutMapping("/{dispositivoId}/conectividad")
    public Dispositivo actualizarConectividad(
            @PathVariable String dispositivoId,
            @RequestBody Map<String, Object> body) {
        Dispositivo disp = obtener(dispositivoId);
        Map<String, Object> merged = new HashMap<>(disp.getConfigRedMqtt() != null ? disp.getConfigRedMqtt() : Map.of());
        merged.putAll(body);
        disp.setConfigRedMqtt(merged);
        disp.setActualizadoEn(OffsetDateTime.now());
        Dispositivo guardado = dispositivoRepo.save(disp);

        auditService.registrar("Nodo ESP32-S3", "Conectividad Wi-Fi / MQTT", "Anterior", String.valueOf(merged.getOrDefault("ssid", "Actualizado")));
        mqttService.publicarComando("CONFIG_CONECTIVIDAD", merged);
        return guardado;
    }

    @PutMapping("/{dispositivoId}/buffer")
    public Dispositivo actualizarBuffer(
            @PathVariable String dispositivoId,
            @RequestBody Map<String, Object> body) {
        Dispositivo disp = obtener(dispositivoId);
        Map<String, Object> merged = new HashMap<>(disp.getConfigBuffer() != null ? disp.getConfigBuffer() : Map.of());
        merged.putAll(body);
        disp.setConfigBuffer(merged);
        disp.setActualizadoEn(OffsetDateTime.now());
        Dispositivo guardado = dispositivoRepo.save(disp);

        auditService.registrar("Nodo ESP32-S3", "Temporización y Buffer", "Anterior", String.valueOf(merged.getOrDefault("envioSeg", "10")) + " s");
        mqttService.publicarComando("CONFIG_BUFFER", merged);
        return guardado;
    }

    @PutMapping("/{dispositivoId}/pinout")
    public Dispositivo actualizarPinout(
            @PathVariable String dispositivoId,
            @RequestBody List<Map<String, Object>> pinout) {
        Dispositivo disp = obtener(dispositivoId);
        disp.setPinout(pinout);
        disp.setActualizadoEn(OffsetDateTime.now());
        Dispositivo guardado = dispositivoRepo.save(disp);

        auditService.registrar("Nodo ESP32-S3", "Pinout Manager GPIO", "Anterior", "Matriz actualizada");
        mqttService.publicarComando("CONFIG_PINOUT", Map.of("pinout", pinout));
        return guardado;
    }

    @PostMapping("/{dispositivoId}/sincronizar")
    public Map<String, Object> forzarSincronizacion(@PathVariable String dispositivoId) {
        obtener(dispositivoId);
        mqttService.publicarComando("FORZAR_SYNC_BUFFER", Map.of("dispositivoId", dispositivoId));
        return Map.of("mensaje", "Orden de sincronización de buffer enviada al ESP32-S3.");
    }
}
