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

  insert into public.drivers (id, company_id, full_name, phone, email, license_type, employment_type, is_active)
  values
    (driver_1, demo_company, 'Mika Lehtinen', '+358401009900', 'mika.lehtinen@northernroute.fi', 'CE', 'Full-time', true),
    (driver_2, demo_company, 'Jari Koskela', '+358401009901', 'jari.koskela@northernroute.fi', 'CE', 'Full-time', true),
    (driver_3, demo_company, 'Antti Niemi', '+358401009902', 'antti.niemi@northernroute.fi', 'CE', 'Contract', true)
  on conflict (id) do update set
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

  insert into public.trips (id, company_id, transport_order_id, customer_id, vehicle_id, driver_id, start_time, end_time, start_km, end_km, distance_km, waiting_time_minutes, notes, delivery_confirmation, status)
  values
    (trip_1, demo_company, order_1, customer_1, vehicle_1, driver_1, now() - interval '8 days', now() - interval '8 days' + interval '4 hours', 181920, 182340, 420, 35, 'Delivered on schedule with terminal queue.', 'Signed by H. Virtanen', 'completed'),
    (trip_2, demo_company, order_2, customer_2, vehicle_2, driver_2, now() - interval '5 days', now() - interval '5 days' + interval '8 hours', 244610, 245180, 570, 50, 'Long-haul replenishment completed overnight.', 'Dock receipt confirmed', 'invoiced'),
    (trip_3, demo_company, order_3, customer_3, vehicle_3, driver_3, now() - interval '4 hours', null, 98210, null, null, 20, 'Driver reported crane-site congestion.', null, 'started'),
    (trip_4, demo_company, order_4, customer_2, vehicle_1, driver_1, now() + interval '1 day', null, null, null, null, 0, 'Pre-dispatched for morning departure.', null, 'planned'),
    (trip_5, demo_company, order_5, customer_1, null, null, now() + interval '3 days', null, null, null, null, 15, 'Placeholder trip created before final assignment.', null, 'planned')
  on conflict (id) do update set
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
end $$;
