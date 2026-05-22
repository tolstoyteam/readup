-- Book audio: allow the mobile app (anon / signed-in users) to read objects in the book-audio bucket.
-- Without this, createSignedUrl() fails with "Object not found" and public URLs return 400 — the reader
-- will hide Listen mode and playback will not work.
--
-- Run in Supabase → SQL Editor (same as db/supabase-books-anon-select.sql for the books table).

drop policy if exists "Allow anon read book-audio objects" on storage.objects;

create policy "Allow anon read book-audio objects"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'book-audio');
