# Despliegue web en Hostinger

La aplicación se entrega como un proyecto Node.js: Vite compila React y Express sirve tanto la web como `/v1` bajo el mismo dominio. Nunca incluya credenciales Admin de Firebase en el ZIP.

## Construcción

Para un único despliegue no defina `VITE_API_URL`; el navegador utilizará el mismo origen. Ejecute:

```bash
npm ci
npm run build:hostinger
```

Suba el código fuente como aplicación Node.js, excluyendo `node_modules/`, `dist/`, `backend/dist/`, `.git/`, Android y archivos locales. Hostinger debe ejecutar `npm run build:hostinger` y luego `npm start` con Node.js 22.

Configure en Hostinger las variables `FIREBASE_PROJECT_ID`, `FIRESTORE_DATABASE_ID`, `FIREBASE_SERVICE_ACCOUNT_JSON` y `CORS_ORIGINS`. `FIREBASE_SERVICE_ACCOUNT_JSON` contiene el JSON completo en una sola línea y nunca debe guardarse en Git.

## Firebase Authentication

El dominio final debe figurar en Firebase Authentication → Settings → Authorized domains. El proveedor Google está habilitado y actualmente están autorizados `presta.hispaniolapay.com` y `prestapay.hispaniolapay.com`, además de los dominios propios de Firebase y localhost.

## Verificación

Después de publicar, compruebe la portada, el acceso Google, una ruta interna recargada directamente y la conexión con `/health` del API. Si Hostinger sirve una versión anterior, limpie la caché desde hPanel.
