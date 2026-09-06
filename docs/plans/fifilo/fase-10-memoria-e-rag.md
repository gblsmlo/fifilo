# Fase 10 — Memória e RAG

**Marco 2** · Depende de: [Fase 09](fase-09-insights-e-relatorios.md) ·
Entrega: o agente passa a conhecer o histórico do usuário.

## Objetivo

Duas coisas distintas que costumam ser confundidas:

- **Memória**: o que o agente sabe sobre este usuário — preferências, contexto
  declarado ("sou autônomo", "aluguel é minha maior conta fixa"), decisões
  passadas.
- **Recuperação**: achar, no histórico do próprio usuário, o que é relevante
  para a pergunta atual sem despejar tudo no contexto.

## Categorização automática vem antes

Antes de qualquer embedding, o ganho maior e mais barato: **classificar
transação nova pelo histórico já classificado do próprio workspace**.

- Normalizar a descrição do estabelecimento e casar com o que o usuário já
  categorizou. Casamento exato e por similaridade textual resolve a maioria.
- O que sobra vai para vizinho mais próximo por embedding.
- O que ainda sobra vai para o modelo, com as opções de categoria do workspace
  no prompt.
- Sugestão é sugestão: entra como proposta, o usuário confirma, e a confirmação
  vira exemplo. O agente não recategoriza histórico sozinho.

Essa escada — determinístico, depois vetorial, depois modelo — é a versão
"pés no chão" da mesma ideia da [Fase 09](fase-09-insights-e-relatorios.md):
o modelo é o último recurso, não o primeiro.

## Escopo

### Entra

- `pgvector` no PostgreSQL 17 e a tabela de embeddings.
- Indexação de descrição de transação, nota, categoria e insight publicado.
- Recuperação escopada por workspace.
- Memória declarada do usuário, editável e visível.
- Categorização automática com a escada acima.

### Não entra

Índice compartilhado entre workspaces. Conteúdo de terceiros. Ajuste fino de
modelo.

## Persistência

- Extensão `vector` habilitada em migração própria.
- `embeddings`: `(organization_id, id)`, `source_type`, `source_id`, `chunk`,
  `embedding vector(N)`, `model`, `created_at`. Índice HNSW.
- `agent_memories`: `(organization_id, id)`, `scope` em
  `workspace | user`, `content`, `source` em `declared | inferred`,
  `confirmed_at`, `version`.

RLS `FORCE` e as cinco provas negativas nas duas.

**A recuperação filtra o workspace no SQL, nunca por instrução no prompt.** Um
`where organization_id = current_setting(...)` é verificável; "só use dados
deste usuário" escrito no prompt não é.

## Guardrails específicos

- Texto que vai para o provedor de embedding passa pelo mesmo portão de redação
  da [Fase 07](fase-07-fundacao-de-ia.md). Descrição de transação carrega nome
  de pessoa com frequência.
- Memória inferida é sempre mostrada ao usuário e pode ser apagada. Memória que
  o usuário não vê e não controla é um passivo, não um recurso.
- Apagar a fonte apaga o embedding na mesma transação. Sobra de índice depois
  de exclusão é vazamento com outro nome, e a `security.md` já exige que a
  exclusão cubra índice e cache.
- Trocar de modelo de embedding invalida o índice: guardar `model` na linha e
  reindexar por migração, nunca misturar espaços vetoriais.

## Critério de conclusão

- [ ] Categorização automática medida: taxa de acerto por camada da escada,
      sobre um conjunto rotulado do próprio workspace.
- [ ] Teste de que a recuperação de A nunca devolve linha de B.
- [ ] Teste de que apagar a transação apaga o embedding.
- [ ] Teste de redação antes do embedding.
- [ ] Memória inferida visível e removível na UI.
- [ ] Cinco provas negativas de RLS em `embeddings` e `agent_memories`.

## Decisões a registrar

| # | Decisão |
| ---: | --- |
| 036 | a escada de categorização é determinística, depois vetorial, depois modelo |
| 037 | recuperação é escopada por SQL; instrução em prompt não é controle de acesso |

## Fatias de commit

1. `feat(database): enable pgvector and persist embeddings and memories`
2. `feat(ai): add the embedding port and retrieval`
3. `feat(core): add the categorization ladder`
4. `feat(web): surface and edit agent memory`
5. `test(memory): add scoping, deletion and accuracy evidence`

## Registro de sessões

_(a preencher durante a execução)_
