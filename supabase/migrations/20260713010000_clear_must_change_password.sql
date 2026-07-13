-- ============================================================================
-- Add: employees can clear their own must_change_password flag
-- Place this file at: supabase/migrations/20260713010000_clear_must_change_password.sql
-- ============================================================================

create or replace function public.clear_must_change_password()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update employees
  set must_change_password = false
  where auth_user_id = auth.uid();
end;
$$;

grant execute on function public.clear_must_change_password() to authenticated;
