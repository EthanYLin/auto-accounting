create table public.transaction (
  id bigserial not null,
  user_id uuid not null,
  account_id bigint not null,
  budget_type_id bigint null,
  main_category_id bigint null,
  sub_category_id bigint null,
  original_amount numeric(18, 2) null,
  amount numeric(18, 2) not null,
  datetime timestamp without time zone null,
  name text null,
  merchant text null,
  source text null,
  remark text null,
  title text null,
  raw_info jsonb null,
  transaction_type public.transaction_type null,
  status public.transaction_status null,
  parent_id bigint null,
  constraint transaction_pkey primary key (id),
  constraint transaction_budget_type_fk foreign KEY (user_id, budget_type_id) references budget_type (user_id, id) on update CASCADE on delete set null,
  constraint transaction_main_category_fk foreign KEY (user_id, main_category_id) references main_category (user_id, id) on update CASCADE on delete set null,
  constraint transaction_parent_fk foreign KEY (parent_id) references transaction (id) on delete set null,
  constraint transaction_user_id_fkey foreign KEY (user_id) references auth.users (id) on update CASCADE on delete CASCADE,
  constraint transaction_account_fk foreign KEY (user_id, account_id) references account (user_id, id) on update CASCADE on delete RESTRICT,
  constraint transaction_sub_category_fk foreign KEY (user_id, sub_category_id) references sub_category (user_id, id) on update CASCADE on delete set null,
  constraint transaction_amount_positive check ((amount >= (0)::numeric))
) TABLESPACE pg_default;

create index IF not exists idx_transaction_user_datetime on public.transaction using btree (user_id, datetime desc) TABLESPACE pg_default;

create index IF not exists idx_transaction_user_account on public.transaction using btree (user_id, account_id) TABLESPACE pg_default;

create index IF not exists idx_transaction_user_type on public.transaction using btree (user_id, transaction_type) TABLESPACE pg_default;