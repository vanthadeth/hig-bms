-- Run after the stub and all migrations. Any broken expectation raises an exception.
\set ON_ERROR_STOP on
create or replace function pg_temp.expect(label text, got anyelement, want anyelement) returns void
language plpgsql as $$ begin
  if got is distinct from want then raise exception 'FAIL %: got %, want %', label, got, want; end if;
  raise notice 'ok   %', label;
end $$;
create or replace function pg_temp.fails(label text, stmt text, want_state text) returns void
language plpgsql as $$ begin
  begin
    execute stmt;
  exception when others then
    if sqlstate = want_state then raise notice 'ok   % (rejected: %)', label, sqlstate; return; end if;
    raise exception 'FAIL %: rejected with % (%), wanted %', label, sqlstate, sqlerrm, want_state;
  end;
  raise exception 'FAIL %: statement was accepted', label;
end $$;

-- people: A admin | S supervisor | D, E report to S (E via D) | P salesperson | M manager | X outsider
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-00000000000a', 'admin@hig.test'),
 ('00000000-0000-0000-0000-0000000000a5', 'sup@hig.test'),
 ('00000000-0000-0000-0000-0000000000d1', 'dave@hig.test'),
 ('00000000-0000-0000-0000-0000000000e1', 'erin@hig.test'),
 ('00000000-0000-0000-0000-0000000000b0', 'paul@hig.test'),
 ('00000000-0000-0000-0000-0000000000c0', 'mary@hig.test'),
 ('00000000-0000-0000-0000-0000000000f0', 'xavier@hig.test');

select pg_temp.expect('auth trigger created users', (select count(*) from core.users)::int, 7);
select pg_temp.expect('username derived from email', (select username from core.users where email = 'admin@hig.test'), 'admin');

-- ---- catalog shape
select pg_temp.expect('three scopes in order', (select string_agg(code, ',' order by rank) from core.scopes), 'own,team,all');
select pg_temp.expect('actions table holds view..export', (select count(*) from core.actions)::int, 6);
select pg_temp.expect('sale orders: view is scoped', (select scoped from core.module_actions ma join core.modules m on m.id = ma.module_id where m.code = 'orders.sale_orders' and ma.action = 'view'), true);
select pg_temp.expect('sale orders: add is not scoped', (select scoped from core.module_actions ma join core.modules m on m.id = ma.module_id where m.code = 'orders.sale_orders' and ma.action = 'create'), false);
select pg_temp.expect('admin modules have no scoped actions', (select count(*) from core.module_actions ma join core.modules m on m.id = ma.module_id where m.app = 'admin' and ma.scoped)::int, 0);

-- ---- super_admin
insert into core.user_roles select '00000000-0000-0000-0000-00000000000a', id from core.roles where code = 'super_admin';
select pg_temp.expect('super_admin: admin action', core.has_permission('admin.roles', 'delete', '00000000-0000-0000-0000-00000000000a'), true);
select pg_temp.expect('super_admin: sale orders view at all', core.permission_level('orders.sale_orders', 'view', '00000000-0000-0000-0000-00000000000a'), 'all');
select pg_temp.expect('super_admin: unscoped add is just allowed', core.permission_level('orders.sale_orders', 'create', '00000000-0000-0000-0000-00000000000a'), 'allowed');
select pg_temp.expect('undeclared action is never granted', core.has_permission('admin.users', 'export', '00000000-0000-0000-0000-00000000000a'), false);

-- ---- the three sales roles from the brief
insert into core.roles (code, name) values ('salesperson', 'Salesperson'), ('sales_supervisor', 'Sales Supervisor'), ('sales_manager', 'Sales Manager');
create or replace function pg_temp.grant_role(r text, act text, allow boolean, sc text) returns void language sql as $$
  insert into core.role_permissions (role_id, module_id, action, allowed, scope)
  select ro.id, m.id, act, allow, sc from core.roles ro, core.modules m where ro.code = r and m.code = 'orders.sale_orders'
