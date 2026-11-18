# Guía de Uso y Despliegue con Docker — AXIÓN - IOT

Esta guía resume cómo levantar, construir y operar el entorno de contenedores del proyecto una vez terminado el desarrollo.

---

## 1. ¿Qué incluye actualmente el proyecto?

En `hidroponia.backend/` ya están definidos los archivos base:
* **[docker-compose.yml](hidroponia.backend/docker-compose.yml):** Orquesta los servicios externos que necesita el sistema:
  * `axion_postgres` (`timescale/timescaledb:latest-pg16`, puerto `5432`): Base de datos PostgreSQL 16 con la extensión TimescaleDB y volumen persistente `axion_pgdata`.
  * `axion_mosquitto` (`eclipse-mosquitto:2`, puertos `1883` y `9001`): Broker MQTT para recibir telemetría y enviar comandos al `ESP32-S3`.
* **[docker/mosquitto.conf](hidroponia.backend/docker/mosquitto.conf):** Configuración inicial del broker MQTT.
* **[Dockerfile](hidroponia.backend/Dockerfile):** Receta *multi-stage* para compilar el backend Spring Boot con JDK 21 y empaquetarlo en una imagen ligera con JRE 21.

---

## 2. Preparación previa (una sola vez)

### En Linux
1. Verifica que Docker esté instalado y activo:
   ```bash
   sudo systemctl enable --now docker
   docker --version
   docker compose version
   ```
2. *(Opcional)* Permite ejecutar `docker` sin `sudo` añadiendo tu usuario al grupo `docker` (requiere cerrar sesión y volver a entrar):
   ```bash
   sudo usermod -aG docker $USER
   ```

### En Windows
1. Habilita **WSL 2** abriendo PowerShell como Administrador (si aún no lo tienes):
   ```powershell
   wsl --install
   ```
2. Descarga e instala **Docker Desktop for Windows** desde `https://www.docker.com/products/docker-desktop/` (asegúrate de dejar marcada la opción *"Use WSL 2 instead of Hyper-V"*).
3. Abre **Docker Desktop** y espera a que la barra inferior indique **Engine running** (en verde).
4. Verifica en **PowerShell** o **Windows Terminal**:
   ```powershell
   docker --version
   docker compose version
   ```
   *(Consejo: puedes usar PowerShell, CMD o Git Bash; para evitar problemas de rendimiento de disco, es recomendable tener el proyecto dentro de tu carpeta de usuario o dentro del sistema de archivos de WSL 2).*

---

## 3. Cómo armar y levantar el sistema

### Escenario A: Solo infraestructura (Desarrollo local)
Ideal mientras trabajas en el código. Levanta únicamente PostgreSQL + TimescaleDB y Mosquitto en Docker, y corre Spring Boot y React directamente en tu máquina:

```bash
cd hidroponia.backend
docker compose up -d
```

Luego:
* Backend: `mvn spring-boot:run` (en `hidroponia.backend/`)
* Frontend: `npm run dev` (en `hidroponia.frontend/`)

---

### Escenario B: Armar también la imagen del Backend Spring Boot
Cuando quieras empaquetar el backend Java en su propio contenedor (útil si no tienes JDK instalado en el servidor o vas a desplegar):

```bash
cd hidroponia.backend
docker build -t axion-backend:1.1.0 .
```

Para ejecutarlo conectado a los contenedores de `docker-compose.yml`:

* **En Linux:**
  ```bash
  docker run -d \
    --name axion_backend \
    --env-file .env \
    --network host \
    axion-backend:1.1.0
  ```

