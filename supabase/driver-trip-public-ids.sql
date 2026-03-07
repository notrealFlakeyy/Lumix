-- Add short public route IDs for drivers and trips.
-- Safe to run in Supabase SQL Editor for an existing project.

create or replace function public.generate_public_id(target_length integer default 10)
returns text
language plpgsql
as $$
declare
  chars constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  output text := '';
  index_value integer;
begin
  if target_length is null or target_length < 8 then
    target_length := 8;
  end if;

  while length(output) < target_length loop
    index_value := floor(random() * length(chars) + 1)::integer;
    output := output || substr(chars, index_value, 1);
  end loop;

  return output;
end;
$$;

create or replace function public.assign_public_id()
returns trigger
language plpgsql
as $$
declare
  candidate text;
  exists_match boolean;
  attempt_count integer := 0;
  target_length integer := greatest(coalesce(nullif(TG_ARGV[0], '')::integer, 10), 8);
begin
  if new.public_id is not null and btrim(new.public_id) <> '' then
    return new;
  end if;

  loop
    attempt_count := attempt_count + 1;

    if attempt_count > 25 then
      raise exception 'Unable to generate unique public_id for %.%', TG_TABLE_SCHEMA, TG_TABLE_NAME;
    end if;

    candidate := public.generate_public_id(target_length);

    execute format(
      'select exists (select 1 from %I.%I where public_id = $1)',
      TG_TABLE_SCHEMA,
      TG_TABLE_NAME
    )
      into exists_match
      using candidate;

    if not exists_match then
      new.public_id := candidate;
      return new;
    end if;
  end loop;
end;
$$;

alter table public.drivers add column if not exists public_id text;
alter table public.trips add column if not exists public_id text;

do $$
declare
  record_id uuid;
  candidate text;
begin
  for record_id in select id from public.drivers where public_id is null loop
    loop
      candidate := public.generate_public_id(10);
      exit when not exists (select 1 from public.drivers where public_id = candidate);
    end loop;

    update public.drivers
    set public_id = candidate
    where id = record_id;
  end loop;

  for record_id in select id from public.trips where public_id is null loop
    loop
      candidate := public.generate_public_id(10);
      exit when not exists (select 1 from public.trips where public_id = candidate);
    end loop;

    update public.trips
    set public_id = candidate
    where id = record_id;
  end loop;
end $$;

alter table public.drivers alter column public_id drop default;
alter table public.trips alter column public_id drop default;

alter table public.drivers alter column public_id set not null;
alter table public.trips alter column public_id set not null;

create unique index if not exists idx_drivers_public_id on public.drivers(public_id);
create unique index if not exists idx_trips_public_id on public.trips(public_id);

drop trigger if exists set_drivers_public_id on public.drivers;
create trigger set_drivers_public_id
before insert on public.drivers
for each row execute function public.assign_public_id('10');

drop trigger if exists set_trips_public_id on public.trips;
create trigger set_trips_public_id
before insert on public.trips
for each row execute function public.assign_public_id('10');

update public.drivers
set public_id = case id
  when '44444444-4444-4444-4444-444444444441'::uuid then 'Mk7Lp2Qa9X'
  when '44444444-4444-4444-4444-444444444442'::uuid then 'Jr4Ns8Wd1K'
  when '44444444-4444-4444-4444-444444444443'::uuid then 'An6Rb3Ty5M'
  else public_id
end
where id in (
  '44444444-4444-4444-4444-444444444441'::uuid,
  '44444444-4444-4444-4444-444444444442'::uuid,
  '44444444-4444-4444-4444-444444444443'::uuid
);

update public.trips
set public_id = case id
  when '66666666-6666-6666-6666-666666666661'::uuid then 'Tp9Xk2Lm4Q'
  when '66666666-6666-6666-6666-666666666662'::uuid then 'Tr7Pd5Ns8V'
  when '66666666-6666-6666-6666-666666666663'::uuid then 'Tx4Qw9Er2L'
  when '66666666-6666-6666-6666-666666666664'::uuid then 'Ty6Mn3Kp8R'
  when '66666666-6666-6666-6666-666666666665'::uuid then 'Tz2Hv7Lc5B'
  else public_id
end
where id in (
  '66666666-6666-6666-6666-666666666661'::uuid,
  '66666666-6666-6666-6666-666666666662'::uuid,
  '66666666-6666-6666-6666-666666666663'::uuid,
  '66666666-6666-6666-6666-666666666664'::uuid,
  '66666666-6666-6666-6666-666666666665'::uuid
);
