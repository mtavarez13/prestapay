# Arquitectura SaaS de PrestaPay

## Límites de confianza

- Firebase Authentication emite la identidad. Los roles de empresa nunca se deducen del correo; la única excepción global es el correo verificado del Super Admin principal configurado explícitamente.
- Cada registro operativo vive bajo `tenants/{tenantId}/...` y conserva `tenantId` como defensa adicional.
- Las reglas de Firestore validan membresía, rol y `subscription.accessUntil` en cada escritura.
- El API repite esas validaciones con Firebase Admin. Android consume el API; la web puede usar Firestore en tiempo real para operaciones autorizadas.
- El correo verificado `martin.tavarez.gomez@gmail.com` y las identidades con el custom claim `superAdmin: true`, asignado fuera del cliente, pueden administrar todas las empresas y suscripciones.

## Colecciones

```text
users/{uid}
  memberships/{tenantId}       # índice privado del usuario
tenants/{tenantId}
  members/{uid}
  clients/{id}
  loans/{id}
  articles/{id}
  transactions/{id}            # inmutable desde el cliente
  fixedExpenses/{id}
  receipts/{id}                # solo servidor
  auditLogs/{id}               # solo servidor
plans/{planId}
```

## Suscripciones

Los estados son `trialing`, `active`, `past_due`, `suspended`, `canceled` y `expired`. Solo `trialing` y `active`, antes de `accessUntil`, habilitan escrituras operativas. El panel del cliente muestra el estado, pero no puede modificarlo. El endpoint Super Admin actualiza el estado y deja auditoría.

## Impresión

La web genera HTML específico para 58/80 mm y abre la vista previa nativa del navegador; los navegadores no permiten escoger una impresora silenciosamente. Android genera ESC/POS y conecta por Bluetooth RFCOMM a una impresora ya vinculada, solicitando `BLUETOOTH_CONNECT` en Android 12 o posterior.
