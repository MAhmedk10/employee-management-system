-- ============================================================================
-- Employee Management System — Consolidated Initial Schema (v2 fresh start)
-- Place this file at: supabase/migrations/20260711120000_initial_schema.sql
-- Apply with: supabase db push
--
-- This is a single clean file combining everything already designed and
-- tested in the previous build: core tables, RLS, secure clock-in/out logic
-- (with the midnight-crossing shift bug already fixed), and leave-day
-- marking tied to the leave balance. Nothing here is untested guesswork.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EMPLOYEES
-- ----------------------------------------------------------------------------
create table public.employees (
  id                      uuid primary key default gen_random_uuid(),
  employee_code           text unique not null,              -- human-facing login ID, e.g. EMP-0042
  auth_user_id            uuid unique references auth.users(id) on delete cascade,
  full_name               text not null,
  father_name             text not null,
  cnic                    text not null,
  salary                  numeric(12,2) not null,
  role_title              text,                               -- job title / designation
  system_role             text not null default 'employee' check (system_role in ('admin','employee')),
  monthly_leave_balance   numeric(5,2) not null default 0,
  status                  text not null default 'active' check (status in ('active','inactive')),
  must_change_password    boolean not null default true,
  created_at              timestamptz not null default now()
);

create index idx_employees_auth_user_id on public.employees(auth_user_id);

-- ----------------------------------------------------------------------------
-- 2. OFFICE SETTINGS (single row — one office)
-- ----------------------------------------------------------------------------
create table public.office_settings (
  id                      uuid primary key default gen_random_uuid(),
  office_lat              numeric(9,6),
  office_lng              numeric(9,6),
  allowed_radius_meters   integer default 150,
  office_ip_address       text,           -- reserved for future IP-based check
  shift_start_time        time not null default '22:00:00',
  shift_end_time          time not null default '06:00:00',
  late_cutoff_time        time not null default '22:30:00',
  updated_at              timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 3. ATTENDANCE
-- ----------------------------------------------------------------------------
create table public.attendance (
  id                      uuid primary key default gen_random_uuid(),
  employee_id             uuid not null references public.employees(id) on delete cascade,
  date                    date not null default current_date,  -- the shift's START date (matters for night shifts)
  clock_in_at             timestamptz,
  clock_out_at            timestamptz,
  clock_in_lat            numeric(9,6),
  clock_in_lng            numeric(9,6),
  clock_out_lat           numeric(9,6),
  clock_out_lng           numeric(9,6),
  clock_in_marked_by      text check (clock_in_marked_by in ('self','admin')),
  clock_out_marked_by     text check (clock_out_marked_by in ('self','admin')),
  recorded_by_admin_id    uuid references public.employees(id),
  is_leave                boolean not null default false,
  created_at              timestamptz not null default now(),
  unique (employee_id, date),
  constraint chk_leave_no_clock check (not (is_leave and (clock_in_at is not null or clock_out_at is not null)))
);

create index idx_attendance_employee_date on public.attendance(employee_id, date);
create index idx_attendance_date on public.attendance(date);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- is_admin(): SECURITY DEFINER avoids RLS recursion when a policy on
-- `employees` needs to check the `employees` table itself for role.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from employees
    where auth_user_id = auth.uid()
    and system_role = 'admin'
    and status = 'active'
  );
$$;

-- Haversine distance in meters — kept ready for whenever GPS verification
-- is turned on; not currently called by clock_in/clock_out.
create or replace function public.calculate_distance_meters(
  lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric
) returns numeric
language sql
immutable
as $$
  select 6371000 * acos(
    least(1, greatest(-1,
      cos(radians(lat1)) * cos(radians(lat2)) * cos(radians(lng2) - radians(lng1)) +
      sin(radians(lat1)) * sin(radians(lat2))
    ))
  );
$$;

