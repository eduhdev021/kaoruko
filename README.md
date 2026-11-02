<div align="center">

# Kaoruko Waguri

**Gestão de comunidades, automação e utilidades para Telegram.**

Um bot modular com moderação de grupos, painel web, integração com Mini Apps e recursos para conteúdo e serviços digitais.

[![Versão](https://img.shields.io/github/package-json/v/eduhdev021/kaoruko?style=flat-square&color=8b5cf6&label=vers%C3%A3o)](https://github.com/eduhdev021/kaoruko/releases)
[![Node.js](https://img.shields.io/badge/Node.js-22%20%7C%2024-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Licença](https://img.shields.io/badge/licen%C3%A7a-MIT-64748b?style=flat-square)](LICENSE)

[Instalação](#instalação) · [Configuração](#configuração) · [Painel web](#painel-web) · [Documentação](#documentação)

</div>

---

## Visão geral

A Kaoruko reúne ferramentas para administrar comunidades e oferecer serviços pelo Telegram. Desenvolvida em JavaScript com módulos ESM, utiliza **Telegraf**, **Express** e **SQLite**, com comandos organizados por categoria e configurações persistentes.

| Área | Recursos |
| --- | --- |
| **Comunidades** | Boas-vindas, regras, CAPTCHA, anti-raid, antispam, advertências e histórico de moderação. |
| **Conteúdo** | Notas com mídia e botões, comandos personalizados, publicações agendadas, enquetes e quizzes. |
| **Administração** | Painel web, permissões por grupo, indicadores de atividade, backups e restauração. |
| **Telegram** | Tópicos, publicações em canais com confirmação, convites temporários e gestão de pedidos de entrada. |
| **Utilidades** | Lembretes, reputação, álbuns, stickers, pesquisas e integrações de mídia e IA. |
| **Serviços digitais** | Mini App pessoal, planos VIP, compras com Stars e respostas por regras no Telegram Business. |

As integrações de mídia e IA utilizam a **Okarun System API**. Mini App, Stars, Business e modo inline são opcionais e precisam ser configurados antes do uso.

## Instalação

### Requisitos

- **Node.js 22 ou 24** e npm.
- Um bot criado no [@BotFather](https://t.me/BotFather).
- Seu ID numérico do Telegram para os comandos de proprietário.
- Chave da [Okarun System API](https://api.okarunsystem.com.br), caso utilize os recursos integrados a esse serviço.

Em sistemas sem binário compatível para o SQLite, a instalação também pode exigir Python, Make e um compilador C++.

### 1. Obtenha o projeto

```bash
git clone https://github.com/eduhdev021/kaoruko.git
cd kaoruko
npm ci
```

### 2. Configure o ambiente

```bash
cp .env.example .env
```

Edite o `.env` com suas credenciais. Para iniciar com o painel administrativo, preencha:

```dotenv
BOT_TOKEN=SEU_TOKEN_DO_BOTFATHER
BOT_OWNERS=SEU_ID_NUMERICO

PAINEL_ENABLED=true
PAINEL_PORT=4091
PAINEL_ADMIN_EMAIL=admin@seu-dominio.com
PAINEL_ADMIN_SENHA=DEFINA_UMA_SENHA_FORTE
```

`BOT_OWNERS` aceita vários IDs separados por vírgula. O e-mail e a senha acima provisionam a conta inicial de administrador; substitua os exemplos pelos seus dados. A senha deve ter pelo menos oito caracteres.

### 3. Inicie a aplicação

```bash
npm start
```

No Telegram, abra o privado da bot e envie `/start`. Use `/menu` para explorar as categorias e `/buscarcmd palavra` para localizar um comando.

## Configuração

O arquivo [`.env.example`](.env.example) contém as opções disponíveis. As principais são:

| Variável | Finalidade |
| --- | --- |
| `BOT_TOKEN` | Autenticação da bot no Telegram. |
| `BOT_OWNERS` | IDs dos proprietários autorizados. |
| `BOT_NAME` / `BOT_PREFIX` | Nome de exibição e prefixos dos comandos. |
| `BOT_TZ` | Fuso horário utilizado pela aplicação. |
| `OKARUN_APIKEY` | Chave para os comandos integrados à Okarun. Deixe vazia se não utilizar esses recursos. |
| `PAINEL_ADMIN_EMAIL` / `PAINEL_ADMIN_SENHA` | Credenciais para provisionar o administrador inicial. |
| `PAINEL_PORT` / `PAINEL_URL` | Porta local e endereço público do painel. |
| `DATABASE_PATH` / `BACKUP_DIR` | Caminhos personalizados para o banco e os backups. |

**Em grupos:** conceda à bot os direitos necessários para os recursos que ativar, como excluir mensagens ou restringir membros. A moderação de mensagens também depende da configuração de privacidade no BotFather. Comece com `/configgrupo` e habilite as proteções conforme a política da comunidade.

### Integrações opcionais

| Módulo | Preparação necessária |
| --- | --- |
| **Mini App** | URL pública HTTPS e configuração de abertura pelo Telegram. |
| **Stars** | Termos de compra, canal de suporte e catálogo de produtos VIP. |
| **Business** | Conta compatível, conexão autorizada e permissão para responder. |
| **Inline** | Ativação no BotFather e na configuração da aplicação. |
| **Webhook** | Endpoint HTTPS público e segredo próprio de autenticação. |

O transporte padrão é **polling**. As instruções de ativação de cada módulo estão no [guia da plataforma](GUIA-5.0.md).

## Painel web

Com o serviço iniciado, acesse:

| Página | Endereço local |
| --- | --- |
| Conta e acesso | [http://localhost:4091](http://localhost:4091) |
| Central de Gestão | [http://localhost:4091/gestao.html](http://localhost:4091/gestao.html) |
| Integrações e produtos | [http://localhost:4091/plataforma.html](http://localhost:4091/plataforma.html) |

Entre com a conta administrativa configurada no `.env`. O acesso de outras contas à gestão de grupos depende do vínculo com o Telegram e das permissões no chat.

Para acesso público, utilize **HTTPS** e configure `PAINEL_URL`. Não publique o `.env`, o banco de dados ou os backups.

## Operação

### Docker

Com o `.env` preenchido e `PAINEL_PORT=4091`:

```bash
docker compose up -d --build
docker compose logs -f
```

O Compose mantém o banco em um volume persistente e publica o painel em `127.0.0.1:4091` no servidor. Use um proxy reverso para disponibilizá-lo externamente.

### Backup e atualização

O banco padrão fica em `database/kaoruko.db`. Preserve o banco, o `.env` e seus backups ao atualizar. Mantenha apenas uma instância por token e banco de dados.

Para restaurar um backup, **pare a bot antes**:

```bash
npm run restaurar -- /caminho/backup.db
```

Se utilizar Stars, consulte as orientações de conciliação no guia antes de restaurar dados de pagamentos.

### Desenvolvimento

```bash
npm run dev          # Execução com recarga automática
npm test             # Testes automatizados
npm run test:types   # Verificação de tipos do cliente Telegram
```

Novos comandos são adicionados em `commands/<categoria>/<nome>.js`, com uma função exportada como padrão. O registro carrega os módulos automaticamente; permissões e validação de entrada devem ser definidas pelo comando.

## Documentação

| Documento | Conteúdo |
| --- | --- |
| [Guia da plataforma](GUIA-5.0.md) | Mini App, Stars, Business, webhook e operação das integrações. |
| [Guia de gestão de comunidades](GUIA-4.0.md) | Moderação, conteúdos, Central de Gestão e administração de grupos. |
| [Cobertura da integração Telegram](docs/TELEGRAM-COBERTURA.md) | Recursos disponíveis e escopo de cada integração. |
| [Referência de métodos](docs/TELEGRAM-CATALOGO.md) | Catálogo da Bot API para desenvolvimento de extensões. |
| [Notas de versão](ATUALIZACOES.md) | Histórico de alterações do projeto. |

## Licença e créditos

Desenvolvido por **Eduardo Develop · Lagos Soluções**.

Consulte [LICENSE](LICENSE) para a licença do código e [COPYRIGHT.md](COPYRIGHT.md) para os avisos de autoria e marcas.
