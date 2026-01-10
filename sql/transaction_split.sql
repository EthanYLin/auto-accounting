create table public.transaction_split (
  id bigserial not null,
  user_id uuid not null,
  account_id bigint not null,
  budget_type_id bigint null,
  main_category_id bigint null,
  sub_category_id bigint null,
  amount numeric(18, 2) not null,
  transaction_type public.transaction_type null,
  name text null,
  transaction_id bigint not null,
  constraint transaction_split_pkey primary key (id),
  constraint transaction_split_budget_type_fk foreign KEY (user_id, budget_type_id) references budget_type (user_id, id) on update CASCADE on delete set null,
  constraint transaction_split_main_category_fk foreign KEY (user_id, main_category_id) references main_category (user_id, id) on update CASCADE on delete set null,
  constraint transaction_split_user_id_fkey foreign KEY (user_id) references auth.users (id) on update CASCADE on delete CASCADE,
  constraint transaction_split_account_fk foreign KEY (user_id, account_id) references account (user_id, id) on update CASCADE on delete RESTRICT,
  constraint transaction_split_sub_category_fk foreign KEY (user_id, sub_category_id) references sub_category (user_id, id) on update CASCADE on delete set null,
  constraint transaction_split_transaction_fk foreign KEY (transaction_id) references transaction (id) on update CASCADE on delete CASCADE,
  constraint transaction_split_amount_positive check ((amount >= (0)::numeric))
) TABLESPACE pg_default;

create index IF not exists idx_transaction_split_user_account on public.transaction_split using btree (user_id, account_id) TABLESPACE pg_default;

create index IF not exists idx_transaction_split_user_type on public.transaction_split using btree (user_id, transaction_type) TABLESPACE pg_default;

create index IF not exists idx_transaction_split_user_tx on public.transaction_split using btree (user_id, transaction_id) TABLESPACE pg_default;