do $$
declare
  demo_company uuid := '11111111-1111-1111-1111-111111111111';
  customer_1 uuid := '22222222-2222-2222-2222-222222222221';
  customer_2 uuid := '22222222-2222-2222-2222-222222222222';
  customer_3 uuid := '22222222-2222-2222-2222-222222222223';
  vehicle_1 uuid := '33333333-3333-3333-3333-333333333331';
  vehicle_2 uuid := '33333333-3333-3333-3333-333333333332';
  vehicle_3 uuid := '33333333-3333-3333-3333-333333333333';
  driver_1 uuid := '44444444-4444-4444-4444-444444444441';
  driver_2 uuid := '44444444-4444-4444-4444-444444444442';
  driver_3 uuid := '44444444-4444-4444-4444-444444444443';
  order_1 uuid := '55555555-5555-5555-5555-555555555551';
  order_2 uuid := '55555555-5555-5555-5555-555555555552';
  order_3 uuid := '55555555-5555-5555-5555-555555555553';
  order_4 uuid := '55555555-5555-5555-5555-555555555554';
  order_5 uuid := '55555555-5555-5555-5555-555555555555';
  trip_1 uuid := '66666666-6666-6666-6666-666666666661';
  trip_2 uuid := '66666666-6666-6666-6666-666666666662';
  trip_3 uuid := '66666666-6666-6666-6666-666666666663';
  trip_4 uuid := '66666666-6666-6666-6666-666666666664';
  trip_5 uuid := '66666666-6666-6666-6666-666666666665';
  invoice_1 uuid := '77777777-7777-7777-7777-777777777771';
  invoice_2 uuid := '77777777-7777-7777-7777-777777777772';
  invoice_3 uuid := '77777777-7777-7777-7777-777777777773';
  first_user uuid;
