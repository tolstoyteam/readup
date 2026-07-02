-- Extend generation_jobs.type for book-generation pipeline audit.

alter table public.generation_jobs
  drop constraint if exists generation_jobs_type_check;

alter table public.generation_jobs
  add constraint generation_jobs_type_check
  check (type in ('translation', 'tts', 'book_generation', 'cover'));
