import { after, before, beforeEach, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { Timestamp, doc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';

let environment;
const uid = 'legacy-admin-user';

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'prestapay-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'users', uid), { email: 'admin@example.com', role: 'admin' });
  });
});

after(async () => environment?.cleanup());

test('an existing legacy admin profile can create its first tenant atomically', async () => {
  const db = environment.authenticatedContext(uid, { email: 'admin@example.com' }).firestore();
  const tenantId = 'tenant-onboarding';
  const membership = { tenantId, userId: uid, email: 'admin@example.com', displayName: 'Admin', role: 'owner', permissions: { viewHistory: true, manageLoans: true, manageClients: true, manageInventory: true, manageCash: true, manageStaff: true, manageSettings: true }, status: 'active', createdAt: new Date().toISOString() };
  const batch = writeBatch(db);
  batch.set(doc(db, 'tenants', tenantId), { id: tenantId, ownerId: uid, status: 'active', subscription: { status: 'trialing', accessUntil: Timestamp.fromMillis(Date.now() + 14 * 24 * 60 * 60 * 1000) } });
  batch.set(doc(db, 'tenants', tenantId, 'members', uid), membership);
  batch.set(doc(db, 'users', uid, 'memberships', tenantId), membership);
  batch.set(doc(db, 'users', uid), { uid, email: 'admin@example.com', displayName: 'Admin', activeTenantId: tenantId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
  await assertSucceeds(batch.commit());
});

test('a user cannot create a tenant owned by somebody else', async () => {
  const db = environment.authenticatedContext(uid).firestore();
  await assertFails(setDoc(doc(db, 'tenants', 'foreign'), { id: 'foreign', ownerId: 'another-user', status: 'active', subscription: { status: 'trialing', accessUntil: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000) } }));
});
