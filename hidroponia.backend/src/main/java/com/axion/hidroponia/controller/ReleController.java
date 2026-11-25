package com.axion.hidroponia.controller;

import com.axion.hidroponia.model.ReleCanal;
import com.axion.hidroponia.repository.ReleCanalRepository;
import com.axion.hidroponia.service.AuditService;
import com.axion.hidroponia.service.DeviceCommandService;
import com.axion.hidroponia.service.TelemetryService;
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
    private final TelemetryService telemetryService;

    public ReleController(
            ReleCanalRepository releRepo,
            AuditService auditService,
            DeviceCommandService commandService,
            TelemetryService telemetryService) {
        this.releRepo = releRepo;
        this.auditService = auditService;
        this.commandService = commandService;
        this.telemetryService = telemetryService;
    }

    public record EstadoReleRequest(boolean encendido) {}
    public record NombreReleRequest(String nombre) {}
    public record ModoReleRequest(String modoOperacion) {}
    public record TecnicoRelesRequest(String logicaDisparo, Map<Integer, String> pines) {}
    public record ReglaAutoRequest(
            String variable,
            String encenderCuando,
            Double umbralEncendido,
            String apagarCuando,
            Double umbralApagado) {}

    private static final Set<String> VARIABLES_REGLA = Set.of(
            "ninguna", "temp_aire", "humedad_aire", "temp_agua", "ph", "ec", "tds", "nivel_agua"
    );
    private static final Set<String> CONDICIONES_ENCENDIDO = Set.of(
            "menor_min", "mayor_max", "fuera_rango", "dentro_rango", "menor_valor", "mayor_valor"
    );
    private static final Set<String> CONDICIONES_APAGADO = Set.of(
            "en_rango", "inverso_encendido", "mayor_igual_max", "menor_igual_min", "mayor_igual_valor", "menor_igual_valor"
    );

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

        auditService.registrar("Control de Equipos", "Relé " + canal + " · " + rele.getNombre(),
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
        releRepo.saveAll(todos);

        auditService.registrar("Control de Equipos", "Modo de Operación", "Anterior", modo);
        commandService.encolarComando("SET_MODO_RELES", Map.of("modo", modo));
        if ("automatico".equals(modo)) {
            telemetryService.recalcularModoAutomaticoReles("ESP32_HIDRO_01");
        }
        return releRepo.findAllByOrderByCanalAsc();
    }

    @PutMapping("/{canal}/regla")
    public ReleCanal actualizarRegla(@PathVariable Integer canal, @RequestBody ReglaAutoRequest req) {
        ReleCanal rele = releRepo.findById(canal)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Canal de relé no encontrado"));

        String variable = (req != null && req.variable() != null) ? req.variable().trim().toLowerCase() : "ninguna";
        if (!VARIABLES_REGLA.contains(variable)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Variable de sensor no válida: " + variable);
        }

        Map<String, Object> regla = new LinkedHashMap<>();
        regla.put("variable", variable);

        if (!"ninguna".equals(variable)) {
            String enc = (req.encenderCuando() != null) ? req.encenderCuando().trim() : "";
            String apa = (req.apagarCuando() != null) ? req.apagarCuando().trim() : "";
            if (!CONDICIONES_ENCENDIDO.contains(enc)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Condición de encendido no válida");
            }
            if (!CONDICIONES_APAGADO.contains(apa)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Condición de apagado no válida");
            }

            boolean usaValorEnc = enc.endsWith("_valor");
            boolean usaValorApa = apa.endsWith("_valor");
            if (usaValorEnc && (req.umbralEncendido() == null || !Double.isFinite(req.umbralEncendido()))) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indica un valor numérico válido para encender");
            }
            if (usaValorApa && (req.umbralApagado() == null || !Double.isFinite(req.umbralApagado()))) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indica un valor numérico válido para apagar");
            }
            if ("menor_valor".equals(enc) && "mayor_igual_valor".equals(apa)
                    && req.umbralApagado() < req.umbralEncendido()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "El umbral de apagado debe ser mayor o igual al umbral de encendido");
            }
            if ("mayor_valor".equals(enc) && "menor_igual_valor".equals(apa)
                    && req.umbralApagado() > req.umbralEncendido()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "El umbral de apagado debe ser menor o igual al umbral de encendido");
            }

            regla.put("encenderCuando", enc);
            if (usaValorEnc) {
                regla.put("umbralEncendido", req.umbralEncendido());
            }
            regla.put("apagarCuando", apa);
            if (usaValorApa) {
                regla.put("umbralApagado", req.umbralApagado());
            }
        }

        rele.setReglaAuto(regla);
        rele.setActualizadoEn(OffsetDateTime.now());
        releRepo.save(rele);

        auditService.registrar("Control de Equipos", "Regla Automática Relé " + canal,
                "Anterior", "ninguna".equals(variable) ? "Sin regla" : variable);

        if ("automatico".equalsIgnoreCase(rele.getModoOperacion())) {
            telemetryService.recalcularModoAutomaticoReles("ESP32_HIDRO_01");
        }
        return releRepo.findById(canal).orElse(rele);
    }

    private static final Set<Integer> GPIOS_RESERVADOS_ESP32_S3 = Set.of(
            0, 3, 19, 20, 22, 23, 24, 25,
            26, 27, 28, 29, 30, 31, 32,
            33, 34, 35, 36, 37,
            45, 46
    );

    private String validarYNormalizarGpioEsp32S3(Integer canal, String rawPin) {
        if (rawPin == null || rawPin.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Pin GPIO vacío para el canal " + canal);
        }
        String limpio = rawPin.trim().toUpperCase();
        String soloNumero = limpio.startsWith("GPIO") ? limpio.substring(4).trim() : limpio;
        if (!soloNumero.matches("^\\d+$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Formato de pin GPIO inválido para el canal " + canal + ": \"" + rawPin + "\"");
        }
        int gpio = Integer.parseInt(soloNumero);
        if (gpio < 1 || gpio > 48 || GPIOS_RESERVADOS_ESP32_S3.contains(gpio)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El pin GPIO " + gpio + " está reservado en el ESP32-S3-WROOM-1 o fuera de rango");
        }
        return "GPIO " + gpio;
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
            if (canal == null || canal < 1 || canal > 8) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Canal de relé fuera de rango: " + canal);
            }
            String pinNormalizado = validarYNormalizarGpioEsp32S3(canal, entry.getValue());
            if (!pinesUsados.add(pinNormalizado)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El pin GPIO \"" + pinNormalizado + "\" está duplicado entre canales.");
            }
            pinesLimpios.put(canal, pinNormalizado);
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
