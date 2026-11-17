insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('barbearia-images', 'barbearia-images', true, 2097152, array['image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Public can view barbershop images"
on storage.objects for select
to public
using (bucket_id = 'barbearia-images');

create policy "Authenticated users can upload barbershop images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'barbearia-images');

create policy "Authenticated users can update barbershop images"
on storage.objects for update
to authenticated
using (bucket_id = 'barbearia-images')
with check (bucket_id = 'barbearia-images');

create policy "Authenticated users can delete barbershop images"
on storage.objects for delete
to authenticated
using (bucket_id = 'barbearia-images');
