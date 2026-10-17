-- Pin search_path on the updated_at trigger function (Supabase linter 0011).
create or replace function core.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;
