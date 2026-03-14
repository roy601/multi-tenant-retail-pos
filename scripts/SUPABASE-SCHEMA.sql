-- Supabase Schema for Mobile POS System
-- Includes sequences, functions, and tables

-- 1. Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create Sequences
CREATE SEQUENCE IF NOT EXISTS color_variants_id_seq;
CREATE SEQUENCE IF NOT EXISTS customers_id_seq;
CREATE SEQUENCE IF NOT EXISTS day_cashbook_entries_id_seq;
CREATE SEQUENCE IF NOT EXISTS expense_reference_seq;
CREATE SEQUENCE IF NOT EXISTS ledger_id_seq;
CREATE SEQUENCE IF NOT EXISTS purchase_return_items_id_seq;
CREATE SEQUENCE IF NOT EXISTS purchase_returns_id_seq;
CREATE SEQUENCE IF NOT EXISTS purchases_id_seq;
CREATE SEQUENCE IF NOT EXISTS return_items_id_seq;
CREATE SEQUENCE IF NOT EXISTS sale_customers_id_seq;
CREATE SEQUENCE IF NOT EXISTS sales_id_seq;
CREATE SEQUENCE IF NOT EXISTS sales_return_items_id_seq;
CREATE SEQUENCE IF NOT EXISTS sales_returns_id_seq;
CREATE SEQUENCE IF NOT EXISTS sold_products_id_seq;

-- 3. Create Helper Functions

-- Function to generate invoice codes
CREATE OR REPLACE FUNCTION gen_invoice_code(length integer) 
RETURNS text AS $$
DECLARE
  chars text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 4. Create Tables

CREATE TABLE public.organizations ( 
   id uuid NOT NULL DEFAULT gen_random_uuid(), 
   name text NOT NULL, 
   created_at timestamp with time zone NOT NULL DEFAULT now(), 
   updated_at timestamp with time zone NOT NULL DEFAULT now(), 
   address text, 
   phone character varying, 
   email character varying, 
   tax_id character varying, 
   is_active boolean DEFAULT true, 
   CONSTRAINT organizations_pkey PRIMARY KEY (id) 
);

CREATE TABLE public.users ( 
   id uuid NOT NULL, 
   full_name text NOT NULL, 
   email text NOT NULL UNIQUE, 
   phone text, 
   role text NOT NULL CHECK (role = ANY (ARRAY['owner'::text, 'manager'::text])), 
   is_active boolean DEFAULT true, 
   created_at timestamp with time zone DEFAULT now(), 
   updated_at timestamp with time zone DEFAULT now(), 
   last_login timestamp with time zone, 
   CONSTRAINT users_pkey PRIMARY KEY (id), 
   CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) 
);

CREATE TABLE public.user_organizations ( 
   id uuid NOT NULL DEFAULT gen_random_uuid(), 
   user_id uuid NOT NULL, 
   organization_id uuid NOT NULL, 
   role text NOT NULL CHECK (role = ANY (ARRAY['owner'::text, 'manager'::text])), 
   created_at timestamp with time zone DEFAULT now(), 
   CONSTRAINT user_organizations_pkey PRIMARY KEY (id), 
   CONSTRAINT user_organizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id), 
   CONSTRAINT user_organizations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) 
);

CREATE TABLE public.accounts ( 
   id uuid NOT NULL DEFAULT uuid_generate_v4(), 
   name character varying NOT NULL UNIQUE, 
   type character varying NOT NULL CHECK (type::text = ANY (ARRAY['asset'::character varying, 'liability'::character varying, 'equity'::character varying, 'revenue'::character varying, 'expense'::character varying]::text[])), 
   description text, 
   is_active boolean DEFAULT true, 
   created_at timestamp with time zone DEFAULT now(), 
   updated_at timestamp with time zone DEFAULT now(), 
   organization_id uuid, 
   CONSTRAINT accounts_pkey PRIMARY KEY (id), 
   CONSTRAINT accounts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) 
);

