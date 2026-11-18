package com.axion.hidroponia.controller;

import com.axion.hidroponia.config.JwtService;
import com.axion.hidroponia.model.AdminCuenta;
import com.axion.hidroponia.repository.AdminCuentaRepository;
import com.axion.hidroponia.service.AuditService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AdminCuentaRepository adminRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuditService auditService;

    public AuthController(
            AdminCuentaRepository adminRepo,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            AuditService auditService) {
        this.adminRepo = adminRepo;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.auditService = auditService;
    }

    public record LoginRequest(@NotBlank @Email String correo, @NotBlank String password) {}
    public record RecuperarRequest(@NotBlank String tokenRecuperacion, @NotBlank String nuevaPassword) {}

    @PostMapping("/login")
    public Map<String, Object> login(@Valid @RequestBody LoginRequest req) {
        AdminCuenta admin = adminRepo.findById(1)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Cuenta administrativa no configurada"));

        if (!admin.getCorreo().equalsIgnoreCase(req.correo().trim())
                || !passwordEncoder.matches(req.password(), admin.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales incorrectas");
        }

        String token = jwtService.generarToken(admin.getCorreo(), admin.getTokenVersion());
        return Map.of(
                "token", token,
                "rol", "Administrador Único",
                "correo", admin.getCorreo(),
                "nombreVisible", admin.getNombreVisible(),
                "expiraEnSeg", jwtService.getExpirationSec()
        );
    }

    @PostMapping("/recuperar")
    public Map<String, Object> recuperar(@Valid @RequestBody RecuperarRequest req) {
        AdminCuenta admin = adminRepo.findById(1)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cuenta no encontrada"));

        if (admin.getTokenRecuperacion() == null
                || !admin.getTokenRecuperacion().equals(req.tokenRecuperacion().trim())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Token de recuperación inválido");
        }
        if (req.nuevaPassword().trim().length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La nueva contraseña debe tener al menos 6 caracteres");
        }

        admin.setPasswordHash(passwordEncoder.encode(req.nuevaPassword().trim()));
        admin.setTokenVersion(admin.getTokenVersion() + 1);
        admin.setActualizadoEn(OffsetDateTime.now());
        adminRepo.save(admin);

        auditService.registrar("Cuenta Administrativa", "Recuperación con Token Físico", "Anterior", "Contraseña restablecida");
        return Map.of("mensaje", "Contraseña restablecida correctamente.");
    }

    @PostMapping("/logout")
    public Map<String, Object> logout() {
        adminRepo.findById(1).ifPresent(admin -> {
            admin.setTokenVersion(admin.getTokenVersion() + 1);
            adminRepo.save(admin);
        });
        return Map.of("mensaje", "Sesión cerrada e invalidada correctamente.");
    }
}