begin
  insert into public.companies (id, name, business_id, vat_number, email, phone, address_line1, postal_code, city, country, timezone)
  values (
    demo_company,
    'Northern Route Logistics Oy',
    '3245567-8',
    'FI32455678',
    'ops@northernroute.fi',
    '+358401234567',
    'Satamatie 18',
    '20100',
    'Turku',
    'FI',
    'Europe/Helsinki'
  )
  on conflict (id) do update set
    name = excluded.name,
    business_id = excluded.business_id,
    vat_number = excluded.vat_number,
    email = excluded.email,
    phone = excluded.phone,
    address_line1 = excluded.address_line1,
    postal_code = excluded.postal_code,
    city = excluded.city,
    country = excluded.country,
    timezone = excluded.timezone;

  insert into public.customers (id, company_id, name, business_id, vat_number, email, phone, billing_address_line1, billing_postal_code, billing_city, notes)
  values
    (customer_1, demo_company, 'Arctic Timber Solutions', '2431001-4', 'FI24310014', 'traffic@arctictimber.fi', '+358401112223', 'Sahakatu 9', '90100', 'Oulu', 'High-volume timber transport account with recurring northern routes.'),
    (customer_2, demo_company, 'Baltic Retail Cargo', '2788202-5', 'FI27882025', 'logistics@balticretail.fi', '+358501234890', 'Varastokuja 3', '00940', 'Helsinki', 'Retail replenishment loads with tight delivery windows.'),
    (customer_3, demo_company, 'Polar Construction Group', '3019987-1', 'FI30199871', 'dispatch@polarconstruction.fi', '+358442229955', 'Tyomaantie 12', '15110', 'Lahti', 'Construction materials and site transfers.')
  on conflict (id) do update set
    name = excluded.name,
    business_id = excluded.business_id,
    vat_number = excluded.vat_number,
    email = excluded.email,
    phone = excluded.phone,
    billing_address_line1 = excluded.billing_address_line1,
    billing_postal_code = excluded.billing_postal_code,
    billing_city = excluded.billing_city,
    notes = excluded.notes;

  insert into public.vehicles (id, company_id, registration_number, make, model, year, fuel_type, current_km, next_service_km, is_active)
  values
    (vehicle_1, demo_company, 'ABC-123', 'Volvo', 'FH16', 2021, 'Diesel', 182450, 195000, true),
    (vehicle_2, demo_company, 'DEF-456', 'Scania', 'R500', 2020, 'Diesel', 245300, 255000, true),
    (vehicle_3, demo_company, 'GHI-789', 'Mercedes', 'Actros', 2022, 'Diesel', 98420, 112000, true)
  on conflict (id) do update set
    registration_number = excluded.registration_number,
    make = excluded.make,
    model = excluded.model,
    year = excluded.year,
    fuel_type = excluded.fuel_type,
    current_km = excluded.current_km,
    next_service_km = excluded.next_service_km,
    is_active = excluded.is_active;

  insert into public.drivers (id, public_id, company_id, full_name, phone, email, license_type, employment_type, is_active)
  values
    (driver_1, 'Mk7Lp2Qa9X', demo_company, 'Mika Lehtinen', '+358401009900', 'mika.lehtinen@northernroute.fi', 'CE', 'Full-time', true),
    (driver_2, 'Jr4Ns8Wd1K', demo_company, 'Jari Koskela', '+358401009901', 'jari.koskela@northernroute.fi', 'CE', 'Full-time', true),
    (driver_3, 'An6Rb3Ty5M', demo_company, 'Antti Niemi', '+358401009902', 'antti.niemi@northernroute.fi', 'CE', 'Contract', true)
  on conflict (id) do update set
    public_id = excluded.public_id,
    full_name = excluded.full_name,
    phone = excluded.phone,
    email = excluded.email,
    license_type = excluded.license_type,
    employment_type = excluded.employment_type,
    is_active = excluded.is_active;

  insert into public.transport_orders (id, company_id, customer_id, assigned_vehicle_id, assigned_driver_id, order_number, pickup_location, delivery_location, cargo_description, scheduled_at, status, notes)
  values
    (order_1, demo_company, customer_1, vehicle_1, driver_1, 'ORD-0001', 'Turku', 'Helsinki', 'Processed timber bundles', now() - interval '8 days', 'completed', 'Unload at Vuosaari terminal gate B.'),
    (order_2, demo_company, customer_2, vehicle_2, driver_2, 'ORD-0002', 'Tampere', 'Oulu', 'Retail pallet distribution', now() - interval '5 days', 'invoiced', 'Priority shelves for weekend campaign.'),
    (order_3, demo_company, customer_3, vehicle_3, driver_3, 'ORD-0003', 'Vaasa', 'Jyvaskyla', 'Steel beams and site fencing', now() - interval '1 day', 'in_progress', 'Site contact requires 30 min notice.'),
    (order_4, demo_company, customer_2, vehicle_1, driver_1, 'ORD-0004', 'Espoo', 'Lahti', 'Retail fixtures', now() + interval '1 day', 'assigned', 'Reverse route with return packaging.'),
    (order_5, demo_company, customer_1, null, null, 'ORD-0005', 'Salo', 'Vantaa', 'Lumber reload transfer', now() + interval '3 days', 'planned', 'Awaiting final equipment assignment.')
  on conflict (company_id, order_number) do update set
    customer_id = excluded.customer_id,
    assigned_vehicle_id = excluded.assigned_vehicle_id,
    assigned_driver_id = excluded.assigned_driver_id,
    pickup_location = excluded.pickup_location,
    delivery_location = excluded.delivery_location,
    cargo_description = excluded.cargo_description,
    scheduled_at = excluded.scheduled_at,
    status = excluded.status,
    notes = excluded.notes;

  insert into public.trips (id, public_id, company_id, transport_order_id, customer_id, vehicle_id, driver_id, start_time, end_time, start_km, end_km, distance_km, waiting_time_minutes, notes, delivery_confirmation, status)
  values
    (trip_1, 'Tp9Xk2Lm4Q', demo_company, order_1, customer_1, vehicle_1, driver_1, now() - interval '8 days', now() - interval '8 days' + interval '4 hours', 181920, 182340, 420, 35, 'Delivered on schedule with terminal queue.', 'Signed by H. Virtanen', 'completed'),
    (trip_2, 'Tr7Pd5Ns8V', demo_company, order_2, customer_2, vehicle_2, driver_2, now() - interval '5 days', now() - interval '5 days' + interval '8 hours', 244610, 245180, 570, 50, 'Long-haul replenishment completed overnight.', 'Dock receipt confirmed', 'invoiced'),
    (trip_3, 'Tx4Qw9Er2L', demo_company, order_3, customer_3, vehicle_3, driver_3, now() - interval '4 hours', null, 98210, null, null, 20, 'Driver reported crane-site congestion.', null, 'started'),
    (trip_4, 'Ty6Mn3Kp8R', demo_company, order_4, customer_2, vehicle_1, driver_1, now() + interval '1 day', null, null, null, null, 0, 'Pre-dispatched for morning departure.', null, 'planned'),
    (trip_5, 'Tz2Hv7Lc5B', demo_company, order_5, customer_1, null, null, now() + interval '3 days', null, null, null, null, 15, 'Placeholder trip created before final assignment.', null, 'planned')
  on conflict (id) do update set
    public_id = excluded.public_id,
    transport_order_id = excluded.transport_order_id,
    customer_id = excluded.customer_id,
    vehicle_id = excluded.vehicle_id,
    driver_id = excluded.driver_id,
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    start_km = excluded.start_km,
    end_km = excluded.end_km,
    distance_km = excluded.distance_km,
    waiting_time_minutes = excluded.waiting_time_minutes,
    notes = excluded.notes,
    delivery_confirmation = excluded.delivery_confirmation,
    status = excluded.status;

  insert into public.invoices (id, company_id, customer_id, trip_id, invoice_number, issue_date, due_date, reference_number, status, subtotal, vat_total, total, notes)
  values
    (invoice_1, demo_company, customer_2, trip_2, 'INV-0001', current_date - 5, current_date - 1, '1200456', 'paid', 1050.00, 267.75, 1317.75, 'Retail replenishment route billed from completed trip.'),
    (invoice_2, demo_company, customer_1, trip_1, 'INV-0002', current_date - 8, current_date + 6, '1200457', 'partially_paid', 860.00, 219.30, 1079.30, 'Timber delivery including waiting time at terminal.'),
    (invoice_3, demo_company, customer_3, null, 'INV-0003', current_date - 12, current_date - 2, '1200458', 'overdue', 720.00, 183.60, 903.60, 'Advance mobilisation fee for construction site haulage.')
  on conflict (company_id, invoice_number) do update set
    customer_id = excluded.customer_id,
    trip_id = excluded.trip_id,
    issue_date = excluded.issue_date,
    due_date = excluded.due_date,
    reference_number = excluded.reference_number,
    status = excluded.status,
    subtotal = excluded.subtotal,
    vat_total = excluded.vat_total,
    total = excluded.total,
    notes = excluded.notes;

  delete from public.invoice_items where invoice_id in (invoice_1, invoice_2, invoice_3);

  insert into public.invoice_items (invoice_id, description, quantity, unit_price, vat_rate, line_total)
  values
    (invoice_1, 'Transport service', 1, 1050.00, 25.50, 1050.00),
    (invoice_2, 'Transport service', 1, 800.00, 25.50, 800.00),
    (invoice_2, 'Waiting time', 1, 60.00, 25.50, 60.00),
    (invoice_3, 'Mobilisation and route planning', 1, 720.00, 25.50, 720.00);

  delete from public.payments where invoice_id in (invoice_1, invoice_2, invoice_3);

  insert into public.payments (company_id, invoice_id, payment_date, amount, payment_method, reference)
  values
    (demo_company, invoice_1, current_date - 1, 1317.75, 'Bank transfer', 'NRL-AR-0001'),
    (demo_company, invoice_2, current_date - 2, 540.00, 'Bank transfer', 'NRL-AR-0002');

  insert into public.company_app_settings (
    company_id,
    order_prefix,
    order_next_number,
    invoice_prefix,
    invoice_next_number,
    default_payment_terms_days,
    default_vat_rate,
    fuel_cost_per_km,
    maintenance_cost_per_km,
    driver_cost_per_hour,
    waiting_cost_per_hour,
    default_currency,
    invoice_footer,
    brand_accent
  )
  values (
    demo_company,
    'ORD',
    6,
    'INV',
    4,
    14,
    25.50,
    0.42,
    0.18,
    32.00,
    24.00,
    'EUR',
    'Payment by due date. Reference number required on all bank transfers.',
    '#0f172a'
  )
  on conflict (company_id) do update set
    order_prefix = excluded.order_prefix,
    order_next_number = excluded.order_next_number,
    invoice_prefix = excluded.invoice_prefix,
    invoice_next_number = excluded.invoice_next_number,
    default_payment_terms_days = excluded.default_payment_terms_days,
    default_vat_rate = excluded.default_vat_rate,
    fuel_cost_per_km = excluded.fuel_cost_per_km,
    maintenance_cost_per_km = excluded.maintenance_cost_per_km,
    driver_cost_per_hour = excluded.driver_cost_per_hour,
    waiting_cost_per_hour = excluded.waiting_cost_per_hour,
    default_currency = excluded.default_currency,
    invoice_footer = excluded.invoice_footer,
    brand_accent = excluded.brand_accent;

  insert into public.documents (company_id, related_type, related_id, file_name, file_path, mime_type)
  values
    (demo_company, 'trip', trip_1, 'delivery-note-trip-1.pdf', 'demo/trips/delivery-note-trip-1.pdf', 'application/pdf')
  on conflict do nothing;

  insert into public.audit_logs (company_id, entity_type, entity_id, action, new_values)
  values
    (demo_company, 'seed', demo_company, 'seed_demo_dataset', jsonb_build_object('company', 'Northern Route Logistics Oy'))
  on conflict do nothing;

  select id into first_user from auth.users order by created_at asc limit 1;

  if first_user is not null then
    insert into public.profiles (id, full_name, phone)
    values (first_user, 'Demo Owner', '+358400000001')
    on conflict (id) do update set
      full_name = excluded.full_name,
      phone = excluded.phone;

    insert into public.company_users (company_id, user_id, role, is_active)
    values (demo_company, first_user, 'owner', true)
    on conflict (company_id, user_id) do update set
      role = excluded.role,
      is_active = excluded.is_active;
  end if;

  update public.drivers d
  set auth_user_id = matched.user_id
  from (
    select distinct on (driver_row.id)
      driver_row.id,
      cu.user_id
    from public.drivers driver_row
    join public.company_users cu
      on cu.company_id = driver_row.company_id
     and cu.is_active = true
     and cu.role = 'driver'
    left join public.profiles p
      on p.id = cu.user_id
    left join auth.users u
      on u.id = cu.user_id
    where driver_row.company_id = demo_company
      and driver_row.auth_user_id is null
      and (
        lower(coalesce(driver_row.email, '')) = lower(coalesce(u.email, ''))
        or lower(coalesce(driver_row.full_name, '')) = lower(coalesce(p.full_name, ''))
      )
    order by
      driver_row.id,
      case
        when lower(coalesce(driver_row.email, '')) = lower(coalesce(u.email, '')) then 0
        else 1
      end,
      cu.created_at asc
  ) as matched
  where d.id = matched.id
    and d.auth_user_id is null;
end $$;

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