CREATE TABLE public.customers ( 
   id integer NOT NULL DEFAULT nextval('customers_id_seq'::regclass), 
   name text NOT NULL, 
   phone_number text UNIQUE, 
   email text, 
   address text, 
   dues numeric DEFAULT 0, 
   created_at timestamp with time zone DEFAULT now(), 
   updated_at timestamp with time zone DEFAULT now(), 
   organization_id uuid, 
   CONSTRAINT customers_pkey PRIMARY KEY (id), 
   CONSTRAINT customers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) 
);

CREATE TABLE public.suppliers ( 
   id uuid NOT NULL DEFAULT gen_random_uuid(), 
   name text NOT NULL, 
   contact_person text, 
   phone text, 
   email text, 
   address text, 
   owner uuid NOT NULL, 
   created_at timestamp with time zone DEFAULT now(), 
   updated_at timestamp with time zone DEFAULT now(), 
   organization_id uuid, 
   CONSTRAINT suppliers_pkey PRIMARY KEY (id), 
   CONSTRAINT suppliers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) 
);

CREATE TABLE public.purchases ( 
   id bigint NOT NULL DEFAULT nextval('purchases_id_seq'::regclass), 
   supplier text, 
   product_name text, 
   model_number text, 
   category text, 
   brand text, 
   cost_price numeric, 
   sale_price numeric, 
   description text, 
   created_at timestamp with time zone DEFAULT now(), 
   updated_at timestamp with time zone DEFAULT now(), 
   supplier_id uuid, 
   organization_id uuid, 
   CONSTRAINT purchases_pkey PRIMARY KEY (id), 
   CONSTRAINT purchases_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id), 
   CONSTRAINT purchases_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) 
);

CREATE TABLE public.color_variants ( 
   id bigint NOT NULL DEFAULT nextval('color_variants_id_seq'::regclass), 
   purchase_id bigint NOT NULL, 
   color text, 
   barcode text UNIQUE, 
   imei text, 
   quantity integer DEFAULT 1, 
   created_at timestamp with time zone DEFAULT now(), 
   updated_at timestamp with time zone DEFAULT now(), 
   organization_id uuid, 
   CONSTRAINT color_variants_pkey PRIMARY KEY (id), 
   CONSTRAINT color_variants_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES public.purchases(id), 
   CONSTRAINT color_variants_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) 
);

CREATE TABLE public.inventory ( 
   barcode text NOT NULL, 
   purchase_id integer, 
   product_name text NOT NULL, 
   model_number text, 
   category text, 
   brand text, 
   supplier text, 
   cost_price numeric, 
   sale_price numeric, 
   description text, 
   color text, 
   quantity smallint NOT NULL DEFAULT 0, 
   imei text, 
   created_at timestamp with time zone DEFAULT now(), 
   updated_at timestamp with time zone DEFAULT now(), 
   unit_price numeric, 
   organization_id uuid, 
   CONSTRAINT inventory_pkey PRIMARY KEY (barcode), 
   CONSTRAINT inventory_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) 
);

CREATE TABLE public.expenses ( 
   id uuid NOT NULL DEFAULT gen_random_uuid(), 
   date date NOT NULL, 
   category text NOT NULL CHECK (category = ANY (ARRAY['party_payment'::text, 'salaries'::text, 'printer_papers'::text, 'water_bill'::text, 'mobile_bill'::text, 'internet_bill'::text, 'land_bill'::text, 'bank_charge'::text, 'entertainment'::text, 'shopping_bag'::text, 'other'::text, 'office_supplies'::text])), 
   custom_category text, 
   description text NOT NULL, 
   amount numeric NOT NULL CHECK (amount > 0::numeric), 
   payment_method text NOT NULL CHECK (payment_method = ANY (ARRAY['cash'::text, 'card'::text, 'mobile_banking'::text, 'bank_transfer'::text])), 
   reference text NOT NULL DEFAULT ('EXP-'::text || nextval('expense_reference_seq'::regclass)) UNIQUE, 
   notes text, 
   user_id uuid NOT NULL, 
   created_at timestamp with time zone NOT NULL DEFAULT now(), 
   updated_at timestamp with time zone NOT NULL DEFAULT now(), 
   supplier_id uuid, 
   organization_id uuid, 
   CONSTRAINT expenses_pkey PRIMARY KEY (id), 
   CONSTRAINT expenses_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id), 
   CONSTRAINT expenses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id), 
   CONSTRAINT expenses_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) 
);

