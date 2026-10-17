# HIG database (Supabase)

`migrations/` — apply in order with the Supabase CLI (`supabase db push`) or the Supabase MCP `apply_migration`.

## Core access model (`core` schema)

| Table | Meaning |
|---|---|
| `users` | Basic login info (id = `auth.users.id`, username, email, phone, active flag) |
| `user_profiles` | Other info (name EN/KM, employee code, position, department, locale, ...) |
| `modules` | App functions permissions attach to, coded `app.function` (e.g. `admin.users`) |
| `scopes` | What a permission covers: view, create, update, delete, approve, export (extendable, e.g. `own`, `branch`) |
| `roles` / `user_roles` | Roles and their assignment to users |
| `role_permissions` | role + module + scope -> allowed / denied |
| `user_permissions` | user + module + scope -> allowed / denied (overrides roles both ways) |

Resolution in `core.has_permission(module, scope, user)`:
1. user override wins (allow or deny)
2. otherwise active roles: any deny beats any allow
3. otherwise denied. Inactive users/modules are always denied.

`core.effective_permissions(user)` returns the resolved matrix with its source (`user`/`role`/`default`).

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
