-- ============================================================================
-- Add: employee profile photos
-- Place this file at: supabase/migrations/20260712010000_employee_photos.sql
-- ============================================================================

-- Column to store the photo's public URL
alter table public.employees
add column profile_photo_url text;

-- Storage bucket for photos (public read — like any standard avatar system —
-- but write access restricted to admins only via policies below)
insert into storage.buckets (id, name, public)
values ('employee-photos', 'employee-photos', true)
on conflict (id) do nothing;

-- Only admins can upload, replace, or remove photos (consistent with the
-- rest of the system: employee profile data is admin-managed, employee
-- view-only)
create policy "employee_photos_select_all"
on storage.objects for select
using (bucket_id = 'employee-photos');

create policy "employee_photos_insert_admin"
on storage.objects for insert
with check (bucket_id = 'employee-photos' and is_admin());

create policy "employee_photos_update_admin"
on storage.objects for update
using (bucket_id = 'employee-photos' and is_admin());

create policy "employee_photos_delete_admin"
on storage.objects for delete
using (bucket_id = 'employee-photos' and is_admin());