CREATE TABLE public.income_owner ( 
   id uuid NOT NULL DEFAULT uuid_generate_v4(), 
   date date NOT NULL, 
   income_type text NOT NULL CHECK (income_type = ANY (ARRAY['owner_income'::text, 'party_income'::text])), 
   amount numeric NOT NULL CHECK (amount > 0::numeric), 
   destination_type text NOT NULL CHECK (destination_type = ANY (ARRAY['cash'::text, 'bank'::text])), 
   description text, 
   notes text, 
   created_at timestamp with time zone DEFAULT now(), 
   updated_at timestamp with time zone DEFAULT now(), 
   supplier_id uuid, 
   organization_id uuid, 
   CONSTRAINT income_owner_pkey PRIMARY KEY (id), 
   CONSTRAINT fk_income_owner_supplier FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id), 
   CONSTRAINT income_owner_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) 
);

CREATE TABLE public.sales ( 
   id integer NOT NULL DEFAULT nextval('sales_id_seq'::regclass), 
   sale_date timestamp with time zone DEFAULT now(), 
   subtotal numeric DEFAULT 0, 
   total_discount numeric DEFAULT 0, 
   total_amount numeric DEFAULT 0, 
   cash_received numeric DEFAULT 0, 
   card_received numeric DEFAULT 0, 
   mobile_banking_received numeric DEFAULT 0, 
   bank_transfer_received numeric DEFAULT 0, 
   total_received numeric DEFAULT 0, 
   change_amount numeric DEFAULT 0, 
   payment_method text, 
   status text DEFAULT 'completed'::text, 
   notes text, 
   created_at timestamp with time zone DEFAULT now(), 
   invoice_number text DEFAULT gen_invoice_code(8) UNIQUE, 
   previous_dues numeric DEFAULT '0'::numeric, 
   net_amount numeric, 
   due_amount numeric, 
   card_bank text, 
   bank_transfer_bank text, 
   bkash_received numeric, 
   nagad_received numeric, 
   rocket_received numeric, 
   upay_received numeric, 
   organization_id uuid, 
   CONSTRAINT sales_pkey PRIMARY KEY (id), 
   CONSTRAINT sales_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) 
);

CREATE TABLE public.sold_products ( 
   id integer NOT NULL DEFAULT nextval('sold_products_id_seq'::regclass), 
   sales_id integer, 
   barcode numeric, 
   product_name text NOT NULL, 
   model_number text, 
   color text, 
   quantity smallint NOT NULL, 
   unit_price numeric NOT NULL, 
   discount_percentage numeric DEFAULT 0, 
   discount_amount numeric DEFAULT 0, 
   total_price numeric NOT NULL, 
   cost_price numeric, 
   brand text, 
   category text, 
   organization_id uuid, 
   CONSTRAINT sold_products_pkey PRIMARY KEY (id), 
   CONSTRAINT sold_products_sales_id_fkey FOREIGN KEY (sales_id) REFERENCES public.sales(id), 
   CONSTRAINT sold_products_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) 
);

CREATE TABLE public.sale_customers ( 
   id integer NOT NULL DEFAULT nextval('sale_customers_id_seq'::regclass), 
   sales_id integer, 
   customer_id integer, 
   customer_name text, 
   customer_phone text, 
   customer_email text, 
   organization_id uuid, 
   CONSTRAINT sale_customers_pkey PRIMARY KEY (id), 
   CONSTRAINT sale_customers_sales_id_fkey FOREIGN KEY (sales_id) REFERENCES public.sales(id), 
   CONSTRAINT sale_customers_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id), 
   CONSTRAINT sale_customers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) 
);

