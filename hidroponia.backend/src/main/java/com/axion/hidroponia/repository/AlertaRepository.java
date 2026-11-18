package com.axion.hidroponia.repository;

import com.axion.hidroponia.model.Alerta;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AlertaRepository extends JpaRepository<Alerta, Long> {
    List<Alerta> findTop20ByOrderByCreadaEnDesc();
    boolean existsByModuloAndNivelAndLeidaFalse(String modulo, String nivel);
}
