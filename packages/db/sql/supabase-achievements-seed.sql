-- Seed the achievement catalog. Re-runnable: uses ON CONFLICT on slug.
-- metric + threshold drive the data-driven unlock loop in _maybe_unlock_achievements.

alter table public.achievements
  add column if not exists metric text,
  add column if not exists threshold integer,
  add column if not exists title_en text,
  add column if not exists description_en text;

insert into public.achievements (
  slug,
  title,
  title_en,
  description,
  description_en,
  icon,
  sort_order,
  metric,
  threshold
) values
  -- Streak (consecutive days)
  ('streak_3', 'Три дня подряд', 'Three days in a row', 'Читайте три дня без перерыва', 'Read for three days without a break', 'Flame', 100, 'streak_days', 3),
  ('streak_7', 'Неделя дисциплины', 'A week of discipline', 'Читайте семь дней без перерыва', 'Read for seven days without a break', 'Trophy', 110, 'streak_days', 7),
  ('streak_14', 'Две недели подряд', 'Two weeks in a row', 'Читайте 14 дней без перерыва', 'Read for 14 days without a break', 'Award', 120, 'streak_days', 14),
  ('streak_30', 'Месяц дисциплины', 'A month of discipline', 'Читайте 30 дней без перерыва', 'Read for 30 days without a break', 'Medal', 130, 'streak_days', 30),
  ('streak_100', 'Сто дней подряд', 'One hundred days in a row', 'Читайте 100 дней без перерыва', 'Read for 100 days without a break', 'Crown', 140, 'streak_days', 100),
  -- Books completed (completed only)
  ('first_book_completed', 'Первая книга', 'First book', 'Завершите свою первую книгу', 'Finish your first book', 'BookOpen', 200, 'completed_books', 1),
  ('three_books_completed', 'Три книги', 'Three books', 'Завершите три книги', 'Finish three books', 'BookMarked', 210, 'completed_books', 3),
  ('five_books_completed', 'Пять книг', 'Five books', 'Завершите пять книг', 'Finish five books', 'BookCopy', 220, 'completed_books', 5),
  ('ten_books_completed', 'Десять книг', 'Ten books', 'Завершите десять книг', 'Finish ten books', 'Library', 230, 'completed_books', 10),
  ('twenty_five_books_completed', 'Двадцать пять книг', 'Twenty-five books', 'Завершите 25 книг', 'Finish 25 books', 'Award', 240, 'completed_books', 25),
  ('fifty_books_completed', 'Пятьдесят книг', 'Fifty books', 'Завершите 50 книг', 'Finish 50 books', 'Crown', 250, 'completed_books', 50),
  -- Total reading time (cumulative minutes)
  ('reading_time_60', 'Час за чтением', 'One hour reading', 'Прочитайте 60 минут суммарно', 'Read for 60 minutes total', 'Clock', 300, 'reading_minutes', 60),
  ('reading_time_300', 'Пять часов', 'Five hours', 'Прочитайте 300 минут суммарно', 'Read for 300 minutes total', 'Clock', 310, 'reading_minutes', 300),
  ('reading_time_1000', 'Тысяча минут', 'One thousand minutes', 'Прочитайте 1000 минут суммарно', 'Read for 1000 minutes total', 'Hourglass', 320, 'reading_minutes', 1000),
  ('reading_time_5000', 'Книжный марафон', 'Book marathon', 'Прочитайте 5000 минут суммарно', 'Read for 5000 minutes total', 'Trophy', 330, 'reading_minutes', 5000),
  -- Daily reading (best single day)
  ('daily_minutes_10', 'Разминка', 'Warm-up', 'Прочитайте 10 минут за один день', 'Read for 10 minutes in one day', 'Timer', 400, 'best_day_minutes', 10),
  ('daily_minutes_30', 'Полчаса в день', 'Half an hour in a day', 'Прочитайте 30 минут за один день', 'Read for 30 minutes in one day', 'Timer', 410, 'best_day_minutes', 30),
  ('daily_minutes_60', 'Час за день', 'One hour in a day', 'Прочитайте 60 минут за один день', 'Read for 60 minutes in one day', 'Zap', 420, 'best_day_minutes', 60),
  ('daily_minutes_120', 'Глубокое погружение', 'Deep dive', 'Прочитайте 120 минут за один день', 'Read for 120 minutes in one day', 'Zap', 430, 'best_day_minutes', 120),
  -- Activity
  ('quiz_perfect', 'Идеальный тест', 'Perfect quiz', 'Ответьте на все вопросы теста верно', 'Answer every quiz question correctly', 'Sparkles', 500, 'perfect_quiz', 1),
  ('reading_days_10', 'Десять дней чтения', 'Ten reading days', 'Читайте в течение 10 дней', 'Read on 10 days', 'CalendarCheck', 510, 'reading_days', 10),
  ('reading_days_50', 'Пятьдесят дней чтения', 'Fifty reading days', 'Читайте в течение 50 дней', 'Read on 50 days', 'CalendarDays', 520, 'reading_days', 50)
on conflict (slug) do update
  set title = excluded.title,
      title_en = excluded.title_en,
      description = excluded.description,
      description_en = excluded.description_en,
      icon = excluded.icon,
      sort_order = excluded.sort_order,
      metric = excluded.metric,
      threshold = excluded.threshold;
