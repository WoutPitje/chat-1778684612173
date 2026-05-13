create table public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  email text not null,
  content text not null,
  created_at timestamptz default now() not null
);

alter table public.messages enable row level security;

create policy "Anyone logged in can read messages"
  on public.messages for select
  to authenticated
  using (true);

create policy "Users can insert their own messages"
  on public.messages for insert
  to authenticated
  with check (auth.uid() = user_id);