* **En Windows (PowerShell):**
  En Windows, `--network host` no enlaza directamente con otros contenedores locales. Conéctalo usando la red creada por `docker compose` (`hidroponiabackend_default` o el nombre de red de `docker network ls`) o `host.docker.internal`:
  ```powershell
  docker run -d `
    --name axion_backend `
    --env-file .env `
    -p 8080:8080 `
    -e DB_URL=jdbc:postgresql://host.docker.internal:5432/axion_hidroponia `
    -e MQTT_BROKER_URL=tcp://host.docker.internal:1883 `
    axion-backend:1.1.0
  ```
*(Si los conectas dentro de la misma red bridge de Docker Compose, cambia `host.docker.internal` por `axion_postgres` y `axion_mosquitto`).*

---

### Escenario C: Compilar el Frontend para producción
El frontend en `hidroponia.frontend/` no requiere contenedor en desarrollo. Para producción genera la carpeta estática `dist/`:

```bash
cd hidroponia.frontend
npm install
npm run build
```

Puedes servir `dist/` directamente con **Nginx/Apache** o añadir un contenedor `nginx:alpine` con `try_files $uri /index.html;` para soportar las rutas de React Router.

---

## 4. Comandos esenciales de operación y mantenimiento

| Acción | Comando |
| :--- | :--- |
| Ver contenedores activos | `docker ps` |
| Levantar servicios en segundo plano | `docker compose up -d` |
| Ver logs en tiempo real (todos) | `docker compose logs -f` |
| Ver logs de un servicio específico | `docker logs -f axion_postgres` / `docker logs -f axion_mosquitto` |
| Detener contenedores *(conserva los datos)* | `docker compose down` |
| Detener y **borrar** volúmenes *(reinicia la BD desde cero)* | `docker compose down -v` |
| Entrar a la consola SQL de PostgreSQL | `docker exec -it axion_postgres psql -U postgres -d axion_hidroponia` |
| Probar publicación MQTT manual *(Linux / Git Bash)* | `docker exec -it axion_mosquitto mosquitto_pub -t "axion/hidroponia/telemetria" -m '{"dispositivo_id":"ESP32_HIDRO_01","datos":{"nivel_ph":6.2}}'` |
| Probar publicación MQTT manual *(Windows PowerShell)* | `docker exec -it axion_mosquitto mosquitto_pub -t "axion/hidroponia/telemetria" -m '{\"dispositivo_id\":\"ESP32_HIDRO_01\",\"datos\":{\"nivel_ph\":6.2}}'` |

---

## 5. Respaldo y restauración de la Base de Datos

### En Linux (Bash)
* **Crear backup manual (`.sql`):**
  ```bash
  docker exec axion_postgres pg_dump -U postgres axion_hidroponia > backup_axion_$(date +%F).sql
  ```
* **Restaurar backup:**
  ```bash
  cat backup_axion_2026-11-17.sql | docker exec -i axion_postgres psql -U postgres -d axion_hidroponia
  ```

### En Windows (PowerShell)
En PowerShell el operador `>` guarda archivos en UTF-16 y puede corromper archivos SQL; usa `docker cp` para generar y restaurar respaldos limpios en UTF-8:
* **Crear backup manual (`.sql`):**
  ```powershell
  $fecha = Get-Date -Format "yyyy-MM-dd"
  docker exec axion_postgres pg_dump -U postgres -d axion_hidroponia -f /tmp/backup.sql
  docker cp axion_postgres:/tmp/backup.sql "backup_axion_$fecha.sql"
  ```
* **Restaurar backup:**
  ```powershell
  docker cp backup_axion_2026-11-17.sql axion_postgres:/tmp/restore.sql
  docker exec -it axion_postgres psql -U postgres -d axion_hidroponia -f /tmp/restore.sql
  ```

---

## 6. Checklist antes de pasar a Producción

Antes de armar el sistema para un entorno real fuera de tu red de pruebas:
1. **Mosquitto seguro:** Cambiar `allow_anonymous true` a `allow_anonymous false` en `docker/mosquitto.conf`, crear archivo de contraseñas con `mosquitto_passwd` y habilitar TLS si el ESP32-S3 se conecta por red pública.
2. **Credenciales en `.env`:** Reemplazar `DB_PASSWORD`, `MQTT_PASSWORD`, `ADMIN_PASSWORD` y `JWT_SECRET` (mínimo 32 caracteres aleatorios).
3. **Cerrar puerto 5432 al exterior:** En `docker-compose.yml`, cambiar `"5432:5432"` a `"127.0.0.1:5432:5432"` (o quitar `ports` si el backend también corre en la misma red Docker).
4. **Fijar versión de TimescaleDB:** Cambiar `timescale/timescaledb:latest-pg16` por una etiqueta de versión específica para evitar actualizaciones inesperadas.
