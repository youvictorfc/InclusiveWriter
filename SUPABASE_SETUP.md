# Supabase Database Setup Instructions

Please execute these steps in your Supabase dashboard:

1. **Enable Row Level Security (RLS)**
```sql
-- Enable RLS on all tables
alter table documents enable row level security;
alter table analyses enable row level security;

-- Create policies for documents table
create policy "Users can read their own documents"
  on documents for select
  using (auth.uid() = user_id::text);

create policy "Users can insert their own documents"
  on documents for insert
  with check (auth.uid() = user_id::text);

create policy "Users can update their own documents"
  on documents for update
  using (auth.uid() = user_id::text);

create policy "Users can delete their own documents"
  on documents for delete
  using (auth.uid() = user_id::text);

-- Create policies for analyses table
create policy "Users can read analyses"
  on analyses for select
  using (true);

create policy "Users can create analyses"
  on analyses for insert
  with check (true);

-- Create triggers and functions
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
```

2. **Set up Foreign Key Relationships**
```sql
-- Add indexes for better performance
create index if not exists idx_documents_user_id on documents(user_id);
create index if not exists idx_users_supabase_id on users(supabase_id);
```

3. **Verify Setup**
- Go to Authentication > Settings
- Ensure "Enable email confirmations" is turned on
- Update Site URL to match your application URL
- Add the callback URL (`/auth/callback`) to the Additional Redirect URLs

4. **Test the Policies**
- Try to create a document while logged in
- Try to read documents from different users
- Verify that analyses can be created and read
