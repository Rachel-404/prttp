package com.axion.hidroponia.controller;

import com.axion.hidroponia.model.Dispositivo;
import com.axion.hidroponia.repository.DispositivoRepository;
import com.axion.hidroponia.service.AuditService;
import com.axion.hidroponia.service.DeviceCommandService;
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
    private final DeviceCommandService commandService;

    public NodoMaestroController(
            DispositivoRepository dispositivoRepo,
            AuditService auditService,
            DeviceCommandService commandService) {
        this.dispositivoRepo = dispositivoRepo;
        this.auditService = auditService;
        this.commandService = commandService;
    }

    @GetMapping("/{dispositivoId}")
    public Dispositivo obtenerEndpoint(@PathVariable String dispositivoId) {
        Dispositivo disp = obtener(dispositivoId);
        Dispositivo copia = new Dispositivo();
        copia.setId(disp.getId());
        copia.setNombre(disp.getNombre());
        copia.setFirmware(disp.getFirmware());
        copia.setConectado(disp.isConectado());
        copia.setRssi(disp.getRssi());
        copia.setAlimentacion(disp.getAlimentacion());
        copia.setConsumoMa(disp.getConsumoMa());
        copia.setPsramOcupadaPct(disp.getPsramOcupadaPct());
        copia.setBufferTramas(disp.getBufferTramas());
        copia.setUltimoHeartbeat(disp.getUltimoHeartbeat());
        copia.setConfigBuffer(disp.getConfigBuffer());
        copia.setPinout(disp.getPinout());
        copia.setActualizadoEn(disp.getActualizadoEn());

        if (disp.getConfigRed() != null) {
            Map<String, Object> limpia = new HashMap<>(disp.getConfigRed());
            limpia.remove("password");
            limpia.remove("wifiPassword");
            limpia.remove("passTransporte");
            limpia.remove("deviceKey");
            limpia.remove("endpoint");
            limpia.remove("habilitarTls");
            if (!limpia.containsKey("serverUrl") && limpia.get("brokerUrl") != null) {
                limpia.put("serverUrl", limpia.get("brokerUrl"));
            }
            limpia.remove("brokerUrl");
            copia.setConfigRed(limpia);
        }
        return copia;
    }

    private Dispositivo obtener(String dispositivoId) {
        return dispositivoRepo.findById(dispositivoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dispositivo no encontrado"));
    }

    @PutMapping("/{dispositivoId}/conectividad")
    public Dispositivo actualizarConectividad(
            @PathVariable String dispositivoId,
            @RequestBody Map<String, Object> body) {
        Dispositivo disp = obtener(dispositivoId);
        Map<String, Object> merged = new HashMap<>(disp.getConfigRed() != null ? disp.getConfigRed() : Map.of());
        merged.putAll(body);

        String wifiPass = extraerSecreto(merged.remove("password"));
        if (wifiPass == null) {
            wifiPass = extraerSecreto(merged.remove("wifiPassword"));
        } else {
            merged.remove("wifiPassword");
        }
        String passTransporte = extraerSecreto(merged.remove("passTransporte"));
        if (passTransporte == null) {
            passTransporte = extraerSecreto(merged.remove("deviceKey"));
        }

        merged.remove("endpoint");
        merged.remove("brokerUrl");
        merged.remove("habilitarTls");
        merged.put("protocolo", "http");
        if (passTransporte != null) {
            merged.put("deviceKey", passTransporte);
        }

        disp.setConfigRed(merged);
        disp.setActualizadoEn(OffsetDateTime.now());
        dispositivoRepo.save(disp);

        Map<String, Object> cmdParams = new HashMap<>(merged);
        cmdParams.remove("deviceKey");
        if (wifiPass != null) {
            cmdParams.put("password", wifiPass);
        }
        if (passTransporte != null) {
            cmdParams.put("passTransporte", passTransporte);
        }

        auditService.registrar("Nodo ESP32-S3", "Conectividad Wi-Fi / HTTP", "Anterior", String.valueOf(merged.getOrDefault("ssid", "Actualizado")));
        commandService.encolarComando(dispositivoId, "CONFIG_CONECTIVIDAD", cmdParams);
        return obtenerEndpoint(dispositivoId);
    }

    private String extraerSecreto(Object raw) {
        if (raw == null) return null;
        String val = String.valueOf(raw).trim();
        if (val.isEmpty() || "********".equals(val)) return null;
        return val;
    }

    @PostMapping("/{dispositivoId}/wifi/escanear")
    public Map<String, Object> escanearRedesWifi(@PathVariable String dispositivoId) {
        obtener(dispositivoId);
        commandService.encolarComando(dispositivoId, "ESCANEAR_WIFI", Map.of("dispositivoId", dispositivoId));
        return Map.of("mensaje", "Solicitud de escaneo Wi-Fi enviada al ESP32-S3.");
    }

    @GetMapping("/{dispositivoId}/wifi/redes")
    public Map<String, Object> listarRedesWifi(@PathVariable String dispositivoId) {
        obtener(dispositivoId);
        return commandService.obtenerRedesWifi(dispositivoId);
    }

    @PutMapping("/{dispositivoId}/buffer")
    public Dispositivo actualizarBuffer(
            @PathVariable String dispositivoId,
            @RequestBody Map<String, Object> body) {
        Dispositivo disp = obtener(dispositivoId);
        Map<String, Object> merged = new HashMap<>();

        Object rawIntervalo = (body != null && body.get("muestreoSeg") != null)
                ? body.get("muestreoSeg")
                : (body != null && body.get("envioSeg") != null
                        ? body.get("envioSeg")
                        : (disp.getConfigBuffer() != null ? disp.getConfigBuffer().getOrDefault("muestreoSeg", 300) : 300));

        Integer intervaloSeg = parsearEnteroPositivo(rawIntervalo);
        int acotado = intervaloSeg != null ? Math.min(3600, Math.max(15, intervaloSeg)) : 300;
        merged.put("muestreoSeg", acotado);
        merged.put("envioSeg", acotado);

        disp.setConfigBuffer(merged);
        disp.setActualizadoEn(OffsetDateTime.now());
        Dispositivo guardado = dispositivoRepo.save(disp);

        auditService.registrar("Nodo ESP32-S3", "Cadencia de Muestreo HTTP", "Anterior", acotado + " s");
        commandService.encolarComando(dispositivoId, "CONFIG_BUFFER", merged);
        return guardado;
    }

    private Integer parsearEnteroPositivo(Object raw) {
        if (raw instanceof Number n) {
            return n.intValue();
        }
        if (raw instanceof String s) {
            try {
                return Integer.parseInt(s.trim());
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
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
        commandService.encolarComando(dispositivoId, "CONFIG_PINOUT", Map.of("pinout", pinout));
        return guardado;
    }

    @PostMapping("/{dispositivoId}/sincronizar")
    public Map<String, Object> forzarSincronizacion(@PathVariable String dispositivoId) {
        obtener(dispositivoId);
        commandService.encolarComando(dispositivoId, "FORZAR_SYNC_BUFFER", Map.of("dispositivoId", dispositivoId));
        return Map.of("mensaje", "Orden de sincronización de buffer enviada al ESP32-S3.");
    }
}