-- ============================================================================
-- CLOCK IN / CLOCK OUT
-- No location restriction currently enforced (deliberate v1 decision).
-- clock_out() finds the employee's most recent OPEN shift rather than
-- matching on current_date — required because the 10PM-6AM shift crosses
-- midnight, so current_date changes between clock-in and clock-out.
-- ============================================================================
create or replace function public.clock_in(p_lat numeric default null, p_lng numeric default null)
returns public.attendance
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee_id uuid;
  v_row public.attendance;
begin
  select id into v_employee_id from employees
  where auth_user_id = auth.uid() and status = 'active';

  if v_employee_id is null then
    raise exception 'Employee not found or inactive';
  end if;

  insert into attendance (employee_id, date, clock_in_at, clock_in_lat, clock_in_lng, clock_in_marked_by)
  values (v_employee_id, current_date, now(), p_lat, p_lng, 'self')
  on conflict (employee_id, date) do nothing
  returning * into v_row;

  if v_row is null then
    raise exception 'You have already clocked in today';
  end if;

  return v_row;
end;
$$;

create or replace function public.clock_out(p_lat numeric default null, p_lng numeric default null)
returns public.attendance
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee_id uuid;
  v_row public.attendance;
begin
  select id into v_employee_id from employees
  where auth_user_id = auth.uid() and status = 'active';

  if v_employee_id is null then
    raise exception 'Employee not found or inactive';
  end if;

  update attendance
  set clock_out_at = now(),
      clock_out_lat = p_lat,
      clock_out_lng = p_lng,
      clock_out_marked_by = 'self'
  where employee_id = v_employee_id
    and clock_in_at is not null
    and clock_out_at is null
    and clock_in_at >= now() - interval '20 hours'  -- safety bound against
                                                       -- accidentally closing a
                                                       -- long-forgotten shift
  returning * into v_row;

  if v_row is null then
    raise exception 'No open clock-in found to close (either you have not clocked in, or your last shift was already closed)';
  end if;

  return v_row;
end;
$$;

-- Admin manual attendance entry (WFH / IP-blocked exception case)
create or replace function public.admin_mark_attendance(
  p_employee_id uuid,
  p_date date,
  p_clock_in timestamptz default null,
  p_clock_out timestamptz default null
) returns public.attendance
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid;
  v_row public.attendance;
begin
  if not is_admin() then
    raise exception 'Only admins can record attendance manually';
  end if;

  select id into v_admin_id from employees where auth_user_id = auth.uid();

  insert into attendance (
    employee_id, date, clock_in_at, clock_out_at,
    clock_in_marked_by, clock_out_marked_by, recorded_by_admin_id
  )
  values (
    p_employee_id, p_date, p_clock_in, p_clock_out,
    case when p_clock_in is not null then 'admin' end,
    case when p_clock_out is not null then 'admin' end,
    v_admin_id
  )
  on conflict (employee_id, date) do update
  set clock_in_at          = coalesce(excluded.clock_in_at, attendance.clock_in_at),
      clock_out_at         = coalesce(excluded.clock_out_at, attendance.clock_out_at),
      clock_in_marked_by   = case when excluded.clock_in_at is not null then 'admin' else attendance.clock_in_marked_by end,
      clock_out_marked_by  = case when excluded.clock_out_at is not null then 'admin' else attendance.clock_out_marked_by end,
      recorded_by_admin_id = v_admin_id
  returning * into v_row;

  return v_row;
end;
$$;

-- ============================================================================
-- LEAVE MARKING (tied to monthly_leave_balance)
-- ============================================================================
create or replace function public.admin_mark_leave(
  p_employee_id uuid,
  p_date date
) returns public.attendance
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid;
  v_row public.attendance;
  v_was_already_leave boolean;
begin
  if not is_admin() then
    raise exception 'Only admins can mark leave';
  end if;

  select id into v_admin_id from employees where auth_user_id = auth.uid();

  select is_leave into v_was_already_leave
  from attendance where employee_id = p_employee_id and date = p_date;

  insert into attendance (employee_id, date, is_leave, clock_in_at, clock_out_at, recorded_by_admin_id)
  values (p_employee_id, p_date, true, null, null, v_admin_id)
  on conflict (employee_id, date) do update
  set is_leave              = true,
      clock_in_at           = null,
      clock_out_at          = null,
      clock_in_marked_by    = null,
      clock_out_marked_by   = null,
      recorded_by_admin_id  = v_admin_id
  returning * into v_row;

  if v_was_already_leave is distinct from true then
    update employees set monthly_leave_balance = monthly_leave_balance - 1 where id = p_employee_id;
  end if;

  return v_row;
