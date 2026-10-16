-- Run after stub + migrations. Fails loudly (exception) on any broken expectation.
\set ON_ERROR_STOP on
create or replace function pg_temp.expect(label text, got anyelement, want anyelement) returns void
language plpgsql as $$ begin
  if got is distinct from want then raise exception 'FAIL %: got %, want %', label, got, want; end if;
  raise notice 'ok   %', label;
end $$;

insert into auth.users (id,email) values
 ('00000000-0000-0000-0000-00000000000a','admin@hig.test'),
 ('00000000-0000-0000-0000-00000000000b','staff@hig.test'),
 ('00000000-0000-0000-0000-00000000000c','other@hig.test');

select pg_temp.expect('trigger created users', (select count(*) from core.users)::int, 3);
select pg_temp.expect('trigger created profiles', (select count(*) from core.user_profiles)::int, 3);
select pg_temp.expect('username derived', (select username from core.users where email='admin@hig.test'), 'admin');

insert into core.user_roles select '00000000-0000-0000-0000-00000000000a', id from core.roles where code='super_admin';
-- limited role: view users only
insert into core.roles (code,name) values ('hr_viewer','HR Viewer'),('blocker','Blocker');
insert into core.role_permissions select r.id,m.id,'view',true from core.roles r,core.modules m where r.code='hr_viewer' and m.code='admin.users';
insert into core.role_permissions select r.id,m.id,'view',false from core.roles r,core.modules m where r.code='blocker' and m.code='admin.users';
insert into core.user_roles select '00000000-0000-0000-0000-00000000000b', id from core.roles where code='hr_viewer';

select pg_temp.expect('super_admin allowed', core.has_permission('admin.roles','delete','00000000-0000-0000-0000-00000000000a'), true);
select pg_temp.expect('role allow', core.has_permission('admin.users','view','00000000-0000-0000-0000-00000000000b'), true);
select pg_temp.expect('default deny', core.has_permission('admin.users','update','00000000-0000-0000-0000-00000000000b'), false);
select pg_temp.expect('unknown module deny', core.has_permission('nope.x','view','00000000-0000-0000-0000-00000000000b'), false);

-- deny beats allow across roles
insert into core.user_roles select '00000000-0000-0000-0000-00000000000b', id from core.roles where code='blocker';
select pg_temp.expect('role deny wins over role allow', core.has_permission('admin.users','view','00000000-0000-0000-0000-00000000000b'), false);

-- user override allow beats role deny
insert into core.user_permissions select '00000000-0000-0000-0000-00000000000b', id,'view',true from core.modules where code='admin.users';
select pg_temp.expect('user allow overrides role deny', core.has_permission('admin.users','view','00000000-0000-0000-0000-00000000000b'), true);
-- user override deny beats super_admin
insert into core.user_permissions select '00000000-0000-0000-0000-00000000000a', id,'delete',false from core.modules where code='admin.roles';
select pg_temp.expect('user deny overrides role allow', core.has_permission('admin.roles','delete','00000000-0000-0000-0000-00000000000a'), false);
select pg_temp.expect('other scope still allowed', core.has_permission('admin.roles','update','00000000-0000-0000-0000-00000000000a'), true);

-- inactive role / user
update core.roles set is_active=false where code='blocker';
delete from core.user_permissions where user_id='00000000-0000-0000-0000-00000000000b';
select pg_temp.expect('inactive role ignored', core.has_permission('admin.users','view','00000000-0000-0000-0000-00000000000b'), true);
update core.users set is_active=false where id='00000000-0000-0000-0000-00000000000b';
select pg_temp.expect('inactive user denied', core.has_permission('admin.users','view','00000000-0000-0000-0000-00000000000b'), false);
update core.users set is_active=true where id='00000000-0000-0000-0000-00000000000b';

-- effective_permissions source labels (caller must be the user or hold admin.permissions view)
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
select pg_temp.expect('effective source role', (select source from core.effective_permissions('00000000-0000-0000-0000-00000000000a') where module_code='admin.users' and scope='view'), 'role');
select pg_temp.expect('effective source user', (select source from core.effective_permissions('00000000-0000-0000-0000-00000000000a') where module_code='admin.roles' and scope='delete'), 'user');

select set_config('request.jwt.claim.sub','',false);
-- ---- RLS as authenticated users
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';  -- staff: hr_viewer
select pg_temp.expect('staff sees all users (view perm)', (select count(*) from core.users)::int, 3);
select pg_temp.expect('staff cannot see role_permissions', (select count(*) from core.role_permissions)::int, 0);
do $$ begin
  update core.users set phone='999' where id='00000000-0000-0000-0000-00000000000c';
  if found then raise exception 'FAIL staff updated a user'; end if;
  raise notice 'ok   staff update blocked by RLS';
end $$;
-- staff edits own profile address ok, employment field blocked
update core.user_profiles set address='PP' where user_id='00000000-0000-0000-0000-00000000000b';
select pg_temp.expect('own profile editable', (select address from core.user_profiles where user_id='00000000-0000-0000-0000-00000000000b'), 'PP');
do $$ begin
  begin
    update core.user_profiles set position='CEO' where user_id='00000000-0000-0000-0000-00000000000b';
    raise exception 'FAIL position change allowed';
  exception when insufficient_privilege then raise notice 'ok   employment field guarded'; end;
end $$;

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';  -- other: no roles
select pg_temp.expect('no-role user sees only self', (select count(*) from core.users)::int, 1);
select pg_temp.expect('catalog readable', (select count(*) from core.modules)::int, 5);
do $$ begin
  begin
    insert into core.roles (code,name) values ('hack','Hack');
    raise exception 'FAIL insert role allowed';
  exception when insufficient_privilege then raise notice 'ok   role insert blocked'; end;
end $$;

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';  -- admin
insert into core.roles (code,name) values ('sales','Sales');
select pg_temp.expect('admin can create role', (select count(*) from core.roles where code='sales')::int, 1);
do $$ declare n int; begin
  delete from core.roles where code='super_admin'; get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL system role deleted'; end if;
  raise notice 'ok   system role undeletable';
end $$;
-- new module / scope automatically granted to super_admin
reset role;
insert into core.modules (app,code,name) values ('footprints','footprints.attendance','Attendance');
insert into core.scopes (code,name) values ('own','Own records');
select pg_temp.expect('new module granted to super_admin', core.has_permission('footprints.attendance','export','00000000-0000-0000-0000-00000000000a'), true);
select pg_temp.expect('new scope granted to super_admin', core.has_permission('admin.users','own','00000000-0000-0000-0000-00000000000a'), true);
reset role;
\echo ALL TESTS PASSED
