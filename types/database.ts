// types/database.ts
// Database types for multi-tenant mobile POS system based on Supabase schema

export type UserRole = 'owner' | 'manager';

export type User = {
  id: string; // UUID
  full_name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string | null;
};

export type BankNames = {
  bkash?: string;
  nagad?: string;
  rocket?: string;
  upay?: string;
  card?: string;
  bank_transfer?: string;
};

export type Organization = {
  id: string; // UUID
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  tax_id?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  bank_names?: BankNames | null;
};

export type UserOrganization = {
  id: string; // UUID
  user_id: string;
  organization_id: string;
  role: UserRole;
  created_at: string;
};

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export type Account = {
  id: string; // UUID
  name: string;
  type: AccountType;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  organization_id: string;
};

export type Customer = {
  id: number;
  name: string;
  phone_number?: string | null;
  email?: string | null;
  address?: string | null;
  dues: number;
  created_at: string;
  updated_at: string;
  organization_id: string;
};

export type Supplier = {
  id: string; // UUID
  name: string;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  owner: string; // UUID
  created_at: string;
  updated_at: string;
  organization_id: string;
};

export type Purchase = {
  id: number; // bigint in DB, but JS number is usually enough for IDs
  supplier?: string | null;
  product_name?: string | null;
  model_number?: string | null;
  category?: string | null;
  brand?: string | null;
  cost_price?: number | null;
  sale_price?: number | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
  supplier_id?: string | null;
  organization_id: string;
};

export type ColorVariant = {
  id: number; // bigint
  purchase_id: number;
  color?: string | null;
  barcode?: string | null;
  imei?: string | null;
  quantity: number;
  created_at: string;
  updated_at: string;
  organization_id: string;
};

export type Inventory = {
  barcode: string;
  purchase_id?: number | null;
  product_name: string;
  model_number?: string | null;
  category?: string | null;
  brand?: string | null;
  supplier?: string | null;
  cost_price?: number | null;
  sale_price?: number | null;
  description?: string | null;
  color?: string | null;
  quantity: number;
  imei?: string | null;
  created_at: string;
  updated_at: string;
  unit_price?: number | null;
  organization_id: string;
};

export type ExpenseCategory = 
  | 'party_payment' | 'salaries' | 'printer_papers' | 'water_bill' 
  | 'mobile_bill' | 'internet_bill' | 'land_bill' | 'bank_charge' 
  | 'entertainment' | 'shopping_bag' | 'other' | 'office_supplies';

export type PaymentMethod = 'cash' | 'card' | 'mobile_banking' | 'bank_transfer';

export type Expense = {
  id: string; // UUID
  date: string;
  category: ExpenseCategory;
  custom_category?: string | null;
  description: string;
  amount: number;
  payment_method: PaymentMethod;
  reference: string;
  notes?: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  supplier_id?: string | null;
  organization_id: string;
};

export type IncomeOwner = {
  id: string; // UUID
  date: string;
  income_type: 'owner_income' | 'party_income';
  amount: number;
  destination_type: 'cash' | 'bank';
  description?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  supplier_id?: string | null;
  organization_id: string;
};

export type Sale = {
  id: number;
  sale_date: string;
  subtotal: number;
  total_discount: number;
  total_amount: number;
  cash_received: number;
  card_received: number;
  mobile_banking_received: number;
  bank_transfer_received: number;
  total_received: number;
  change_amount: number;
  payment_method?: string | null;
  status: string;
  notes?: string | null;
  created_at: string;
  invoice_number?: string | null;
  previous_dues: number;
  net_amount?: number | null;
  due_amount?: number | null;
  card_bank?: string | null;
  bank_transfer_bank?: string | null;
  bkash_received?: number | null;
  nagad_received?: number | null;
  rocket_received?: number | null;
  upay_received?: number | null;
  organization_id: string;
};

export type SoldProduct = {
  id: number;
  sales_id: number;
  barcode?: number | null;
  product_name: string;
  model_number?: string | null;
  color?: string | null;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  discount_amount: number;
  total_price: number;
  cost_price?: number | null;
  brand?: string | null;
  category?: string | null;
  organization_id: string;
};

export type SaleCustomer = {
  id: number;
  sales_id: number;
  customer_id: number;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  organization_id: string;
};

