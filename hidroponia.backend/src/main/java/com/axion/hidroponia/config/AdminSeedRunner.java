package com.axion.hidroponia.config;

import com.axion.hidroponia.model.AdminCuenta;
import com.axion.hidroponia.repository.AdminCuentaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.util.HexFormat;

@Component
public class AdminSeedRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminSeedRunner.class);

    private final AdminCuentaRepository adminRepo;
    private final PasswordEncoder passwordEncoder;
    private final String adminEmail;
    private final String adminPassword;
    private final String configuredRecoveryToken;

    public AdminSeedRunner(
            AdminCuentaRepository adminRepo,
            PasswordEncoder passwordEncoder,
            @Value("${axion.admin.email:admin@universidad.edu}") String adminEmail,
            @Value("${axion.admin.password:axion2026}") String adminPassword,
            @Value("${axion.admin.recovery-token:}") String configuredRecoveryToken) {
        this.adminRepo = adminRepo;
        this.passwordEncoder = passwordEncoder;
        this.adminEmail = adminEmail;
        this.adminPassword = adminPassword;
        this.configuredRecoveryToken = configuredRecoveryToken;
    }

    @Override
    public void run(String... args) {
        if (adminRepo.findById(1).isEmpty()) {
            String rawRecoveryToken;
            if (configuredRecoveryToken != null && !configuredRecoveryToken.isBlank()) {
                rawRecoveryToken = configuredRecoveryToken.trim();
            } else {
                byte[] randomBytes = new byte[8];
                new SecureRandom().nextBytes(randomBytes);
                rawRecoveryToken = "axn_" + HexFormat.of().formatHex(randomBytes);
                log.info("Token de recuperación inicial generado (guardar en lugar seguro): {}", rawRecoveryToken);
            }

            AdminCuenta admin = new AdminCuenta();
            admin.setId(1);
            admin.setCorreo(adminEmail.trim().toLowerCase());
            admin.setPasswordHash(passwordEncoder.encode(adminPassword));
            admin.setNombreVisible("Ing. Soporte Principal");
            admin.setExpiracionMinutos(30);
            admin.setTokenRecuperacion(passwordEncoder.encode(rawRecoveryToken));
            admin.setTokenVersion(1);
            adminRepo.save(admin);
        }
    }
}