end;
$$;

create or replace function public.admin_unmark_leave(
  p_employee_id uuid,
  p_date date
) returns public.attendance
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.attendance;
  v_was_leave boolean;
begin
  if not is_admin() then
    raise exception 'Only admins can modify leave records';
  end if;

  select is_leave into v_was_leave from attendance where employee_id = p_employee_id and date = p_date;

  if v_was_leave is null then
    raise exception 'No attendance record found for this employee/date';
  end if;

  update attendance set is_leave = false
  where employee_id = p_employee_id and date = p_date
  returning * into v_row;

  if v_was_leave = true then
    update employees set monthly_leave_balance = monthly_leave_balance + 1 where id = p_employee_id;
  end if;

  return v_row;
end;
$$;

-- ============================================================================
-- COMPUTED STATUS VIEW (Present / Late / Absent / On Leave / Pending)
-- Reads shift timing from office_settings so changing the shift config
-- automatically updates status calculations everywhere.
-- ============================================================================
create or replace view public.attendance_with_status as
select
  a.*,
  e.employee_code,
  e.full_name,
  e.role_title,
  case
    when a.is_leave then 'on_leave'
    when a.clock_in_at is not null
      and a.clock_in_at <= (a.date::timestamp + coalesce((select late_cutoff_time from office_settings limit 1), '22:30:00'))
      then 'present'
    when a.clock_in_at is not null
      then 'late'
    when now() > (a.date::timestamp + interval '1 day' + coalesce((select shift_end_time from office_settings limit 1), '06:00:00'))
      then 'absent'
    else 'pending'
  end as computed_status
from public.attendance a
join public.employees e on e.id = a.employee_id;

-- ============================================================================
-- GRANTS
-- ============================================================================
grant execute on function public.is_admin() to authenticated;
grant execute on function public.clock_in(numeric, numeric) to authenticated;
grant execute on function public.clock_out(numeric, numeric) to authenticated;
grant execute on function public.admin_mark_attendance(uuid, date, timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_mark_leave(uuid, date) to authenticated;
grant execute on function public.admin_unmark_leave(uuid, date) to authenticated;

grant select, insert, update, delete on public.employees to authenticated;
grant select on public.attendance to authenticated;
grant select on public.attendance_with_status to authenticated;
grant select, insert, update on public.office_settings to authenticated;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.employees enable row level security;
alter table public.attendance enable row level security;
alter table public.office_settings enable row level security;

create policy "employees_select_own" on public.employees for select
  using (auth_user_id = auth.uid());
create policy "employees_select_admin" on public.employees for select
  using (is_admin());
create policy "employees_insert_admin" on public.employees for insert
  with check (is_admin());
create policy "employees_update_admin" on public.employees for update
  using (is_admin());
create policy "employees_delete_admin" on public.employees for delete
  using (is_admin());

create policy "attendance_select_own" on public.attendance for select
  using (employee_id in (select id from employees where auth_user_id = auth.uid()));
create policy "attendance_select_admin" on public.attendance for select
  using (is_admin());
-- No insert/update policies for attendance — all writes go through the
-- SECURITY DEFINER functions above (clock_in, clock_out, admin_mark_attendance,
-- admin_mark_leave). This is deliberate: it's what actually enforces the
-- business rules, since a client can't bypass them with a raw insert/update.

create policy "office_settings_select_all" on public.office_settings for select
  using (auth.role() = 'authenticated');
create policy "office_settings_insert_admin" on public.office_settings for insert
  with check (is_admin());
create policy "office_settings_update_admin" on public.office_settings for update
  using (is_admin());
