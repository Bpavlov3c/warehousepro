-- Create a function to handle new user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Admin User'),
    coalesce(new.raw_user_meta_data ->> 'role', 'admin')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Drop existing trigger if it exists
drop trigger if exists on_auth_user_created on auth.users;

-- Create trigger to automatically create profile when user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
