update public.achievements as a
set title_en = v.title_en,
    description_en = v.description_en
from (
  values
    ('streak_3', 'Three days in a row', 'Read for three days without a break'),
    ('streak_7', 'A week of discipline', 'Read for seven days without a break'),
    ('streak_14', 'Two weeks in a row', 'Read for 14 days without a break'),
    ('streak_30', 'A month of discipline', 'Read for 30 days without a break'),
    ('streak_100', 'One hundred days in a row', 'Read for 100 days without a break'),
    ('first_book_completed', 'First book', 'Finish your first book'),
    ('three_books_completed', 'Three books', 'Finish three books'),
    ('five_books_completed', 'Five books', 'Finish five books'),
    ('ten_books_completed', 'Ten books', 'Finish ten books'),
    ('twenty_five_books_completed', 'Twenty-five books', 'Finish 25 books'),
    ('fifty_books_completed', 'Fifty books', 'Finish 50 books'),
    ('reading_time_60', 'One hour reading', 'Read for 60 minutes total'),
    ('reading_time_300', 'Five hours', 'Read for 300 minutes total'),
    ('reading_time_1000', 'One thousand minutes', 'Read for 1000 minutes total'),
    ('reading_time_5000', 'Book marathon', 'Read for 5000 minutes total'),
    ('daily_minutes_10', 'Warm-up', 'Read for 10 minutes in one day'),
    ('daily_minutes_30', 'Half an hour in a day', 'Read for 30 minutes in one day'),
    ('daily_minutes_60', 'One hour in a day', 'Read for 60 minutes in one day'),
    ('daily_minutes_120', 'Deep dive', 'Read for 120 minutes in one day'),
    ('quiz_perfect', 'Perfect quiz', 'Answer every quiz question correctly'),
    ('reading_days_10', 'Ten reading days', 'Read on 10 days'),
    ('reading_days_50', 'Fifty reading days', 'Read on 50 days')
) as v(slug, title_en, description_en)
where a.slug = v.slug;