export type SalesReturn = {
  id: number;
  return_date: string;
  original_sale_id?: number | null;
  customer_id?: number | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  return_reason: string;
  total_refund_amount: number;
  refund_method?: string | null;
  status: string;
  notes?: string | null;
  processed_by?: string | null;
  created_at: string;
  updated_at: string;
  organization_id: string;
};

export type SalesReturnItem = {
  id: number;
  return_id?: number | null;
  original_sold_product_id?: number | null;
  barcode?: string | null;
  product_name: string;
  model_number?: string | null;
  color?: string | null;
  quantity: number;
  unit_price: number;
  total_refund_amount: number;
  condition: string;
  restock: boolean;
  organization_id: string;
};

export type Ledger = {
  id: number;
  entry_date: string;
  entry_type: string;
  description?: string | null;
  amount: number;
  method?: string | null;
  ref?: string | null;
  created_at: string;
  organization_id: string;
};

export type LedgerEntry = {
  id: string; // UUID
  date: string;
  description: string;
  account: string;
  debit: number;
  credit: number;
  balance: number;
  reference?: string | null;
  type: 'sales' | 'purchase' | 'expense' | 'income' | 'transfer';
  created_at: string;
  updated_at: string;
  organization_id: string;
};

export type DayCashbookEntry = {
  id: number;
  date: string;
  particular: string;
  dr_amount: number;
  cr_amount: number;
  created_at: string;
  updated_at: string;
  is_auto_generated: boolean;
  source_type?: string | null;
  organization_id: string;
};

export type PurchaseReturn = {
  id: number;
  original_purchase_id?: number | null;
  supplier: string;
  return_reason: string;
  credit_method: string;
  notes?: string | null;
  return_date: string;
  total_credit_amount?: number | null;
  status: string;
  created_at: string;
  updated_at: string;
  organization_id: string;
};

export type PurchaseReturnItem = {
  id: number;
  purchase_return_id: number;
  barcode: string;
  product_name: string;
  model_number?: string | null;
  color?: string | null;
  return_quantity: number;
  unit_cost: number;
  total_credit_amount?: number | null;
  condition?: string | null;
  original_color_variant_barcode?: string | null;
  created_at: string;
  organization_id: string;
};

// Permission types
export type Permission = 
  | 'pos_access' | 'sales_view' | 'sales_delete' | 'inventory_view' 
  | 'inventory_add_edit' | 'inventory_delete' | 'products_view' 
  | 'products_add_edit' | 'products_delete' | 'customers_view' 
  | 'customers_manage' | 'expenses_view' | 'expenses_add' 
  | 'expenses_delete' | 'income_view' | 'income_add' | 'income_delete' 
  | 'returns_process' | 'analytics_view' | 'cashbook_view' | 'cashbook_edit' 
  | 'bank_info_view' | 'bank_info_edit' | 'ledger_view' | 'ledger_edit' 
  | 'settings_view' | 'settings_edit' | 'users_view' | 'users_manage' 
  | 'backup_create' | 'backup_restore' | 'print_all';

// Permission sets by role
export const RolePermissions: Record<UserRole, Permission[]> = {
  owner: [
    'pos_access', 'sales_view', 'sales_delete', 'inventory_view', 
    'inventory_add_edit', 'inventory_delete', 'products_view', 
    'products_add_edit', 'products_delete', 'customers_view', 
    'customers_manage', 'expenses_view', 'expenses_add', 'expenses_delete', 
    'income_view', 'income_add', 'income_delete', 'returns_process', 
    'analytics_view', 'cashbook_view', 'cashbook_edit', 'bank_info_view', 
    'bank_info_edit', 'ledger_view', 'ledger_edit', 'settings_view', 
    'settings_edit', 'users_view', 'users_manage', 'backup_create', 
    'backup_restore', 'print_all',
  ],
  manager: [
    'pos_access', 'sales_view', 'inventory_view', 'inventory_add_edit', 
    'products_view', 'products_add_edit', 'customers_view', 'customers_manage', 
    'expenses_view', 'expenses_add', 'income_view', 'income_add', 
    'returns_process', 'analytics_view', 'cashbook_view', 'bank_info_view', 
    'ledger_view', 'backup_create', 'print_all',
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return RolePermissions[role].includes(permission);
}

// Database insert types
export type UserInsert = Omit<User, 'id' | 'created_at' | 'updated_at' | 'last_login'>;
export type OrganizationInsert = Omit<Organization, 'id' | 'created_at' | 'updated_at'>;
export type UserOrganizationInsert = Omit<UserOrganization, 'id' | 'created_at'>;
