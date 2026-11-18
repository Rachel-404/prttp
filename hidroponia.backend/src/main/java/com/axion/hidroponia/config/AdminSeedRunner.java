package com.axion.hidroponia.config;

import com.axion.hidroponia.model.AdminCuenta;
import com.axion.hidroponia.repository.AdminCuentaRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminSeedRunner implements CommandLineRunner {

    private final AdminCuentaRepository adminRepo;
    private final PasswordEncoder passwordEncoder;
    private final String adminEmail;
    private final String adminPassword;

    public AdminSeedRunner(
            AdminCuentaRepository adminRepo,
            PasswordEncoder passwordEncoder,
            @Value("${axion.admin.email:admin@universidad.edu}") String adminEmail,
            @Value("${axion.admin.password:axion2026}") String adminPassword) {
        this.adminRepo = adminRepo;
        this.passwordEncoder = passwordEncoder;
        this.adminEmail = adminEmail;
        this.adminPassword = adminPassword;
    }

    @Override
    public void run(String... args) {
        if (adminRepo.findById(1).isEmpty()) {
            AdminCuenta admin = new AdminCuenta();
            admin.setId(1);
            admin.setCorreo(adminEmail.trim().toLowerCase());
            admin.setPasswordHash(passwordEncoder.encode(adminPassword));
            admin.setNombreVisible("Ing. Soporte Principal");
            admin.setExpiracionMinutos(30);
            admin.setTokenRecuperacion("AXN-ESP32-2026");
            admin.setTokenVersion(1);
            adminRepo.save(admin);
        }
    }
}