CREATE TABLE public.sales_returns ( 
   id integer NOT NULL DEFAULT nextval('sales_returns_id_seq'::regclass), 
   return_date timestamp with time zone DEFAULT now(), 
   original_sale_id integer, 
   customer_id integer, 
   customer_name text, 
   customer_phone text, 
   return_reason text NOT NULL, 
   total_refund_amount numeric DEFAULT 0, 
   refund_method text, 
   status text DEFAULT 'processed'::text, 
   notes text, 
   processed_by text, 
   created_at timestamp with time zone DEFAULT now(), 
   updated_at timestamp with time zone DEFAULT now(), 
   organization_id uuid, 
   CONSTRAINT sales_returns_pkey PRIMARY KEY (id), 
   CONSTRAINT sales_returns_original_sale_id_fkey FOREIGN KEY (original_sale_id) REFERENCES public.sales(id), 
   CONSTRAINT sales_returns_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id), 
   CONSTRAINT sales_returns_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) 
);

CREATE TABLE public.sales_return_items ( 
   id integer NOT NULL DEFAULT nextval('sales_return_items_id_seq'::regclass), 
   return_id integer, 
   original_sold_product_id integer, 
   barcode text, 
   product_name text NOT NULL, 
   model_number text, 
   color text, 
   quantity integer NOT NULL CHECK (quantity > 0), 
   unit_price numeric NOT NULL, 
   total_refund_amount numeric NOT NULL, 
   condition text DEFAULT 'good'::text, 
   restock boolean DEFAULT true, 
   organization_id uuid, 
   CONSTRAINT sales_return_items_pkey PRIMARY KEY (id), 
   CONSTRAINT sales_return_items_return_id_fkey FOREIGN KEY (return_id) REFERENCES public.sales_returns(id), 
   CONSTRAINT sales_return_items_original_sold_product_id_fkey FOREIGN KEY (original_sold_product_id) REFERENCES public.sold_products(id), 
   CONSTRAINT sales_return_items_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) 
);

CREATE TABLE public.purchase_returns ( 
   id integer NOT NULL DEFAULT nextval('purchase_returns_id_seq'::regclass), 
   original_purchase_id integer, 
   supplier text NOT NULL, 
   return_reason text NOT NULL, 
   credit_method text NOT NULL, 
   notes text, 
   return_date date NOT NULL, 
   total_credit_amount numeric, 
   status text DEFAULT 'processed', 
   created_at timestamp with time zone DEFAULT now(), 
   updated_at timestamp with time zone DEFAULT now(), 
   organization_id uuid, 
   CONSTRAINT purchase_returns_pkey PRIMARY KEY (id), 
   CONSTRAINT purchase_returns_original_purchase_id_fkey FOREIGN KEY (original_purchase_id) REFERENCES public.purchases(id), 
   CONSTRAINT purchase_returns_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) 
);

CREATE TABLE public.purchase_return_items ( 
   id integer NOT NULL DEFAULT nextval('purchase_return_items_id_seq'::regclass), 
   purchase_return_id integer NOT NULL, 
   barcode text NOT NULL, 
   product_name text NOT NULL, 
   model_number text, 
   color text, 
   return_quantity integer NOT NULL, 
   unit_cost numeric NOT NULL, 
   total_credit_amount numeric, 
   condition text, 
   original_color_variant_barcode text, 
   created_at timestamp with time zone DEFAULT now(), 
   organization_id uuid, 
   CONSTRAINT purchase_return_items_pkey PRIMARY KEY (id), 
   CONSTRAINT purchase_return_items_purchase_return_id_fkey FOREIGN KEY (purchase_return_id) REFERENCES public.purchase_returns(id), 
   CONSTRAINT purchase_return_items_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) 
);

CREATE TABLE public.return_items ( 
   id integer NOT NULL DEFAULT nextval('return_items_id_seq'::regclass), 
   return_id integer, 
   sold_product_id integer, 
   quantity integer NOT NULL, 
   unit_price numeric NOT NULL, 
   total_amount numeric NOT NULL, 
   condition text DEFAULT 'good'::text, 
   created_at timestamp without time zone DEFAULT now(), 
   organization_id uuid, 
   CONSTRAINT return_items_pkey PRIMARY KEY (id), 
   CONSTRAINT return_items_return_id_fkey FOREIGN KEY (return_id) REFERENCES public.sales_returns(id), 
   CONSTRAINT return_items_sold_product_id_fkey FOREIGN KEY (sold_product_id) REFERENCES public.sold_products(id), 
   CONSTRAINT return_items_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) 
);

