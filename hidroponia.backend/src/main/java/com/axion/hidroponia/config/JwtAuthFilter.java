package com.axion.hidroponia.config;

import com.axion.hidroponia.repository.AdminCuentaRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final AdminCuentaRepository adminRepo;

    public JwtAuthFilter(JwtService jwtService, AdminCuentaRepository adminRepo) {
        this.jwtService = jwtService;
        this.adminRepo = adminRepo;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try {
                Claims claims = jwtService.parsearClaims(token);
                String correo = claims.getSubject();
                Integer ver = claims.get("ver", Integer.class);

                var adminOpt = adminRepo.findById(1);
                if (adminOpt.isPresent()
                        && adminOpt.get().getCorreo().equalsIgnoreCase(correo)
                        && (ver == null || ver.equals(adminOpt.get().getTokenVersion()))) {
                    var auth = new UsernamePasswordAuthenticationToken(
                            correo,
                            null,
                            List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
                    );
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            } catch (Exception ignored) {
                SecurityContextHolder.clearContext();
            }
        }

        filterChain.doFilter(request, response);
    }
}
