package com.axion.hidroponia.repository;

import com.axion.hidroponia.model.AdminCuenta;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AdminCuentaRepository extends JpaRepository<AdminCuenta, Integer> {
    Optional<AdminCuenta> findByCorreoIgnoreCase(String correo);
}
