# Configuração das variáveis de ambiente do Cloudflare R2

Referência para configurar o armazenamento do TrackZone. Instruções consultadas
na documentação oficial da Cloudflare em 6 de outubro de 2026.

## Variáveis utilizadas

O projeto exige quatro variáveis e aceita duas opcionais, conforme
[`apps/web/.env.example`](../apps/web/.env.example).

| Variável               | Obrigatória                 | Valor                                               |
| ---------------------- | --------------------------- | --------------------------------------------------- |
| `R2_ACCOUNT_ID`        | Sim                         | ID da conta Cloudflare que contém o bucket          |
| `R2_ACCESS_KEY_ID`     | Sim                         | Identificador da credencial S3 gerada no R2         |
| `R2_SECRET_ACCESS_KEY` | Sim                         | Chave secreta da credencial S3 gerada no R2         |
| `R2_BUCKET`            | Sim                         | Nome exato do bucket                                |
| `R2_ENDPOINT`          | Não, para o endpoint padrão | Endereço base da API S3                             |
| `R2_REGION`            | Não                         | `auto` para Cloudflare R2; já é o padrão do projeto |

## 1. Acessar e ativar o R2

1. Entre no [painel Cloudflare](https://dash.cloudflare.com/).
2. Selecione a conta que será utilizada pelo TrackZone.
3. Abra **Storage & databases → R2 → Overview**.
4. Se for o primeiro acesso, conclua a ativação solicitada pelo painel antes de
   criar as credenciais.

Fonte: [Autenticação do R2](https://developers.cloudflare.com/r2/api/tokens/).

## 2. Criar o bucket e obter `R2_BUCKET`

1. Na página do R2, clique em **Create bucket**.
2. Informe um nome, por exemplo `trackzone-audio`.
3. Escolha a localização e a classe de armazenamento conforme a necessidade.
4. Conclua em **Create bucket**.
5. Use o nome exato na variável. Se o bucket já existir, copie seu nome da lista.

```dotenv
R2_BUCKET="trackzone-audio"
```

Mantenha o bucket privado. O TrackZone usa URLs assinadas e temporárias para
upload e reprodução.

Fonte: [Criação de buckets](https://developers.cloudflare.com/r2/buckets/create-buckets/).

## 3. Obter `R2_ACCOUNT_ID`

1. No painel Cloudflare, selecione a conta correta.
2. Pressione **Cmd + K** no Mac ou **Ctrl + K** no Windows/Linux.
3. Pesquise **Copy account ID**.
4. Selecione o resultado para copiar o identificador.
5. Cole o valor na variável.

```dotenv
R2_ACCOUNT_ID="cole-o-id-da-conta"
```

Fonte: [Como encontrar o ID da conta](https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/).

## 4. Obter `R2_ACCESS_KEY_ID` e `R2_SECRET_ACCESS_KEY`

1. Abra **R2 → Overview**.
2. Em **Account Details → API Tokens**, clique em **Manage**.
3. Escolha **Create Account API token**, se disponível para seu usuário, ou
   **Create User API token**.
4. Dê um nome, como `trackzone-storage`.
5. Selecione a permissão **Object Read & Write**.
6. Selecione **Apply to specific buckets only** e marque o bucket do TrackZone.
7. Conclua a criação do token.
8. Na confirmação, copie os campos **Access Key ID** e **Secret Access Key** das
   credenciais S3 para as respectivas variáveis.

```dotenv
R2_ACCESS_KEY_ID="cole-o-access-key-id"
R2_SECRET_ACCESS_KEY="cole-o-secret-access-key"
```

A chave secreta só é exibida nessa etapa. Guarde-a antes de sair da página;
se perdê-la, gere novas credenciais. Mantenha esses valores no arquivo de ambiente
ou no gerenciador de secrets da hospedagem, sem incluí-los no Git.

Fonte: [Autenticação do R2](https://developers.cloudflare.com/r2/api/tokens/).

## 5. Configurar `R2_ENDPOINT` e `R2_REGION`

Copie o endpoint S3 da confirmação da criação do token ou da página
**R2 → Overview**. Para buckets sem jurisdição específica, o endereço padrão é:

```dotenv
R2_ENDPOINT="https://SEU_ACCOUNT_ID.r2.cloudflarestorage.com"
R2_REGION="auto"
```

No TrackZone, `R2_ENDPOINT` pode ser omitido quando usar esse endereço padrão:
o código o monta a partir de `R2_ACCOUNT_ID`. `R2_REGION` também pode ser omitido,
pois seu padrão já é `auto`.

Buckets criados com jurisdição específica exigem o endpoint correspondente.
Para **European Union**, configure explicitamente:

```dotenv
R2_ENDPOINT="https://SEU_ACCOUNT_ID.eu.r2.cloudflarestorage.com"
```

Copie apenas o endereço base, sem acrescentar `/trackzone-audio`. O projeto
adiciona o nome do bucket ao construir os endereços dos objetos. A região de
assinatura continua sendo `auto` para o R2.

Fontes: [Integração S3](https://developers.cloudflare.com/r2/get-started/s3/)
e [Endpoints por jurisdição](https://developers.cloudflare.com/r2/api/tokens/).

## 6. Preencher o arquivo de ambiente do projeto

Edite `apps/web/.env.local`, preservando as outras variáveis existentes:

```dotenv
R2_ACCOUNT_ID="seu-id-da-conta"
R2_ACCESS_KEY_ID="seu-access-key-id"
R2_SECRET_ACCESS_KEY="sua-secret-access-key"
R2_BUCKET="trackzone-audio"
R2_REGION="auto"
# Para jurisdição específica, inclua o endpoint correspondente:
# R2_ENDPOINT="https://SEU_ACCOUNT_ID.eu.r2.cloudflarestorage.com"
```

Se o arquivo ainda não existir, use `apps/web/.env.example` como base. Os valores
acima são exemplos: substitua-os pelos valores reais obtidos no painel.

Se você configurou anteriormente o armazenamento local, remova ou substitua
o `R2_ENDPOINT` local e troque `R2_REGION="local"` por `"auto"`.
Reinicie o servidor após salvar.

Na hospedagem, configure essas variáveis no ambiente do aplicativo web.
Para processamento hospedado, configure também os valores nos secrets do worker
no Trigger.dev, seguindo a [etapa 8](#8-processamento-em-desenvolvimento-e-produção).
Em desenvolvimento, `pnpm worker:dev` usa o R2 e o banco configurados no mesmo
arquivo de ambiente do web.

Referências do projeto: [`README.md`](../README.md),
[`apps/web/src/env.ts`](../apps/web/src/env.ts),
[`apps/worker/src/env.ts`](../apps/worker/src/env.ts) e
[`packages/storage/src/r2.ts`](../packages/storage/src/r2.ts).

### Verificar a configuração

Na raiz do projeto, execute:

```bash
pnpm storage:check
```

O comando usa `apps/web/.env.local`, testa CORS, upload assinado, HEAD, cópia
condicional, leitura e byte ranges para seek. Cria apenas dois objetos temporários
com identificadores aleatórios e os remove ao concluir. Não usa o banco Supabase
nem imprime credenciais ou URLs assinadas.

Antes de usar o fluxo de upload, aplique também as migrations de segurança e
recuperação de processamento no banco de destino. Elas adicionam autorizações
server-side, finalização atômica e leases do worker. Configurar R2 não aplica
essas alterações no banco.

## 7. Configurar CORS para o navegador

Além das variáveis, uploads pelo navegador exigem uma política CORS no bucket.

1. Abra **R2 → seu bucket → Settings**.
2. Em **CORS Policy**, selecione **Add CORS policy**.
3. Na aba JSON, use a política abaixo para desenvolvimento.
4. Clique em **Save**.

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Para produção, acrescente a origem real da aplicação em `AllowedOrigins`,
incluindo `https://`, sem caminho ou barra final. Por exemplo:

```json
"AllowedOrigins": ["http://localhost:3000", "https://app.seudominio.com"]
```

Essa política permite as requisições do navegador mantendo o bucket privado.

Fonte: [Configuração de CORS](https://developers.cloudflare.com/r2/buckets/cors/).

## 8. Processamento em desenvolvimento e produção

### Desenvolvimento com R2

Para usar R2 em desenvolvimento, execute `pnpm dev` na raiz: esse comando inicia
web e worker. Se iniciar apenas a web, execute também `pnpm worker:dev`.
O worker lê `apps/web/.env.local`, usa o bucket R2 configurado e se conecta ao banco
indicado por `NEXT_PUBLIC_SUPABASE_URL`, seja ele local ou hospedado. Não é
necessário Supabase Storage local, nem Docker quando o banco já for hospedado.

Sem `TRIGGER_SECRET_KEY` em desenvolvimento, o processamento fica a cargo desse
worker. Em produção, é necessário configurar e publicar a task no Trigger.dev;
o processo `worker:dev` não é um serviço de produção.

R2 substitui o storage de áudio. O Supabase continua responsável por banco,
autenticação e permissões: para dispensar totalmente a instância local, a URL e
as chaves precisam apontar para um projeto Supabase hospedado, com as migrations
aplicadas. Alterar somente as variáveis R2 não migra os usuários e registros do
banco existente.

### Worker hospedado no Trigger.dev

O aplicativo web recebe o upload e solicita o processamento. O worker executa
essa tarefa: lê o áudio no R2, extrai os metadados e atualiza o Supabase.
Por isso, ele precisa de acesso ao mesmo bucket e ao mesmo banco utilizados
pelo aplicativo web naquele ambiente.

Configurar `apps/web/.env.local` prepara o aplicativo web local. O worker
hospedado recebe suas próprias variáveis pelo painel do Trigger.dev; o projeto
atual não configura sincronização automática entre os dois.

### 8.1. Vincular o worker ao projeto correto

1. Entre em [Trigger.dev Cloud](https://cloud.trigger.dev/).
2. Crie ou abra a organização e o projeto destinados ao TrackZone.
3. Copie a referência do projeto (`proj_...`), disponível nas configurações do
   projeto ou no exemplo de configuração apresentado no onboarding.
4. Em `apps/worker/trigger.config.ts`, substitua somente o valor de `project`:

```ts
project: 'proj_SUA_REFERENCIA_REAL',
```

Se o arquivo ainda usar `proj_trackzone_placeholder`, substitua esse exemplo
antes de executar ou publicar as tarefas. Preserve as outras
configurações, incluindo `dirs: ['./src/trigger']`.

Fonte: [Configuração do Trigger.dev](https://github.com/triggerdotdev/trigger.dev/blob/main/rules/4.0.0/config.md).

### 8.2. Cadastrar as variáveis no painel

1. Dentro do projeto, abra **Environment Variables** no menu lateral.
2. Clique em **New environment variable**.
3. Informe o nome exato e o valor, sem as aspas usadas em arquivos `.env`.
4. Preencha **Production** para o worker publicado, ou **Development** para
   testes com `dev:trigger`. Configure **Staging** se utilizar esse ambiente.
5. Para as credenciais indicadas abaixo, marque **Secret** durante a criação.
6. Salve e repita para as demais variáveis.

Valores marcados como **Secret** ficam ocultos após a criação. Essa opção não
pode ser alterada na variável existente; para mudar a classificação, é preciso
excluir e recriar a variável.

Fonte: [Variáveis de ambiente no Trigger.dev](https://trigger.dev/docs/deploy-environment-variables).

Cadastre as variáveis exigidas por `apps/worker/src/env.ts`:

| Nome                        | Valor a cadastrar                                           | Marcar como Secret |
| --------------------------- | ----------------------------------------------------------- | ------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`  | URL do mesmo projeto Supabase usado pelo web nesse ambiente | Não                |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço desse projeto Supabase                     | Sim                |
| `R2_ACCOUNT_ID`             | ID da conta Cloudflare que contém o bucket                  | Não                |
| `R2_ACCESS_KEY_ID`          | Access Key ID obtido na etapa 4                             | Sim                |
| `R2_SECRET_ACCESS_KEY`      | Secret Access Key obtida na etapa 4                         | Sim                |
| `R2_BUCKET`                 | Nome do mesmo bucket usado pelo web                         | Não                |
| `R2_REGION`                 | `auto`; pode ser omitida                                    | Não                |
| `R2_ENDPOINT`               | Endpoint da etapa 5, se necessário                          | Não                |

Exemplo: no formulário de uma variável, preencha **Name** com `R2_BUCKET` e
o valor de **Production** com `trackzone-audio`.

Para `R2_ENDPOINT`, use o endereço completo quando necessário ou omita a variável.
Não salve um valor vazio: a validação do worker exige uma URL válida quando
essa variável está definida. O worker hospedado precisa de endereços acessíveis
pela internet; um Supabase ou armazenamento em `localhost` no seu computador
não é acessível a ele.

`NEXT_PUBLIC_SUPABASE_ANON_KEY` e `NEXT_PUBLIC_SITE_URL` não são exigidas pelo
worker atual. Sua conexão com o banco usa `SUPABASE_SERVICE_ROLE_KEY`.

### 8.3. Configurar a chave que permite ao web disparar tarefas

A `TRIGGER_SECRET_KEY` autoriza o aplicativo web a solicitar execuções no
Trigger.dev. Ela é configurada no ambiente do **aplicativo web**.

1. No Trigger.dev, selecione o projeto e o ambiente que receberão as tarefas.
2. Abra **API keys** e clique em **New API key**.
3. Dê um nome, como `trackzone-web-production`.
4. Escolha acesso **Trigger only**, autorizando a tarefa `process-audio-file`
   ou todas as tarefas desse projeto.
5. Copie a chave e configure `TRIGGER_SECRET_KEY` no ambiente do web.

Para testes com o web local, use a chave de **Development** em
`apps/web/.env.local`. Para o web de produção, configure a chave de
**Production** nos secrets da hospedagem. Reinicie ou publique novamente o web
para carregar a alteração.

As chaves pertencem a um ambiente: uma chave de Development não dispara tarefas
em Production. O worker atual não exige que você cadastre `TRIGGER_SECRET_KEY`
na tabela de variáveis da etapa 8.2.

Fonte: [API keys do Trigger.dev](https://trigger.dev/docs/apikeys).

### 8.4. Publicar o worker ou executar em desenvolvimento

Execute os comandos abaixo na raiz do repositório, após ajustar a referência
do projeto e cadastrar as variáveis:

```bash
# Autenticar a CLI na sua conta Trigger.dev
pnpm --filter @trackzone/worker exec trigger login

# Publicar as tarefas em Production
pnpm --filter @trackzone/worker deploy
```

O comando de deploy usa Production por padrão. Publicar o worker é uma etapa
separada da publicação do aplicativo web. Passar `--env-file` ao deploy carrega
variáveis para a CLI, sem cadastrar por si só as variáveis usadas pelas tarefas
hospedadas; mantenha os valores no painel conforme a etapa 8.2.

Fonte: [Comando deploy](https://trigger.dev/docs/cli-deploy-commands).

Para testes no ambiente Development:

```bash
pnpm --filter @trackzone/worker dev:trigger
```

Mantenha esse processo rodando enquanto testa e use a chave de Development no
web. Para esse fluxo, você pode cadastrar as variáveis em Development no painel.
Se usar arquivos locais, mantenha as variáveis do worker em
`apps/worker/.env.local`; não presuma que o comando leia o arquivo do web.
Valores locais podem substituir os valores de Development cadastrados no painel.

Fontes: [Comando dev](https://trigger.dev/docs/cli-dev-commands) e
[Variáveis de desenvolvimento](https://trigger.dev/docs/deploy-environment-variables).

### 8.5. Conferir a integração

1. Confirme que a tarefa `process-audio-file` aparece no ambiente correto do
   Trigger.dev após o deploy ou a conexão da CLI de desenvolvimento.
2. Envie um novo arquivo de áudio pelo TrackZone.
3. Abra **Runs** no mesmo ambiente do Trigger.dev e localize a execução.
4. Confira se ela conclui com sucesso e se o TrackZone exibe os metadados do áudio.

Se houver falha, use estes pontos para localizar a configuração incorreta:

| Sintoma                                           | O que conferir                                                                                            |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Erro de validação de variável ausente             | As seis variáveis obrigatórias da etapa 8.2 no ambiente da execução                                       |
| Erro ao acessar o Supabase                        | URL e chave de serviço do mesmo projeto usado pelo web                                                    |
| HTTP 403 ao ler o áudio no R2                     | Credenciais S3, acesso ao bucket e endpoint da jurisdição                                                 |
| Nenhuma execução após o upload                    | `TRIGGER_SECRET_KEY` do web, projeto, ambiente e tarefa publicada; em Development, CLI conectada          |
| Execução concluída sem atualizar o áudio esperado | Web e worker apontando para o mesmo banco; o código encerra sem processamento se não encontrar o registro |

Referências do projeto: [`apps/worker/src/env.ts`](../apps/worker/src/env.ts),
[`apps/worker/src/trigger/process-audio-file.ts`](../apps/worker/src/trigger/process-audio-file.ts),
[`apps/worker/src/process-stored-audio-file.ts`](../apps/worker/src/process-stored-audio-file.ts) e
[`apps/web/src/lib/jobs/process-audio.ts`](../apps/web/src/lib/jobs/process-audio.ts).
