-- Server-side code (Next.js route handlers using the service_role key) needs
-- explicit privileges on the custom core schema. service_role bypasses RLS but
-- not GRANTs. anon stays without access.
grant usage on schema core to service_role;
grant all on all tables    in schema core to service_role;
grant all on all routines  in schema core to service_role;
grant all on all sequences in schema core to service_role;
alter default privileges for role postgres in schema core
  grant all on tables to service_role;
alter default privileges for role postgres in schema core
  grant all on routines to service_role;
alter default privileges for role postgres in schema core
  grant all on sequences to service_role;
