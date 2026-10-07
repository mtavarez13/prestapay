export type TenantRole = 'owner' | 'admin' | 'appraiser' | 'cashier' | 'viewer';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'suspended' | 'canceled' | 'expired';
export type PaperWidth = 58 | 80;

export interface UserPermissions {
  viewHistory: boolean;
  manageLoans: boolean;
  manageClients: boolean;
  manageInventory: boolean;
  manageCash: boolean;
  manageStaff: boolean;
  manageSettings: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  activeTenantId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenantMembership {
  id: string;
  tenantId: string;
  userId: string;
  email: string;
  displayName: string;
  role: TenantRole;
  permissions: UserPermissions;
  status: 'active' | 'invited' | 'disabled';
  createdAt: string;
}

export interface Subscription {
  status: SubscriptionStatus;
  planId: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  accessUntil: Date | string;
  gracePeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  provider?: 'manual' | 'stripe';
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  updatedAt: string;
}

export interface TenantBranding {
  businessName: string;
  legalName: string;
  taxId: string;
  phone: string;
  email: string;
  address: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  currency: string;
  locale: string;
  notaryData: string;
}

export interface PrinterSettings {
  paperWidth: PaperWidth;
  marginMm: number;
  copies: number;
  showLogo: boolean;
  footer: string;
  webPrinterName?: string;
  androidBluetoothAddress?: string;
}

export interface Tenant {
  id: string;
  slug: string;
  ownerId: string;
  status: 'active' | 'suspended' | 'closed';
  branding: TenantBranding;
  printer: PrinterSettings;
  subscription: Subscription;
  createdAt: string;
  updatedAt: string;
}

export interface TenantEntity {
  id: string;
  tenantId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Client extends TenantEntity {
  name: string;
  phone: string;
  address: string;
  identityNumber?: string;
}

export type ArticleState = 'en_resguardo' | 'devuelto' | 'vendido';
export interface Article extends TenantEntity {
  name: string;
  category: string;
  brand: string;
  state: ArticleState;
  contractId?: string;
  clientId?: string;
  description: string;
}

export type LoanType = 'prenda' | 'sin_garantia' | 'hipotecario';
export type LoanStatus = 'activo' | 'atrasado' | 'vencido' | 'pagado';
export interface Loan extends TenantEntity {
  clientId: string;
  clientName?: string;
  type: LoanType;
  capital: number;
  rate: number;
  installments: number;
  balance: number;
  status: LoanStatus;
  dueDate: string;
}

export interface Transaction extends TenantEntity {
  contractId?: string;
  type: 'ingreso' | 'egreso';
  amount: number;
  previousBalance: number;
  newBalance: number;
  description?: string;
}

export interface FixedExpense extends TenantEntity {
  description: string;
  amount: number;
  date: string;
}

export interface ReceiptData {
  number: string;
  issuedAt: string;
  customerName: string;
  description: string;
  amount: number;
  balance?: number;
}

export enum OperationType { CREATE = 'create', UPDATE = 'update', DELETE = 'delete', LIST = 'list', GET = 'get', WRITE = 'write' }
export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: { userId?: string; email?: string | null };
}
