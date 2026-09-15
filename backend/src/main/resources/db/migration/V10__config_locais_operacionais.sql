create table if not exists config_local_operacional (
    id bigserial primary key,
    nome varchar(80) not null,
    cor varchar(24) not null,
    ordem_exibicao integer not null,
    ativo boolean not null default true,
    atualizado_por_id bigint references motoristas(id),
    atualizado_em timestamp not null default now()
);

create unique index if not exists uk_config_local_operacional_nome_lower
    on config_local_operacional (lower(nome));

insert into config_local_operacional (nome, cor, ordem_exibicao, ativo)
select 'Ilha', '#e7f5ff', 1, true
where not exists (select 1 from config_local_operacional where lower(nome) = lower('Ilha'));

insert into config_local_operacional (nome, cor, ordem_exibicao, ativo)
select 'Lateral', '#eaf7ef', 2, true
where not exists (select 1 from config_local_operacional where lower(nome) = lower('Lateral'));

insert into config_local_operacional (nome, cor, ordem_exibicao, ativo)
select 'Escadaria', '#fff4cc', 3, true
where not exists (select 1 from config_local_operacional where lower(nome) = lower('Escadaria'));

insert into config_local_operacional (nome, cor, ordem_exibicao, ativo)
select 'Montanha Russa', '#fdebd3', 4, true
where not exists (select 1 from config_local_operacional where lower(nome) = lower('Montanha Russa'));

insert into config_local_operacional (nome, cor, ordem_exibicao, ativo)
select 'Igreja da Sé', '#f0e9ff', 5, true
where not exists (select 1 from config_local_operacional where lower(nome) = lower('Igreja da Sé'));

insert into config_local_operacional (nome, cor, ordem_exibicao, ativo)
select 'Outro', '#edf1f6', 6, true
where not exists (select 1 from config_local_operacional where lower(nome) = lower('Outro'));