$$;
select pg_temp.grant_role('salesperson', 'view', true, 'own');
select pg_temp.grant_role('salesperson', 'create', true, null);
select pg_temp.grant_role('salesperson', 'update', true, 'own');
select pg_temp.grant_role('salesperson', 'delete', false, null);
select pg_temp.grant_role('sales_supervisor', 'view', true, 'team');
select pg_temp.grant_role('sales_supervisor', 'create', true, null);
select pg_temp.grant_role('sales_supervisor', 'update', true, 'own');
select pg_temp.grant_role('sales_supervisor', 'delete', false, null);
select pg_temp.grant_role('sales_manager', 'view', true, 'all');
select pg_temp.grant_role('sales_manager', 'create', true, null);
select pg_temp.grant_role('sales_manager', 'update', true, 'all');
select pg_temp.grant_role('sales_manager', 'delete', false, null);

insert into core.user_roles select '00000000-0000-0000-0000-0000000000b0', id from core.roles where code = 'salesperson';
insert into core.user_roles select '00000000-0000-0000-0000-0000000000a5', id from core.roles where code = 'sales_supervisor';
insert into core.user_roles select '00000000-0000-0000-0000-0000000000c0', id from core.roles where code = 'sales_manager';
insert into core.user_roles select '00000000-0000-0000-0000-0000000000d1', id from core.roles where code = 'salesperson';
insert into core.user_roles select '00000000-0000-0000-0000-0000000000e1', id from core.roles where code = 'salesperson';

select pg_temp.expect('salesperson view -> own',   core.permission_level('orders.sale_orders', 'view',   '00000000-0000-0000-0000-0000000000b0'), 'own');
select pg_temp.expect('salesperson add -> allowed', core.permission_level('orders.sale_orders', 'create', '00000000-0000-0000-0000-0000000000b0'), 'allowed');
select pg_temp.expect('salesperson edit -> own',   core.permission_level('orders.sale_orders', 'update', '00000000-0000-0000-0000-0000000000b0'), 'own');
select pg_temp.expect('salesperson delete -> denied', core.permission_level('orders.sale_orders', 'delete', '00000000-0000-0000-0000-0000000000b0'), null::text);
select pg_temp.expect('supervisor view -> team',   core.permission_level('orders.sale_orders', 'view',   '00000000-0000-0000-0000-0000000000a5'), 'team');
select pg_temp.expect('supervisor edit -> own',    core.permission_level('orders.sale_orders', 'update', '00000000-0000-0000-0000-0000000000a5'), 'own');
select pg_temp.expect('supervisor delete -> denied', core.has_permission('orders.sale_orders', 'delete', '00000000-0000-0000-0000-0000000000a5'), false);
select pg_temp.expect('manager view -> all',       core.permission_level('orders.sale_orders', 'view',   '00000000-0000-0000-0000-0000000000c0'), 'all');
select pg_temp.expect('manager edit -> all',       core.permission_level('orders.sale_orders', 'update', '00000000-0000-0000-0000-0000000000c0'), 'all');
select pg_temp.expect('manager delete -> denied',  core.has_permission('orders.sale_orders', 'delete', '00000000-0000-0000-0000-0000000000c0'), false);
select pg_temp.expect('no role, no access',        core.has_permission('orders.sale_orders', 'view', '00000000-0000-0000-0000-0000000000f0'), false);

-- ---- grant validation
select pg_temp.fails('scoped action needs a scope when allowed',
  $q$ insert into core.role_permissions (role_id, module_id, action, allowed) select r.id, m.id, 'view', true from core.roles r, core.modules m where r.code='salesperson' and m.code='orders.sale_orders' $q$, '23514');
select pg_temp.fails('unscoped action rejects a scope',
  $q$ update core.role_permissions rp set scope = 'all' from core.modules m where rp.module_id = m.id and m.code = 'orders.sale_orders' and rp.action = 'create' and rp.role_id = (select id from core.roles where code='salesperson') $q$, '23514');
select pg_temp.fails('allowed without scope is rejected on a scoped action',
  $q$ update core.role_permissions rp set scope = null from core.modules m where rp.module_id = m.id and m.code = 'orders.sale_orders' and rp.action = 'view' and rp.role_id = (select id from core.roles where code='salesperson') $q$, '23514');
select pg_temp.fails('a denied grant cannot carry a scope',
  $q$ update core.role_permissions rp set scope = 'own' from core.modules m where rp.module_id = m.id and m.code = 'orders.sale_orders' and rp.action = 'delete' and rp.role_id = (select id from core.roles where code='salesperson') $q$, '23514');
