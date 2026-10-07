export type UserRole = 'admin' | 'tasador' | 'cajero';

export interface UserPermissions {
  verHistorial: boolean;
  modificarPrestamos: boolean;
  modificarClientes: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  permissions: UserPermissions;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  address: string;
  createdAt: string;
}

export type ArticleState = 'en_resguardo' | 'devuelto' | 'vendido';

export interface Article {
  id: string;
  name: string;
  category: string;
  brand: string;
  state: ArticleState;
  contractId?: string;
  clientId?: string;
  description: string;
  createdAt: string;
}

export type LoanType = 'prenda' | 'sin_garantia' | 'hipotecario';
export type LoanStatus = 'activo' | 'atrasado' | 'vencido' | 'pagado';

export interface Loan {
  id: string;
  clientId: string;
  type: LoanType;
  capital: number;
  rate: number;
  installments: number;
  balance: number;
  status: LoanStatus;
  createdAt: string;
  dueDate: string;
  clientName?: string; // For UI convenience
}

export type TransactionType = 'ingreso' | 'egreso';

export interface Transaction {
  id: string;
  contractId?: string;
  type: TransactionType;
  amount: number;
  previousBalance: number;
  newBalance: number;
  createdAt: string;
  description?: string;
}

export interface BusinessConfig {
  businessName: string;
  initialCapital: number;
  notaryData: string;
}

export interface FixedExpense {
  id: string;
  description: string;
  amount: number;
  date: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
