create extension if not exists pgcrypto;

create type public.order_status as enum ('DRAFT','PLANNED','IN_PROGRESS','READY_FOR_REVIEW','COMPLETED','INVOICED','CANCELLED');
create type public.invoice_status as enum ('DRAFT','REVIEW','APPROVED','SENT','PARTIALLY_PAID','PAID','OVERDUE','CANCELLED');

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  street text,
  zip text,
  city text,
  country text not null default 'DE',
  email text,
  phone text,
  website text,
  tax_number text,
  vat_id text,
  iban text,
  bic text,
  invoice_prefix text not null default 'RE',
  quote_prefix text not null default 'AN',
  order_prefix text not null default 'AU',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  full_name text not null,
  email text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.modules (
  code text primary key,
  label text not null,
  description text,
  sort_order integer not null default 0
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  system_role boolean not null default false,
  unique(company_id, code)
);

create table public.role_modules (
  role_id uuid not null references public.roles(id) on delete cascade,
  module_code text not null references public.modules(code) on delete cascade,
  can_view boolean not null default true,
  can_create boolean not null default false,
  can_edit boolean not null default false,
  can_delete boolean not null default false,
  primary key(role_id, module_code)
);

create table public.user_roles (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  primary key(user_id, role_id)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  number text,
  kind text not null default 'COMPANY',
  name text not null,
  contact_person text,
  street text,
  zip text,
  city text,
  email text,
  phone text,
  vat_id text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, number)
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  customer_number text,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  sku text,
  ean text,
  manufacturer text,
  manufacturer_sku text,
  name text not null,
  description text,
  item_type text not null default 'MATERIAL',
  unit text not null default 'Stk',
  purchase_price numeric(12,2),
  sales_price numeric(12,2) not null default 0,
  tax_rate numeric(5,2) not null default 19,
  active boolean not null default true,
  source text not null default 'MANUAL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, sku)
);

create table public.price_lists (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  unique(company_id, code)
);

create table public.catalog_prices (
  item_id uuid not null references public.catalog_items(id) on delete cascade,
  price_list_id uuid not null references public.price_lists(id) on delete cascade,
  price numeric(12,2) not null,
  primary key(item_id, price_list_id)
);

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  source_type text not null,
  file_name text,
  status text not null default 'DONE',
  rows_total integer not null default 0,
  rows_imported integer not null default 0,
  errors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id),
  number text not null,
  title text not null,
  description text,
  status public.order_status not null default 'DRAFT',
  street text,
  zip text,
  city text,
  scheduled_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, number)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  catalog_item_id uuid references public.catalog_items(id) on delete set null,
  position integer not null,
  description text not null,
  quantity numeric(12,3) not null default 1,
  unit text not null default 'Stk',
  unit_price numeric(12,2) not null default 0,
  tax_rate numeric(5,2) not null default 19
);

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid references public.profiles(user_id) on delete set null,
  started_at timestamptz,
  ended_at timestamptz,
  minutes integer not null default 0,
  description text,
  billable boolean not null default true,
  hourly_rate numeric(12,2),
  created_at timestamptz not null default now()
);

create table public.material_usages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  catalog_item_id uuid references public.catalog_items(id) on delete set null,
  description text not null,
  quantity numeric(12,3) not null,
  unit text not null default 'Stk',
  unit_price numeric(12,2),
  billable boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.extra_work (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  description text not null,
  amount numeric(12,2) not null default 0,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.order_notes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid references public.profiles(user_id) on delete set null,
  note text not null,
  created_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id),
  order_id uuid references public.orders(id) on delete set null,
  number text,
  status public.invoice_status not null default 'DRAFT',
  net_total numeric(12,2) not null default 0,
  tax_total numeric(12,2) not null default 0,
  gross_total numeric(12,2) not null default 0,
  due_at date,
  sent_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, number)
);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  position integer not null,
  description text not null,
  quantity numeric(12,3) not null,
  unit text not null default 'Stk',
  unit_price numeric(12,2) not null,
  tax_rate numeric(5,2) not null default 19
);

insert into public.modules(code,label,description,sort_order) values
('DASHBOARD','Heute','Aufgaben und Überblick',10),
('CUSTOMERS','Kunden','Kunden und Kontakte',20),
('CATALOG','Artikel & Leistungen','Material, Leistungen und Preislisten',30),
('ORDERS','Aufträge','Aufträge, Baustellen und Dokumentation',40),
('BILLING','Abrechnung','Rechnungsvorschläge und Rechnungen',50),
('FINANCE','Finanzen','Offene Posten, Bank und Mahnwesen',60),
('PURCHASING','Einkauf & Lager','Lieferanten, Bestellung und Lager',70),
('ADMIN','Verwaltung','Unternehmen, Benutzer, Rollen und Module',90)
on conflict (code) do update set label=excluded.label, description=excluded.description, sort_order=excluded.sort_order;

