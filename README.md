# DevFlow

Plataforma full stack para pequenos times de desenvolvimento organizarem projetos, tarefas e prazos em um só lugar. O projeto mantém frontend, API REST e acesso ao PostgreSQL organizados em módulos fáceis de explicar e evoluir.

## Demonstração e screenshots

**Demonstração online:** [ainda não publicada. Adicione aqui a URL pública do Render depois de realizar e validar o deploy.](https://devflow-dnkf.onrender.com/)

| Dashboard | Projetos e tarefas |
| --- | --- |
| Adicione uma captura em `docs/screenshots/dashboard.png` | Adicione uma captura em `docs/screenshots/projects.png` |

## Funcionalidades

- Cadastro, login e logout com bcrypt e JWT.
- CRUD de projetos com descrição, status, prioridade e prazo.
- CRUD de tarefas vinculadas a projetos, com busca, filtros e ordenação.
- Dashboard com indicadores, progresso calculado a partir das tarefas e atividade recente.
- Interface em português responsiva, com estados vazios, carregamento, erros e confirmações.
- Paginação nas listagens da API e isolamento dos dados por proprietário.
- Helmet, cabeçalhos de segurança, limite de tentativas de autenticação e validação de entrada.

## Tecnologias

- HTML5, CSS3 e JavaScript ES modules (ES6+).
- Node.js 20+, Express 5 e API REST.
- PostgreSQL, `pg`, `bcrypt`, `jsonwebtoken`, `zod`, `helmet`, `express-rate-limit` e `dotenv`.
- npm, Git, GitHub, Render e Neon PostgreSQL.
- Docker Compose opcional para desenvolvimento local.

## Arquitetura

```text
client/
  app.js                  # Navegação e integração das telas
  pages/                  # Dashboard, projetos e tarefas
  services/api.js         # Cliente HTTP e sessão
  utils/format.js         # Formatação e escape de conteúdo
  styles/main.css         # Layout e componentes responsivos
server/
  config/                 # Validação de variáveis de ambiente
  controllers/            # Entrada HTTP e respostas
  database/               # Pool, migrações e schema PostgreSQL
  middleware/             # Autenticação, validação e tratamento de erros
  routes/                 # Rotas REST
  services/               # Regras de negócio e consultas parametrizadas
  utils/                  # Erros, paginação e funções compartilhadas
  integration.test.js     # Testes HTTP com PostgreSQL
render.yaml               # Blueprint Render sem credenciais
```

Controllers recebem as requisições e delegam aos services; os services concentram as regras e consultas SQL parametrizadas; middleware valida entradas e protege recursos; o schema e o registro de migrações mantêm a estrutura do banco. O Express serve frontend e API no mesmo domínio. O cliente usa URLs relativas `/api`, sem endereço de localhost embutido.

## Requisitos

- Node.js 20+ e npm.
- PostgreSQL local para execução e testes de integração, ou uma conexão PostgreSQL remota como Neon.

## Desenvolvimento local

```bash
npm ci
cp .env.example .env
```

Edite `.env` localmente: configure `DATABASE_URL`, `POSTGRES_PASSWORD` e um `JWT_SECRET` aleatório com pelo menos 32 caracteres. Escolha `JWT_EXPIRES_IN` entre `15m`, `30m`, `1h`, `2h`, `4h` e `8h`. Para desenvolvimento local, `DB_SSL=false`.

### PostgreSQL local com Docker Compose

O Docker Compose lê `POSTGRES_DB`, `POSTGRES_USER` e `POSTGRES_PASSWORD` do `.env`:

```bash
docker compose up -d db
docker compose ps
npm run db:migrate
npm run dev
```

Aguarde o serviço `db` ficar `healthy`. Também é possível instalar PostgreSQL diretamente e configurar `DATABASE_URL` para esse servidor. Não dependa do disco local do serviço Render para persistir dados.

### Variáveis de ambiente

| Variável | Uso |
| --- | --- |
| `NODE_ENV` | `development`, `test` ou `production` |
| `PORT` | Porta HTTP; padrão local `3000`, fornecida pelo Render em produção |
| `DATABASE_URL` | URL de conexão PostgreSQL; mantenha-a secreta |
| `JWT_SECRET` | Segredo para assinatura JWT, mínimo de 32 caracteres |
| `JWT_EXPIRES_IN` | Validade da sessão: `15m`, `30m`, `1h`, `2h`, `4h` ou `8h` |
| `DB_SSL` | `true` exige TLS e validação do certificado do PostgreSQL |
| `POSTGRES_DB` | Nome do banco local no Docker Compose |
| `POSTGRES_USER` | Usuário PostgreSQL local no Docker Compose |
| `POSTGRES_PASSWORD` | Senha local do PostgreSQL no Docker Compose |
| `TEST_DATABASE_URL` | URL exclusiva do banco local descartável de testes, terminada em `_test` |

`.env` e outros arquivos de ambiente ficam fora do Git. `.env.example` só contém valores de exemplo; nunca preencha nele credenciais reais.

### Executar e testar

```bash
npm run dev
npm test
```

Abra `http://localhost:3000`. `npm start` inicia o servidor de produção e aplica a migração inicial registrada em `schema_migrations`; `npm run db:migrate` pode ser executado separadamente. `GET /health` verifica servidor e banco. `npm test` roda os testes unitários sem banco.

### Banco de testes isolado

Crie um PostgreSQL local descartável chamado `devflow_security_test`, com usuário e senha exclusivos para testes. Configure `TEST_DATABASE_URL` no `.env` para esse banco (não reutilize `DATABASE_URL` de desenvolvimento ou produção). Execute:

```bash
npm run test:integration
```

O runner recusa URLs que não sejam locais ou cujo banco não termine em `_test`; as credenciais e os usuários gerados nos testes são fictícios. A suíte não executa em bancos remotos.

## API

As rotas protegidas exigem `Authorization: Bearer <token>`. Datas usam `AAAA-MM-DD`. As listagens paginadas retornam `{ items, pagination: { page, limit, total } }`.

| Método | Endpoint | Descrição |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Criar conta |
| `POST` | `/api/auth/login` | Iniciar sessão |
| `POST` | `/api/auth/logout` | Invalidar sessões ativas |
| `GET` | `/api/auth/me` | Usuário autenticado |
| `GET` | `/api/projects` | Listar projetos |
| `POST` | `/api/projects` | Criar projeto |
| `GET` | `/api/projects/:id` | Ver projeto |
| `PUT` | `/api/projects/:id` | Atualizar projeto |
| `DELETE` | `/api/projects/:id` | Excluir projeto e tarefas vinculadas |
| `GET` | `/api/projects/:id/tasks` | Listar tarefas do projeto |
| `POST` | `/api/projects/:id/tasks` | Criar tarefa |
| `PUT` | `/api/tasks/:id` | Atualizar tarefa |
| `DELETE` | `/api/tasks/:id` | Excluir tarefa |
| `GET` | `/api/dashboard` | Indicadores e atividade |
| `GET` | `/health` | Health check do Render e conexão com PostgreSQL |
| `GET` | `/api/health` | Alias do health check |
