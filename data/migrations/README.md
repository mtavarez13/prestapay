# Migración del esquema legado

El comando `npm --workspace backend run migrate:legacy` solo cuenta y muestra el destino por defecto. Defina `MIGRATION_TENANT_ID` y credenciales de Firebase Admin. Después de validar el respaldo y la simulación, establezca `APPLY_MIGRATION=true` para copiar. El proceso conserva las colecciones originales para permitir reversión; no elimina datos.
