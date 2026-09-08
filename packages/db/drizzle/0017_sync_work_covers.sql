-- Sync book covers to work-level: one cover per work, mirrored on all editions.
-- Prefers existing book_works.cover_image_url; otherwise first non-empty edition cover.
-- Does not delete storage objects.

with canonical as (
  select
    w.id as work_id,
    coalesce(
      nullif(trim(w.cover_image_url), ''),
      (
        select nullif(trim(b.cover_image_url), '')
        from public.books b
        where b.work_id = w.id
          and b.cover_image_url is not null
          and trim(b.cover_image_url) <> ''
        order by b.id asc
        limit 1
      )
    ) as cover_image_url
  from public.book_works w
)
update public.book_works w
set
  cover_image_url = c.cover_image_url,
  updated_at = now()
from canonical c
where w.id = c.work_id
  and c.cover_image_url is not null
  and w.cover_image_url is distinct from c.cover_image_url;

-- Mirror the work cover onto every edition (including clearing divergent edition paths).
update public.books b
set cover_image_url = w.cover_image_url
from public.book_works w
where b.work_id = w.id
  and b.cover_image_url is distinct from w.cover_image_url;
