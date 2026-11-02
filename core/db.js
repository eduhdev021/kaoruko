import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { logSucesso, logErro } from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PASTA = path.join(__dirname, "..", "database");
if (!fs.existsSync(PASTA)) fs.mkdirSync(PASTA, { recursive: true });

export const ARQUIVO = process.env.DATABASE_PATH || path.join(PASTA, "kaoruko.db");

export const db = new Database(ARQUIVO);

db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS usuarios (id TEXT PRIMARY KEY,
  nome TEXT NOT NULL DEFAULT '',
  username TEXT NOT NULL DEFAULT '',
  comandos INTEGER NOT NULL DEFAULT 0,
  primeiro_uso INTEGER NOT NULL,
  ultimo_uso INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS grupos (id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'group',
  desde INTEGER NOT NULL,
  mensagens INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS vip (id TEXT PRIMARY KEY,
  plano TEXT NOT NULL DEFAULT 'bronze',
  expira_em INTEGER,
  vitalicio INTEGER NOT NULL DEFAULT 0,
  desde INTEGER NOT NULL,
  concedido_por TEXT NOT NULL DEFAULT '',
  usos_hoje INTEGER NOT NULL DEFAULT 0,
  usos_total INTEGER NOT NULL DEFAULT 0,
  reset_em INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS vip_historico (id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  acao TEXT NOT NULL,
  plano TEXT,
  duracao INTEGER,
  por TEXT NOT NULL DEFAULT '',
  em INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS bloqueados (id TEXT PRIMARY KEY,
  motivo TEXT NOT NULL DEFAULT '',
  em INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS uso_diario (user_id TEXT NOT NULL,
  dia TEXT NOT NULL,
  usos INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, dia)
);

CREATE TABLE IF NOT EXISTS estatisticas (comando TEXT PRIMARY KEY,
  usos INTEGER NOT NULL DEFAULT 0,
  erros INTEGER NOT NULL DEFAULT 0,
  ultimo INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS contas (id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  senha_salt TEXT NOT NULL,
  nome TEXT NOT NULL DEFAULT '',
  papel TEXT NOT NULL DEFAULT 'membro',
  telegram_id TEXT,
  criada_em INTEGER NOT NULL,
  ultimo_login INTEGER NOT NULL DEFAULT 0,
  tentativas INTEGER NOT NULL DEFAULT 0,
  bloqueada_ate INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sessoes (token TEXT PRIMARY KEY,
  conta_id INTEGER NOT NULL,
  criada_em INTEGER NOT NULL,
  expira_em INTEGER NOT NULL,
  ip TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (conta_id) REFERENCES contas(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vip_expira ON vip (expira_em);
CREATE INDEX IF NOT EXISTS idx_hist_user ON vip_historico (user_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_conta ON sessoes (conta_id);
CREATE INDEX IF NOT EXISTS idx_contas_email ON contas (email);
CREATE INDEX IF NOT EXISTS idx_sessoes_exp ON sessoes (expira_em);
CREATE INDEX IF NOT EXISTS idx_uso_dia ON uso_diario (dia);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS usuario_grupos (
  user_id    TEXT NOT NULL,
  grupo_id   TEXT NOT NULL,
  visto_em   INTEGER NOT NULL,
  mensagens  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, grupo_id)
);

CREATE INDEX IF NOT EXISTS idx_ug_user  ON usuario_grupos (user_id);
CREATE INDEX IF NOT EXISTS idx_ug_grupo ON usuario_grupos (grupo_id);

CREATE TABLE IF NOT EXISTS avatares (
  tipo       TEXT NOT NULL,
  alvo_id    TEXT NOT NULL,
  file_id    TEXT,
  dados      BLOB,
  mime       TEXT NOT NULL DEFAULT 'image/jpeg',
  buscado_em INTEGER NOT NULL,
  PRIMARY KEY (tipo, alvo_id)
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS logs (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  em        INTEGER NOT NULL,
  nivel     TEXT NOT NULL DEFAULT 'info',
  comando   TEXT NOT NULL DEFAULT '',
  argumento TEXT NOT NULL DEFAULT '',
  user_id   TEXT NOT NULL DEFAULT '',
  nome      TEXT NOT NULL DEFAULT '',
  chat_id   TEXT NOT NULL DEFAULT '',
  chat_nome TEXT NOT NULL DEFAULT '',
  em_grupo  INTEGER NOT NULL DEFAULT 0,
  duracao   INTEGER NOT NULL DEFAULT 0,
  erro      TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_logs_em    ON logs (em DESC);
CREATE INDEX IF NOT EXISTS idx_logs_nivel ON logs (nivel);
CREATE INDEX IF NOT EXISTS idx_logs_user  ON logs (user_id);
`);

const colunasGrupos = db
  .prepare("PRAGMA table_info(grupos)")
  .all()
  .map((c) => c.name);

for (const [nome, tipo] of [
  ["membros", "INTEGER NOT NULL DEFAULT 0"],
  ["membros_em", "INTEGER NOT NULL DEFAULT 0"],
  ["bot_admin", "INTEGER NOT NULL DEFAULT 0"],
  ["username", "TEXT NOT NULL DEFAULT ''"],
]) {
  if (!colunasGrupos.includes(nome)) {
    db.exec(`ALTER TABLE grupos ADD COLUMN ${nome} ${tipo}`);
  }
}

const colunasUsuarios = db
  .prepare("PRAGMA table_info(usuarios)")
  .all()
  .map((c) => c.name);

for (const [nome, tipo] of [
  ["eh_bot", "INTEGER NOT NULL DEFAULT 0"],
  ["idioma", "TEXT NOT NULL DEFAULT ''"],
  ["tg_premium", "INTEGER NOT NULL DEFAULT 0"],
  ["tipo_chat", "TEXT NOT NULL DEFAULT 'private'"],
]) {
  if (!colunasUsuarios.includes(nome)) {
    db.exec(`ALTER TABLE usuarios ADD COLUMN ${nome} ${tipo}`);
  }
}

db.exec("CREATE INDEX IF NOT EXISTS idx_user_bot ON usuarios (eh_bot)");

export function fecharDb() {
  try {
    db.pragma("wal_checkpoint(TRUNCATE)");
    db.close();
  } catch (err) {
    logErro("Falha ao fechar o banco", err);
  }
}

logSucesso(`Banco SQLite pronto (${path.basename(ARQUIVO)})`);
