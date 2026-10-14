# API de PrestaPay

Todas las rutas bajo `/v1` requieren `Authorization: Bearer <Firebase ID token>`. Las rutas de una empresa también requieren `X-Tenant-Id`; el servidor valida membresía, rol y suscripción sin confiar en datos enviados por el cliente.

## Cuenta y empresa

- `GET /v1/me`: identidad y membresías disponibles.
- `POST /v1/tenants`: crea empresa, propietario y prueba de 14 días.
- `GET /v1/tenant`: branding, impresión, suscripción efectiva y permisos del usuario activo.

## Operación

- `GET|POST /v1/clients`, `/v1/loans` y `/v1/articles`.
- Los préstamos incluyen `paymentFrequency` (`diaria`, `semanal`, `quincenal` o `mensual`) e `installments` como cantidad de cuotas.
- `PATCH /v1/clients/:id`, `/v1/loans/:id` y `/v1/articles/:id`.
- `GET|POST /v1/transactions`: los abonos por una cuota, varias cuotas o monto libre actualizan préstamo, próxima fecha de cobro, caja y recibo en una sola transacción; no permite sobrepagos.
- `GET /v1/summary`: capital invertido, préstamos al día/atrasados, clientes activos y métricas de la empresa.

## Administración

- `GET /v1/members` y `POST /v1/members/by-email`: equipo y permisos por rol.
- `GET /v1/admin/tenants` y `PUT /v1/admin/tenants/:tenantId/subscription`: requieren el correo verificado del Super Admin principal o el custom claim `superAdmin`.

Errores de validación usan HTTP 422; suscripción inactiva 402; rol insuficiente 403; conflictos financieros 409.
