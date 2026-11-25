package com.axion.hidroponia.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Map;

@Entity
@Table(name = "sensor_configuracion")
public class SensorConfiguracion {

    @Id
    @Column(length = 32)
    private String modulo;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(nullable = false)
    private boolean activo = true;

    @Column(name = "min_normal")
    private Double minNormal;

    @Column(name = "max_normal")
    private Double maxNormal;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "parametros_tecnicos", columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> parametrosTecnicos;

    @Column(name = "actualizado_en", nullable = false)
    private OffsetDateTime actualizadoEn = OffsetDateTime.now();

    public String getModulo() { return modulo; }
    public void setModulo(String modulo) { this.modulo = modulo; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public boolean isActivo() { return activo; }
    public void setActivo(boolean activo) { this.activo = activo; }
    public Double getMinNormal() { return minNormal; }
    public void setMinNormal(Double minNormal) { this.minNormal = minNormal; }
    public Double getMaxNormal() { return maxNormal; }
    public void setMaxNormal(Double maxNormal) { this.maxNormal = maxNormal; }
    public Map<String, Object> getParametrosTecnicos() { return parametrosTecnicos; }
    public void setParametrosTecnicos(Map<String, Object> parametrosTecnicos) { this.parametrosTecnicos = parametrosTecnicos; }
    public OffsetDateTime getActualizadoEn() { return actualizadoEn; }
    public void setActualizadoEn(OffsetDateTime actualizadoEn) { this.actualizadoEn = actualizadoEn; }
}
