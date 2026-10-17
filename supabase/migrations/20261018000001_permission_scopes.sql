-- Permission scopes.
--
--   ACTION  what you do      view | create (add) | update (edit) | delete | approve | export
--   SCOPE   how far it reaches   own | team | all
--
-- A grant for (role or user, module, action) is one of:
--   denied                      allowed = false
--   allowed                     allowed = true,  scope = null     (actions that take no scope, e.g. Add)
--   allowed with a scope        allowed = true,  scope = own|team|all
-- Each module declares its actions in core.module_actions and whether each one takes a scope.
--
-- Example, module "Sale orders":
--   Salesperson       view -> own   add   edit -> own   delete -> denied
--   Sales supervisor  view -> team  add   edit -> own   delete -> denied
--   Sales manager     view -> all   add   edit -> all   delete -> denied

-- ------------------------------------------------------------------------------------------------
-- 1. What used to be called "scopes" are actions
-- ------------------------------------------------------------------------------------------------
drop policy scopes_select on core.scopes;
drop policy scopes_write  on core.scopes;
drop trigger scopes_grant_super_admin  on core.scopes;
drop trigger modules_grant_super_admin on core.modules;
drop function core.grant_super_admin_on_catalog_insert();

alter table core.scopes rename to actions;
alter table core.actions rename constraint scopes_pkey to actions_pkey;
alter table core.actions rename constraint scopes_code_check to actions_code_check;

alter table core.role_permissions rename column scope to action;
alter table core.user_permissions rename column scope to action;
alter table core.role_permissions rename constraint role_permissions_scope_fkey to role_permissions_action_fkey;
alter table core.user_permissions rename constraint user_permissions_scope_fkey to user_permissions_action_fkey;

-- ------------------------------------------------------------------------------------------------
-- 2. Scopes: how far an action reaches. Wider number = wider reach.
-- ------------------------------------------------------------------------------------------------
create table core.scopes (
  code        text primary key check (code ~ '^[a-z][a-z0-9_]*$'),
  name        text not null,
  description text,
  rank        int  not null unique check (rank > 0)
);
insert into core.scopes (code, name, description, rank) values
  ('own',  'Own',  'Only records the person owns',                                     1),
  ('team', 'Team', 'The person''s own records and those of everyone who reports to them', 2),
  ('all',  'All',  'Every record',                                                     3);

-- ------------------------------------------------------------------------------------------------
-- 3. Which actions a module has, and whether each takes a scope
-- ------------------------------------------------------------------------------------------------
create table core.module_actions (
  module_id uuid    not null references core.modules (id) on delete cascade,
  action    text    not null references core.actions (code) on update cascade,
  scoped    boolean not null default false,   -- true: a grant must say own, team or all
  primary key (module_id, action)
);
create index module_actions_action_idx on core.module_actions (action);

-- Existing admin modules: only the actions the app really uses, none of them scoped.
insert into core.module_actions (module_id, action)
select m.id, a.action
from core.modules m
join (values
  ('admin.users', 'view'), ('admin.users', 'create'), ('admin.users', 'update'), ('admin.users', 'delete'),
  ('admin.roles', 'view'), ('admin.roles', 'create'), ('admin.roles', 'update'), ('admin.roles', 'delete'),
  ('admin.permissions', 'view'), ('admin.permissions', 'update'),
  ('admin.modules', 'view'), ('admin.modules', 'update'),
  ('admin.settings', 'view'), ('admin.settings', 'update')
) as a(code, action) on a.code = m.code;

delete from core.role_permissions rp
where not exists (select 1 from core.module_actions ma where ma.module_id = rp.module_id and ma.action = rp.action);
delete from core.user_permissions up
where not exists (select 1 from core.module_actions ma where ma.module_id = up.module_id and ma.action = up.action);

alter table core.role_permissions
  add constraint role_permissions_module_action_fkey
  foreign key (module_id, action) references core.module_actions (module_id, action) on delete cascade on update cascade;
