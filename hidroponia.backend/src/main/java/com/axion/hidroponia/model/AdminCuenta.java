package com.axion.hidroponia.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "admin_cuenta")
public class AdminCuenta {

    @Id
    private Integer id = 1;

    @Column(nullable = false, unique = true, length = 160)
    private String correo;

    @Column(name = "password_hash", nullable = false, length = 200)
    private String passwordHash;

    @Column(name = "nombre_visible", nullable = false, length = 120)
    private String nombreVisible = "Ing. Soporte Principal";

    @Column(name = "expiracion_minutos", nullable = false)
    private Integer expiracionMinutos = 30;

    @Column(name = "token_recuperacion", length = 120)
    private String tokenRecuperacion;

    @Column(name = "token_version", nullable = false)
    private Integer tokenVersion = 1;

    @Column(name = "actualizado_en", nullable = false)
    private OffsetDateTime actualizadoEn = OffsetDateTime.now();

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getCorreo() { return correo; }
    public void setCorreo(String correo) { this.correo = correo; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public String getNombreVisible() { return nombreVisible; }
    public void setNombreVisible(String nombreVisible) { this.nombreVisible = nombreVisible; }
    public Integer getExpiracionMinutos() { return expiracionMinutos; }
    public void setExpiracionMinutos(Integer expiracionMinutos) { this.expiracionMinutos = expiracionMinutos; }
    public String getTokenRecuperacion() { return tokenRecuperacion; }
    public void setTokenRecuperacion(String tokenRecuperacion) { this.tokenRecuperacion = tokenRecuperacion; }
    public Integer getTokenVersion() { return tokenVersion; }
    public void setTokenVersion(Integer tokenVersion) { this.tokenVersion = tokenVersion; }
    public OffsetDateTime getActualizadoEn() { return actualizadoEn; }
    public void setActualizadoEn(OffsetDateTime actualizadoEn) { this.actualizadoEn = actualizadoEn; }
}
