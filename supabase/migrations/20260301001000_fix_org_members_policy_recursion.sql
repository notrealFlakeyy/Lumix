-- Fix: org_members RLS policy recursion (42P17).
-- RLS policies on a table must not query that same table.
-- For MVP we only need members to read their own membership row; membership writes are done via service role.

drop policy if exists "org_members_select_member" on org_members;
drop policy if exists "org_members_manage_owner_admin" on org_members;
drop policy if exists "org_members_select_self_or_admin" on org_members;
drop policy if exists "org_members_insert_owner_admin" on org_members;
drop policy if exists "org_members_update_owner_admin" on org_members;
drop policy if exists "org_members_delete_owner_admin" on org_members;

create policy "org_members_select_self"
  on org_members for select
  using (user_id = auth.uid());

-- Prevent direct writes from client sessions (use service role / admin routes).
create policy "org_members_insert_disabled"
  on org_members for insert
  with check (false);

create policy "org_members_update_disabled"
  on org_members for update
  using (false)
  with check (false);

create policy "org_members_delete_disabled"
  on org_members for delete
  using (false);

