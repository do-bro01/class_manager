-- Add timetable fields to classes table
alter table classes
  add column day_of_week integer check (day_of_week is null or (day_of_week >= 0 and day_of_week <= 4)),
  add column start_time time,
  add column end_time time,
  add constraint check_times check (
    (start_time is null and end_time is null) or
    (start_time is not null and end_time is not null and start_time < end_time)
  );
