# AXIÓN - IOT | Backend (Spring Boot + PostgreSQL + TimescaleDB)

Backend REST, WebSocket (STOMP) y cliente MQTT para el sistema hidropónico basado en `ESP32-S3-WROOM-1`.

## Requisitos
- **JDK 21** (con compilador `javac`, p. ej. `java-21-openjdk-devel` o Temurin 21)
- **PostgreSQL 16 + TimescaleDB** y **Mosquitto MQTT** (incluidos en `docker-compose.yml`)

## Levantar infraestructura (PostgreSQL + TimescaleDB + Mosquitto)
```bash
cd hidroponia.backend
docker compose up -d
```

## Ejecutar en local
1. Ajustar las credenciales en `.env` (usar `.env.example` como referencia).
2. Compilar y ejecutar con Maven:
```bash
mvn spring-boot:run
```
*(Nota: Si en tu sistema solo tienes instalado el JRE sin `javac`, instala el paquete `java-21-openjdk-devel` o construye la imagen usando el `Dockerfile` incluido).*
