package com.axion.hidroponia.repository;

import com.axion.hidroponia.model.ReleCanal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReleCanalRepository extends JpaRepository<ReleCanal, Integer> {
    List<ReleCanal> findAllByOrderByCanalAsc();
}
