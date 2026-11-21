-- Almacena la configuración de respaldos por correo y Google Drive en PostgreSQL
ALTER TABLE sistema_preferencias
    ADD COLUMN IF NOT EXISTS config_respaldos JSONB NOT NULL DEFAULT '{
        "correo": {
            "activo": false,
            "correo": "admin@universidad.edu",
            "frecuencia": "semanal",
            "formato": "xlsx"
        },
        "drive": {
            "conectado": false,
            "cuenta": "admin@universidad.edu",
            "ruta": "/AXION-IOT/Respaldos_Hidroponia/",
            "frecuencia": "24h",
            "ultimoRespaldo": "Sin respaldos registrados"
        }
    }'::jsonb;
