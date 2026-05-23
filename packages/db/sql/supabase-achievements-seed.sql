-- Seed the achievement catalog. Re-runnable: uses ON CONFLICT on slug.

insert into public.achievements (slug, title, description, icon, sort_order) values
  ('first_book_completed', 'Первая книга', 'Завершите свою первую книгу', 'BookOpen', 10),
  ('five_books_completed', 'Пять книг', 'Завершите пять книг', 'BookMarked', 20),
  ('streak_3', 'Три дня подряд', 'Читайте три дня без перерыва', 'Flame', 30),
  ('streak_7', 'Неделя дисциплины', 'Семь дней подряд', 'Trophy', 40),
  ('quiz_perfect', 'Идеальный тест', 'Ответьте на все вопросы теста верно', 'Sparkles', 50),
  ('reading_time_60', 'Час за чтением', 'Прочитайте 60 минут суммарно', 'Clock', 60)
on conflict (slug) do update
  set title = excluded.title,
      description = excluded.description,
      icon = excluded.icon,
      sort_order = excluded.sort_order;
