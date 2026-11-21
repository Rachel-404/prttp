package com.axion.hidroponia.controller;

import com.axion.hidroponia.config.JwtService;
import com.axion.hidroponia.model.AdminCuenta;
import com.axion.hidroponia.model.AuditoriaCambio;
import com.axion.hidroponia.model.SistemaPreferencias;
import com.axion.hidroponia.repository.AdminCuentaRepository;
import com.axion.hidroponia.repository.AuditoriaCambioRepository;
import com.axion.hidroponia.repository.SistemaPreferenciasRepository;
import com.axion.hidroponia.service.AuditService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class ConfiguracionController {

    private final AdminCuentaRepository adminRepo;
    private final SistemaPreferenciasRepository prefsRepo;
    private final AuditoriaCambioRepository auditoriaRepo;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final JwtService jwtService;

    public ConfiguracionController(
            AdminCuentaRepository adminRepo,
            SistemaPreferenciasRepository prefsRepo,
            AuditoriaCambioRepository auditoriaRepo,
            PasswordEncoder passwordEncoder,
            AuditService auditService,
            JwtService jwtService) {
        this.adminRepo = adminRepo;
        this.prefsRepo = prefsRepo;
        this.auditoriaRepo = auditoriaRepo;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
        this.jwtService = jwtService;
    }

    public record CuentaRequest(
            String nombreVisible,
            String correoAlertas,
            Integer expiracionMinutos,
            String passwordActual,
            String passwordNueva) {}

    @GetMapping("/configuracion/cuenta")
    public Map<String, Object> obtenerCuenta() {
        AdminCuenta admin = adminRepo.findById(1)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cuenta no encontrada"));
        return Map.of(
                "correo", admin.getCorreo(),
                "nombreVisible", admin.getNombreVisible(),
                "expiracionMinutos", admin.getExpiracionMinutos(),
                "actualizadoEn", admin.getActualizadoEn().toString()
        );
    }

    @PutMapping("/configuracion/cuenta")
    public Map<String, Object> actualizarCuenta(@RequestBody CuentaRequest req) {
        AdminCuenta admin = adminRepo.findById(1)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cuenta no encontrada"));

        if (req.passwordActual() == null || !passwordEncoder.matches(req.passwordActual(), admin.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "La contraseña actual es incorrecta");
        }

        if (req.nombreVisible() != null && !req.nombreVisible().isBlank()) {
            admin.setNombreVisible(req.nombreVisible().trim());
        }
        if (req.correoAlertas() != null && !req.correoAlertas().isBlank()) {
            admin.setCorreo(req.correoAlertas().trim().toLowerCase());
        }
        if (req.expiracionMinutos() != null && req.expiracionMinutos() >= 1 && req.expiracionMinutos() <= 1440) {
            admin.setExpiracionMinutos(req.expiracionMinutos());
        }

        boolean cambioPass = false;
        if (req.passwordNueva() != null && !req.passwordNueva().isBlank()) {
            if (req.passwordNueva().trim().length() < 6) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La nueva contraseña debe tener al menos 6 caracteres");
            }
            admin.setPasswordHash(passwordEncoder.encode(req.passwordNueva().trim()));
            admin.setTokenVersion(admin.getTokenVersion() + 1);
            cambioPass = true;
        }

        admin.setActualizadoEn(OffsetDateTime.now());
        adminRepo.save(admin);

        auditService.registrar("Cuenta Administrativa", cambioPass ? "Perfil y Contraseña" : "Perfil y Sesión",
                "Anterior", admin.getExpiracionMinutos() + " min");
        String nuevoJwt = jwtService.generarToken(admin.getCorreo(), admin.getTokenVersion());
        return Map.of("mensaje", "Cuenta administrativa actualizada correctamente.", "token", nuevoJwt);
    }

    @PostMapping("/configuracion/regenerar-token")
    public Map<String, Object> regenerarToken() {
        AdminCuenta admin = adminRepo.findById(1)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cuenta no encontrada"));
        String nuevoToken = "axn_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        admin.setTokenRecuperacion(nuevoToken);
        admin.setTokenVersion(admin.getTokenVersion() + 1);
        admin.setActualizadoEn(OffsetDateTime.now());
        adminRepo.save(admin);

        auditService.registrar("Cuenta Administrativa", "Token de Emergencia", "Anterior", "Regenerado");
        String nuevoJwt = jwtService.generarToken(admin.getCorreo(), admin.getTokenVersion());
        return Map.of("tokenRecuperacion", nuevoToken, "token", nuevoJwt);
    }

    @GetMapping("/configuracion/apariencia")
    public SistemaPreferencias obtenerApariencia() {
        return prefsRepo.findById(1).orElseGet(SistemaPreferencias::new);
    }

    @PutMapping("/configuracion/apariencia")
    public SistemaPreferencias actualizarApariencia(@RequestBody Map<String, Object> body) {
        SistemaPreferencias prefs = prefsRepo.findById(1).orElseGet(SistemaPreferencias::new);
        if (body.get("tema") != null) prefs.setTema(String.valueOf(body.get("tema")));
        if (body.get("titlePx") instanceof Number n) prefs.setTitlePx(n.intValue());
        if (body.get("subtitlePx") instanceof Number n) prefs.setSubtitlePx(n.intValue());
        if (body.get("basePx") instanceof Number n) prefs.setBasePx(n.intValue());
        prefs.setActualizadoEn(OffsetDateTime.now());

        SistemaPreferencias guardado = prefsRepo.save(prefs);
        auditService.registrar("Sistema y Tipografía", "Escala Tipográfica", "Anterior",
                guardado.getTitlePx() + "/" + guardado.getSubtitlePx() + "/" + guardado.getBasePx() + " px");
        return guardado;
    }

    @GetMapping("/auditoria")
    public Page<AuditoriaCambio> listarAuditoria(
            @RequestParam(defaultValue = "todos") String modulo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageRequest pageable = PageRequest.of(page, size);
        if ("todos".equalsIgnoreCase(modulo)) {
            return auditoriaRepo.findAllByOrderByFechaHoraDesc(pageable);
        }
        return auditoriaRepo.findByModuloOrderByFechaHoraDesc(modulo, pageable);
    }

    @GetMapping("/auditoria/exportar")
    public ResponseEntity<byte[]> exportarAuditoriaCsv(@RequestParam(defaultValue = "todos") String modulo) {
        List<AuditoriaCambio> registros = "todos".equalsIgnoreCase(modulo)
                ? auditoriaRepo.findAllByOrderByFechaHoraDesc(PageRequest.of(0, 1000)).getContent()
                : auditoriaRepo.findByModuloOrderByFechaHoraDesc(modulo, PageRequest.of(0, 1000)).getContent();

        StringBuilder sb = new StringBuilder();
        sb.append("FechaHora,Modulo,Parametro,ValorAnterior,ValorNuevo,Usuario\n");
        for (AuditoriaCambio item : registros) {
            sb.append(csvEscape(item.getFechaHora() != null ? item.getFechaHora().toString() : "")).append(',')
              .append(csvEscape(item.getModulo())).append(',')
              .append(csvEscape(item.getParametro())).append(',')
              .append(csvEscape(item.getValorAnterior())).append(',')
              .append(csvEscape(item.getValorNuevo())).append(',')
              .append(csvEscape(item.getUsuario())).append('\n');
        }

        byte[] bytes = ("\uFEFF" + sb).getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=axion_auditoria.csv")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(bytes);
    }

    private String csvEscape(String val) {
        if (val == null) return "\"\"";
        return "\"" + val.replace("\"", "\"\"") + "\"";
    }
}
