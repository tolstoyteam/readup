create or replace function public.get_recommended_books(p_limit integer default 12)
returns table (
  id integer,
  book_id text,
  title text,
  author text,
  language text,
  cover_image_url text,
  genres text[],
  match_score integer
)
language sql
security definer
set search_path = public
as $$
  with me as (
    select coalesce(selected_interests, array[]::text[]) as interests
    from public.profiles
    where id = auth.uid()
  ),
  interest_labels(id, ru, en) as (
    values
      ('entrepreneurship', 'предпринимательство', 'entrepreneurship'),
      ('startups', 'стартапы', 'startups'),
      ('leadership', 'лидерство', 'leadership'),
      ('career_growth', 'карьерный рост', 'career growth'),
      ('investing', 'инвестиции', 'investing'),
      ('personal_finance', 'личные финансы', 'personal finance'),
      ('economics', 'экономика', 'economics'),
      ('financial_literacy', 'финансовая грамотность', 'financial literacy'),
      ('productivity', 'продуктивность', 'productivity'),
      ('psychology', 'психология', 'psychology'),
      ('mindset', 'мышление', 'mindset'),
      ('habits', 'привычки', 'habits'),
      ('artificial_intelligence', 'искусственный интеллект', 'artificial intelligence'),
      ('innovation', 'инновации', 'innovation'),
      ('history_of_science', 'история науки', 'history of science'),
      ('future', 'будущее', 'future'),
      ('biographies', 'биографии', 'biographies'),
      ('literature', 'литература', 'literature'),
      ('society', 'общество', 'society'),
      ('history', 'история', 'history')
  ),
  expanded_interests as (
    select distinct lower(value) as interest
    from me
    cross join lateral unnest(me.interests) raw_interest(raw)
    cross join lateral (
      values
        (raw_interest.raw),
        ((select ru from interest_labels where id = raw_interest.raw limit 1)),
        ((select en from interest_labels where id = raw_interest.raw limit 1))
    ) expanded(value)
    where value is not null and length(trim(value)) > 0
  ),
  scored as (
    select
      b.id,
      b.work_id,
      b.id::text as book_id,
      b.title,
      b.author,
      b.language,
      coalesce(w.cover_image_url, b.cover_image_url) as cover_image_url,
      coalesce(
        array_agg(distinct g.name_ru order by g.name_ru) filter (where g.name_ru is not null),
        array[]::text[]
      ) as genres,
      (
        coalesce((
          select count(*)::integer
          from expanded_interests i
          where exists (
            select 1
            from public.book_genres bg2
            join public.genres g2 on g2.id = bg2.genre_id
            where bg2.book_id = b.id and (
              lower(g2.name_ru) = i.interest
              or lower(g2.name) = i.interest
            )
          )
        ), 0)
        +
        coalesce((
          select count(*)::integer
          from expanded_interests i
          where exists (
            select 1
            from jsonb_array_elements_text(coalesce(b.keywords, '[]'::jsonb)) kw
            where lower(kw) = i.interest
          )
        ), 0)
      ) as match_score
    from public.books b
    join public.book_works w on w.id = b.work_id
    left join public.book_genres bg on bg.book_id = b.id
    left join public.genres g on g.id = bg.genre_id
    where b.status = 'published'
    group by b.id, w.cover_image_url
  ),
  ranked as (
    select *,
      row_number() over (
        partition by work_id
        order by match_score desc, case language when 'ru' then 0 when 'en' then 1 else 2 end, id asc
      ) as rn
    from scored
  )
  select id, book_id, title, author, language, cover_image_url, genres, match_score
  from ranked
  where rn = 1
  order by match_score desc, id asc
  limit greatest(coalesce(p_limit, 12), 1);
$$;

grant execute on function public.get_recommended_books(integer) to authenticated;
