# HIG database (Supabase)

`migrations/` — apply in order with the Supabase CLI (`supabase db push`) or the Supabase MCP `apply_migration`.

## Core access model (`core` schema)

| Table | Meaning |
|---|---|
| `users` | Basic login info (id = `auth.users.id`, username, email, phone, active flag) |
| `user_profiles` | Other info (name EN/KM, employee code, position, department, **reports_to**, locale, ...) |
| `modules` | App functions permissions attach to, coded `app.function` (e.g. `admin.users`, `orders.sale_orders`) |
| `actions` | What a person does: view, create (Add), update (Edit), delete, approve, export |
| `scopes` | How far an action reaches: **own**, **team**, **all** (narrow to wide, by `rank`) |
| `module_actions` | Which actions a module has, and whether each one **takes a scope** (`scoped`) |
| `roles` / `user_roles` | Roles and their assignment to users |
| `role_permissions` | role + module + action -> denied / allowed / allowed with a scope |
| `user_permissions` | user + module + action -> same, overrides roles in both directions |

A grant is one of: **denied**, **allowed** (for actions that take no scope, e.g. Add), or **allowed with a scope**.
The database rejects a scope on an action that takes none, and a missing scope on one that does.

Example, module *Sale orders* (view, edit and delete take a scope; add does not):

| Role | View | Add | Edit | Delete |
|---|---|---|---|---|
| Salesperson | own | allowed | own | denied |
| Sales supervisor | team | allowed | own | denied |
| Sales manager | all | allowed | all | denied |

**Team** = the person plus everyone who reports to them at any depth (`user_profiles.reports_to`).

### Resolution: `core.permission_level(module, action, user)`
Returns `null` (no access), `'allowed'` (access, action takes no scope), or `'own' | 'team' | 'all'`.
1. A user override wins, in either direction.
2. Otherwise the user's active roles: any deny beats any allow; among allows the **widest scope** wins.
3. Otherwise no access. Inactive users, modules and undeclared actions are always no access.

`core.has_permission(module, action)` = "has any access". `core.effective_permissions(user)` returns the resolved
list with its source (`user` / `role` / `default`).

### Enforcing scopes on a module's data
A module's table needs an owner column. Then one policy line applies the scope:
```sql
create policy sale_orders_select on orders.sale_orders for select to authenticated
  using (core.in_scope('orders.sale_orders', 'view', owner_id));
create policy sale_orders_update on orders.sale_orders for update to authenticated
  using (core.in_scope('orders.sale_orders', 'update', owner_id))
  with check (core.in_scope('orders.sale_orders', 'update', owner_id));
create policy sale_orders_insert on orders.sale_orders for insert to authenticated
  with check (core.has_permission('orders.sale_orders', 'create') and owner_id = auth.uid());
```
`in_scope`: `all` / unscoped `allowed` -> true; `own` -> owner is the user; `team` -> owner is in the user's team.

### Adding a module
Insert the module, then its actions. `super_admin` is granted everything automatically (at scope `all`).
```sql
with m as (insert into core.modules (app, code, name, sort_order) values ('orders', 'orders.invoices', 'Invoices', 110) returning id)
insert into core.module_actions (module_id, action, scoped)
select m.id, a.action, a.scoped from m, (values ('view', true), ('create', false), ('update', true)) as a(action, scoped);
```

## Bootstrapping the first admin
After creating the first user in Supabase Auth, run once as service role:
```sql
insert into core.user_roles (user_id, role_id)
select '<auth user id>', id from core.roles where code = 'super_admin';
```

## Tests (plain Postgres, no Supabase needed)
```
psql -d <db> -v ON_ERROR_STOP=1 -f tests/00_stub_auth.sql \
  -f migrations/20261016000001_core_users_roles_permissions.sql -f tests/permissions_test.sql
```

## Exposing `core` to the Data API
The apps talk to the `core` schema through Supabase's Data API, so `core` must be listed in
**Exposed schemas** (Dashboard -> Integrations -> Data API -> Settings, or Settings -> API).
If that field is not shown, the Data API may be disabled for the project: enable it first.
The migrations already grant the needed privileges to `authenticated` and `service_role`.
