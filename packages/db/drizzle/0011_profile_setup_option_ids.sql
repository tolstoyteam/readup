update public.profiles
set selected_interests = coalesce(
  (
    select array_agg(distinct mapped.value)
    from unnest(selected_interests) as raw(value)
    cross join lateral (
      values (
        case raw.value
          when 'предпринимательство' then 'entrepreneurship'
          when 'entrepreneurship' then 'entrepreneurship'
          when 'стартапы' then 'startups'
          when 'startups' then 'startups'
          when 'лидерство' then 'leadership'
          when 'leadership' then 'leadership'
          when 'карьерный рост' then 'career_growth'
          when 'career growth' then 'career_growth'
          when 'инвестиции' then 'investing'
          when 'investing' then 'investing'
          when 'личные финансы' then 'personal_finance'
          when 'personal finance' then 'personal_finance'
          when 'экономика' then 'economics'
          when 'economics' then 'economics'
          when 'финансовая грамотность' then 'financial_literacy'
          when 'financial literacy' then 'financial_literacy'
          when 'продуктивность' then 'productivity'
          when 'productivity' then 'productivity'
          when 'психология' then 'psychology'
          when 'psychology' then 'psychology'
          when 'мышление' then 'mindset'
          when 'mindset' then 'mindset'
          when 'привычки' then 'habits'
          when 'habits' then 'habits'
          when 'искусственный интеллект' then 'artificial_intelligence'
          when 'artificial intelligence' then 'artificial_intelligence'
          when 'инновации' then 'innovation'
          when 'innovation' then 'innovation'
          when 'история науки' then 'history_of_science'
          when 'history of science' then 'history_of_science'
          when 'будущее' then 'future'
          when 'future' then 'future'
          when 'биографии' then 'biographies'
          when 'biographies' then 'biographies'
          when 'литература' then 'literature'
          when 'literature' then 'literature'
          when 'общество' then 'society'
          when 'society' then 'society'
          when 'история' then 'history'
          when 'history' then 'history'
          else raw.value
        end
      )
    ) as mapped(value)
  ),
  array[]::text[]
),
reading_goal = case reading_goal
  when 'Читать 5 минут в день' then 'read_5_minutes_daily'
  when 'Read 5 minutes a day' then 'read_5_minutes_daily'
  when 'Закончить 1 книгу в неделю' then 'finish_1_book_weekly'
  when 'Finish 1 book a week' then 'finish_1_book_weekly'
  when 'Развивать карьерные навыки' then 'career_skills'
  when 'Build career skills' then 'career_skills'
  when 'Больше понимать финансы' then 'understand_finance'
  when 'Understand finance better' then 'understand_finance'
  when 'Стать продуктивнее' then 'be_more_productive'
  when 'Become more productive' then 'be_more_productive'
  else reading_goal
end
where selected_interests <> array[]::text[] or reading_goal is not null;
