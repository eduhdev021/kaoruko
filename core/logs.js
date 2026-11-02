import { db } from "./db.js";

const MAX_LINHAS = 5000;

export function registrarLog({
  nivel = "info",
  comando = "",
  argumento = "",
  userId = "",
  nome = "",
  chatId = "",
  chatNome = "",
  emGrupo = false,
  duracao = 0,
  erro = "",
}) {
  db.prepare(
    `
    INSERT INTO logs (em, nivel, comando, argumento, user_id, nome, chat_id, chat_nome, em_grupo, duracao, erro)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `,
  ).run(
    Date.now(),
    nivel,
    String(comando).slice(0, 60),
    ["conta", "contas", "painelconta", "convite", "business", "telegram", "canal", "contato", "local"].includes(String(comando).toLowerCase())
      ? "[argumentos privados omitidos]"
      : String(argumento).slice(0, 300),
    String(userId),
    String(nome).slice(0, 80),
    String(chatId),
    String(chatNome).slice(0, 80),
    emGrupo ? 1 : 0,
    Math.round(duracao),
    String(erro).slice(0, 600),
  );
}

export function lerLogs({
  nivel = "todos",
  busca = "",
  pagina = 1,
  porPagina = 50,
} = {}) {
  const condicoes = [];
  const termo = `%${String(busca).trim().toLowerCase()}%`;

  if (nivel !== "todos") condicoes.push("nivel = @nivel");
  if (String(busca).trim()) {
    condicoes.push(
      "(LOWER(comando) LIKE @termo OR LOWER(nome) LIKE @termo OR LOWER(argumento) LIKE @termo OR user_id LIKE @termo)",
    );
  }

  const where = condicoes.length > 0 ? `WHERE ${condicoes.join(" AND ")}` : "";
  const limite = Math.min(Math.max(Number(porPagina) || 50, 1), 200);
  const offset = (Math.max(Number(pagina) || 1, 1) - 1) * limite;

  const total = db
    .prepare(`SELECT COUNT(*) c FROM logs ${where}`)
    .get({ nivel, termo }).c;

  const linhas = db
    .prepare(
      `SELECT * FROM logs ${where} ORDER BY em DESC LIMIT @limite OFFSET @offset`,
    )
    .all({ nivel, termo, limite, offset });

  return {
    logs: linhas,
    total,
    pagina: Math.max(Number(pagina) || 1, 1),
    paginas: Math.max(Math.ceil(total / limite), 1),
  };
}

export function resumoLogs() {
  const agora = Date.now();
  const q = (sql, ...p) => db.prepare(sql).get(...p);

  return {
    total: q("SELECT COUNT(*) c FROM logs").c,
    erros: q("SELECT COUNT(*) c FROM logs WHERE nivel = 'erro'").c,
    ultimaHora: q("SELECT COUNT(*) c FROM logs WHERE em > ?", agora - 3600000)
      .c,
    mediaMs: Math.round(
      q("SELECT AVG(duracao) m FROM logs WHERE nivel = 'ok'").m ?? 0,
    ),
  };
}

export function limparLogs() {
  return db.prepare("DELETE FROM logs").run().changes;
}

export function podarLogs() {
  const total = db.prepare("SELECT COUNT(*) c FROM logs").get().c;
  if (total <= MAX_LINHAS) return 0;

  return db
    .prepare(
      "DELETE FROM logs WHERE id IN (SELECT id FROM logs ORDER BY em ASC LIMIT ?)",
    )
    .run(total - MAX_LINHAS).changes;
}
