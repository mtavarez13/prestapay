# PrestaPay

PrestaPay es una plataforma SaaS multiempresa para casas de empeño y negocios de préstamos. El repositorio contiene:

- `src/`: panel web React con datos por empresa, roles, suscripción, branding e impresión 58/80 mm.
- `backend/`: API TypeScript/Express autenticada con Firebase, validación de tenant, rol y suscripción.
- `android/`: aplicación Android nativa Kotlin + Jetpack Compose, Retrofit y ESC/POS Bluetooth.
- `firestore.rules` y `storage.rules`: aislamiento multi-tenant y permisos.
- `data/migrations/`: migración conservadora del esquema anterior.

## Requisitos

- Node.js 22 o posterior y npm.
- Proyecto Firebase con Authentication, Firestore y Storage.
- Para Android: Android Studio, JDK 17 y Android SDK 35.

## Configuración local

1. Copie `.env.example` a `.env.local` y complete las variables `VITE_*`.
2. Para el API, exporte `GOOGLE_APPLICATION_CREDENTIALS`, `FIREBASE_PROJECT_ID`, `FIRESTORE_DATABASE_ID` y `CORS_ORIGINS` en el entorno del servidor. No exponga `GEMINI_API_KEY` en Vite.
3. Instale y verifique:

```bash
npm install
npm run build:all
```

4. Ejecute el panel y el API en dos terminales:

```bash
npm run dev
npm --workspace backend run dev
```

## Android

Abra `android/` en Android Studio. Configure estas propiedades en `~/.gradle/gradle.properties` o como variables de entorno; no las confirme al repositorio:

```properties
PRESTAPAY_API_URL=https://api.example.com/
PRESTAPAY_FIREBASE_API_KEY=...
PRESTAPAY_FIREBASE_APP_ID=...
PRESTAPAY_FIREBASE_PROJECT_ID=...
```

La URL debe terminar en `/`. Para el emulador local, el valor predeterminado es `http://10.0.2.2:8080/`. Compile con `gradle :app:assembleDebug` o desde Android Studio.

La app usa autenticación nativa de Firebase con correo/contraseña y conserva la sesión mediante Firebase Auth; solo guarda el identificador del tenant en DataStore. La impresión Bluetooth requiere vincular la impresora en Android y aceptar el permiso de dispositivos cercanos.

## Seguridad y operación

- Asigne el claim `superAdmin: true` únicamente desde un entorno administrativo seguro con Firebase Admin SDK.
- Publique las reglas con Firebase CLI solo después de probarlas contra un proyecto de staging.
- Conecte un proveedor de pagos mediante webhooks firmados para automatizar estados. El endpoint manual de Super Admin sirve para administración controlada, no sustituye un webhook.
- Consulte [arquitectura](docs/ARCHITECTURE.md), [auditoría](docs/AUDIT.md) y [migración](data/migrations/README.md).

No se incluye despliegue ni credenciales de producción.
