-- ============================================================================
-- clear_must_change_password()
-- Lets an authenticated user clear the `must_change_password` flag on THEIR
-- OWN employee record only. Used by the /change-password page after the user
-- has successfully set a new password via supabase.auth.updateUser().
--
-- SECURITY DEFINER so it can update the row, but it is hard-scoped to
-- auth.uid() inside the function body, so a user can never clear another
-- user's flag regardless of the RLS update policy.
-- ============================================================================
create or replace function public.clear_must_change_password()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.employees
  set must_change_password = false
  where auth_user_id = auth.uid();
end;
$$;

grant execute on function public.clear_must_change_password() to authenticated;
