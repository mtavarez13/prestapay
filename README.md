# PrestaPay

PrestaPay es una plataforma SaaS multiempresa para casas de empeño y negocios de préstamos. El repositorio contiene:

Proyecto Firebase configurado: `prestamo-27ccb` (número `1098192394227`).

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

1. La configuración local de `PrestaPay Web` está en `.env.local` (ignorada por Git). Para otro entorno, copie `.env.example` y reemplace las variables `VITE_*`.
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

Abra `android/` en Android Studio. La configuración local está en `android/firebase.properties` (ignorada por Git). Para otro entorno, configure estas propiedades allí, en Gradle o como variables de entorno:

```properties
PRESTAPAY_API_URL=https://api.example.com/
PRESTAPAY_FIREBASE_API_KEY=...
PRESTAPAY_FIREBASE_APP_ID=...
PRESTAPAY_FIREBASE_PROJECT_ID=...
```

La URL debe terminar en `/`. Para el emulador local, el valor predeterminado es `http://10.0.2.2:8080/`. Compile con `gradle :app:assembleDebug` o desde Android Studio.

La app usa autenticación nativa de Firebase con correo/contraseña o Google mediante Credential Manager y conserva la sesión mediante Firebase Auth; solo guarda el identificador del tenant en DataStore. La impresión Bluetooth requiere vincular la impresora en Android y aceptar el permiso de dispositivos cercanos.

La huella SHA-1 del keystore de desarrollo está registrada en Firebase. Antes de publicar en Play Store, registre también las huellas SHA-1/SHA-256 del keystore release o de Play App Signing.

El APK de desarrollo se genera en `android/app/build/outputs/apk/debug/app-debug.apk`. Para conectarlo fuera del emulador, reemplace `PRESTAPAY_API_URL` por una URL HTTPS alcanzable antes de compilar.

## Seguridad y operación

- La cuenta verificada `martin.tavarez.gomez@gmail.com` es el Super Admin principal. Cuentas adicionales deben configurarse con `SUPER_ADMIN_EMAILS` en el API y mediante el claim `superAdmin: true` desde Firebase Admin SDK.
- Publique las reglas con Firebase CLI solo después de probarlas contra un proyecto de staging.
- Conecte un proveedor de pagos mediante webhooks firmados para automatizar estados. El endpoint manual de Super Admin sirve para administración controlada, no sustituye un webhook.
- Consulte [arquitectura](docs/ARCHITECTURE.md), [auditoría](docs/AUDIT.md) y [migración](data/migrations/README.md).
- Consulte también el [contrato resumido del API](docs/API.md).
- Para publicar la interfaz estática consulte la [guía de Hostinger](docs/HOSTINGER.md).

No se incluye despliegue ni credenciales de producción.
