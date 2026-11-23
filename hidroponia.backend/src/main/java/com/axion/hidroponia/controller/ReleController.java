package com.axion.hidroponia.controller;

import com.axion.hidroponia.model.ReleCanal;
import com.axion.hidroponia.repository.ReleCanalRepository;
import com.axion.hidroponia.service.AuditService;
import com.axion.hidroponia.service.DeviceCommandService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/v1/reles")
public class ReleController {

    private final ReleCanalRepository releRepo;
    private final AuditService auditService;
    private final DeviceCommandService commandService;

    public ReleController(ReleCanalRepository releRepo, AuditService auditService, DeviceCommandService commandService) {
        this.releRepo = releRepo;
        this.auditService = auditService;
        this.commandService = commandService;
    }

    public record EstadoReleRequest(boolean encendido) {}
    public record NombreReleRequest(String nombre) {}
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
        commandService.encolarComando("SET_RELE", Map.of("canal", canal, "encendido", req.encendido()));
        return guardado;
    }

    @PatchMapping("/{canal}/nombre")
    public ReleCanal cambiarNombre(@PathVariable Integer canal, @RequestBody NombreReleRequest req) {
        ReleCanal rele = releRepo.findById(canal)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Canal de relé no encontrado"));
        String nuevoNombre = req.nombre() != null ? req.nombre().trim() : "";
        if (nuevoNombre.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El nombre del equipo no puede estar vacío");
        }
        String previo = rele.getNombre();
        rele.setNombre(nuevoNombre);
        rele.setActualizadoEn(OffsetDateTime.now());
        ReleCanal guardado = releRepo.save(rele);

        auditService.registrar("Control de Equipos", "Nombre Relé " + canal, previo, nuevoNombre);
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
        commandService.encolarComando("SET_MODO_RELES", Map.of("modo", modo));
        return guardados;
    }

    @PutMapping("/tecnico")
    public List<ReleCanal> actualizarTecnico(@RequestBody TecnicoRelesRequest req) {
        if (req == null || req.pines() == null || req.pines().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Debe especificar los pines GPIO de los relés.");
        }

        Map<Integer, String> pinesLimpios = new LinkedHashMap<>();
        Set<String> pinesUsados = new HashSet<>();
        for (Map.Entry<Integer, String> entry : req.pines().entrySet()) {
            Integer canal = entry.getKey();
            String pin = entry.getValue() != null ? entry.getValue().trim() : "";
            if (canal == null || canal < 1 || canal > 6 || pin.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Pin GPIO inválido o vacío para el canal " + canal);
            }
            if (!pinesUsados.add(pin.toUpperCase())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El pin GPIO \"" + pin + "\" está duplicado entre canales.");
            }
            pinesLimpios.put(canal, pin);
        }

        String logica = "high".equalsIgnoreCase(req.logicaDisparo()) ? "high" : "low";
        List<ReleCanal> todos = releRepo.findAllByOrderByCanalAsc();
        for (ReleCanal r : todos) {
            r.setLogicaDisparo(logica);
            if (pinesLimpios.containsKey(r.getCanal())) {
                r.setPinGpio(pinesLimpios.get(r.getCanal()));
            }
            r.setActualizadoEn(OffsetDateTime.now());
        }
        List<ReleCanal> guardados = releRepo.saveAll(todos);

        Map<String, Object> cmdParams = new LinkedHashMap<>();
        cmdParams.put("logica", logica);
        cmdParams.put("pines", pinesLimpios);

        auditService.registrar("Control de Equipos", "Configuración de Pines", "Anterior", "Actualizado");
        commandService.encolarComando("CONFIG_RELES_TECNICO", cmdParams);
        return guardados;
    }
}
