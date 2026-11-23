package com.axion.hidroponia.config;

import com.axion.hidroponia.model.AdminCuenta;
import com.axion.hidroponia.repository.AdminCuentaRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class JwtService {

    private final SecretKey key;
    private final long expirationMs;
    private final AdminCuentaRepository adminRepo;

    public JwtService(String secret, long expirationMs) {
        this(secret, expirationMs, null);
    }

    @Autowired
    public JwtService(
            @Value("${axion.security.jwt-secret}") String secret,
            @Value("${axion.security.jwt-expiration-ms:1800000}") long expirationMs,
            AdminCuentaRepository adminRepo) {
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            byte[] padded = new byte[32];
            System.arraycopy(bytes, 0, padded, 0, bytes.length);
            bytes = padded;
        }
        this.key = Keys.hmacShaKeyFor(bytes);
        this.expirationMs = expirationMs;
        this.adminRepo = adminRepo;
    }

    private long resolverExpiracionMs() {
        long respaldoMs = (this.expirationMs > 0) ? this.expirationMs : 30L * 60_000L;
        if (this.adminRepo == null) {
            return respaldoMs;
        }
        try {
            return this.adminRepo.findById(1)
                    .map(AdminCuenta::getExpiracionMinutos)
                    .filter(min -> min != null && min >= 1 && min <= 1440)
                    .map(min -> min.longValue() * 60_000L)
                    .orElse(respaldoMs);
        } catch (Exception ex) {
            return respaldoMs;
        }
    }

    public String generarToken(String correo, Integer tokenVersion) {
        long now = System.currentTimeMillis();
        long expMs = resolverExpiracionMs();
        return Jwts.builder()
                .subject(correo)
                .claim("rol", "ROLE_ADMIN")
                .claim("ver", tokenVersion)
                .issuedAt(new Date(now))
                .expiration(new Date(now + expMs))
                .signWith(key)
                .compact();
    }

    public Claims parsearClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public long getExpirationSec() {
        return resolverExpiracionMs() / 1000L;
    }
}
