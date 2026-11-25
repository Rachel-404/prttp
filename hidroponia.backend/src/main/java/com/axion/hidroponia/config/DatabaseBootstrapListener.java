package com.axion.hidroponia.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationEnvironmentPreparedEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.core.env.ConfigurableEnvironment;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Verifica antes de inicializar el DataSource que la base de datos PostgreSQL
 * configurada en spring.datasource.url exista; si no existe, la crea automáticamente.
 */
public class DatabaseBootstrapListener implements ApplicationListener<ApplicationEnvironmentPreparedEvent> {

    private static final Logger log = LoggerFactory.getLogger(DatabaseBootstrapListener.class);
    private static final Pattern PG_URL_PATTERN = Pattern.compile("^(jdbc:postgresql://[^/]+)/([^?]+)(.*)$");
    private static final Pattern SAFE_DB_NAME = Pattern.compile("^[a-zA-Z0-9_]+$");

    @Override
    public void onApplicationEvent(ApplicationEnvironmentPreparedEvent event) {
        ConfigurableEnvironment env = event.getEnvironment();
        String url = env.getProperty("spring.datasource.url");
        String username = env.getProperty("spring.datasource.username");
        String password = env.getProperty("spring.datasource.password");

        if (url == null || !url.startsWith("jdbc:postgresql://")) {
            return;
        }

        Matcher matcher = PG_URL_PATTERN.matcher(url);
        if (!matcher.matches()) {
            return;
        }

        String baseUrl = matcher.group(1);
        String dbName = matcher.group(2);
        String queryParams = matcher.group(3);

        if ("postgres".equalsIgnoreCase(dbName) || !SAFE_DB_NAME.matcher(dbName).matches()) {
            return;
        }

        String adminUrl = baseUrl + "/postgres" + queryParams;
        try (Connection conn = DriverManager.getConnection(adminUrl, username, password)) {
            boolean existe;
            try (PreparedStatement ps = conn.prepareStatement("SELECT 1 FROM pg_database WHERE datname = ?")) {
                ps.setString(1, dbName);
                try (ResultSet rs = ps.executeQuery()) {
                    existe = rs.next();
                }
            }

            if (!existe) {
                log.info("Base de datos '{}' no existe. Creándola automáticamente...", dbName);
                try (Statement st = conn.createStatement()) {
                    st.executeUpdate("CREATE DATABASE \"" + dbName + "\"");
                }
                log.info("Base de datos '{}' creada correctamente.", dbName);
            }
        } catch (Exception e) {
            log.warn("No se pudo verificar/crear automáticamente la base de datos '{}': {}", dbName, e.getMessage());
        }
    }
}
