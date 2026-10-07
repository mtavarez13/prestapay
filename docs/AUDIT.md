# Auditoría inicial

Fecha: 2026-10-06

## Hallazgos críticos corregidos

1. Todas las colecciones eran globales y legibles por cualquier usuario autenticado. Se migró el modelo y las reglas a rutas por tenant.
2. Un correo fijo recibía rol administrador y usuarios nuevos podían crear perfiles privilegiados desde el navegador. Se eliminaron ambos patrones.
3. La clave de Gemini se insertaba en el paquete web. La llamada ahora pasa por un endpoint autenticado del servidor.
4. No existía verificación de suscripción. Firestore y el API bloquean escrituras por estado y vencimiento.
5. Transacciones financieras podían actualizarse o borrarse. Ahora son inmutables para clientes; cambios administrativos se auditan en servidor.
6. La configuración de Firebase estaba ligada a un proyecto concreto. Ahora usa variables de entorno.
7. Las pantallas mostraban datos de ejemplo, no datos reales. Los módulos principales consultan colecciones del tenant activo.

## Estado funcional encontrado

El repositorio original era un único frontend React de 663 líneas con login de Google y pantallas estáticas para dashboard, clientes, préstamos, inventario, caja y configuración. No había API, backend, pruebas, migraciones, facturación, multiempresa ni Android.

## Pendientes externos

- Crear los productos/precios en el proveedor de pagos elegido y firmar webhooks antes de habilitar cobros reales.
- Configurar credenciales Firebase, dominios autorizados, índices sugeridos por Firestore y el custom claim del primer Super Admin.
- Ejecutar la migración primero en simulación y respaldar Firestore antes de aplicarla.
- Firmar el APK/AAB con una clave de publicación gestionada fuera del repositorio.