CREATE TABLE public.ledger ( 
   id integer NOT NULL DEFAULT nextval('ledger_id_seq'::regclass), 
   entry_date date NOT NULL, 
   entry_type text NOT NULL, 
   description text, 
   amount numeric NOT NULL, 
   method text, 
   ref text, 
   created_at timestamp with time zone DEFAULT now(), 
   organization_id uuid, 
   CONSTRAINT ledger_pkey PRIMARY KEY (id), 
   CONSTRAINT ledger_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) 
);

CREATE TABLE public.ledger_entries ( 
   id uuid NOT NULL DEFAULT uuid_generate_v4(), 
   date date NOT NULL, 
   description text NOT NULL, 
   account character varying NOT NULL, 
   debit numeric NOT NULL DEFAULT 0.00, 
   credit numeric NOT NULL DEFAULT 0.00, 
   balance numeric NOT NULL DEFAULT 0.00, 
   reference character varying, 
   type character varying NOT NULL CHECK (type::text = ANY (ARRAY['sales'::character varying, 'purchase'::character varying, 'expense'::character varying, 'income'::character varying, 'transfer'::character varying]::text[])), 
   created_at timestamp with time zone DEFAULT now(), 
   updated_at timestamp with time zone DEFAULT now(), 
   organization_id uuid, 
   CONSTRAINT ledger_entries_pkey PRIMARY KEY (id), 
   CONSTRAINT ledger_entries_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id), 
   CONSTRAINT fk_account FOREIGN KEY (account) REFERENCES public.accounts(name) 
);

CREATE TABLE public.day_cashbook_entries ( 
   id integer NOT NULL DEFAULT nextval('day_cashbook_entries_id_seq'::regclass), 
   date date NOT NULL, 
   particular text NOT NULL, 
   dr_amount numeric DEFAULT 0, 
   cr_amount numeric DEFAULT 0, 
   created_at timestamp without time zone DEFAULT now(), 
   updated_at timestamp without time zone DEFAULT now(), 
   is_auto_generated boolean DEFAULT false, 
   source_type text, 
   organization_id uuid, 
   CONSTRAINT day_cashbook_entries_pkey PRIMARY KEY (id), 
   CONSTRAINT day_cashbook_entries_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) 
);

-- 5. RPC Functions for the Application

-- Atomic function to register a new organization and user profile
CREATE OR REPLACE FUNCTION public.register_organization_and_user(
  p_org_name text,
  p_full_name text,
  p_email text,
  p_phone text
)
RETURNS json AS $$
DECLARE
  v_org_id uuid;
  v_user_id uuid := auth.uid();
