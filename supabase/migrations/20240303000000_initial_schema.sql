-- Enable Row Level Security
alter table documents enable row level security;
alter table analyses enable row level security;

-- Create policies
create policy "Users can read their own documents"
  on documents for select
  using (auth.uid()::text = user_id::text);

create policy "Users can insert their own documents"
  on documents for insert
  with check (auth.uid()::text = user_id::text);

create policy "Users can update their own documents"
  on documents for update
  using (auth.uid()::text = user_id::text);

create policy "Users can delete their own documents"
  on documents for delete
  using (auth.uid()::text = user_id::text);

create policy "Users can read their own analyses"
  on analyses for select
  using (true);

create policy "Users can insert analyses"
  on analyses for insert
  with check (true);

-- Create functions
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (email, supabase_id)
  values (new.email, new.id);
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for new user
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Add indexes
create index if not exists idx_documents_user_id on documents(user_id);
create index if not exists idx_users_supabase_id on users(supabase_id);
