package com.axion.hidroponia.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "dispositivos")
public class Dispositivo {

    @Id
    @Column(length = 64)
    private String id;

    @Column(nullable = false, length = 120)
    private String nombre;

    @Column(nullable = false, length = 32)
    private String firmware = "1.1.0-http-real";

    @Column(nullable = false)
    private boolean conectado = false;

    private Integer rssi;

    @Column(length = 64)
    private String alimentacion = "5V USB-C";

    @Column(name = "consumo_ma")
    private Integer consumoMa = 160;

    @Column(name = "psram_ocupada_pct")
    private Integer psramOcupadaPct = 12;

    @Column(name = "buffer_tramas")
    private Integer bufferTramas = 0;

    @Column(name = "ultimo_heartbeat")
    private OffsetDateTime ultimoHeartbeat;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "config_red", columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> configRed;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "config_buffer", columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> configBuffer;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "pinout", columnDefinition = "jsonb", nullable = false)
    private List<Map<String, Object>> pinout;

    @Column(name = "actualizado_en", nullable = false)
    private OffsetDateTime actualizadoEn = OffsetDateTime.now();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getFirmware() { return firmware; }
    public void setFirmware(String firmware) { this.firmware = firmware; }
    public boolean isConectado() { return conectado; }
    public void setConectado(boolean conectado) { this.conectado = conectado; }
    public Integer getRssi() { return rssi; }
    public void setRssi(Integer rssi) { this.rssi = rssi; }
    public String getAlimentacion() { return alimentacion; }
    public void setAlimentacion(String alimentacion) { this.alimentacion = alimentacion; }
    public Integer getConsumoMa() { return consumoMa; }
    public void setConsumoMa(Integer consumoMa) { this.consumoMa = consumoMa; }
    public Integer getPsramOcupadaPct() { return psramOcupadaPct; }
    public void setPsramOcupadaPct(Integer psramOcupadaPct) { this.psramOcupadaPct = psramOcupadaPct; }
    public Integer getBufferTramas() { return bufferTramas; }
    public void setBufferTramas(Integer bufferTramas) { this.bufferTramas = bufferTramas; }
    public OffsetDateTime getUltimoHeartbeat() { return ultimoHeartbeat; }
    public void setUltimoHeartbeat(OffsetDateTime ultimoHeartbeat) { this.ultimoHeartbeat = ultimoHeartbeat; }
    public Map<String, Object> getConfigRed() { return configRed; }
    public void setConfigRed(Map<String, Object> configRed) { this.configRed = configRed; }
    public Map<String, Object> getConfigBuffer() { return configBuffer; }
    public void setConfigBuffer(Map<String, Object> configBuffer) { this.configBuffer = configBuffer; }
    public List<Map<String, Object>> getPinout() { return pinout; }
    public void setPinout(List<Map<String, Object>> pinout) { this.pinout = pinout; }
    public OffsetDateTime getActualizadoEn() { return actualizadoEn; }
    public void setActualizadoEn(OffsetDateTime actualizadoEn) { this.actualizadoEn = actualizadoEn; }
}
