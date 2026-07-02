-- Server-side RPCs for the engagement layer.
-- All functions are security definer and live in the public schema so PostgREST can call them,
-- but each one explicitly checks auth.uid() before mutating data.

-- ----------------------------------------------------------------------------
-- record_reading_session
--   Upserts user_work_library (canonical) + updates streak counters + daily log.
--   Marks book completed if page >= total_pages.
-- ----------------------------------------------------------------------------

create or replace function public.record_reading_session(
  p_book_id text,
  p_page integer,
  p_total_pages integer,
  p_minutes_delta integer default 0,
  p_audio_position_ms integer default null,
  p_chapter_stable_id uuid default null,
  p_block_stable_id uuid default null
)
returns public.user_work_library
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_reading_status text;
  v_today date := (now() at time zone 'utc')::date;
  v_progress jsonb;
  v_canonical jsonb;
  v_work_id uuid;
  v_edition_id integer;
  v_edition_language text;
  v_row public.user_work_library;
  v_profile record;
  v_minutes integer := greatest(coalesce(p_minutes_delta, 0), 0);
  v_was_completed boolean := false;
  v_had_log_today boolean;
  v_work_touched_today boolean := false;
  v_new_streak integer;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_book_id is null or length(trim(p_book_id)) = 0 then
    raise exception 'book id required';
  end if;

  v_reading_status := case
    when p_total_pages > 0 and p_page >= p_total_pages then 'completed'
    else 'in_progress'
  end;

  v_canonical := jsonb_build_object(
    'page', greatest(p_page, 0),
    'total_pages', greatest(p_total_pages, 0)
  );
  if p_chapter_stable_id is not null then
    v_canonical := v_canonical || jsonb_build_object('chapter_stable_id', p_chapter_stable_id::text);
  end if;
  if p_block_stable_id is not null then
    v_canonical := v_canonical || jsonb_build_object('block_stable_id', p_block_stable_id::text);
  end if;

  v_progress := jsonb_build_object(
    'page', greatest(p_page, 0),
    'total_pages', greatest(p_total_pages, 0),
    'last_read_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'edition_book_id', p_book_id,
    'canonical_position', v_canonical
  );
  if p_chapter_stable_id is not null then
    v_progress := v_progress || jsonb_build_object('chapter_stable_id', p_chapter_stable_id::text);
  end if;
  if p_block_stable_id is not null then
    v_progress := v_progress || jsonb_build_object('block_stable_id', p_block_stable_id::text);
  end if;
  if p_audio_position_ms is not null then
    v_progress := v_progress || jsonb_build_object('audio_position_ms', p_audio_position_ms);
  end if;

  select id, work_id, language
    into v_edition_id, v_work_id, v_edition_language
  from public.books
  where id::text = p_book_id;

  if v_work_id is null then
    raise exception 'book % not found or missing work_id', p_book_id;
  end if;

  select reading_status = 'completed' into v_was_completed
  from public.user_work_library
  where user_id = v_user_id and work_id = v_work_id;

  insert into public.user_work_library (
    user_id,
    work_id,
    last_edition_id,
    preferred_language,
    is_saved,
    reading_status,
    progress,
    updated_at
  )
  values (
    v_user_id,
    v_work_id,
    v_edition_id,
    v_edition_language,
    false,
    v_reading_status,
    v_progress,
    now()
  )
  on conflict (user_id, work_id) do update
    set last_edition_id = excluded.last_edition_id,
        preferred_language = excluded.preferred_language,
        reading_status = case
          when public.user_work_library.reading_status = 'completed' then 'completed'
          else excluded.reading_status
        end,
        progress = excluded.progress,
        updated_at = now()
  returning * into v_row;

  -- Daily log + streak: first session of the UTC day marks the day (even with 0 minutes).
  select exists(
    select 1 from public.reading_daily_log
    where user_id = v_user_id and activity_date = v_today
  ) into v_had_log_today;

  select exists(
    select 1 from public.reading_daily_log
    where user_id = v_user_id
      and activity_date = v_today
      and touched_work_ids ? v_work_id::text
  ) into v_work_touched_today;

  if not v_had_log_today then
    insert into public.reading_daily_log (
      user_id,
      activity_date,
      minutes_read,
      books_touched,
      touched_work_ids
    )
    values (
      v_user_id,
      v_today,
      v_minutes,
      1,
      jsonb_build_array(v_work_id::text)
    );

    select
      current_streak_days,
      longest_streak_days,
      last_read_date,
      total_reading_minutes,
      coalesce(total_reading_days, 0) as total_reading_days
      into v_profile
    from public.profiles
    where id = v_user_id;

    if v_profile is null then
      insert into public.profiles (
        id,
        last_read_date,
        current_streak_days,
        longest_streak_days,
        total_reading_minutes,
        total_reading_days
      )
      values (v_user_id, v_today, 1, 1, v_minutes, 1);
    else
      v_new_streak := case
        when v_profile.last_read_date = v_today then v_profile.current_streak_days
        when v_profile.last_read_date = v_today - 1 then v_profile.current_streak_days + 1
        else 1
      end;

      update public.profiles
      set last_read_date = v_today,
          current_streak_days = v_new_streak,
          longest_streak_days = greatest(v_profile.longest_streak_days, v_new_streak),
          total_reading_minutes = v_profile.total_reading_minutes + v_minutes,
          total_reading_days = v_profile.total_reading_days + 1,
          updated_at = now()
      where id = v_user_id;
    end if;
  else
    if v_minutes > 0 then
      update public.reading_daily_log
      set minutes_read = public.reading_daily_log.minutes_read + v_minutes
      where user_id = v_user_id and activity_date = v_today;

      update public.profiles
      set total_reading_minutes = total_reading_minutes + v_minutes,
          updated_at = now()
      where id = v_user_id;
    end if;

    if not v_work_touched_today then
      update public.reading_daily_log
      set books_touched = public.reading_daily_log.books_touched + 1,
          touched_work_ids = public.reading_daily_log.touched_work_ids || jsonb_build_array(v_work_id::text)
      where user_id = v_user_id and activity_date = v_today;
    end if;
  end if;

  if v_reading_status = 'completed' and not v_was_completed then
    update public.profiles
    set total_books_completed = total_books_completed + 1,
        updated_at = now()
    where id = v_user_id;
  end if;

  perform public._maybe_unlock_achievements(v_user_id);

  return v_row;
