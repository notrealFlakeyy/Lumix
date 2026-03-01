-- Fix RLS recursion for org membership reads.
-- Previous policies referenced is_org_member/has_org_role which query org_members,
-- but org_members itself was not readable, causing membership lookups to return no rows.

drop policy if exists "org_members_select_member" on org_members;
drop policy if exists "org_members_manage_owner_admin" on org_members;

create policy "org_members_select_self_or_admin"
  on org_members for select
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from org_members m
      where m.org_id = org_members.org_id
        and m.user_id = auth.uid()
        and m.role in ('owner','admin')
    )
  );

create policy "org_members_insert_owner_admin"
  on org_members for insert
  with check (
    exists (
      select 1
      from org_members m
      where m.org_id = org_members.org_id
        and m.user_id = auth.uid()
        and m.role in ('owner','admin')
    )
  );

create policy "org_members_update_owner_admin"
  on org_members for update
  using (
    exists (
      select 1
      from org_members m
      where m.org_id = org_members.org_id
        and m.user_id = auth.uid()
        and m.role in ('owner','admin')
    )
  )
  with check (
    exists (
      select 1
      from org_members m
      where m.org_id = org_members.org_id
        and m.user_id = auth.uid()
        and m.role in ('owner','admin')
    )
  );

create policy "org_members_delete_owner_admin"
  on org_members for delete
  using (
    exists (
      select 1
      from org_members m
      where m.org_id = org_members.org_id
        and m.user_id = auth.uid()
        and m.role in ('owner','admin')
    )
  );

