import { app } from './app.js';
import express from 'express';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../dist');
if (existsSync(webRoot)) {
  app.use(express.static(webRoot, { index: 'index.html', maxAge: '1h' }));
  app.get('/{*path}', (req, res, next) => req.path.startsWith('/v1/') ? next() : res.sendFile(resolve(webRoot, 'index.html')));
}

const port = Number(process.env.PORT || 8080);
app.listen(port, () => console.log(`PrestaPay API listening on ${port}`));
