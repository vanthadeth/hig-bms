-- HIG core: users, profiles, modules, scopes, roles, role/user permissions.
-- Login credentials live in Supabase auth.users; core.users is the app-level
-- account row keyed by the same id.

create schema if not exists core;

-- ---------------------------------------------------------------- helpers
create or replace function core.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ------------------------------------------------------------------ users
-- Basic login information.
create table core.users (
  id            uuid primary key references auth.users (id) on delete cascade,
  username      text not null,
  email         text,
  phone         text,
  is_active     boolean not null default true,
  last_login_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint users_username_format check (username ~ '^[a-z0-9._-]{3,40}$')
);
create unique index users_username_key on core.users (lower(username));
create unique index users_email_key    on core.users (lower(email)) where email is not null;
create unique index users_phone_key    on core.users (phone)        where phone is not null;
create trigger users_updated_at before update on core.users
  for each row execute function core.set_updated_at();

-- Other information related to the user.
create table core.user_profiles (
  user_id        uuid primary key references core.users (id) on delete cascade,
  employee_code  text unique,
  full_name      text not null default '',
  full_name_km   text,
  gender         text check (gender in ('male', 'female', 'other')),
  date_of_birth  date,
  photo_path     text,
  position       text,
  department     text,
  hire_date      date,
  address        text,
  emergency_contact_name  text,
  emergency_contact_phone text,
  locale         text not null default 'km' check (locale in ('km', 'en')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger user_profiles_updated_at before update on core.user_profiles
  for each row execute function core.set_updated_at();

-- Create core.users + empty profile when an auth user is created.
-- username defaults to the email local-part; admin tooling may pass
-- raw_user_meta_data.username / full_name.
create or replace function core.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_username text;
begin
  v_username := lower(coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    split_part(coalesce(new.email, new.id::text), '@', 1)
  ));
  v_username := regexp_replace(v_username, '[^a-z0-9._-]', '', 'g');
  if length(v_username) < 3 then
    v_username := 'user' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;
  -- keep usernames unique when a derived one collides
  if exists (select 1 from core.users where lower(username) = v_username) then
    v_username := left(v_username, 31) || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;

  insert into core.users (id, username, email, phone)
  values (new.id, v_username, new.email, nullif(new.phone, ''));

  insert into core.user_profiles (user_id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function core.handle_new_auth_user();

-- ---------------------------------------------------------------- modules
-- A module is an app function that permissions are assigned against,
-- e.g. admin.users, footprints.attendance, dispatch.shipments.
create table core.modules (
  id          uuid primary key default gen_random_uuid(),
  app         text not null check (app ~ '^[a-z][a-z0-9_]*$'),
  code        text not null unique check (code ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'),
  name        text not null,
  description text,
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint modules_code_matches_app check (code like app || '.%')
);
create trigger modules_updated_at before update on core.modules
  for each row execute function core.set_updated_at();

-- Scopes: what the permission lets you do. A lookup table (not an enum) so
-- data-reach scopes such as own / team / branch / all can be added later
-- without a schema migration.
create table core.scopes (
  code        text primary key check (code ~ '^[a-z][a-z0-9_]*$'),
  name        text not null,
  description text,
  sort_order  int  not null default 0
);

-- ------------------------------------------------------------------ roles
create table core.roles (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique check (code ~ '^[a-z][a-z0-9_]*$'),
  name        text not null,
  description text,
  is_system   boolean not null default false,  -- seeded; cannot be deleted
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger roles_updated_at before update on core.roles
  for each row execute function core.set_updated_at();

create table core.user_roles (
  user_id    uuid not null references core.users (id) on delete cascade,
  role_id    uuid not null references core.roles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);
create index user_roles_role_idx on core.user_roles (role_id);

-- ------------------------------------------------------------ permissions
create table core.role_permissions (
  role_id    uuid not null references core.roles (id)   on delete cascade,
  module_id  uuid not null references core.modules (id) on delete cascade,
  scope      text not null references core.scopes (code) on update cascade,
  allowed    boolean not null,           -- true = allowed, false = denied
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (role_id, module_id, scope)
);
create index role_permissions_module_idx on core.role_permissions (module_id);
create trigger role_permissions_updated_at before update on core.role_permissions
  for each row execute function core.set_updated_at();

-- Per-user override of role permissions, in both directions.
create table core.user_permissions (
  user_id    uuid not null references core.users (id)   on delete cascade,
  module_id  uuid not null references core.modules (id) on delete cascade,
  scope      text not null references core.scopes (code) on update cascade,
  allowed    boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, module_id, scope)
);
create index user_permissions_module_idx on core.user_permissions (module_id);
create trigger user_permissions_updated_at before update on core.user_permissions
  for each row execute function core.set_updated_at();

-- ------------------------------------------------------ permission engine
-- Resolution order:
--   1. user override (core.user_permissions)      -> its allowed flag wins
--   2. roles of the user (active roles only)      -> any deny beats any allow
--   3. nothing matched                            -> denied
-- Inactive users / modules always resolve to denied.
create or replace function core.has_permission(
  p_module text,
  p_scope  text,
  p_user   uuid default auth.uid()
) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  v_module_id uuid;
  v_override  boolean;
  v_role_res  boolean;
begin
  if p_user is null then return false; end if;

  if not exists (select 1 from core.users where id = p_user and is_active) then
    return false;
  end if;

  select id into v_module_id from core.modules where code = p_module and is_active;
  if v_module_id is null then return false; end if;

  select allowed into v_override
  from core.user_permissions
  where user_id = p_user and module_id = v_module_id and scope = p_scope;
  if found then return v_override; end if;

  select bool_and(rp.allowed) into v_role_res
  from core.user_roles ur
  join core.roles r on r.id = ur.role_id and r.is_active
  join core.role_permissions rp on rp.role_id = r.id
  where ur.user_id = p_user and rp.module_id = v_module_id and rp.scope = p_scope;

  return coalesce(v_role_res, false);
end $$;

-- Effective permissions for a user (for UI gating and the admin "why" view).
create or replace function core.effective_permissions(p_user uuid default auth.uid())
returns table (module_code text, scope text, allowed boolean, source text)
language sql stable security definer set search_path = '' as $$
  with combos as (
    select m.id as module_id, m.code, s.code as scope
    from core.modules m cross join core.scopes s
    where m.is_active
  ), res as (
    select c.code as module_code, c.scope,
           up.allowed as override_allowed,
           (select bool_and(rp.allowed)
              from core.user_roles ur
              join core.roles r on r.id = ur.role_id and r.is_active
              join core.role_permissions rp on rp.role_id = r.id
             where ur.user_id = p_user and rp.module_id = c.module_id and rp.scope = c.scope
           ) as role_allowed
    from combos c
    left join core.user_permissions up
      on up.user_id = p_user and up.module_id = c.module_id and up.scope = c.scope
  )
  select module_code, scope,
         case when not exists (select 1 from core.users where id = p_user and is_active) then false
              else coalesce(override_allowed, role_allowed, false) end,
         case when override_allowed is not null then 'user'
              when role_allowed is not null then 'role'
              else 'default' end
  from res
  where p_user = auth.uid() or core.has_permission('admin.permissions', 'view');
$$;

-- --------------------------------------------------------------------- RLS
alter table core.users            enable row level security;
alter table core.user_profiles    enable row level security;
alter table core.modules          enable row level security;
alter table core.scopes           enable row level security;
alter table core.roles            enable row level security;
alter table core.user_roles       enable row level security;
alter table core.role_permissions enable row level security;
alter table core.user_permissions enable row level security;

-- users: self can read; admin.users scopes for everything else.
create policy users_select on core.users for select to authenticated
  using (id = auth.uid() or core.has_permission('admin.users', 'view'));
create policy users_insert on core.users for insert to authenticated
  with check (core.has_permission('admin.users', 'create'));
create policy users_update on core.users for update to authenticated
  using (core.has_permission('admin.users', 'update'))
  with check (core.has_permission('admin.users', 'update'));
create policy users_delete on core.users for delete to authenticated
  using (core.has_permission('admin.users', 'delete'));

-- profiles: self can read; self may edit own via the column grant below.
create policy profiles_select on core.user_profiles for select to authenticated
  using (user_id = auth.uid() or core.has_permission('admin.users', 'view'));
create policy profiles_insert on core.user_profiles for insert to authenticated
  with check (core.has_permission('admin.users', 'create'));
create policy profiles_update on core.user_profiles for update to authenticated
  using (user_id = auth.uid() or core.has_permission('admin.users', 'update'))
  with check (user_id = auth.uid() or core.has_permission('admin.users', 'update'));
create policy profiles_delete on core.user_profiles for delete to authenticated
  using (core.has_permission('admin.users', 'delete'));

-- catalogs: readable by any signed-in user (needed to render UI); writes gated.
create policy modules_select on core.modules for select to authenticated using (true);
create policy modules_write  on core.modules for all to authenticated
  using (core.has_permission('admin.modules', 'update'))
  with check (core.has_permission('admin.modules', 'update'));

create policy scopes_select on core.scopes for select to authenticated using (true);
create policy scopes_write  on core.scopes for all to authenticated
  using (core.has_permission('admin.modules', 'update'))
  with check (core.has_permission('admin.modules', 'update'));

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

create policy user_roles_select on core.user_roles for select to authenticated
  using (user_id = auth.uid() or core.has_permission('admin.roles', 'view'));
create policy user_roles_write on core.user_roles for all to authenticated
  using (core.has_permission('admin.roles', 'update'))
  with check (core.has_permission('admin.roles', 'update'));

create policy role_permissions_select on core.role_permissions for select to authenticated
  using (core.has_permission('admin.permissions', 'view'));
create policy role_permissions_write on core.role_permissions for all to authenticated
  using (core.has_permission('admin.permissions', 'update'))
  with check (core.has_permission('admin.permissions', 'update'));

create policy user_permissions_select on core.user_permissions for select to authenticated
  using (user_id = auth.uid() or core.has_permission('admin.permissions', 'view'));
create policy user_permissions_write on core.user_permissions for all to authenticated
  using (core.has_permission('admin.permissions', 'update'))
  with check (core.has_permission('admin.permissions', 'update'));

-- Column-level guard: a normal user may only edit their own non-sensitive
-- profile fields; employment fields need admin.users update.
create or replace function core.guard_profile_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if core.has_permission('admin.users', 'update') or auth.uid() is null then
    return new;
  end if;
  if new.employee_code is distinct from old.employee_code
     or new.position   is distinct from old.position
     or new.department is distinct from old.department
     or new.hire_date  is distinct from old.hire_date
     or new.user_id    is distinct from old.user_id then
    raise exception 'insufficient privilege to change employment fields'
      using errcode = '42501';
  end if;
  return new;
end $$;
create trigger user_profiles_guard before update on core.user_profiles
  for each row execute function core.guard_profile_update();

-- Same idea for core.users: self-service is read-only (login changes go
-- through Supabase Auth), so no self-update policy exists.

-- ------------------------------------------------------------------ grants
grant usage on schema core to authenticated;
grant select, insert, update, delete on all tables in schema core to authenticated;
grant execute on function core.has_permission(text, text, uuid)  to authenticated;
grant execute on function core.effective_permissions(uuid)       to authenticated;
revoke all on all tables in schema core from anon;

-- The system super_admin role always holds every module x scope. Keep that
-- true when modules or scopes are added later.
create or replace function core.grant_super_admin_on_catalog_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'modules' then
    insert into core.role_permissions (role_id, module_id, scope, allowed)
    select r.id, new.id, s.code, true
    from core.roles r cross join core.scopes s
    where r.code = 'super_admin'
    on conflict do nothing;
  else
    insert into core.role_permissions (role_id, module_id, scope, allowed)
    select r.id, m.id, new.code, true
    from core.roles r cross join core.modules m
    where r.code = 'super_admin'
    on conflict do nothing;
  end if;
  return new;
end $$;
create trigger modules_grant_super_admin after insert on core.modules
  for each row execute function core.grant_super_admin_on_catalog_insert();
create trigger scopes_grant_super_admin after insert on core.scopes
  for each row execute function core.grant_super_admin_on_catalog_insert();

-- ------------------------------------------------------------------- seeds
insert into core.scopes (code, name, description, sort_order) values
  ('view',    'View',    'Read records',                1),
  ('create',  'Create',  'Create new records',          2),
  ('update',  'Update',  'Edit existing records',       3),
  ('delete',  'Delete',  'Delete records',              4),
  ('approve', 'Approve', 'Approve or reject requests',  5),
  ('export',  'Export',  'Export / download data',      6);

insert into core.modules (app, code, name, description, sort_order) values
  ('admin', 'admin.users',       'Users',       'User accounts and profiles',         10),
  ('admin', 'admin.roles',       'Roles',       'Roles and user-role assignment',     20),
  ('admin', 'admin.permissions', 'Permissions', 'Role and user permission settings',  30),
  ('admin', 'admin.modules',     'Modules',     'Module and scope catalog',           40),
  ('admin', 'admin.settings',    'Settings',    'System settings',                    50);

insert into core.roles (code, name, description, is_system) values
  ('super_admin', 'Super Admin', 'Full access to every module and scope', true);

insert into core.role_permissions (role_id, module_id, scope, allowed)
select r.id, m.id, s.code, true
from core.roles r, core.modules m, core.scopes s
where r.code = 'super_admin';
