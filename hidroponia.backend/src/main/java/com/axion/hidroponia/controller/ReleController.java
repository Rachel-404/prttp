package com.axion.hidroponia.controller;

import com.axion.hidroponia.model.ReleCanal;
import com.axion.hidroponia.repository.ReleCanalRepository;
import com.axion.hidroponia.service.AuditService;
import com.axion.hidroponia.service.MqttService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/reles")
public class ReleController {

    private final ReleCanalRepository releRepo;
    private final AuditService auditService;
    private final MqttService mqttService;

    public ReleController(ReleCanalRepository releRepo, AuditService auditService, MqttService mqttService) {
        this.releRepo = releRepo;
        this.auditService = auditService;
        this.mqttService = mqttService;
    }

    public record EstadoReleRequest(boolean encendido) {}
    public record ModoReleRequest(String modoOperacion) {}
    public record TecnicoRelesRequest(String logicaDisparo, Map<Integer, String> pines) {}

    @GetMapping
    public List<ReleCanal> listar() {
        return releRepo.findAllByOrderByCanalAsc();
    }

    @PatchMapping("/{canal}/estado")
    public ReleCanal cambiarEstado(@PathVariable Integer canal, @RequestBody EstadoReleRequest req) {
        ReleCanal rele = releRepo.findById(canal)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Canal de relé no encontrado"));

        if ("automatico".equalsIgnoreCase(rele.getModoOperacion())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Control manual bloqueado: el módulo está en Modo Automático");
        }

        boolean previo = rele.isEncendido();
        rele.setEncendido(req.encendido());
        rele.setActualizadoEn(OffsetDateTime.now());
        ReleCanal guardado = releRepo.save(rele);

        auditService.registrar("Control de Equipos", "Relé " + canal + " (" + rele.getNombre() + ")",
                previo ? "Encendido" : "Apagado", req.encendido() ? "Encendido" : "Apagado");
        mqttService.publicarComando("SET_RELE", Map.of("canal", canal, "encendido", req.encendido()));
        return guardado;
    }

    @PutMapping("/modo")
    public List<ReleCanal> cambiarModo(@RequestBody ModoReleRequest req) {
        String modo = "automatico".equalsIgnoreCase(req.modoOperacion()) ? "automatico" : "manual";
        List<ReleCanal> todos = releRepo.findAllByOrderByCanalAsc();
        todos.forEach(r -> {
            r.setModoOperacion(modo);
            r.setActualizadoEn(OffsetDateTime.now());
        });
        List<ReleCanal> guardados = releRepo.saveAll(todos);

        auditService.registrar("Control de Equipos", "Modo de Operación", "Anterior", modo);
        mqttService.publicarComando("SET_MODO_RELES", Map.of("modo", modo));
        return guardados;
    }

    @PutMapping("/tecnico")
    public List<ReleCanal> actualizarTecnico(@RequestBody TecnicoRelesRequest req) {
        List<ReleCanal> todos = releRepo.findAllByOrderByCanalAsc();
        for (ReleCanal r : todos) {
            if (req.logicaDisparo() != null) {
                r.setLogicaDisparo(req.logicaDisparo());
            }
            if (req.pines() != null && req.pines().containsKey(r.getCanal())) {
                r.setPinGpio(req.pines().get(r.getCanal()));
            }
            r.setActualizadoEn(OffsetDateTime.now());
        }
        List<ReleCanal> guardados = releRepo.saveAll(todos);

        auditService.registrar("Control de Equipos", "Configuración de Pines", "Anterior", "Actualizado");
        mqttService.publicarComando("CONFIG_RELES_TECNICO", Map.of("logica", req.logicaDisparo(), "pines", req.pines()));
        return guardados;
    }
}
