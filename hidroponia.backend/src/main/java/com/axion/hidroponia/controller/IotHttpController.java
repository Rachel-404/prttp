package com.axion.hidroponia.controller;

import com.axion.hidroponia.model.ComandoPendiente;
import com.axion.hidroponia.model.ReleCanal;
import com.axion.hidroponia.model.TelemetriaLectura;
import com.axion.hidroponia.repository.ReleCanalRepository;
import com.axion.hidroponia.service.DeviceCommandService;
import com.axion.hidroponia.service.TelemetryService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/iot")
public class IotHttpController {

    private final TelemetryService telemetryService;
    private final DeviceCommandService commandService;
    private final ReleCanalRepository releRepo;
    private final String expectedDeviceKey;

    public IotHttpController(
            TelemetryService telemetryService,
            DeviceCommandService commandService,
            ReleCanalRepository releRepo,
            @Value("${axion.iot.device-key:axion_dev_esp32_key_2026}") String expectedDeviceKey) {
        this.telemetryService = telemetryService;
        this.commandService = commandService;
        this.releRepo = releRepo;
        this.expectedDeviceKey = expectedDeviceKey;
    }

    private void validarDeviceKey(String deviceKey) {
        if (deviceKey == null || !deviceKey.equals(expectedDeviceKey)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "X-Device-Key inválida o ausente");
        }
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
}
