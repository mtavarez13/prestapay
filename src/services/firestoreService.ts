import { DocumentData, FirestoreError, QueryConstraint, addDoc, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { OperationType, FirestoreErrorInfo, Tenant, TenantMembership } from '../types';

const TENANT_COLLECTIONS = new Set(['clients', 'articles', 'loans', 'transactions', 'fixedExpenses', 'auditLogs', 'receipts']);

function fail(error: unknown, operationType: OperationType, path: string): never {
  const info: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error), operationType, path,
    authInfo: { userId: auth.currentUser?.uid, email: auth.currentUser?.email },
  };
  console.error('Firestore operation failed', info);
  throw new Error(JSON.stringify(info));
}

function tenantPath(tenantId: string, collectionName: string): string {
  if (!tenantId || !TENANT_COLLECTIONS.has(collectionName)) throw new Error('Ruta multiempresa inválida.');
  return `tenants/${tenantId}/${collectionName}`;
}

export const firestoreService = {
  async getDocument<T>(path: string, id: string): Promise<T | null> {
    try {
      const snapshot = await getDoc(doc(db, path, id));
      return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as T) : null;
    } catch (error) { return fail(error, OperationType.GET, `${path}/${id}`); }
  },
  async getTenant(tenantId: string): Promise<Tenant | null> { return this.getDocument('tenants', tenantId) as Promise<Tenant | null>; },
  async getTenantCollection<T>(tenantId: string, name: string, constraints: QueryConstraint[] = []): Promise<T[]> {
    const path = tenantPath(tenantId, name);
    try {
      const snapshot = await getDocs(query(collection(db, path), ...constraints));
      return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as T));
    } catch (error) { return fail(error, OperationType.LIST, path); }
  },
  subscribeToTenantCollection<T>(tenantId: string, name: string, callback: (data: T[]) => void) {
    const path = tenantPath(tenantId, name);
    return onSnapshot(collection(db, path), (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as T))),
      (error: FirestoreError) => fail(error, OperationType.LIST, path));
  },
  async addTenantDocument<T extends DocumentData>(tenantId: string, name: string, data: T): Promise<string> {
    const path = tenantPath(tenantId, name);
    try {
      const item = await addDoc(collection(db, path), { ...data, tenantId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      return item.id;
    } catch (error) { return fail(error, OperationType.CREATE, path); }
  },
  async updateTenantDocument<T extends DocumentData>(tenantId: string, name: string, id: string, data: Partial<T>) {
    const path = `${tenantPath(tenantId, name)}/${id}`;
    try { await updateDoc(doc(db, path), { ...data, tenantId, updatedAt: serverTimestamp() }); }
    catch (error) { fail(error, OperationType.UPDATE, path); }
  },
  async deleteTenantDocument(tenantId: string, name: string, id: string) {
    const path = `${tenantPath(tenantId, name)}/${id}`;
    try { await deleteDoc(doc(db, path)); } catch (error) { fail(error, OperationType.DELETE, path); }
  },
  async listMemberships(userId: string): Promise<TenantMembership[]> {
    const path = `users/${userId}/memberships`;
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as TenantMembership));
    } catch (error) { return fail(error, OperationType.LIST, path); }
  },
  async createTenant(tenant: Tenant, membership: TenantMembership): Promise<void> {
    const user = auth.currentUser;
    if (!user || user.uid !== tenant.ownerId || membership.userId !== user.uid) throw new Error('Alta de empresa no autorizada.');
    const batch = writeBatch(db);
    batch.set(doc(db, 'tenants', tenant.id), tenant);
    batch.set(doc(db, 'tenants', tenant.id, 'members', user.uid), membership);
    batch.set(doc(db, 'users', user.uid, 'memberships', tenant.id), membership);
    batch.set(doc(db, 'users', user.uid), { uid: user.uid, email: user.email ?? '', displayName: user.displayName ?? '', activeTenantId: tenant.id, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
    await batch.commit();
  },
  async updateTenant(tenantId: string, data: Partial<Tenant>): Promise<void> {
    try { await updateDoc(doc(db, 'tenants', tenantId), { ...data, updatedAt: new Date().toISOString() }); }
    catch (error) { fail(error, OperationType.UPDATE, `tenants/${tenantId}`); }
  },
  async setDocument<T extends DocumentData>(path: string, id: string, data: T): Promise<void> {
    try { await setDoc(doc(db, path, id), data, { merge: true }); }
    catch (error) { fail(error, OperationType.WRITE, `${path}/${id}`); }
  },
};
