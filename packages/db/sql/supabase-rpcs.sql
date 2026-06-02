-- Server-side RPCs for the engagement layer.
-- All functions are security definer and live in the public schema so PostgREST can call them,
-- but each one explicitly checks auth.uid() before mutating data.

-- ----------------------------------------------------------------------------
-- record_reading_session
--   Upserts user_library progress + updates streak counters + daily log.
--   Marks book completed if page >= total_pages.
-- ----------------------------------------------------------------------------

create or replace function public.record_reading_session(
  p_book_id text,
  p_page integer,
  p_total_pages integer,
  p_minutes_delta integer default 0,
  p_audio_position_ms integer default null
)
returns public.user_library
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_reading_status text;
  v_today date := (now() at time zone 'utc')::date;
  v_progress jsonb;
  v_row public.user_library;
  v_profile record;
  v_minutes integer := greatest(coalesce(p_minutes_delta, 0), 0);
  v_was_completed boolean := false;
  v_had_log_today boolean;
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

  v_progress := jsonb_build_object(
    'page', greatest(p_page, 0),
    'total_pages', greatest(p_total_pages, 0),
    'last_read_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );
  if p_audio_position_ms is not null then
    v_progress := v_progress || jsonb_build_object('audio_position_ms', p_audio_position_ms);
  end if;

  -- Was this book already completed before this call? Avoid double-counting.
  select reading_status = 'completed' into v_was_completed
  from public.user_library
  where user_id = v_user_id and book_id = p_book_id;

  insert into public.user_library (user_id, book_id, is_saved, reading_status, progress, updated_at)
  values (v_user_id, p_book_id, false, v_reading_status, v_progress, now())
  on conflict (user_id, book_id) do update
    set reading_status = case
          when public.user_library.reading_status = 'completed' then 'completed'
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

  if not v_had_log_today then
    insert into public.reading_daily_log (user_id, activity_date, minutes_read, books_touched)
    values (v_user_id, v_today, v_minutes, 1);

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
  elsif v_minutes > 0 then
    update public.reading_daily_log
    set minutes_read = public.reading_daily_log.minutes_read + v_minutes
    where user_id = v_user_id and activity_date = v_today;

    update public.profiles
    set total_reading_minutes = total_reading_minutes + v_minutes,
        updated_at = now()
    where id = v_user_id;
  end if;

  -- Increment total_books_completed once per book.
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

grant execute on function public.record_reading_session(text, integer, integer, integer, integer) to authenticated;

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
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'array' then
    raise exception 'answers must be a JSON array';
  end if;

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

  insert into public.user_quiz_attempts (user_id, book_id, quiz_id, score, total_questions, answers)
  values (v_user_id, p_book_id, p_quiz_id, v_score, v_total, v_scored)
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
      b.id::text as book_id,
      b.title,
      b.author,
      b.language,
      b.cover_image_url,
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
    left join public.book_genres bg on bg.book_id = b.id
    left join public.genres g on g.id = bg.genre_id
    group by b.id
  )
  select id, book_id, title, author, language, cover_image_url, genres, match_score
  from scored
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
begin
  select * into v_profile from public.profiles where id = p_user_id;
  if v_profile is null then
    return;
  end if;

  select count(*)::integer into v_completed_books
  from public.user_library
  where user_id = p_user_id and reading_status = 'completed';

  if v_profile.total_books_completed is distinct from v_completed_books then
    update public.profiles
    set total_books_completed = v_completed_books,
        updated_at = now()
    where id = p_user_id;
    v_profile.total_books_completed := v_completed_books;
  end if;

  select exists(
    select 1 from public.user_quiz_attempts
    where user_id = p_user_id and total_questions > 0 and score = total_questions
  ) into v_perfect_quiz;

  -- first_book_completed
  if v_completed_books >= 1 then
    insert into public.user_achievements (user_id, achievement_id)
    select p_user_id, id from public.achievements where slug = 'first_book_completed'
    on conflict do nothing;
  end if;

  -- five_books_completed
  if v_completed_books >= 5 then
    insert into public.user_achievements (user_id, achievement_id)
    select p_user_id, id from public.achievements where slug = 'five_books_completed'
    on conflict do nothing;
  end if;

  -- streak_3
  if v_profile.current_streak_days >= 3 then
    insert into public.user_achievements (user_id, achievement_id)
    select p_user_id, id from public.achievements where slug = 'streak_3'
    on conflict do nothing;
  end if;

  -- streak_7
  if v_profile.current_streak_days >= 7 then
    insert into public.user_achievements (user_id, achievement_id)
    select p_user_id, id from public.achievements where slug = 'streak_7'
    on conflict do nothing;
  end if;

  -- quiz_perfect
  if v_perfect_quiz then
    insert into public.user_achievements (user_id, achievement_id)
    select p_user_id, id from public.achievements where slug = 'quiz_perfect'
    on conflict do nothing;
  end if;

  -- reading_time_60
  if v_profile.total_reading_minutes >= 60 then
    insert into public.user_achievements (user_id, achievement_id)
    select p_user_id, id from public.achievements where slug = 'reading_time_60'
    on conflict do nothing;
  end if;
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