alter table core.user_permissions
  add constraint user_permissions_module_action_fkey
  foreign key (module_id, action) references core.module_actions (module_id, action) on delete cascade on update cascade;

-- ------------------------------------------------------------------------------------------------
-- 4. Scope on each grant
-- ------------------------------------------------------------------------------------------------
alter table core.role_permissions add column scope text references core.scopes (code) on update cascade;
alter table core.user_permissions add column scope text references core.scopes (code) on update cascade;
alter table core.role_permissions add constraint role_permissions_scope_needs_allow check (allowed or scope is null);
alter table core.user_permissions add constraint user_permissions_scope_needs_allow check (allowed or scope is null);

-- A scoped action needs a scope when allowed; an unscoped action must not carry one.
create or replace function core.validate_grant()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_scoped boolean;
begin
  select scoped into v_scoped from core.module_actions where module_id = new.module_id and action = new.action;
  if not found then
    raise exception 'action "%" is not defined for this module', new.action using errcode = '23514';
  end if;
  if new.allowed and v_scoped and new.scope is null then
    raise exception 'a scope (own, team or all) is required for action "%"', new.action using errcode = '23514';
  end if;
  if new.scope is not null and not v_scoped then
    raise exception 'action "%" does not take a scope', new.action using errcode = '23514';
  end if;
  return new;
end $$;
create trigger role_permissions_validate before insert or update on core.role_permissions
  for each row execute function core.validate_grant();
create trigger user_permissions_validate before insert or update on core.user_permissions
  for each row execute function core.validate_grant();

-- The system super_admin role holds every declared action, at the widest scope.
-- Keep that true when module actions are added, and keep rows valid if "scoped" is flipped.
create or replace function core.on_module_action_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into core.role_permissions (role_id, module_id, action, allowed, scope)
    select r.id, new.module_id, new.action, true, case when new.scoped then 'all' end
    from core.roles r
    where r.code = 'super_admin'
    on conflict do nothing;
  elsif new.scoped is distinct from old.scoped then
    update core.role_permissions
       set scope = case when new.scoped then 'all' end
     where module_id = new.module_id and action = new.action and allowed;
    update core.user_permissions
       set scope = case when new.scoped then 'all' end
     where module_id = new.module_id and action = new.action and allowed;
  end if;
  return new;
end $$;
create trigger module_actions_change after insert or update on core.module_actions
  for each row execute function core.on_module_action_change();

-- ------------------------------------------------------------------------------------------------
-- 5. Teams: who reports to whom
-- ------------------------------------------------------------------------------------------------
alter table core.user_profiles add column reports_to uuid references core.users (id) on delete set null;
alter table core.user_profiles add constraint user_profiles_not_own_manager check (reports_to is distinct from user_id);
create index user_profiles_reports_to_idx on core.user_profiles (reports_to) where reports_to is not null;

-- ------------------------------------------------------------------------------------------------
-- 6. Permission engine
-- ------------------------------------------------------------------------------------------------
drop function core.has_permission(text, text, uuid) cascade;   -- drops every policy that calls it; recreated below
drop function core.effective_permissions(uuid);

-- Level a user has for (module, action):
--   null      no access (denied, not set, inactive user or module, or action not defined)
--   'allowed' access, and the action takes no scope
--   'own' | 'team' | 'all'
-- Order of precedence:
--   1. a user override wins, either way
--   2. otherwise roles: any deny beats any allow; among allows the widest scope wins
--   3. otherwise no access
-- Asking about someone else needs admin.permissions view.
create or replace function core.permission_level(p_module text, p_action text, p_user uuid default auth.uid())
returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  v_module_id uuid;
  v_scoped    boolean;
  v_ov_allow  boolean;
  v_ov_scope  text;
  v_any_deny  boolean;
  v_any_allow boolean;
  v_rank      int;
  v_code      text;
