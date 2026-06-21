-- Seed the achievement catalog. Re-runnable: uses ON CONFLICT on slug.
-- metric + threshold drive the data-driven unlock loop in _maybe_unlock_achievements.

alter table public.achievements
  add column if not exists metric text,
  add column if not exists threshold integer;

insert into public.achievements (slug, title, description, icon, sort_order, metric, threshold) values
  -- Streak (consecutive days)
  ('streak_3', 'Три дня подряд', 'Читайте три дня без перерыва', 'Flame', 100, 'streak_days', 3),
  ('streak_7', 'Неделя дисциплины', 'Читайте семь дней без перерыва', 'Trophy', 110, 'streak_days', 7),
  ('streak_14', 'Две недели подряд', 'Читайте 14 дней без перерыва', 'Award', 120, 'streak_days', 14),
  ('streak_30', 'Месяц дисциплины', 'Читайте 30 дней без перерыва', 'Medal', 130, 'streak_days', 30),
  ('streak_100', 'Сто дней подряд', 'Читайте 100 дней без перерыва', 'Crown', 140, 'streak_days', 100),
  -- Books completed (completed only)
  ('first_book_completed', 'Первая книга', 'Завершите свою первую книгу', 'BookOpen', 200, 'completed_books', 1),
  ('three_books_completed', 'Три книги', 'Завершите три книги', 'BookMarked', 210, 'completed_books', 3),
  ('five_books_completed', 'Пять книг', 'Завершите пять книг', 'BookCopy', 220, 'completed_books', 5),
  ('ten_books_completed', 'Десять книг', 'Завершите десять книг', 'Library', 230, 'completed_books', 10),
  ('twenty_five_books_completed', 'Двадцать пять книг', 'Завершите 25 книг', 'Award', 240, 'completed_books', 25),
  ('fifty_books_completed', 'Пятьдесят книг', 'Завершите 50 книг', 'Crown', 250, 'completed_books', 50),
  -- Total reading time (cumulative minutes)
  ('reading_time_60', 'Час за чтением', 'Прочитайте 60 минут суммарно', 'Clock', 300, 'reading_minutes', 60),
  ('reading_time_300', 'Пять часов', 'Прочитайте 300 минут суммарно', 'Clock', 310, 'reading_minutes', 300),
  ('reading_time_1000', 'Тысяча минут', 'Прочитайте 1000 минут суммарно', 'Hourglass', 320, 'reading_minutes', 1000),
  ('reading_time_5000', 'Книжный марафон', 'Прочитайте 5000 минут суммарно', 'Trophy', 330, 'reading_minutes', 5000),
  -- Daily reading (best single day)
  ('daily_minutes_10', 'Разминка', 'Прочитайте 10 минут за один день', 'Timer', 400, 'best_day_minutes', 10),
  ('daily_minutes_30', 'Полчаса в день', 'Прочитайте 30 минут за один день', 'Timer', 410, 'best_day_minutes', 30),
  ('daily_minutes_60', 'Час за день', 'Прочитайте 60 минут за один день', 'Zap', 420, 'best_day_minutes', 60),
  ('daily_minutes_120', 'Глубокое погружение', 'Прочитайте 120 минут за один день', 'Zap', 430, 'best_day_minutes', 120),
  -- Activity
  ('quiz_perfect', 'Идеальный тест', 'Ответьте на все вопросы теста верно', 'Sparkles', 500, 'perfect_quiz', 1),
  ('reading_days_10', 'Десять дней чтения', 'Читайте в течение 10 дней', 'CalendarCheck', 510, 'reading_days', 10),
  ('reading_days_50', 'Пятьдесят дней чтения', 'Читайте в течение 50 дней', 'CalendarDays', 520, 'reading_days', 50)
on conflict (slug) do update
  set title = excluded.title,
      description = excluded.description,
      icon = excluded.icon,
      sort_order = excluded.sort_order,
      metric = excluded.metric,
      threshold = excluded.threshold;
