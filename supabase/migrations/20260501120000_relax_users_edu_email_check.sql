-- Relax public.users.edu_email: allow any normal email shape.
-- Drops legacy .edu.cn-only check if present (name varies by project).

alter table public.users drop constraint if exists users_edu_email_format_check;
alter table public.users drop constraint if exists users_email_format_check;

alter table public.users
  add constraint users_email_format_check
  check (edu_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