begin
  if p_user is null then return null; end if;
  if auth.uid() is not null and p_user is distinct from auth.uid()
     and core.permission_level('admin.permissions', 'view', auth.uid()) is null then
    return null;
  end if;

  if not exists (select 1 from core.users where id = p_user and is_active) then return null; end if;

  select id into v_module_id from core.modules where code = p_module and is_active;
  if v_module_id is null then return null; end if;

  select scoped into v_scoped from core.module_actions where module_id = v_module_id and action = p_action;
  if not found then return null; end if;

  select allowed, scope into v_ov_allow, v_ov_scope
  from core.user_permissions
  where user_id = p_user and module_id = v_module_id and action = p_action;
  if found then
    if not v_ov_allow then return null; end if;
    return coalesce(v_ov_scope, 'allowed');
  end if;

  select coalesce(bool_or(not rp.allowed), false), coalesce(bool_or(rp.allowed), false), max(s.rank)
    into v_any_deny, v_any_allow, v_rank
  from core.user_roles ur
  join core.roles r on r.id = ur.role_id and r.is_active
  join core.role_permissions rp on rp.role_id = r.id and rp.module_id = v_module_id and rp.action = p_action
  left join core.scopes s on s.code = rp.scope
  where ur.user_id = p_user;

  if v_any_deny or not v_any_allow then return null; end if;
  if not v_scoped then return 'allowed'; end if;
  select code into v_code from core.scopes where rank = v_rank;
  return v_code;   -- null if a scoped grant somehow has no scope: treated as no access
end $$;