select pg_temp.fails('action not declared for the module',
  $q$ insert into core.role_permissions (role_id, module_id, action, allowed) select r.id, m.id, 'approve', true from core.roles r, core.modules m where r.code='salesperson' and m.code='orders.sale_orders' $q$, '23514');
select pg_temp.fails('unknown scope code',
  $q$ update core.role_permissions rp set scope = 'planet' from core.modules m where rp.module_id = m.id and m.code = 'orders.sale_orders' and rp.action = 'view' and rp.role_id = (select id from core.roles where code='salesperson') $q$, '23503');

-- ---- row reach: in_scope
update core.user_profiles set reports_to = '00000000-0000-0000-0000-0000000000a5' where user_id = '00000000-0000-0000-0000-0000000000d1';
update core.user_profiles set reports_to = '00000000-0000-0000-0000-0000000000d1' where user_id = '00000000-0000-0000-0000-0000000000e1';
select pg_temp.expect('team = self + reports at any depth', (select count(*) from core.team_member_ids('00000000-0000-0000-0000-0000000000a5'))::int, 3);
select pg_temp.expect('team of a leaf is only themself',   (select count(*) from core.team_member_ids('00000000-0000-0000-0000-0000000000e1'))::int, 1);

select pg_temp.expect('own: own row ok',       core.in_scope('orders.sale_orders', 'view', '00000000-0000-0000-0000-0000000000b0', '00000000-0000-0000-0000-0000000000b0'), true);
select pg_temp.expect('own: other row blocked', core.in_scope('orders.sale_orders', 'view', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b0'), false);
select pg_temp.expect('own: unowned row blocked', core.in_scope('orders.sale_orders', 'view', null, '00000000-0000-0000-0000-0000000000b0'), false);
select pg_temp.expect('team: direct report ok',  core.in_scope('orders.sale_orders', 'view', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000a5'), true);
select pg_temp.expect('team: report of report ok', core.in_scope('orders.sale_orders', 'view', '00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a5'), true);
select pg_temp.expect('team: own row ok',        core.in_scope('orders.sale_orders', 'view', '00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000a5'), true);
select pg_temp.expect('team: outsider blocked',  core.in_scope('orders.sale_orders', 'view', '00000000-0000-0000-0000-0000000000b0', '00000000-0000-0000-0000-0000000000a5'), false);
select pg_temp.expect('supervisor edit is own only', core.in_scope('orders.sale_orders', 'update', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000a5'), false);
select pg_temp.expect('manager: any row',        core.in_scope('orders.sale_orders', 'view', '00000000-0000-0000-0000-0000000000f0', '00000000-0000-0000-0000-0000000000c0'), true);
select pg_temp.expect('manager cannot delete any row', core.in_scope('orders.sale_orders', 'delete', '00000000-0000-0000-0000-0000000000f0', '00000000-0000-0000-0000-0000000000c0'), false);
select pg_temp.expect('unscoped add ignores the owner', core.in_scope('orders.sale_orders', 'create', null, '00000000-0000-0000-0000-0000000000b0'), true);

select pg_temp.fails('reporting loop is rejected',
  $q$ update core.user_profiles set reports_to = '00000000-0000-0000-0000-0000000000e1' where user_id = '00000000-0000-0000-0000-0000000000a5' $q$, '23514');
select pg_temp.fails('nobody reports to themself',
  $q$ update core.user_profiles set reports_to = user_id where user_id = '00000000-0000-0000-0000-0000000000a5' $q$, '23514');

-- ---- several roles: widest scope wins, any deny wins
insert into core.user_roles select '00000000-0000-0000-0000-0000000000b0', id from core.roles where code = 'sales_supervisor';
select pg_temp.expect('two roles: widest view scope wins', core.permission_level('orders.sale_orders', 'view', '00000000-0000-0000-0000-0000000000b0'), 'team');
insert into core.roles (code, name) values ('no_view', 'No view');
select pg_temp.grant_role('no_view', 'view', false, null);
insert into core.user_roles select '00000000-0000-0000-0000-0000000000b0', id from core.roles where code = 'no_view';
select pg_temp.expect('a deny beats any allow', core.has_permission('orders.sale_orders', 'view', '00000000-0000-0000-0000-0000000000b0'), false);
delete from core.user_roles where user_id = '00000000-0000-0000-0000-0000000000b0' and role_id = (select id from core.roles where code = 'no_view');
delete from core.user_roles where user_id = '00000000-0000-0000-0000-0000000000b0' and role_id = (select id from core.roles where code = 'sales_supervisor');

-- ---- user overrides
create or replace function pg_temp.grant_user(u uuid, act text, allow boolean, sc text) returns void language sql as $$
  insert into core.user_permissions (user_id, module_id, action, allowed, scope)
  select u, m.id, act, allow, sc from core.modules m where m.code = 'orders.sale_orders'
  on conflict (user_id, module_id, action) do update set allowed = excluded.allowed, scope = excluded.scope
$$;
select pg_temp.grant_user('00000000-0000-0000-0000-0000000000b0', 'view', true, 'all');
select pg_temp.expect('override widens a role', core.permission_level('orders.sale_orders', 'view', '00000000-0000-0000-0000-0000000000b0'), 'all');
select pg_temp.grant_user('00000000-0000-0000-0000-0000000000b0', 'view', true, 'own');
select pg_temp.grant_user('00000000-0000-0000-0000-0000000000c0', 'update', true, 'own');
select pg_temp.expect('override narrows a role', core.permission_level('orders.sale_orders', 'update', '00000000-0000-0000-0000-0000000000c0'), 'own');
select pg_temp.grant_user('00000000-0000-0000-0000-0000000000c0', 'view', false, null);
select pg_temp.expect('override denies against a wide role', core.has_permission('orders.sale_orders', 'view', '00000000-0000-0000-0000-0000000000c0'), false);
delete from core.user_permissions where user_id in ('00000000-0000-0000-0000-0000000000b0', '00000000-0000-0000-0000-0000000000c0');
select pg_temp.expect('removing the override falls back to the role', core.permission_level('orders.sale_orders', 'update', '00000000-0000-0000-0000-0000000000c0'), 'all');

-- ---- inactive role / user / module
update core.roles set is_active = false where code = 'sales_manager';
select pg_temp.expect('inactive role ignored', core.has_permission('orders.sale_orders', 'view', '00000000-0000-0000-0000-0000000000c0'), false);
update core.roles set is_active = true where code = 'sales_manager';
update core.users set is_active = false where id = '00000000-0000-0000-0000-0000000000c0';
select pg_temp.expect('inactive user denied', core.has_permission('orders.sale_orders', 'view', '00000000-0000-0000-0000-0000000000c0'), false);
update core.users set is_active = true where id = '00000000-0000-0000-0000-0000000000c0';
update core.modules set is_active = false where code = 'orders.sale_orders';
select pg_temp.expect('inactive module denied', core.has_permission('orders.sale_orders', 'view', '00000000-0000-0000-0000-00000000000a'), false);
update core.modules set is_active = true where code = 'orders.sale_orders';

-- ---- catalog changes keep grants valid and super_admin complete
with m as (insert into core.modules (app, code, name) values ('footprints', 'footprints.attendance', 'Attendance') returning id)
insert into core.module_actions (module_id, action, scoped) select m.id, a, s from m, (values ('view', true), ('update', false)) v(a, s);
select pg_temp.expect('new scoped action: super_admin gets all', core.permission_level('footprints.attendance', 'view', '00000000-0000-0000-0000-00000000000a'), 'all');
select pg_temp.expect('new unscoped action: super_admin gets allowed', core.permission_level('footprints.attendance', 'update', '00000000-0000-0000-0000-00000000000a'), 'allowed');
update core.module_actions set scoped = false where action = 'view' and module_id = (select id from core.modules where code = 'footprints.attendance');
select pg_temp.expect('scoped -> unscoped clears scopes', (select scope from core.role_permissions rp join core.modules m on m.id = rp.module_id where m.code = 'footprints.attendance' and rp.action = 'view' limit 1), null::text);
update core.module_actions set scoped = true where action = 'view' and module_id = (select id from core.modules where code = 'footprints.attendance');
select pg_temp.expect('unscoped -> scoped sets all', (select scope from core.role_permissions rp join core.modules m on m.id = rp.module_id where m.code = 'footprints.attendance' and rp.action = 'view' limit 1), 'all');

-- ---- effective_permissions (caller must be the user or hold admin.permissions view)
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select pg_temp.expect('effective: super_admin sale order view', (select scope from core.effective_permissions('00000000-0000-0000-0000-00000000000a') where module_code = 'orders.sale_orders' and action = 'view'), 'all');
select pg_temp.expect('effective: source role', (select source from core.effective_permissions('00000000-0000-0000-0000-0000000000a5') where module_code = 'orders.sale_orders' and action = 'view'), 'role');
select pg_temp.expect('effective: team scope shown', (select scope from core.effective_permissions('00000000-0000-0000-0000-0000000000a5') where module_code = 'orders.sale_orders' and action = 'view'), 'team');
select pg_temp.expect('effective: denied is not allowed', (select allowed from core.effective_permissions('00000000-0000-0000-0000-0000000000a5') where module_code = 'orders.sale_orders' and action = 'delete'), false);
select pg_temp.expect('effective: only declared actions', (select count(*) from core.effective_permissions('00000000-0000-0000-0000-0000000000a5') where module_code = 'orders.sale_orders')::int, 4);
select pg_temp.grant_user('00000000-0000-0000-0000-0000000000a5', 'delete', true, 'own');
select pg_temp.expect('effective: source user', (select source from core.effective_permissions('00000000-0000-0000-0000-0000000000a5') where module_code = 'orders.sale_orders' and action = 'delete'), 'user');
delete from core.user_permissions where user_id = '00000000-0000-0000-0000-0000000000a5';
select set_config('request.jwt.claim.sub', '', false);

-- ---- RLS and function access as signed-in users
select set_config('t.role_id', (select id::text from core.roles where code = 'no_view'), false);
select set_config('t.module_id', (select id::text from core.modules where code = 'orders.sale_orders'), false);
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b0';   -- salesperson, no admin rights
select pg_temp.expect('salesperson can read own level', core.permission_level('orders.sale_orders', 'view'), 'own');
select pg_temp.expect('cannot read someone else''s level', core.permission_level('orders.sale_orders', 'view', '00000000-0000-0000-0000-0000000000c0'), null::text);
select pg_temp.expect('cannot read someone else''s team', (select count(*) from core.team_member_ids('00000000-0000-0000-0000-0000000000a5'))::int, 0);
select pg_temp.expect('cannot list role_permissions', (select count(*) from core.role_permissions)::int, 0);
select pg_temp.expect('cannot list other users', (select count(*) from core.users)::int, 1);
select pg_temp.expect('catalogs readable: scopes', (select count(*) from core.scopes)::int, 3);
select pg_temp.expect('catalogs readable: module actions', (select count(*) from core.module_actions)::int > 5, true);
select pg_temp.fails('cannot change a grant', $q$ insert into core.role_permissions (role_id, module_id, action, allowed) values (current_setting('t.role_id')::uuid, current_setting('t.module_id')::uuid, 'create', true) $q$, '42501');
select pg_temp.fails('cannot edit own reporting line', $q$ update core.user_profiles set reports_to = '00000000-0000-0000-0000-0000000000c0' where user_id = '00000000-0000-0000-0000-0000000000b0' $q$, '42501');
reset role;

set role anon;
select pg_temp.fails('anon cannot call has_permission', $q$ select core.has_permission('orders.sale_orders', 'view', '00000000-0000-0000-0000-0000000000c0') $q$, '42501');
select pg_temp.fails('anon cannot read tables', $q$ select * from core.role_permissions $q$, '42501');
reset role;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';   -- super admin
select pg_temp.expect('admin may read another user''s level', core.permission_level('orders.sale_orders', 'view', '00000000-0000-0000-0000-0000000000c0'), 'all');
select pg_temp.expect('admin sees all grants', (select count(*) from core.role_permissions)::int > 20, true);
do $$ declare n int; begin
  delete from core.roles where code = 'super_admin'; get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL system role deleted'; end if;
  raise notice 'ok   system role undeletable';
end $$;
reset role;
\echo ALL TESTS PASSED
