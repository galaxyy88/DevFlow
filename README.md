<<<<<<< HEAD
# DevFlow
=======
# DevFlow

Plataforma full stack para pequenos times de desenvolvimento organizarem projetos, tarefas e prazos em um só lugar. O projeto mantém frontend, API REST e acesso ao PostgreSQL organizados em módulos fáceis de explicar e evoluir.

## Demonstração e screenshots

**Demonstração online:** ainda não publicada. Adicione aqui a URL pública do Render depois de realizar e validar o deploy.

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
- Helmet, CORS configurável, limite de tentativas de autenticação e validação de entrada.

## Tecnologias

- HTML5, CSS3 e JavaScript ES modules (ES6+).
- Node.js 20+, Express 5 e API REST.
- PostgreSQL, `pg`, `bcrypt`, `jsonwebtoken`, `zod`, `helmet`, `cors`, `express-rate-limit` e `dotenv`.
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

Edite `.env` localmente: configure `DATABASE_URL`, `POSTGRES_PASSWORD` e um `JWT_SECRET` aleatório com pelo menos 32 caracteres. Para desenvolvimento local, `DB_SSL=false`.

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
| `JWT_EXPIRES_IN` | Validade do token, padrão `1h` |
| `DB_SSL` | `true` exige TLS e validação do certificado do PostgreSQL |
| `CLIENT_ORIGINS` | Origens CORS adicionais, separadas por vírgula |
| `RENDER_EXTERNAL_URL` | Origem Render, permitida automaticamente para CORS |
| `POSTGRES_DB` | Nome do banco local no Docker Compose |
| `POSTGRES_USER` | Usuário PostgreSQL local no Docker Compose |
| `POSTGRES_PASSWORD` | Senha local do PostgreSQL no Docker Compose |

`.env` e outros arquivos de ambiente ficam fora do Git. `.env.example` só contém valores de exemplo; nunca preencha nele credenciais reais.

### Executar e testar

```bash
npm run dev
npm test
npm run test:integration
```

Abra `http://localhost:3000`. `npm start` inicia o servidor de produção e aplica a migração inicial registrada em `schema_migrations`; `npm run db:migrate` pode ser executado separadamente. `GET /health` verifica servidor e banco. `npm test` roda os testes unitários sem banco; os testes de integração exigem `DATABASE_URL` apontando para um banco PostgreSQL de teste.

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

## Publicação gratuita: GitHub, Neon e Render

### 1. Criar o PostgreSQL no Neon

1. Entre no [Neon Console](https://console.neon.tech/) e escolha **Create a project**.
2. Defina o nome e uma região próxima à região do serviço Render.
3. Após criar, abra **Dashboard → Connect** e escolha a branch e o database do projeto.
4. Selecione a opção **Pooled connection** para a aplicação e copie a connection string PostgreSQL que o Neon apresentar, mantendo os parâmetros TLS indicados pelo provedor.
5. Trate essa URL como segredo: não a cole no código, README, commits ou screenshots. Ela será cadastrada como `DATABASE_URL` no Render.

Confira no painel do Neon os limites atuais do plano gratuito: cotas de uso, armazenamento e suspensão por inatividade podem mudar. Mantenha cópias dos dados que não puder perder.

### 2. Enviar o código ao GitHub

O projeto ainda não foi publicado em nenhum remoto; o primeiro commit fica apenas no histórico local. Crie um repositório vazio na sua conta do GitHub, sem README nem `.gitignore` preexistentes. Depois confira que o arquivo `.env` não será adicionado e envie a branch local:

```bash
git status --short
git check-ignore .env
git remote add origin <URL-HTTPS-OU-SSH-DO-SEU-REPOSITORIO>
git push -u origin main
```

Substitua o placeholder pela URL do repositório que você criou. Este projeto não cria repositório remoto nem envia código automaticamente.

### 3. Criar o serviço no Render

1. Abra o [Render Dashboard](https://dashboard.render.com/) e selecione **New + → Blueprint**.
2. Conecte o GitHub, selecione seu repositório `DevFlow` e a branch `main`.
3. Revise o `render.yaml` e clique em **Apply**. O Blueprint cria um web service gratuito, instala com `npm ci`, inicia com `npm start` e verifica `/health`.
4. Na tela de configuração/ambiente, preencha `DATABASE_URL` com a URL copiada do Neon. É uma variável `sync: false`, portanto não está gravada no Blueprint.
5. Confirme `NODE_ENV=production`, `DB_SSL=true` e o `JWT_SECRET` gerado pelo próprio Render a partir de `generateValue: true`. Nunca compartilhe o valor do segredo.
6. Salve e inicie o primeiro deploy. O Render fornece automaticamente `PORT` e `RENDER_EXTERNAL_URL`; este último autoriza a origem pública do frontend no CORS. O serviço serve frontend e API pelo mesmo domínio.
7. O Blueprint usa `autoDeploy: false`: depois de mudanças enviadas ao GitHub, abra o serviço e escolha **Manual Deploy → Deploy latest commit** para publicar explicitamente.

O Render pode suspender serviços gratuitos inativos e a primeira requisição após a suspensão pode demorar. Confira quotas e limitações atuais de Render e Neon no painel dos provedores.

### 4. Encontrar e testar o link público

No painel do Render, abra o serviço e copie a URL pública mostrada no cabeçalho, normalmente terminada em `onrender.com`. Abra a URL, crie uma conta, entre, crie/edite/exclua projetos e tarefas e confirme o dashboard. Verifique também `https://<URL-PUBLICA-DO-SERVICO>/health`, que deve responder `{"status":"ok"}`.

## Testes

```bash
npm test
npm run test:integration
```

Os testes de integração inicializam o schema aditivamente, iniciam o Express em uma porta temporária e verificam frontend, health check, cadastro, login, CRUD, dashboard, logout e autorização entre dois usuários. Use um banco isolado de teste, não um banco com dados importantes.

## Desafios técnicos

- **Isolamento por proprietário:** cada consulta de projeto e tarefa confere o usuário proprietário no próprio SQL.
- **Logout de JWT:** `token_version` no PostgreSQL invalida sessões existentes sem armazenar tokens.
- **Filtros seguros:** parâmetros SQL são usados para valores e ordenações vêm de uma lista fixa.
- **Migrações sem apagar dados:** a migração inicial executa em transação, usa advisory lock para evitar corrida entre inicializações e registra sua versão antes de futuras migrações aditivas.
- **Frontend e API no mesmo domínio:** caminhos relativos evitam configurações de endpoint e builds distintos para produção.
- **Conexão Neon:** SSL valida o certificado com `DB_SSL=true`; pool pequeno respeita os limites de um serviço gratuito.

## Próximas melhorias

- Capturar e publicar screenshots reais e adicionar o link de demonstração depois do deploy.
- Adicionar exportação de dados e documentação OpenAPI.
- Considerar atribuição de tarefas, membros e permissões por equipe.

## Aprendizados

O projeto demonstra HTTP/REST, autenticação, autorização por proprietário, PostgreSQL, migrações, frontend responsivo, configuração de ambiente e preparação para deploy com serviços gerenciados.

## Sequência sugerida de commits

```text
feat: create authentication system
feat: add project management
feat: add task management
feat: create dashboard
feat: add responsive interface
test: cover API integration and user isolation
docs: prepare free cloud deployment
```
>>>>>>> e13e798 (feat: prepare DevFlow for free cloud deployment)
