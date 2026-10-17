-- Run AFTER you have created your user in Supabase (Authentication -> Users -> Add user).
-- Makes that user the super admin. Change the email if you used a different one.
insert into core.user_roles (user_id, role_id)
select u.id, r.id
from core.users u, core.roles r
where u.email = 'vantha.deth@gmail.com' and r.code = 'super_admin'
on conflict do nothing;

-- Check: should return one row with 'allowed'/'all'.
select u.email, core.permission_level('admin.users', 'view', u.id) as users_view,
       core.permission_level('orders.sale_orders', 'view', u.id) as sale_orders_view
from core.users u where u.email = 'vantha.deth@gmail.com';