end;
$$;

grant execute on function public.record_reading_session(text, integer, integer, integer, integer, uuid, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- toggle_work_save
--   Resolves edition book_id to work_id and toggles saved state on the work row.
-- ----------------------------------------------------------------------------

create or replace function public.toggle_work_save(
  p_book_id text,
  p_saved boolean
)
returns public.user_work_library
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_work_id uuid;
  v_edition_id integer;
  v_edition_language text;
  v_row public.user_work_library;
  v_existing public.user_work_library;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_book_id is null or length(trim(p_book_id)) = 0 then
    raise exception 'book id required';
  end if;

  select id, work_id, language
    into v_edition_id, v_work_id, v_edition_language
  from public.books
  where id::text = p_book_id;

  if v_work_id is null then
    raise exception 'book % not found or missing work_id', p_book_id;
  end if;

  select * into v_existing
  from public.user_work_library
  where user_id = v_user_id and work_id = v_work_id;

  if v_existing.user_id is not null then
    if p_saved = false
      and v_existing.reading_status = 'not_started'
      and v_existing.is_saved = true then
      delete from public.user_work_library
      where user_id = v_user_id and work_id = v_work_id;
      return null;
    end if;

    update public.user_work_library
    set is_saved = p_saved,
        last_edition_id = coalesce(last_edition_id, v_edition_id),
        preferred_language = coalesce(preferred_language, v_edition_language),
        updated_at = now()
    where user_id = v_user_id and work_id = v_work_id
    returning * into v_row;

    return v_row;
  end if;

  if p_saved = false then
    return null;
  end if;

  insert into public.user_work_library (
    user_id,
    work_id,
    last_edition_id,
    preferred_language,
    is_saved,
    reading_status,
    progress,
    updated_at
  )
  values (
    v_user_id,
    v_work_id,
    v_edition_id,
    v_edition_language,
    true,
    'not_started',
    null,
    now()
  )
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.toggle_work_save(text, boolean) to authenticated;

-- ----------------------------------------------------------------------------
-- complete_quiz
--   Scores a quiz attempt server-side using quiz_answers.is_correct,
--   inserts a row in user_quiz_attempts, returns the final score.
-- ----------------------------------------------------------------------------

create or replace function public.complete_quiz(
  p_book_id text,
  p_quiz_id integer,
  p_answers jsonb
)
returns public.user_quiz_attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_total integer;
  v_score integer := 0;
  v_scored jsonb := '[]'::jsonb;
  v_attempt public.user_quiz_attempts;
  v_entry jsonb;
  v_question_id integer;
  v_answer_id integer;
  v_is_correct boolean;
  v_work_id uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'array' then
    raise exception 'answers must be a JSON array';
  end if;

  select work_id into v_work_id
  from public.books
  where id::text = p_book_id;

  select count(*) into v_total
  from public.quiz_questions
  where quiz_id = p_quiz_id;

  if v_total = 0 then
    raise exception 'quiz % has no questions', p_quiz_id;
  end if;

  for v_entry in select jsonb_array_elements(p_answers)
  loop
    v_question_id := nullif(v_entry ->> 'question_id', '')::integer;
    v_answer_id := nullif(v_entry ->> 'answer_id', '')::integer;
    v_is_correct := false;

    if v_question_id is not null and v_answer_id is not null then
      select is_correct into v_is_correct
      from public.quiz_answers
      where id = v_answer_id and question_id = v_question_id;
      v_is_correct := coalesce(v_is_correct, false);
    end if;

    if v_is_correct then
      v_score := v_score + 1;
    end if;

    v_scored := v_scored || jsonb_build_object(
      'question_id', v_question_id,
      'answer_id', v_answer_id,
      'is_correct', v_is_correct
    );
  end loop;

  insert into public.user_quiz_attempts (
    user_id,
    book_id,
    work_id,
    quiz_id,
    score,
    total_questions,
    answers
  )
  values (v_user_id, p_book_id, v_work_id, p_quiz_id, v_score, v_total, v_scored)
  returning * into v_attempt;

  perform public._maybe_unlock_achievements(v_user_id);

  return v_attempt;
end;
$$;

grant execute on function public.complete_quiz(text, integer, jsonb) to authenticated;

-- ----------------------------------------------------------------------------
-- get_recommended_books
--   Returns up to p_limit books whose genres or keywords overlap with the
--   caller's selected_interests in their profile.
-- ----------------------------------------------------------------------------

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
          from unnest((select interests from me)) i
          where exists (
            select 1
            from public.book_genres bg2
            join public.genres g2 on g2.id = bg2.genre_id
            where bg2.book_id = b.id and (
              lower(g2.name_ru) = lower(i)
              or lower(g2.name) = lower(i)
            )
          )
        ), 0)
        +
        coalesce((
          select count(*)::integer
          from unnest((select interests from me)) i
          where exists (
            select 1
            from jsonb_array_elements_text(coalesce(b.keywords, '[]'::jsonb)) kw
            where lower(kw) = lower(i)
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

-- ----------------------------------------------------------------------------
-- _maybe_unlock_achievements (internal)
--   Inspects the caller's stats and inserts any newly-earned rows in
--   user_achievements. Also drops an in-app notification for each unlock.
-- ----------------------------------------------------------------------------

create or replace function public._maybe_unlock_achievements(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile record;
  v_perfect_quiz boolean;
  v_completed_books integer;
  v_best_day_minutes integer;
  v_rec record;
  v_value integer;
begin
  select * into v_profile from public.profiles where id = p_user_id;
  if v_profile is null then
    return;
  end if;

  select count(*)::integer into v_completed_books
  from public.user_work_library uwl
  where uwl.user_id = p_user_id and uwl.reading_status = 'completed';

  if v_profile.total_books_completed is distinct from v_completed_books then
    update public.profiles
    set total_books_completed = v_completed_books,
        updated_at = now()
    where id = p_user_id;
    v_profile.total_books_completed := v_completed_books;
  end if;

  select exists(
    select 1 from public.user_quiz_attempts uqa
    where uqa.user_id = p_user_id
      and uqa.total_questions > 0
      and uqa.score = uqa.total_questions
      and (
        uqa.work_id is not null
        or uqa.book_id is not null
      )
  ) into v_perfect_quiz;

  select coalesce(max(minutes_read), 0)::integer into v_best_day_minutes
  from public.reading_daily_log
  where user_id = p_user_id;

  for v_rec in
    select id, metric, threshold
    from public.achievements
    where metric is not null and threshold is not null
  loop
    v_value := case v_rec.metric
      when 'completed_books' then v_completed_books
      when 'streak_days' then coalesce(v_profile.current_streak_days, 0)
      when 'reading_minutes' then coalesce(v_profile.total_reading_minutes, 0)
      when 'reading_days' then coalesce(v_profile.total_reading_days, 0)
      when 'best_day_minutes' then v_best_day_minutes
      when 'perfect_quiz' then case when v_perfect_quiz then 1 else 0 end
      else null
    end;

    if v_value is not null and v_value >= v_rec.threshold then
      insert into public.user_achievements (user_id, achievement_id)
      values (p_user_id, v_rec.id)
      on conflict do nothing;
    end if;
  end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- Notification trigger when a new achievement unlocks
-- ----------------------------------------------------------------------------

create or replace function public.notify_on_achievement_unlock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
  v_desc text;
begin
  select title, description into v_title, v_desc
  from public.achievements
  where id = new.achievement_id;

  if v_title is not null then
    insert into public.user_notifications (user_id, type, title, body, payload)
    values (
      new.user_id,
      'achievement',
      v_title,
      coalesce(v_desc, ''),
      jsonb_build_object('achievement_id', new.achievement_id)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_user_achievements_notify on public.user_achievements;
create trigger trg_user_achievements_notify
  after insert on public.user_achievements
  for each row
  execute function public.notify_on_achievement_unlock();
