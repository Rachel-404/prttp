package com.axion.hidroponia.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Entity
@Table(name = "reles_canales")
public class ReleCanal {

    @Id
    private Integer canal;

    @Column(nullable = false, length = 120)
    private String nombre;

    @Column(name = "pin_gpio", nullable = false, length = 32)
    private String pinGpio;

    @Column(nullable = false)
    private boolean encendido = false;

    @Column(name = "modo_operacion", nullable = false, length = 20)
    private String modoOperacion = "manual";

    @Column(name = "logica_disparo", nullable = false, length = 10)
    private String logicaDisparo = "low";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "regla_auto", columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> reglaAuto = new LinkedHashMap<>();

    @Column(name = "actualizado_en", nullable = false)
    private OffsetDateTime actualizadoEn = OffsetDateTime.now();

    public Integer getCanal() { return canal; }
    public void setCanal(Integer canal) { this.canal = canal; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getPinGpio() { return pinGpio; }
    public void setPinGpio(String pinGpio) { this.pinGpio = pinGpio; }
    public boolean isEncendido() { return encendido; }
    public void setEncendido(boolean encendido) { this.encendido = encendido; }
    public String getModoOperacion() { return modoOperacion; }
    public void setModoOperacion(String modoOperacion) { this.modoOperacion = modoOperacion; }
    public String getLogicaDisparo() { return logicaDisparo; }
    public void setLogicaDisparo(String logicaDisparo) { this.logicaDisparo = logicaDisparo; }
    public Map<String, Object> getReglaAuto() { return reglaAuto; }
    public void setReglaAuto(Map<String, Object> reglaAuto) { this.reglaAuto = reglaAuto != null ? reglaAuto : new LinkedHashMap<>(); }
    public OffsetDateTime getActualizadoEn() { return actualizadoEn; }
    public void setActualizadoEn(OffsetDateTime actualizadoEn) { this.actualizadoEn = actualizadoEn; }
}