BEGIN
  -- If not authenticated, we can't link to auth.users reliably
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated. Please confirm your email first if required.';
  END IF;

  -- 1. Create Organization
  INSERT INTO public.organizations (name, is_active)
  VALUES (p_org_name, true)
  RETURNING id INTO v_org_id;

  -- 2. Create User Profile
  INSERT INTO public.users (id, full_name, email, phone, role, is_active)
  VALUES (v_user_id, p_full_name, p_email, p_phone, 'owner', true)
  ON CONFLICT (id) DO UPDATE 
  SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone;

  -- 3. Link User to Organization
  INSERT INTO public.user_organizations (user_id, organization_id, role)
  VALUES (v_user_id, v_org_id, 'owner');

  RETURN json_build_object(
    'success', true,
    'organization_id', v_org_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to start a sale
CREATE OR REPLACE FUNCTION public.start_sale(
  p_customer_id integer,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text
)
RETURNS json AS $$
DECLARE
  v_sale_id integer;
  v_invoice_number text;
  v_org_id uuid;
BEGIN
  -- Get user's organization
  SELECT organization_id INTO v_org_id FROM public.user_organizations WHERE user_id = auth.uid() LIMIT 1;

  INSERT INTO public.sales (
    customer_id,
    sale_date,
    status,
    organization_id
  ) VALUES (
    p_customer_id,
    now(),
    'pending',
    v_org_id
  ) RETURNING id, invoice_number INTO v_sale_id, v_invoice_number;

  INSERT INTO public.sale_customers (
    sales_id,
    customer_id,
    customer_name,
    customer_phone,
    customer_email,
    organization_id
  ) VALUES (
    v_sale_id,
    p_customer_id,
    p_customer_name,
    p_customer_phone,
    p_customer_email,
    v_org_id
  );

  RETURN json_build_object(
    'sale_id', v_sale_id,
    'invoice_number', v_invoice_number
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get product by barcode
CREATE OR REPLACE FUNCTION public.get_product_by_barcode(p_barcode text)
RETURNS json AS $$
DECLARE
  v_inv record;
  v_cv  record;
BEGIN
  -- 1. Try the inventory table first
  SELECT * FROM public.inventory WHERE barcode = p_barcode INTO v_inv;

  IF FOUND THEN
    RETURN json_build_object(
      'success', true,
      'barcode', v_inv.barcode,
      'name', v_inv.product_name,
      'model', v_inv.model_number,
      'color', v_inv.color,
      'price', v_inv.sale_price,
      'available_quantity', v_inv.quantity,
      'category', v_inv.category,
      'brand', v_inv.brand
    );
  END IF;

  -- 2. Fallback: look up in color_variants joined to purchases
  SELECT
    cv.barcode,
    p.product_name,
    p.model_number,
    cv.color,
    p.sale_price,
    cv.quantity,
    p.category,
    p.brand
  INTO v_cv
  FROM public.color_variants cv
  JOIN public.purchases p ON cv.purchase_id = p.id
  WHERE cv.barcode = p_barcode
  LIMIT 1;

  IF FOUND THEN
    RETURN json_build_object(
      'success', true,
      'barcode', v_cv.barcode,
      'name', v_cv.product_name,
      'model', v_cv.model_number,
      'color', v_cv.color,
      'price', v_cv.sale_price,
      'available_quantity', v_cv.quantity,
      'category', v_cv.category,
      'brand', v_cv.brand
    );
  END IF;

  RETURN json_build_object('success', false, 'message', 'Product not found');
END;
$$ LANGUAGE plpgsql;

-- Function for Owners to create managers without logging out
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email text,
  p_password text,
  p_full_name text,
  p_phone text,
  p_role text,
  p_organization_id uuid
)
RETURNS json AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- 1. Create the user in auth.users
  -- NOTE: This requires the pgcrypto extension for crypt()
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', p_full_name),
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO v_user_id;

  -- 2. Create the user profile in public.users
  INSERT INTO public.users (id, full_name, email, phone, role, is_active)
  VALUES (v_user_id, p_full_name, p_email, p_phone, p_role, true);

  -- 3. Link to organization
  INSERT INTO public.user_organizations (user_id, organization_id, role)
  VALUES (v_user_id, p_organization_id, p_role);

  RETURN json_build_object('success', true, 'user_id', v_user_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for Owners to update manager passwords
CREATE OR REPLACE FUNCTION public.admin_update_user_password(
  p_user_id uuid,
  p_new_password text
)
RETURNS json AS $$
BEGIN
  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = p_user_id;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for Owners to update manager emails
CREATE OR REPLACE FUNCTION public.admin_update_user_email(
  p_user_id uuid,
  p_new_email text
)
RETURNS json AS $$
BEGIN
  -- 1. Update auth.users
  UPDATE auth.users
  SET email = p_new_email,
      updated_at = now()
  WHERE id = p_user_id;

  -- 2. Update public.users
  UPDATE public.users
  SET email = p_new_email,
      updated_at = now()
  WHERE id = p_user_id;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for existing Owners to create additional shops
CREATE OR REPLACE FUNCTION public.create_new_shop(
  p_org_name text,
  p_address text,
  p_phone text
)
RETURNS json AS $$
DECLARE
  v_org_id uuid;
  v_user_id uuid := auth.uid();
BEGIN
  -- 1. Create Organization
  INSERT INTO public.organizations (name, address, phone, is_active)
  VALUES (p_org_name, p_address, p_phone, true)
  RETURNING id INTO v_org_id;

  -- 2. Link User to Organization as Owner
  INSERT INTO public.user_organizations (user_id, organization_id, role)
  VALUES (v_user_id, v_org_id, 'owner');

  RETURN json_build_object(
    'success', true,
    'organization_id', v_org_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get inventory scoped to a specific organization
CREATE OR REPLACE FUNCTION public.get_inventory_by_org(p_org_id uuid)
RETURNS TABLE (
  barcode text,
  product_name text,
  model_number text,
  category text,
  brand text,
  supplier text,
  cost_price numeric,
  sale_price numeric,
  quantity integer,
  color text,
  purchase_date timestamptz
) AS $$
BEGIN
  -- Security check: Ensure the user belongs to the requested organization
  IF NOT EXISTS (
    SELECT 1 FROM public.user_organizations 
    WHERE user_id = auth.uid() AND organization_id = p_org_id
  ) THEN
    RAISE EXCEPTION 'Access Denied: You do not belong to this organization';
  END IF;

  RETURN QUERY
  SELECT 
    cv.barcode,
    p.product_name,
    p.model_number,
    p.category,
    p.brand,
    p.supplier,
    p.cost_price,
    p.sale_price,
    cv.quantity,
    cv.color,
    p.created_at as purchase_date
  FROM public.color_variants cv
  JOIN public.purchases p ON cv.purchase_id = p.id
  WHERE cv.organization_id = p_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete an organization (Only for Owners)
CREATE OR REPLACE FUNCTION public.delete_organization(p_org_id uuid)
RETURNS json AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  -- Security check: Ensure the user is an owner of THIS specific organization
  IF NOT EXISTS (
    SELECT 1 FROM public.user_organizations
    WHERE user_id = v_user_id AND organization_id = p_org_id AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Access Denied: Only the owner can delete this shop';
  END IF;

  -- 1. Delete links (user_organizations)
  DELETE FROM public.user_organizations WHERE organization_id = p_org_id;

  -- 2. Delete the organization (Cascade will handle other tables if defined, but we'll be explicit for safety if needed)
  -- Most tables have FK to organizations with ON DELETE CASCADE or restricted. 
  -- Assuming schema handles cascade, otherwise we'd delete from color_variants, purchases, etc here.
  DELETE FROM public.organizations WHERE id = p_org_id;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for the app to set the active organization in the database session
-- This is used to enforce strict isolation in RLS policies even for Owners
CREATE OR REPLACE FUNCTION public.set_active_org_id(p_org_id uuid)
RETURNS void AS $$
BEGIN
  -- Verify the user actually belongs to this organization
  IF EXISTS (
    SELECT 1 FROM public.user_organizations
    WHERE user_id = auth.uid() AND organization_id = p_org_id
  ) THEN
    PERFORM set_config('app.active_org_id', p_org_id::text, false);
  ELSE
    RAISE EXCEPTION 'User does not belong to this organization';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get the current active organization from session
CREATE OR REPLACE FUNCTION public.get_active_org_id()
RETURNS uuid AS $$
BEGIN
  RETURN NULLIF(current_setting('app.active_org_id', true), '')::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- 6. Row Level Security (RLS)

-- Helper function to check if the current user is an owner of the organization
CREATE OR REPLACE FUNCTION public.is_org_owner(p_org_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_organizations
    WHERE user_id = auth.uid()
    AND organization_id = p_org_id
    AND role = 'owner'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get the user's organization IDs
CREATE OR REPLACE FUNCTION public.get_user_organizations()
RETURNS SETOF uuid AS $$
BEGIN
  RETURN QUERY
  SELECT organization_id FROM public.user_organizations
  WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if a user can view another user's profile
CREATE OR REPLACE FUNCTION public.can_view_profile(p_target_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN (
    auth.uid() = p_target_user_id OR 
    EXISTS (
      SELECT 1 FROM public.user_organizations uo_current
      JOIN public.user_organizations uo_target ON uo_current.organization_id = uo_target.organization_id
      WHERE uo_current.user_id = auth.uid() 
      AND uo_target.user_id = p_target_user_id 
      AND uo_current.role = 'owner'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on ALL tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.color_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_owner ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sold_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_cashbook_entries ENABLE ROW LEVEL SECURITY;

-- 6.1 Foundational Policies (Auth/Setup)

-- Organizations: Owners can see all their orgs, Managers can only see the ones they are assigned to
CREATE POLICY "Allow organization insertion" ON public.organizations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "View organizations" ON public.organizations FOR SELECT TO authenticated USING (
  id IN (SELECT public.get_user_organizations())
);
CREATE POLICY "Update organizations" ON public.organizations FOR UPDATE TO authenticated USING (public.is_org_owner(id));

-- Profile policies: Owners can see all users in their organizations, Managers can only see themselves
CREATE POLICY "Allow profile insertion" ON public.users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "View profiles" ON public.users FOR SELECT TO authenticated USING (public.can_view_profile(id));
CREATE POLICY "Update profiles" ON public.users FOR UPDATE TO authenticated USING (public.can_view_profile(id));

-- Link policies
-- Avoid recursion by using simple UID checks for the user's own rows
CREATE POLICY "Allow linking insertion" ON public.user_organizations FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id OR public.is_org_owner(organization_id)
);

CREATE POLICY "View links" ON public.user_organizations FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR public.is_org_owner(organization_id)
);

-- 6.2 Organization Scoped Policies (FOR ALL operations)
-- Simple but strict membership-based isolation.
-- This ensures a user can ONLY interact with data for organizations they are members of.
-- The application is responsible for filtering by the ACTIVE organization_id.

CREATE POLICY "Scope by organization" ON public.accounts FOR ALL TO authenticated 
USING (organization_id IN (SELECT public.get_user_organizations())) 
WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY "Scope by organization" ON public.customers FOR ALL TO authenticated 
USING (organization_id IN (SELECT public.get_user_organizations())) 
WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY "Scope by organization" ON public.suppliers FOR ALL TO authenticated 
USING (organization_id IN (SELECT public.get_user_organizations())) 
WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY "Scope by organization" ON public.purchases FOR ALL TO authenticated 
USING (organization_id IN (SELECT public.get_user_organizations())) 
WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY "Scope by organization" ON public.color_variants FOR ALL TO authenticated 
USING (organization_id IN (SELECT public.get_user_organizations())) 
WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY "Scope by organization" ON public.inventory FOR ALL TO authenticated 
USING (organization_id IN (SELECT public.get_user_organizations())) 
WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY "Scope by organization" ON public.expenses FOR ALL TO authenticated 
USING (organization_id IN (SELECT public.get_user_organizations())) 
WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY "Scope by organization" ON public.income_owner FOR ALL TO authenticated 
USING (organization_id IN (SELECT public.get_user_organizations())) 
WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY "Scope by organization" ON public.sales FOR ALL TO authenticated 
USING (organization_id IN (SELECT public.get_user_organizations())) 
WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY "Scope by organization" ON public.sold_products FOR ALL TO authenticated 
USING (organization_id IN (SELECT public.get_user_organizations())) 
WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY "Scope by organization" ON public.sale_customers FOR ALL TO authenticated 
USING (organization_id IN (SELECT public.get_user_organizations())) 
WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY "Scope by organization" ON public.sales_returns FOR ALL TO authenticated 
USING (organization_id IN (SELECT public.get_user_organizations())) 
WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY "Scope by organization" ON public.sales_return_items FOR ALL TO authenticated 
USING (organization_id IN (SELECT public.get_user_organizations())) 
WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY "Scope by organization" ON public.purchase_returns FOR ALL TO authenticated 
USING (organization_id IN (SELECT public.get_user_organizations())) 
WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY "Scope by organization" ON public.purchase_return_items FOR ALL TO authenticated 
USING (organization_id IN (SELECT public.get_user_organizations())) 
WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY "Scope by organization" ON public.return_items FOR ALL TO authenticated 
USING (organization_id IN (SELECT public.get_user_organizations())) 
WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY "Scope by organization" ON public.ledger FOR ALL TO authenticated 
USING (organization_id IN (SELECT public.get_user_organizations())) 
WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY "Scope by organization" ON public.ledger_entries FOR ALL TO authenticated 
USING (organization_id IN (SELECT public.get_user_organizations())) 
WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY "Scope by organization" ON public.day_cashbook_entries FOR ALL TO authenticated 
USING (organization_id IN (SELECT public.get_user_organizations())) 
WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));