create schema if not exists private;

create or replace function private.current_company_id() returns uuid
language sql stable security definer set search_path = public
as $$ select company_id from public.profiles where user_id = auth.uid() limit 1 $$;
revoke all on function private.current_company_id() from public;
grant execute on function private.current_company_id() to authenticated;

create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = public
as $$
  select exists(
    select 1 from public.user_roles ur
    join public.roles r on r.id=ur.role_id
    where ur.user_id=auth.uid() and r.code='ADMIN'
  )
$$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

create or replace function public.installation_status() returns boolean
language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles) $$;
revoke all on function public.installation_status() from public;
grant execute on function public.installation_status() to anon, authenticated;

create or replace function public.bootstrap_installation(
  p_company_name text,
  p_full_name text,
  p_street text default null,
  p_zip text default null,
  p_city text default null,
  p_email text default null,
  p_phone text default null
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_company uuid;
  v_admin_role uuid;
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  perform pg_advisory_xact_lock(918273645);
  if exists(select 1 from public.profiles) then raise exception 'Installation already initialized'; end if;
  insert into public.companies(name,street,zip,city,email,phone)
  values(p_company_name,p_street,p_zip,p_city,p_email,p_phone) returning id into v_company;
  insert into public.profiles(user_id,company_id,full_name,email)
  values(v_user,v_company,p_full_name,coalesce(p_email,(select email from auth.users where id=v_user)));
  insert into public.roles(company_id,code,name,description,system_role)
  values(v_company,'ADMIN','Administrator','Vollzugriff auf die Installation',true) returning id into v_admin_role;
  insert into public.roles(company_id,code,name,description,system_role) values
    (v_company,'MANAGEMENT','Geschäftsführung','Kaufmännische und operative Steuerung',true),
    (v_company,'EMPLOYEE','Mitarbeiter','Aufträge und Arbeitsdokumentation',true),
    (v_company,'ACCOUNTING','Buchhaltung','Abrechnung und Finanzen',true);
  insert into public.role_modules(role_id,module_code,can_view,can_create,can_edit,can_delete)
  select v_admin_role,code,true,true,true,true from public.modules;
  insert into public.user_roles(user_id,role_id) values(v_user,v_admin_role);
  insert into public.price_lists(company_id,code,name) values
    (v_company,'STANDARD','Standard'),(v_company,'PRIVATE','Privatkunden'),(v_company,'BUSINESS','Gewerbekunden'),(v_company,'PUBLIC','LV / Öffentliche Hand');
  return v_company;
end $$;
revoke all on function public.bootstrap_installation(text,text,text,text,text,text,text) from public;
grant execute on function public.bootstrap_installation(text,text,text,text,text,text,text) to authenticated;

create or replace function public.create_invoice_from_order(p_order_id uuid) returns uuid
language plpgsql security invoker set search_path=public
as $$
declare
  v_order public.orders%rowtype;
  v_invoice uuid;
  v_pos integer := 0;
begin
  select * into v_order from public.orders where id=p_order_id;
  if v_order.id is null then raise exception 'Order not found'; end if;
  insert into public.invoices(company_id,customer_id,order_id,status) values(v_order.company_id,v_order.customer_id,v_order.id,'REVIEW') returning id into v_invoice;
  insert into public.invoice_items(company_id,invoice_id,position,description,quantity,unit,unit_price,tax_rate)
    select company_id,v_invoice,row_number() over(order by position),description,quantity,unit,unit_price,tax_rate from public.order_items where order_id=p_order_id;
  select coalesce(max(position),0) into v_pos from public.invoice_items where invoice_id=v_invoice;
  insert into public.invoice_items(company_id,invoice_id,position,description,quantity,unit,unit_price,tax_rate)
    select company_id,v_invoice,v_pos+row_number() over(order by created_at),description,quantity,unit,coalesce(unit_price,0),19 from public.material_usages where order_id=p_order_id and billable=true;
  select coalesce(max(position),0) into v_pos from public.invoice_items where invoice_id=v_invoice;
  insert into public.invoice_items(company_id,invoice_id,position,description,quantity,unit,unit_price,tax_rate)
    select company_id,v_invoice,v_pos+row_number() over(order by created_at),description,1,'pauschal',amount,19 from public.extra_work where order_id=p_order_id and approved=true;
  update public.invoices i set
    net_total = x.net,
    tax_total = x.tax,
    gross_total = x.net+x.tax
  from (select invoice_id,coalesce(sum(quantity*unit_price),0) net,coalesce(sum(quantity*unit_price*tax_rate/100),0) tax from public.invoice_items where invoice_id=v_invoice group by invoice_id) x
  where i.id=v_invoice;
  update public.orders set status='INVOICED', updated_at=now() where id=p_order_id;
  return v_invoice;
end $$;
grant execute on function public.create_invoice_from_order(uuid) to authenticated;

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.role_modules enable row level security;
alter table public.user_roles enable row level security;
alter table public.customers enable row level security;
alter table public.suppliers enable row level security;
alter table public.catalog_items enable row level security;
alter table public.price_lists enable row level security;
alter table public.catalog_prices enable row level security;
alter table public.import_jobs enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.time_entries enable row level security;
alter table public.material_usages enable row level security;
alter table public.extra_work enable row level security;
alter table public.order_notes enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;

create policy company_member on public.companies for select to authenticated using(id=private.current_company_id());
create policy company_admin_update on public.companies for update to authenticated using(id=private.current_company_id() and private.is_admin()) with check(id=private.current_company_id() and private.is_admin());
create policy profile_member_read on public.profiles for select to authenticated using(company_id=private.current_company_id());
create policy role_member_read on public.roles for select to authenticated using(company_id=private.current_company_id());
create policy role_admin_write on public.roles for all to authenticated using(company_id=private.current_company_id() and private.is_admin()) with check(company_id=private.current_company_id() and private.is_admin());
create policy role_module_member_read on public.role_modules for select to authenticated using(exists(select 1 from public.roles r where r.id=role_id and r.company_id=private.current_company_id()));
create policy role_module_admin_write on public.role_modules for all to authenticated using(private.is_admin()) with check(private.is_admin());
create policy user_role_member_read on public.user_roles for select to authenticated using(exists(select 1 from public.profiles p where p.user_id=user_roles.user_id and p.company_id=private.current_company_id()));
create policy user_role_admin_write on public.user_roles for all to authenticated using(private.is_admin()) with check(private.is_admin());

create policy customer_member_all on public.customers for all to authenticated using(company_id=private.current_company_id()) with check(company_id=private.current_company_id());
create policy supplier_member_all on public.suppliers for all to authenticated using(company_id=private.current_company_id()) with check(company_id=private.current_company_id());
create policy catalog_member_all on public.catalog_items for all to authenticated using(company_id=private.current_company_id()) with check(company_id=private.current_company_id());
create policy price_list_member_all on public.price_lists for all to authenticated using(company_id=private.current_company_id()) with check(company_id=private.current_company_id());
create policy catalog_price_member_all on public.catalog_prices for all to authenticated using(exists(select 1 from public.catalog_items c where c.id=item_id and c.company_id=private.current_company_id())) with check(exists(select 1 from public.catalog_items c where c.id=item_id and c.company_id=private.current_company_id()));
create policy import_member_all on public.import_jobs for all to authenticated using(company_id=private.current_company_id()) with check(company_id=private.current_company_id());
create policy order_member_all on public.orders for all to authenticated using(company_id=private.current_company_id()) with check(company_id=private.current_company_id());
create policy order_item_member_all on public.order_items for all to authenticated using(company_id=private.current_company_id()) with check(company_id=private.current_company_id());
create policy time_member_all on public.time_entries for all to authenticated using(company_id=private.current_company_id()) with check(company_id=private.current_company_id());
create policy material_member_all on public.material_usages for all to authenticated using(company_id=private.current_company_id()) with check(company_id=private.current_company_id());
create policy extra_member_all on public.extra_work for all to authenticated using(company_id=private.current_company_id()) with check(company_id=private.current_company_id());
create policy notes_member_all on public.order_notes for all to authenticated using(company_id=private.current_company_id()) with check(company_id=private.current_company_id());
create policy invoice_member_all on public.invoices for all to authenticated using(company_id=private.current_company_id()) with check(company_id=private.current_company_id());
create policy invoice_item_member_all on public.invoice_items for all to authenticated using(company_id=private.current_company_id()) with check(company_id=private.current_company_id());

grant usage on schema public to anon, authenticated;
grant select on public.modules to anon, authenticated;
grant select,insert,update,delete on all tables in schema public to authenticated;
