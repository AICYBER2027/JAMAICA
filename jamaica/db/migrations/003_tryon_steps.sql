-- A try-on job can dress the model in several garments one after another (top, then bottoms).
alter table tryon_jobs add column steps jsonb not null default '[]';
alter table tryon_jobs add column step int not null default 0;
alter table tryon_jobs add column model_input text;
