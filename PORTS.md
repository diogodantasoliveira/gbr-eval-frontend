# Registro de portas — gbr-eval-frontend

Porta fixa. Não usar default do Next.js (3000) nem auto-discover. Fonte mestra em `../gbr-eval/docs/PORTS.md`; este arquivo é o espelho para o repo frontend.

## Portas locais

| Porta | Serviço | Onde está fixada |
|-------|---------|------------------|
| **3002** | Next.js dev server e production server | `package.json` scripts `dev` (`next dev -p 3002`) e `start` (`next start -p 3002`) |
| **3002** | PORT env var de referência | `.env.example` |

## Regras

1. `next dev` e `next start` sempre com `-p 3002`. Nunca confiar no default 3000.
2. Não há outros servidores — SQLite é arquivo local (`./gbr-eval.db`), sem porta.
3. Webhooks externos apontam para `http://<host>:3002/api/runs/webhook` — se a porta mudar, atualizar os CIs clientes.

Para o registro mestre (incluindo backend e portas externas consumidas), ver `../gbr-eval/docs/PORTS.md`.
