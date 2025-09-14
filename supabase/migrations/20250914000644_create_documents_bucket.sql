insert into storage.buckets (
  id,
  name,
  public,
  avif_autodetection,
  file_size_limit
)
values (
  'documents',
  'documents',
  false,
  false,
  20971520
);


create policy "user can insert own files in documents bucket flreew_0"
on "storage"."objects"
as permissive
for insert
to authenticated
with check (((bucket_id = 'documents'::text) AND (auth.uid() = (split_part(name, '/'::text, 1))::uuid)));


create policy "user can read own files in documents bucket flreew_0"
on "storage"."objects"
as permissive
for select
to authenticated
using (((bucket_id = 'documents'::text) AND (auth.uid() = (split_part(name, '/'::text, 1))::uuid)));


create policy "users can delete own files in documents bucket flreew_0"
on "storage"."objects"
as permissive
for delete
to authenticated
using (((bucket_id = 'documents'::text) AND (auth.uid() = (split_part(name, '/'::text, 1))::uuid)));



