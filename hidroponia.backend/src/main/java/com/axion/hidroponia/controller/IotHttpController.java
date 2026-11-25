package com.axion.hidroponia.controller;

import com.axion.hidroponia.model.ComandoPendiente;
import com.axion.hidroponia.model.Dispositivo;
import com.axion.hidroponia.model.ReleCanal;
import com.axion.hidroponia.model.TelemetriaLectura;
import com.axion.hidroponia.repository.DispositivoRepository;
import com.axion.hidroponia.repository.ReleCanalRepository;
import com.axion.hidroponia.service.DeviceCommandService;
import com.axion.hidroponia.service.TelemetryService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/iot")
public class IotHttpController {

    private final TelemetryService telemetryService;
    private final DeviceCommandService commandService;
    private final ReleCanalRepository releRepo;
    private final DispositivoRepository dispositivoRepo;
    private final String expectedDeviceKey;

    public IotHttpController(
            TelemetryService telemetryService,
            DeviceCommandService commandService,
            ReleCanalRepository releRepo,
            DispositivoRepository dispositivoRepo,
            @Value("${axion.iot.device-key:axion_dev_esp32_key_2026}") String expectedDeviceKey) {
        this.telemetryService = telemetryService;
        this.commandService = commandService;
        this.releRepo = releRepo;
        this.dispositivoRepo = dispositivoRepo;
        this.expectedDeviceKey = expectedDeviceKey;
    }

    private boolean equalsConstante(String a, String b) {
        if (a == null || b == null) return false;
        return MessageDigest.isEqual(
                a.getBytes(StandardCharsets.UTF_8),
                b.getBytes(StandardCharsets.UTF_8)
        );
    }

    private void validarDeviceKey(String deviceKey) {
        if (deviceKey == null || deviceKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "X-Device-Key inválida o ausente");
        }
        if (equalsConstante(deviceKey, expectedDeviceKey)) {
            return;
        }
        for (Dispositivo disp : dispositivoRepo.findAll()) {
            Map<String, Object> cfg = disp.getConfigRed();
            if (cfg != null && cfg.get("deviceKey") != null) {
                String dbKey = String.valueOf(cfg.get("deviceKey")).trim();
                if (!dbKey.isEmpty() && equalsConstante(deviceKey, dbKey)) {
                    return;
                }
            }
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "X-Device-Key inválida o ausente");
    }

    @PostMapping("/telemetria")
    public Map<String, Object> recibirTelemetria(
            @RequestHeader(value = "X-Device-Key", required = false) String deviceKey,
            @RequestBody Map<String, Object> trama) {
        validarDeviceKey(deviceKey);

        TelemetriaLectura guardada = telemetryService.procesarTrama(trama);
        String dispositivoId = guardada.getDispositivoId();
        List<ComandoPendiente> comandos = commandService.obtenerYEntregarPendientes(dispositivoId);
        List<ReleCanal> reles = releRepo.findAllByOrderByCanalAsc();

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("ok", true);
        resp.put("ts", OffsetDateTime.now().toString());
        resp.put("lecturaId", guardada.getId());
        resp.put("dispositivoId", dispositivoId);
        resp.put("reles", reles);
        resp.put("comandosPendientes", comandos);
        return resp;
    }

    @GetMapping("/comandos")
    public Map<String, Object> consultarComandos(
            @RequestHeader(value = "X-Device-Key", required = false) String deviceKey,
            @RequestParam(defaultValue = "ESP32_HIDRO_01") String dispositivoId) {
        validarDeviceKey(deviceKey);
        telemetryService.registrarHeartbeat(dispositivoId);

        List<ComandoPendiente> comandos = commandService.obtenerYEntregarPendientes(dispositivoId);
        List<ReleCanal> reles = releRepo.findAllByOrderByCanalAsc();

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("ts", OffsetDateTime.now().toString());
        resp.put("dispositivoId", dispositivoId);
        resp.put("reles", reles);
        resp.put("comandosPendientes", comandos);
        return resp;
    }

    @PostMapping("/comandos/{id}/ack")
    public Map<String, Object> confirmarComando(
            @RequestHeader(value = "X-Device-Key", required = false) String deviceKey,
            @PathVariable Long id) {
        validarDeviceKey(deviceKey);

        boolean ok = commandService.confirmarEjecucion(id);
        if (!ok) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Comando no encontrado");
        }
        return Map.of("ok", true, "id", id, "estado", "EJECUTADO");
    }

    @PostMapping("/wifi-redes")
    public Map<String, Object> recibirRedesWifi(
            @RequestHeader(value = "X-Device-Key", required = false) String deviceKey,
            @RequestBody Map<String, Object> body) {
        validarDeviceKey(deviceKey);

        Object rawId = body != null ? body.get("dispositivoId") : null;
        String dispositivoId = (rawId != null && !String.valueOf(rawId).isBlank())
                ? String.valueOf(rawId).trim()
                : "ESP32_HIDRO_01";

        List<Map<String, Object>> redes = new ArrayList<>();
        if (body != null && body.get("redes") instanceof List<?> rawList) {
            for (Object item : rawList) {
                if (item instanceof Map<?, ?> rawMap) {
                    Map<String, Object> redLimpia = new LinkedHashMap<>();
                    rawMap.forEach((k, v) -> {
                        if (k != null) {
                            redLimpia.put(String.valueOf(k), v);
                        }
                    });
                    redes.add(redLimpia);
                }
            }
        }

        commandService.registrarRedesWifi(dispositivoId, redes);
        return Map.of("ok", true, "dispositivoId", dispositivoId, "total", redes.size());
    }
}
