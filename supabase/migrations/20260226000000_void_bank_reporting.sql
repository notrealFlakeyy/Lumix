-- Lumix MVP: voiding (reversals), bank import tables, and basic reporting RPCs

-- Bank import metadata (CSV uploads, manual imports)
create table if not exists bank_imports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  source text not null default 'csv',
  original_filename text,
  imported_by uuid references auth.users(id) on delete set null,
  imported_at timestamptz not null default now(),
  stats jsonb not null default '{}'::jsonb
);

create table if not exists bank_transactions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  import_id uuid references bank_imports(id) on delete set null,
  booking_date date not null,
  amount numeric(14,2) not null,
  currency text not null default 'EUR',
  counterparty_name text,
  reference_number text,
  message text,
  raw jsonb not null default '{}'::jsonb,
  matched_invoice_id uuid references ar_invoices(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists bank_tx_org_date_idx on bank_transactions(org_id, booking_date desc);
create index if not exists bank_tx_org_ref_idx on bank_transactions(org_id, reference_number);

alter table bank_imports enable row level security;
alter table bank_transactions enable row level security;

create policy "bank_imports_select_member" on bank_imports for select using (is_org_member(org_id));
create policy "bank_imports_manage_accountant" on bank_imports for all
  using (has_org_role(org_id, array['owner','admin','accountant']::org_role[]))
  with check (has_org_role(org_id, array['owner','admin','accountant']::org_role[]));

create policy "bank_tx_select_member" on bank_transactions for select using (is_org_member(org_id));
create policy "bank_tx_manage_accountant" on bank_transactions for all
  using (has_org_role(org_id, array['owner','admin','accountant']::org_role[]))
  with check (has_org_role(org_id, array['owner','admin','accountant']::org_role[]));

-- Reverse a posted GL entry by creating an inverse entry.
create or replace function reverse_gl_entry(p_entry_id uuid, p_entry_date date, p_description text default null)
returns uuid
language plpgsql
as $$
declare
  v_org_id uuid;
  v_new_id uuid;
  v_desc text;
begin
  select org_id into v_org_id
  from gl_entries
  where id = p_entry_id
  for update;

  if v_org_id is null then
    raise exception 'GL entry not found';
  end if;

  perform assert_unlocked(v_org_id, p_entry_date);

  if not has_org_role(v_org_id, array['owner','admin','accountant']::org_role[]) then
    raise exception 'Not allowed';
  end if;

  select coalesce(p_description, 'Reversal') into v_desc;

  insert into gl_entries(org_id, entry_date, description, source_type, source_id, posted_by, posted_at, is_reversing, reversed_entry_id)
  select org_id, p_entry_date, v_desc, source_type, source_id, auth.uid(), now(), true, id
  from gl_entries
  where id = p_entry_id
  returning id into v_new_id;

  insert into gl_lines(org_id, entry_id, account_id, description, debit, credit, dimensions)
  select
    org_id,
    v_new_id,
    account_id,
    description,
    credit,
    debit,
    dimensions
  from gl_lines
  where entry_id = p_entry_id;

  perform assert_entry_balanced(v_new_id);

  update gl_entries
    set reversed_entry_id = v_new_id
  where id = p_entry_id and reversed_entry_id is null;

  insert into audit_log(org_id, actor_user_id, action, table_name, record_id, metadata)
  values (v_org_id, auth.uid(), 'void', 'gl_entries', p_entry_id, jsonb_build_object('reversal_entry_id', v_new_id));

  return v_new_id;
end;
$$;

-- Void AR invoice (no delete). If posted, creates a reversing entry.
create or replace function void_ar_invoice(p_invoice_id uuid, p_void_date date default (now() at time zone 'utc')::date, p_reason text default null)
returns uuid
language plpgsql
as $$
declare
  v_org_id uuid;
  v_posted_entry uuid;
  v_status doc_status;
  v_reversal_id uuid;
  v_allocated numeric(14,2);
begin
  select org_id, posted_entry_id, status into v_org_id, v_posted_entry, v_status
  from ar_invoices
  where id = p_invoice_id
  for update;

  if v_org_id is null then
    raise exception 'Invoice not found';
  end if;

  perform assert_unlocked(v_org_id, p_void_date);

  if not has_org_role(v_org_id, array['owner','admin','accountant']::org_role[]) then
    raise exception 'Not allowed';
  end if;

  if v_status = 'void' then
    raise exception 'Invoice already void';
  end if;

  select coalesce(sum(amount),0) into v_allocated
  from ar_payment_allocations
  where invoice_id = p_invoice_id;

  if v_allocated > 0 then
    raise exception 'Cannot void invoice with payments allocated';
  end if;

  if v_status = 'paid' then
    raise exception 'Cannot void paid invoice';
  end if;

  if v_posted_entry is not null then
    v_reversal_id := reverse_gl_entry(v_posted_entry, p_void_date, 'AR invoice void');
  else
    v_reversal_id := null;
  end if;

  update ar_invoices
    set status = 'void',
        voided_at = now(),
        void_reason = p_reason
  where id = p_invoice_id;

  insert into audit_log(org_id, actor_user_id, action, table_name, record_id, metadata)
  values (v_org_id, auth.uid(), 'void', 'ar_invoices', p_invoice_id, jsonb_build_object('reversal_entry_id', v_reversal_id, 'reason', p_reason));

  return v_reversal_id;
end;
$$;

-- Void AP invoice (no delete). If posted, creates a reversing entry.
create or replace function void_ap_invoice(p_invoice_id uuid, p_void_date date default (now() at time zone 'utc')::date, p_reason text default null)
returns uuid
language plpgsql
as $$
declare
  v_org_id uuid;
  v_posted_entry uuid;
  v_status doc_status;
  v_reversal_id uuid;
begin
  select org_id, posted_entry_id, status into v_org_id, v_posted_entry, v_status
  from ap_invoices
  where id = p_invoice_id
  for update;

  if v_org_id is null then
    raise exception 'Invoice not found';
  end if;

  perform assert_unlocked(v_org_id, p_void_date);

  if not has_org_role(v_org_id, array['owner','admin','accountant']::org_role[]) then
    raise exception 'Not allowed';
  end if;

  if v_status = 'void' then
    raise exception 'Invoice already void';
  end if;

  if v_status = 'paid' then
    raise exception 'Cannot void paid invoice';
  end if;

  if v_posted_entry is not null then
    v_reversal_id := reverse_gl_entry(v_posted_entry, p_void_date, 'AP invoice void');
  else
    v_reversal_id := null;
  end if;

  update ap_invoices
    set status = 'void',
        voided_at = now(),
        void_reason = p_reason
  where id = p_invoice_id;

  insert into audit_log(org_id, actor_user_id, action, table_name, record_id, metadata)
  values (v_org_id, auth.uid(), 'void', 'ap_invoices', p_invoice_id, jsonb_build_object('reversal_entry_id', v_reversal_id, 'reason', p_reason));

  return v_reversal_id;
end;
$$;

-- Basic P&L for a date range (EUR only in MVP).
create or replace function reporting_pnl(p_org_id uuid, p_start date, p_end date)
returns jsonb
language plpgsql
as $$
declare
  v_income numeric(14,2);
  v_expense numeric(14,2);
begin
  if not is_org_member(p_org_id) then
    raise exception 'Not allowed';
  end if;

  select
    coalesce(sum(case when a.type = 'income' then (l.credit - l.debit) else 0 end),0),
    coalesce(sum(case when a.type = 'expense' then (l.debit - l.credit) else 0 end),0)
  into v_income, v_expense
  from gl_lines l
  join gl_entries e on e.id = l.entry_id
  join gl_accounts a on a.id = l.account_id
  where l.org_id = p_org_id
    and e.entry_date between p_start and p_end;

  return jsonb_build_object(
    'income', round(v_income, 2),
    'expense', round(v_expense, 2),
    'net', round(v_income - v_expense, 2)
  );
end;
$$;

