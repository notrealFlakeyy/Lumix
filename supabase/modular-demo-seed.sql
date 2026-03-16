do $$
declare
  demo_company uuid := '11111111-1111-1111-1111-111111111111';
  branch_1 uuid := '88888888-8888-8888-8888-888888888881';
  branch_2 uuid := '88888888-8888-8888-8888-888888888882';
  product_1 uuid := '99999999-9999-9999-9999-999999999991';
  product_2 uuid := '99999999-9999-9999-9999-999999999992';
  product_3 uuid := '99999999-9999-9999-9999-999999999993';
  vendor_1 uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
  vendor_2 uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2';
  purchase_invoice_1 uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
  purchase_invoice_2 uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2';
  purchase_payment_1 uuid := 'cccccccc-cccc-cccc-cccc-ccccccccccc1';
  employee_1 uuid := 'dddddddd-dddd-dddd-dddd-ddddddddddd1';
  employee_2 uuid := 'dddddddd-dddd-dddd-dddd-ddddddddddd2';
  employee_3 uuid := 'dddddddd-dddd-dddd-dddd-ddddddddddd3';
  time_entry_1 uuid := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1';
  time_entry_2 uuid := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2';
  time_entry_3 uuid := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee3';
  time_entry_4 uuid := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee4';
  time_entry_5 uuid := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee5';
  payroll_run_1 uuid := 'ffffffff-ffff-ffff-ffff-fffffffffff1';
  payroll_item_1 uuid := '12121212-1212-1212-1212-121212121211';
  payroll_item_2 uuid := '12121212-1212-1212-1212-121212121212';