create or replace function core.has_permission(p_module text, p_action text, p_user uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = '' as $$
  select core.permission_level(p_module, p_action, p_user) is not null;
$$;

-- Everyone in a user's team: the user plus everyone who reports to them, at any depth.
create or replace function core.team_member_ids(p_user uuid default auth.uid())
returns setof uuid
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_user is null then return; end if;
  if auth.uid() is not null and p_user is distinct from auth.uid()
     and core.permission_level('admin.users', 'view', auth.uid()) is null then
    return;
  end if;
  return query
    with recursive team(id) as (
      select p_user
      union
      select up.user_id from core.user_profiles up join team t on up.reports_to = t.id
    )
    select id from team;
end $$;

-- For row-level security on any module's table. p_owner is the column that says whose row it is.
--   create policy orders_select on orders.sale_orders for select to authenticated
--     using (core.in_scope('orders.sale_orders', 'view', owner_id));
create or replace function core.in_scope(p_module text, p_action text, p_owner uuid, p_user uuid default auth.uid())
returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  v_level text := core.permission_level(p_module, p_action, p_user);
begin
  if v_level is null then return false; end if;
  if v_level in ('all', 'allowed') then return true; end if;
  if p_owner is null then return false; end if;
  if v_level = 'own' then return p_owner = p_user; end if;
  if v_level = 'team' then return exists (select 1 from core.team_member_ids(p_user) t(id) where t.id = p_owner); end if;
  return false;
end $$;

-- Every declared action for a user, resolved, with where the answer came from.
create or replace function core.effective_permissions(p_user uuid default auth.uid())
returns table (module_code text, action text, allowed boolean, scope text, source text)
language sql stable security definer set search_path = '' as $$
  select m.code, ma.action, l.level is not null,
         case when l.level in ('own', 'team', 'all') then l.level end,
         case
           when exists (select 1 from core.user_permissions up where up.user_id = p_user and up.module_id = m.id and up.action = ma.action) then 'user'
           when exists (select 1 from core.user_roles ur join core.roles r on r.id = ur.role_id and r.is_active
                          join core.role_permissions rp on rp.role_id = r.id
                         where ur.user_id = p_user and rp.module_id = m.id and rp.action = ma.action) then 'role'
           else 'default'
         end
  from core.modules m
  join core.module_actions ma on ma.module_id = m.id
  join core.actions a on a.code = ma.action
  cross join lateral (select core.permission_level(m.code, ma.action, p_user) as level) l
  where m.is_active
    and (p_user = auth.uid() or core.permission_level('admin.permissions', 'view') is not null)
  order by m.sort_order, m.code, a.sort_order;
$$;

-- Only signed-in users call these over the API; asking about others is checked inside.
revoke all on function core.permission_level(text, text, uuid) from public, anon;
revoke all on function core.has_permission(text, text, uuid) from public, anon;
revoke all on function core.team_member_ids(uuid) from public, anon;
revoke all on function core.in_scope(text, text, uuid, uuid) from public, anon;
revoke all on function core.effective_permissions(uuid) from public, anon;
grant execute on function core.permission_level(text, text, uuid) to authenticated, service_role;
grant execute on function core.has_permission(text, text, uuid) to authenticated, service_role;
grant execute on function core.team_member_ids(uuid) to authenticated, service_role;
grant execute on function core.in_scope(text, text, uuid, uuid) to authenticated, service_role;
grant execute on function core.effective_permissions(uuid) to authenticated, service_role;

-- A manager cannot report to someone on their own team.
create or replace function core.prevent_reporting_cycle()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.reports_to is not null and (tg_op = 'INSERT' or new.reports_to is distinct from old.reports_to) then
    if exists (
      with recursive team(id) as (
        select new.user_id
        union
        select up.user_id from core.user_profiles up join team t on up.reports_to = t.id
      )
      select 1 from team where id = new.reports_to
    ) then
      raise exception 'reporting line would form a loop' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;
create trigger user_profiles_no_cycle before insert or update on core.user_profiles
  for each row execute function core.prevent_reporting_cycle();

-- Reporting line is an employment field: needs admin.users update.
create or replace function core.guard_profile_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if core.has_permission('admin.users', 'update') or auth.uid() is null then
    return new;
  end if;
  if new.employee_code is distinct from old.employee_code
     or new.position    is distinct from old.position
     or new.department  is distinct from old.department
     or new.hire_date   is distinct from old.hire_date
     or new.reports_to  is distinct from old.reports_to
     or new.user_id     is distinct from old.user_id then
    raise exception 'insufficient privilege to change employment fields'
      using errcode = '42501';
  end if;
  return new;
end $$;

-- ------------------------------------------------------------------------------------------------
-- 7. Row-level security: recreate every policy (dropping has_permission removed them)
-- ------------------------------------------------------------------------------------------------
alter table core.scopes         enable row level security;
alter table core.module_actions enable row level security;

drop policy if exists users_select on core.users;
drop policy if exists users_insert on core.users;
drop policy if exists users_update on core.users;
drop policy if exists users_delete on core.users;
create policy users_select on core.users for select to authenticated
  using (id = auth.uid() or core.has_permission('admin.users', 'view'));
create policy users_insert on core.users for insert to authenticated
  with check (core.has_permission('admin.users', 'create'));
create policy users_update on core.users for update to authenticated
  using (core.has_permission('admin.users', 'update'))
  with check (core.has_permission('admin.users', 'update'));
create policy users_delete on core.users for delete to authenticated
  using (core.has_permission('admin.users', 'delete'));

drop policy if exists profiles_select on core.user_profiles;
drop policy if exists profiles_insert on core.user_profiles;
drop policy if exists profiles_update on core.user_profiles;
drop policy if exists profiles_delete on core.user_profiles;
create policy profiles_select on core.user_profiles for select to authenticated
  using (user_id = auth.uid() or core.has_permission('admin.users', 'view'));
create policy profiles_insert on core.user_profiles for insert to authenticated
  with check (core.has_permission('admin.users', 'create'));
create policy profiles_update on core.user_profiles for update to authenticated
  using (user_id = auth.uid() or core.has_permission('admin.users', 'update'))
  with check (user_id = auth.uid() or core.has_permission('admin.users', 'update'));
create policy profiles_delete on core.user_profiles for delete to authenticated
  using (core.has_permission('admin.users', 'delete'));

-- catalogs: readable by any signed-in user (the UI needs them); writes need admin.modules update
drop policy if exists modules_write on core.modules;
create policy modules_write on core.modules for all to authenticated
  using (core.has_permission('admin.modules', 'update'))
  with check (core.has_permission('admin.modules', 'update'));

create policy actions_select on core.actions for select to authenticated using (true);
create policy actions_write on core.actions for all to authenticated
  using (core.has_permission('admin.modules', 'update'))
  with check (core.has_permission('admin.modules', 'update'));

create policy scopes_select on core.scopes for select to authenticated using (true);
create policy scopes_write on core.scopes for all to authenticated
  using (core.has_permission('admin.modules', 'update'))
  with check (core.has_permission('admin.modules', 'update'));

create policy module_actions_select on core.module_actions for select to authenticated using (true);
create policy module_actions_write on core.module_actions for all to authenticated
  using (core.has_permission('admin.modules', 'update'))
  with check (core.has_permission('admin.modules', 'update'));

drop policy if exists roles_select on core.roles;
drop policy if exists roles_insert on core.roles;
drop policy if exists roles_update on core.roles;
drop policy if exists roles_delete on core.roles;
create policy roles_select on core.roles for select to authenticated
  using (core.has_permission('admin.roles', 'view')
         or exists (select 1 from core.user_roles ur where ur.role_id = id and ur.user_id = auth.uid()));
create policy roles_insert on core.roles for insert to authenticated
  with check (core.has_permission('admin.roles', 'create'));
create policy roles_update on core.roles for update to authenticated
  using (core.has_permission('admin.roles', 'update'))
  with check (core.has_permission('admin.roles', 'update'));
create policy roles_delete on core.roles for delete to authenticated
  using (core.has_permission('admin.roles', 'delete') and not is_system);

drop policy if exists user_roles_select on core.user_roles;
drop policy if exists user_roles_write on core.user_roles;
create policy user_roles_select on core.user_roles for select to authenticated
  using (user_id = auth.uid() or core.has_permission('admin.roles', 'view'));
create policy user_roles_write on core.user_roles for all to authenticated
  using (core.has_permission('admin.roles', 'update'))
  with check (core.has_permission('admin.roles', 'update'));

drop policy if exists role_permissions_select on core.role_permissions;
drop policy if exists role_permissions_write on core.role_permissions;
create policy role_permissions_select on core.role_permissions for select to authenticated
  using (core.has_permission('admin.permissions', 'view'));
create policy role_permissions_write on core.role_permissions for all to authenticated
  using (core.has_permission('admin.permissions', 'update'))
  with check (core.has_permission('admin.permissions', 'update'));

drop policy if exists user_permissions_select on core.user_permissions;
drop policy if exists user_permissions_write on core.user_permissions;
create policy user_permissions_select on core.user_permissions for select to authenticated
  using (user_id = auth.uid() or core.has_permission('admin.permissions', 'view'));
create policy user_permissions_write on core.user_permissions for all to authenticated
  using (core.has_permission('admin.permissions', 'update'))
  with check (core.has_permission('admin.permissions', 'update'));

grant select, insert, update, delete on core.scopes, core.module_actions to authenticated;
revoke all on core.scopes, core.module_actions from anon;

-- ------------------------------------------------------------------------------------------------
-- 8. First scoped module: Sale orders (HIG Orders). Actions: view, add, edit, delete.
--    View, edit and delete take a scope; add does not. super_admin is granted everything by the trigger.
-- ------------------------------------------------------------------------------------------------
with m as (
  insert into core.modules (app, code, name, description, sort_order)
  values ('orders', 'orders.sale_orders', 'Sale orders', 'Sales orders raised for customers', 100)
  returning id
)
insert into core.module_actions (module_id, action, scoped)
select m.id, a.action, a.scoped
from m, (values ('view', true), ('create', false), ('update', true), ('delete', true)) as a(action, scoped);
