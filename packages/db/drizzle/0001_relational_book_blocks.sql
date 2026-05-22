-- Relational book blocks migration.
-- This keeps the old books.data JSONB column nullable for one-time backfill only.

alter table books
  add column if not exists title text,
  add column if not exists author text,
  add column if not exists language varchar(32),
  add column if not exists cover_image_url text,
  add column if not exists keywords jsonb not null default '[]'::jsonb,
  add column if not exists tts_audio jsonb;

update books
set
  title = coalesce(title, nullif(data ->> 'title', '')),
  author = coalesce(author, nullif(data ->> 'author', '')),
  language = coalesce(language, nullif(data ->> 'language', '')),
  cover_image_url = coalesce(cover_image_url, nullif(data ->> 'cover_image_path', '')),
  tts_audio = coalesce(tts_audio, data -> 'tts_audio')
where data is not null;

update books
set keywords = coalesce(
  (
    select jsonb_agg(keyword)
    from jsonb_array_elements(data -> 'pages') page,
      jsonb_array_elements(page -> 'elements') element,
      jsonb_array_elements_text(element -> 'content') keyword
    where element ->> 'type' = 'keywords'
  ),
  '[]'::jsonb
)
where data is not null;

update books
set
  title = coalesce(nullif(title, ''), 'Untitled book'),
  author = coalesce(nullif(author, ''), 'Unknown author'),
  language = coalesce(nullif(language, ''), 'en');

alter table books
  alter column title set not null,
  alter column author set not null,
  alter column language set not null;

create table if not exists genres (
  id serial primary key,
  name text not null unique
);

create table if not exists book_genres (
  book_id integer not null references books(id) on delete cascade,
  genre_id integer not null references genres(id) on delete cascade,
  primary key (book_id, genre_id)
);

create table if not exists chapters (
  id serial primary key,
  book_id integer not null references books(id) on delete cascade,
  title text not null,
  order_index integer not null
);

create table if not exists chapter_blocks (
  id serial primary key,
  chapter_id integer not null references chapters(id) on delete cascade,
  type varchar(32) not null check (type in ('paragraph', 'quote')),
  content jsonb not null,
  order_index integer not null
);

create table if not exists quizzes (
  id serial primary key,
  book_id integer not null references books(id) on delete cascade
);

create table if not exists quiz_questions (
  id serial primary key,
  quiz_id integer not null references quizzes(id) on delete cascade,
  question text not null,
  order_index integer not null
);

create table if not exists quiz_answers (
  id serial primary key,
  question_id integer not null references quiz_questions(id) on delete cascade,
  text text not null,
  is_correct boolean not null default false
);

create index if not exists books_title_idx on books(title);
create index if not exists book_genres_book_id_idx on book_genres(book_id);
create index if not exists book_genres_genre_id_idx on book_genres(genre_id);
create index if not exists chapters_book_id_idx on chapters(book_id);
create index if not exists chapters_book_order_idx on chapters(book_id, order_index);
create index if not exists chapter_blocks_chapter_id_idx on chapter_blocks(chapter_id);
create index if not exists chapter_blocks_chapter_order_idx on chapter_blocks(chapter_id, order_index);
create index if not exists quizzes_book_id_idx on quizzes(book_id);
create index if not exists quiz_questions_quiz_id_idx on quiz_questions(quiz_id);
create index if not exists quiz_questions_quiz_order_idx on quiz_questions(quiz_id, order_index);
create index if not exists quiz_answers_question_id_idx on quiz_answers(question_id);

insert into genres (name)
select distinct genre
from books,
  jsonb_array_elements_text(data -> 'genres') genre
where data is not null
on conflict (name) do nothing;

insert into book_genres (book_id, genre_id)
select distinct books.id, genres.id
from books
join lateral jsonb_array_elements_text(books.data -> 'genres') genre_name on true
join genres on genres.name = genre_name
where books.data is not null
on conflict do nothing;

with page_rows as (
  select
    books.id as book_id,
    (page.ordinality - 1)::integer as order_index,
    page.value as page_json
  from books
  cross join lateral jsonb_array_elements(books.data -> 'pages') with ordinality as page(value, ordinality)
  where books.data is not null
),
inserted_chapters as (
  insert into chapters (book_id, title, order_index)
  select
    page_rows.book_id,
    coalesce(
      nullif((
        select element ->> 'content'
        from jsonb_array_elements(page_rows.page_json -> 'elements') element
        where element ->> 'type' = 'chapter_name'
        limit 1
      ), ''),
      'Untitled chapter'
    ),
    page_rows.order_index
  from page_rows
  returning id, book_id, order_index
)
insert into chapter_blocks (chapter_id, type, content, order_index)
select
  inserted_chapters.id,
  case element.value ->> 'type'
    when 'text' then 'paragraph'
    when 'quote' then 'quote'
  end,
  jsonb_build_object('text', element.value ->> 'content'),
  (element.ordinality - 1)::integer
from inserted_chapters
join page_rows
  on page_rows.book_id = inserted_chapters.book_id
  and page_rows.order_index = inserted_chapters.order_index
cross join lateral jsonb_array_elements(page_rows.page_json -> 'elements') with ordinality as element(value, ordinality)
where element.value ->> 'type' in ('text', 'quote');

-- After app verification, run in a later migration:
-- alter table books drop column data;