begin
  insert into public.company_modules (company_id, module_key, is_enabled)
  values
    (demo_company, 'core', true),
    (demo_company, 'transport', true),
    (demo_company, 'inventory', true),
    (demo_company, 'purchases', true),
    (demo_company, 'time', true),
    (demo_company, 'payroll', true),
    (demo_company, 'accounting', true)
  on conflict (company_id, module_key) do update
  set is_enabled = excluded.is_enabled;

  insert into public.branches (id, company_id, name, code, branch_type, address_line1, postal_code, city, country, is_active)
  values
    (branch_1, demo_company, 'Turku Terminal', 'TRK', 'terminal', 'Satamatie 18', '20100', 'Turku', 'FI', true),
    (branch_2, demo_company, 'Helsinki Cross-Dock', 'HEL', 'warehouse', 'Vuosaaren Satamatie 6', '00980', 'Helsinki', 'FI', true)
  on conflict (id) do update set
    name = excluded.name,
    code = excluded.code,
    branch_type = excluded.branch_type,
    address_line1 = excluded.address_line1,
    postal_code = excluded.postal_code,
    city = excluded.city,
    country = excluded.country,
    is_active = excluded.is_active;

  update public.customers
  set branch_id = case
    when id = '22222222-2222-2222-2222-222222222222'::uuid then branch_2
    else branch_1
  end
  where company_id = demo_company;

  update public.vehicles
  set branch_id = case
    when id = '33333333-3333-3333-3333-333333333332'::uuid then branch_2
    else branch_1
  end
  where company_id = demo_company;

  update public.drivers
  set branch_id = case
    when id = '44444444-4444-4444-4444-444444444442'::uuid then branch_2
    else branch_1
  end
  where company_id = demo_company;

  update public.transport_orders
  set branch_id = case
    when id in ('55555555-5555-5555-5555-555555555552'::uuid, '55555555-5555-5555-5555-555555555554'::uuid) then branch_2
    else branch_1
  end
  where company_id = demo_company;

  update public.trips
  set branch_id = case
    when id in ('66666666-6666-6666-6666-666666666662'::uuid, '66666666-6666-6666-6666-666666666664'::uuid) then branch_2
    else branch_1
  end
  where company_id = demo_company;

  update public.invoices
  set branch_id = case
    when id = '77777777-7777-7777-7777-777777777772'::uuid then branch_2
    else branch_1
  end
  where company_id = demo_company;

  update public.documents
  set branch_id = branch_1
  where company_id = demo_company
    and branch_id is null;

  insert into public.inventory_products (id, company_id, branch_id, sku, name, category, unit, reorder_level, cost_price, sale_price, notes, is_active)
  values
    (product_1, demo_company, branch_1, 'PAL-STD', 'Standard EUR Pallet', 'Warehouse supplies', 'pcs', 40, 12.50, 18.00, 'Reusable pallet stock for terminal operations.', true),
    (product_2, demo_company, branch_2, 'TIE-RAT', 'Ratchet Strap', 'Load securing', 'pcs', 20, 18.00, 27.00, 'Issued to outbound and subcontractor loads.', true),
    (product_3, demo_company, branch_1, 'HI-VIS', 'Hi-Vis Safety Vest', 'Safety gear', 'pcs', 15, 9.00, 14.50, 'Field and warehouse PPE stock.', true)
  on conflict (id) do update set
    branch_id = excluded.branch_id,
    sku = excluded.sku,
    name = excluded.name,
    category = excluded.category,
    unit = excluded.unit,
    reorder_level = excluded.reorder_level,
    cost_price = excluded.cost_price,
    sale_price = excluded.sale_price,
    notes = excluded.notes,
    is_active = excluded.is_active;

  delete from public.inventory_movements
  where company_id = demo_company
    and product_id in (product_1, product_2, product_3);

  insert into public.inventory_movements (company_id, branch_id, product_id, movement_type, quantity, unit_cost, reference, notes)
  values
    (demo_company, branch_1, product_1, 'receipt', 120, 12.50, 'OPENING-PALLET', 'Opening stock for pallet pool.'),
    (demo_company, branch_2, product_2, 'receipt', 55, 18.00, 'OPENING-STRAP', 'Opening stock for load securing equipment.'),
    (demo_company, branch_1, product_3, 'receipt', 28, 9.00, 'OPENING-PPE', 'Opening PPE stock.'),
    (demo_company, branch_2, product_2, 'issue', 6, 18.00, 'OPS-SECURE-01', 'Issued to outbound drivers.');

  insert into public.purchase_vendors (id, company_id, branch_id, name, business_id, email, phone, address_line1, postal_code, city, notes, is_active)
  values
    (vendor_1, demo_company, branch_1, 'Suomi Packaging Supply Oy', '1900112-3', 'orders@suomipackaging.fi', '+358400700111', 'Pakkaajankatu 7', '20380', 'Turku', 'Terminal consumables and pallet handling materials.', true),
    (vendor_2, demo_company, branch_2, 'Nordic Safety Gear Ab', '2100456-8', 'sales@nordicsafety.fi', '+358400700222', 'Suojatie 14', '01510', 'Vantaa', 'PPE and securing gear for warehouse and fleet teams.', true)
  on conflict (id) do update set
    branch_id = excluded.branch_id,
    name = excluded.name,
    business_id = excluded.business_id,
    email = excluded.email,
    phone = excluded.phone,
    address_line1 = excluded.address_line1,
    postal_code = excluded.postal_code,
    city = excluded.city,
    notes = excluded.notes,
    is_active = excluded.is_active;

  insert into public.purchase_invoices (id, company_id, branch_id, vendor_id, invoice_number, invoice_date, due_date, status, reference_number, subtotal, vat_total, total, notes, received_at)
  values
    (purchase_invoice_1, demo_company, branch_1, vendor_1, 'PUR-0001', current_date - 9, current_date - 1, 'partially_paid', 'SPS-10091', 1500.00, 382.50, 1882.50, 'Pallet and consumables replenishment for Turku terminal.', now() - interval '8 days'),
    (purchase_invoice_2, demo_company, branch_2, vendor_2, 'PUR-0002', current_date - 4, current_date + 10, 'approved', 'NSG-2026-41', 720.00, 183.60, 903.60, 'Safety gear replenishment for Helsinki cross-dock.', null)
  on conflict (id) do update set
    branch_id = excluded.branch_id,
    vendor_id = excluded.vendor_id,
    invoice_number = excluded.invoice_number,
    invoice_date = excluded.invoice_date,
    due_date = excluded.due_date,
    status = excluded.status,
    reference_number = excluded.reference_number,
    subtotal = excluded.subtotal,
    vat_total = excluded.vat_total,
    total = excluded.total,
    notes = excluded.notes,
    received_at = excluded.received_at;

  delete from public.purchase_invoice_items
  where purchase_invoice_id in (purchase_invoice_1, purchase_invoice_2);

  insert into public.purchase_invoice_items (purchase_invoice_id, inventory_product_id, description, quantity, unit_price, vat_rate, line_total, received_to_stock)
  values
    (purchase_invoice_1, product_1, 'EUR pallet batch', 100, 12.50, 25.50, 1250.00, true),
    (purchase_invoice_1, product_3, 'Hi-vis vest restock', 25, 10.00, 25.50, 250.00, true),
    (purchase_invoice_2, product_2, 'Ratchet strap replenishment', 40, 18.00, 25.50, 720.00, false);

  delete from public.purchase_payments
  where id = purchase_payment_1
     or purchase_invoice_id in (purchase_invoice_1, purchase_invoice_2);

  insert into public.purchase_payments (id, company_id, purchase_invoice_id, payment_date, amount, reference, notes)
  values
    (purchase_payment_1, demo_company, purchase_invoice_1, current_date - 2, 900.00, 'SUP-TRK-0001', 'Part payment settled after receipt reconciliation.')
  on conflict (id) do update set
    company_id = excluded.company_id,
    purchase_invoice_id = excluded.purchase_invoice_id,
    payment_date = excluded.payment_date,
    amount = excluded.amount,
    reference = excluded.reference,
    notes = excluded.notes;

  insert into public.workforce_employees (id, company_id, branch_id, full_name, email, phone, job_title, employment_type, pay_type, hourly_rate, overtime_rate, notes, is_active)
  values
    (employee_1, demo_company, branch_1, 'Mika Lehtinen', 'mika.lehtinen@northernroute.fi', '+358401009900', 'Senior Driver', 'Full-time', 'hourly', 24.00, 36.00, 'Primary long-haul driver profile for self clocking demos.', true),
    (employee_2, demo_company, branch_2, 'Jari Koskela', 'jari.koskela@northernroute.fi', '+358401009901', 'Cross-dock Lead', 'Full-time', 'hourly', 26.00, 39.00, 'Leads warehouse and loading operations in Helsinki.', true),
    (employee_3, demo_company, branch_2, 'Laura Hietala', 'laura.hietala@northernroute.fi', '+358401009903', 'Warehouse Operator', 'Full-time', 'hourly', 21.50, 32.25, 'Represents a non-driver warehouse employee for payroll demos.', true)
  on conflict (id) do update set
    branch_id = excluded.branch_id,
    full_name = excluded.full_name,
    email = excluded.email,
    phone = excluded.phone,
    job_title = excluded.job_title,
    employment_type = excluded.employment_type,
    pay_type = excluded.pay_type,
    hourly_rate = excluded.hourly_rate,
    overtime_rate = excluded.overtime_rate,
    notes = excluded.notes,
    is_active = excluded.is_active;

  update public.workforce_employees employee
  set auth_user_id = driver.auth_user_id
  from public.drivers driver
  where employee.company_id = demo_company
    and driver.company_id = employee.company_id
    and driver.auth_user_id is not null
    and lower(coalesce(driver.email, '')) = lower(coalesce(employee.email, ''));

  delete from public.payroll_run_items where payroll_run_id = payroll_run_1;
  delete from public.time_entries where company_id = demo_company and id in (time_entry_1, time_entry_2, time_entry_3, time_entry_4, time_entry_5);
  delete from public.payroll_runs where company_id = demo_company and id = payroll_run_1;

  insert into public.payroll_runs (
    id,
    company_id,
    branch_id,
    period_start,
    period_end,
    status,
    notes,
    total_regular_minutes,
    total_overtime_minutes,
    total_estimated_gross
  )
  values (
    payroll_run_1,
    demo_company,
    null,
    date_trunc('month', current_date - interval '1 month')::date,
    (date_trunc('month', current_date) - interval '1 day')::date,
    'exported',
    'Last month payroll run handed off to external payroll processing.',
    960,
    120,
    465.00
  );

  insert into public.time_entries (
    id,
    company_id,
    branch_id,
    employee_id,
    payroll_run_id,
    work_date,
    start_time,
    end_time,
    break_minutes,
    regular_minutes,
    overtime_minutes,
    status,
    source,
    notes
  )
  values
    (
      time_entry_1,
      demo_company,
      branch_1,
      employee_1,
      null,
      current_date,
      date_trunc('minute', now() - interval '3 hours'),
      null,
      0,
      0,
      0,
      'open',
      'driver',
      'Live shift for mobile and time tracking demos.'
    ),
    (
      time_entry_2,
      demo_company,
      branch_2,
      employee_3,
      null,
      current_date - 1,
      (current_date - 1)::timestamp + time '07:00',
      (current_date - 1)::timestamp + time '16:00',
      30,
      480,
      30,
      'submitted',
      'clock',
      'Submitted shift awaiting supervisor approval.'
    ),
    (
      time_entry_3,
      demo_company,
      branch_2,
      employee_2,
      null,
      current_date - 2,
      (current_date - 2)::timestamp + time '08:00',
      (current_date - 2)::timestamp + time '16:30',
      30,
      480,
      0,
      'approved',
      'manual',
      'Approved cross-dock supervision shift, pending payroll inclusion.'
    ),
    (
      time_entry_4,
      demo_company,
      branch_1,
      employee_1,
      payroll_run_1,
      date_trunc('month', current_date - interval '1 month')::date + 2,
      (date_trunc('month', current_date - interval '1 month')::date + 2)::timestamp + time '06:00',
      (date_trunc('month', current_date - interval '1 month')::date + 2)::timestamp + time '15:30',
      30,
      480,
      30,
      'exported',
      'driver',
      'Historical payroll-backed driver shift.'
    ),
    (
      time_entry_5,
      demo_company,
      branch_2,
      employee_2,
      payroll_run_1,
      date_trunc('month', current_date - interval '1 month')::date + 3,
      (date_trunc('month', current_date - interval '1 month')::date + 3)::timestamp + time '07:30',
      (date_trunc('month', current_date - interval '1 month')::date + 3)::timestamp + time '17:00',
      30,
      480,
      90,
      'exported',
      'manual',
      'Historical warehouse supervision shift.'
    );

  insert into public.payroll_run_items (
    id,
    payroll_run_id,
    employee_id,
    regular_minutes,
    overtime_minutes,
    hourly_rate,
    overtime_rate,
    estimated_gross,
    notes
  )
  values
    (payroll_item_1, payroll_run_1, employee_1, 480, 30, 24.00, 36.00, 210.00, 'Driver route payroll item.'),
    (payroll_item_2, payroll_run_1, employee_2, 480, 90, 26.00, 39.00, 255.00, 'Cross-dock lead payroll item.')
  on conflict (id) do update set
    payroll_run_id = excluded.payroll_run_id,
    employee_id = excluded.employee_id,
    regular_minutes = excluded.regular_minutes,
    overtime_minutes = excluded.overtime_minutes,
    hourly_rate = excluded.hourly_rate,
    overtime_rate = excluded.overtime_rate,
    estimated_gross = excluded.estimated_gross,
    notes = excluded.notes;
end $$;
