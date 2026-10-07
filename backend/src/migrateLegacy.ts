import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './firebase.js';

const tenantId = process.env.MIGRATION_TENANT_ID;
const apply = process.env.APPLY_MIGRATION === 'true';
if (!tenantId) throw new Error('MIGRATION_TENANT_ID es obligatorio.');
const tenant = await adminDb.doc(`tenants/${tenantId}`).get();
if (!tenant.exists) throw new Error(`El tenant ${tenantId} no existe.`);

const mapping = new Map([
  ['clientes', 'clients'], ['articulos', 'articles'], ['contratos_empeno', 'loans'],
  ['transacciones_caja', 'transactions'], ['gastos_fijos', 'fixedExpenses'],
]);

for (const [legacy, target] of mapping) {
  const snapshot = await adminDb.collection(legacy).get();
  console.log(`${legacy}: ${snapshot.size} documentos -> tenants/${tenantId}/${target}`);
  if (!apply || snapshot.empty) continue;
  for (let start = 0; start < snapshot.docs.length; start += 400) {
    const batch = adminDb.batch();
    for (const source of snapshot.docs.slice(start, start + 400)) {
      batch.set(adminDb.doc(`tenants/${tenantId}/${target}/${source.id}`), { ...source.data(), tenantId, legacyPath: source.ref.path, migratedAt: FieldValue.serverTimestamp() }, { merge: false });
    }
    await batch.commit();
  }
}
console.log(apply ? 'Migración terminada. Los datos originales NO fueron eliminados.' : 'Simulación terminada. Use APPLY_MIGRATION=true después de revisar.');
