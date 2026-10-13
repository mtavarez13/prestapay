# Auditoría inicial

Fecha: 2026-10-13

## Hallazgos críticos corregidos

1. Todas las colecciones eran globales y legibles por cualquier usuario autenticado. Se migró el modelo y las reglas a rutas por tenant.
2. Un correo fijo recibía rol administrador y usuarios nuevos podían crear perfiles privilegiados desde el navegador. Se eliminaron ambos patrones.
3. La clave de Gemini se insertaba en el paquete web. La llamada ahora pasa por un endpoint autenticado del servidor.
4. No existía verificación de suscripción. Firestore y el API bloquean escrituras por estado y vencimiento.
5. Transacciones financieras podían actualizarse o borrarse. Ahora son inmutables para clientes y solo el API puede crear el movimiento, el recibo y el cambio de balance de forma atómica.
6. La configuración de Firebase estaba ligada a un proyecto concreto. Ahora usa variables de entorno.
7. Las pantallas mostraban datos de ejemplo, no datos reales. Los módulos principales consultan colecciones del tenant activo.

## Estado funcional encontrado

El repositorio original era un único frontend React de 663 líneas con login de Google y pantallas estáticas para dashboard, clientes, préstamos, inventario, caja y configuración. No había API, backend, pruebas, migraciones, facturación, multiempresa ni Android.

## Pendientes externos

- Crear los productos/precios en el proveedor de pagos elegido y firmar webhooks antes de habilitar cobros reales.
- Firebase `prestamo-27ccb` ya tiene Firestore, reglas, índices y correo/contraseña habilitados. Falta crear Storage para logos, revisar dominios autorizados y asignar el custom claim del primer Super Admin.
- Elegir infraestructura y URL HTTPS para desplegar el API y configurar `CORS_ORIGINS`; no se desplegó por la restricción de no publicar sin autorización específica.
- Ejecutar la migración primero en simulación y respaldar Firestore antes de aplicarla.
- Firmar el APK/AAB con una clave de publicación gestionada fuera del repositorio.
