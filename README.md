# PASSA API

Backend do [PASSA](https://github.com) — marketplace circular para Angola. Monólito modular em NestJS, TypeScript, Prisma e PostgreSQL, com DDD e arquitectura limpa.

O recorte actual cobre a **100%** o painel de admin *Validação e beta* e a rota pública `/inquerito`:

- inquérito público (perguntas, envio, uma resposta por contacto);
- relatório de validação (índice, sinais, segmentos, CSV);
- lista de espera e convites do beta fechado.

## Arranque

```bash
cp .env.example .env
npm install
npm run db:up          # PostgreSQL em localhost:5434
npx prisma migrate dev --name init
npm run db:seed
npm run start:dev      # http://localhost:3333/api/v1
```

Documentação interactiva: [http://localhost:3333/docs](http://localhost:3333/docs)

| Comando | O que faz |
| --- | --- |
| `npm run start:dev` | API em modo watch |
| `npm test` | Testes de domínio e casos de uso |
| `npm run typecheck` | TypeScript |
| `npm run db:studio` | Prisma Studio |

## Conta do seed

O seed cria **apenas** a conta de administrador definida em `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD`.

## HTTP (prefixo `/api/v1`)

**Público**

- `GET /surveys/form` — passos e perguntas do inquérito
- `POST /surveys` — enviar respostas (`answers`, `name?`, `email?`, `phone?`, `betaConsent`)
- `GET /beta/settings` — beta fechado ou aberto
- `GET /beta/access` — acesso actual (JWT opcional)
- `POST /auth/sign-in` / `POST /auth/register` / `GET /auth/me`

**Equipa** (`Authorization: Bearer`, papel `ADMIN`)

- `GET /admin/surveys` — respostas com contactos
- `GET /admin/surveys/report` — índice de validação
- `GET /admin/surveys/export` — CSV
- `GET /admin/beta/invites` · `POST /admin/beta/invites`
- `POST /admin/beta/invites/:id/revoke` · `.../restore`
- `GET /admin/beta/settings` · `PATCH /admin/beta/settings` `{ "closed": true|false }`

## Arquitectura

```
src/
├── config/                    # Ambiente (Zod)
├── modules/                   # Contextos conhecidos
│   ├── identity/              # Contas, JWT, admin
│   ├── research/              # Inquérito e índice de validação
│   └── beta/                  # Convites e beta fechado
│       ├── domain/            # Regras, entidades, portas
│       ├── application/       # Casos de uso
│       ├── infrastructure/    # Prisma, notificações
│       └── presentation/      # Controllers HTTP
├── shared/                    # Relógio, erros, Prisma, filtros
└── main.ts
```

As dependências apontam para dentro: HTTP → aplicação → domínio. O domínio não conhece Nest nem Prisma. Os módulos falam entre si por portas (`BetaAccessPolicy`), não por detalhes de persistência.

## Ligar o frontend

O MVP em `~/dev/passa` ainda corre em memória. Quando for a hora, os serviços `survey` e `beta` do contentor passam a chamar esta API em `http://localhost:3333/api/v1`.
