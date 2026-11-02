import crypto from "node:crypto";
import { db } from "./db.js";
import botConfig from "../config/index.js";
import { planoDe, ehVip } from "./vip.js";

const DURACAO_SESSAO = 7 * 24 * 60 * 60 * 1000;
const ITERACOES = 120000;
const TAM_CHAVE = 64;
const DIGEST = "sha512";
const MAX_TENTATIVAS = 5;
const BLOQUEIO_MS = 15 * 60 * 1000;

export function normalizarEmail(email) {
  return String(email ?? "")
    .trim()
    .toLowerCase();
}

export function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizarEmail(email));
}

export function senhaValida(senha) {
  return typeof senha === "string" && senha.length >= 8 && senha.length <= 200;
}

function gerarHash(senha, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto
    .pbkdf2Sync(senha, salt, ITERACOES, TAM_CHAVE, DIGEST)
    .toString("hex");
  return { hash, salt };
}

function conferirSenha(senha, hashGuardado, salt) {
  if (!senhaValida(senha)) return false;
  const teste = crypto.pbkdf2Sync(senha, salt, ITERACOES, TAM_CHAVE, DIGEST);
  const guardado = Buffer.from(hashGuardado, "hex");
  if (teste.length !== guardado.length) return false;
  return crypto.timingSafeEqual(teste, guardado);
}

export function contaPorEmail(email) {
  return (
    db
      .prepare("SELECT * FROM contas WHERE email = ?")
      .get(normalizarEmail(email)) ?? null
  );
}

export function contaPorId(id) {
  return (
    db.prepare("SELECT * FROM contas WHERE id = ?").get(Number(id)) ?? null
  );
}

export function totalContas() {
  return db.prepare("SELECT COUNT(*) c FROM contas").get().c;
}

export function criarConta({
  email,
  senha,
  nome = "",
  papel = "membro",
  telegramId = null,
}) {
  const mail = normalizarEmail(email);

  if (!emailValido(mail)) return { ok: false, motivo: "E-mail invalido" };
  if (!senhaValida(senha))
    return { ok: false, motivo: "A senha precisa ter pelo menos 8 caracteres" };
  if (contaPorEmail(mail))
    return { ok: false, motivo: "Ja existe uma conta com esse e-mail" };

  const { hash, salt } = gerarHash(senha);
  const agora = Date.now();
  if (!["dono", "membro"].includes(papel)) {
    return { ok: false, motivo: "Papel invalido" };
  }
  const papelFinal = papel;

  const info = db
    .prepare(
      `
  INSERT INTO contas (email, senha_hash, senha_salt, nome, papel, telegram_id, criada_em, tentativas, bloqueada_ate)
  VALUES (?,?,?,?,?,?,?,0,0)
  `,
    )
    .run(
      mail,
      hash,
      salt,
      String(nome).trim(),
      papelFinal,
      telegramId ? String(telegramId) : null,
      agora,
    );

  return { ok: true, conta: contaPorId(info.lastInsertRowid) };
}

export function trocarSenha(contaId, senhaAtual, senhaNova) {
  const conta = contaPorId(contaId);
  if (!conta) return { ok: false, motivo: "Conta nao encontrada" };
  if (!conferirSenha(senhaAtual, conta.senha_hash, conta.senha_salt)) {
    return { ok: false, motivo: "Senha atual incorreta" };
  }
  if (!senhaValida(senhaNova)) {
    return {
      ok: false,
      motivo: "A senha nova precisa ter pelo menos 8 caracteres",
    };
  }

  const { hash, salt } = gerarHash(senhaNova);
  db.prepare(
    "UPDATE contas SET senha_hash = ?, senha_salt = ? WHERE id = ?",
  ).run(hash, salt, conta.id);
  db.prepare("DELETE FROM sessoes WHERE conta_id = ?").run(conta.id);
  return { ok: true };
}

export function definirSenha(email, senhaNova) {
  const conta = contaPorEmail(email);
  if (!conta) return { ok: false, motivo: "Conta nao encontrada" };
  if (!senhaValida(senhaNova))
    return { ok: false, motivo: "Senha muito curta (minimo 8)" };

  const { hash, salt } = gerarHash(senhaNova);
  db.prepare(
    "UPDATE contas SET senha_hash = ?, senha_salt = ?, tentativas = 0, bloqueada_ate = 0 WHERE id = ?",
  ).run(hash, salt, conta.id);
  db.prepare("DELETE FROM sessoes WHERE conta_id = ?").run(conta.id);
  return { ok: true };
}

export function definirPapel(email, papel) {
  if (!["dono", "membro"].includes(papel))
    return { ok: false, motivo: "Papel invalido" };
  const conta = contaPorEmail(email);
  if (!conta) return { ok: false, motivo: "Conta nao encontrada" };
  db.prepare("UPDATE contas SET papel = ? WHERE id = ?").run(papel, conta.id);
  return { ok: true };
}

export function vincularTelegram(email, telegramId) {
  const conta = contaPorEmail(email);
  if (!conta) return { ok: false, motivo: "Conta nao encontrada" };
  db.prepare("UPDATE contas SET telegram_id = ? WHERE id = ?").run(
    String(telegramId),
    conta.id,
  );
  return { ok: true };
}

export function excluirConta(email) {
  const conta = contaPorEmail(email);
  if (!conta) return false;
  db.prepare("DELETE FROM sessoes WHERE conta_id = ?").run(conta.id);
  return (
    db.prepare("DELETE FROM contas WHERE id = ?").run(conta.id).changes > 0
  );
}

export function listarContas() {
  return db
    .prepare(
      "SELECT id, email, nome, papel, telegram_id, criada_em, ultimo_login FROM contas ORDER BY criada_em DESC",
    )
    .all();
}

export function entrar({ email, senha, ip = "" }) {
  const mail = normalizarEmail(email);
  const conta = contaPorEmail(mail);
  const agora = Date.now();

  if (!conta) return { ok: false, motivo: "E-mail ou senha incorretos" };

  if (conta.bloqueada_ate && conta.bloqueada_ate > agora) {
    const min = Math.ceil((conta.bloqueada_ate - agora) / 60000);
    return {
      ok: false,
      motivo: `Conta bloqueada. Tente de novo em ${min} min`,
    };
  }

  if (!conferirSenha(senha ?? "", conta.senha_hash, conta.senha_salt)) {
    const tentativas = conta.tentativas + 1;
    const bloqueia = tentativas >= MAX_TENTATIVAS;
    db.prepare(
      "UPDATE contas SET tentativas = ?, bloqueada_ate = ? WHERE id = ?",
    ).run(
      bloqueia ? 0 : tentativas,
      bloqueia ? agora + BLOQUEIO_MS : 0,
      conta.id,
    );

    return {
      ok: false,
      motivo: bloqueia
        ? "Muitas tentativas. Conta bloqueada por 15 minutos"
        : `E-mail ou senha incorretos (${MAX_TENTATIVAS - tentativas} tentativas restantes)`,
    };
  }

  db.prepare(
    "UPDATE contas SET tentativas = 0, bloqueada_ate = 0, ultimo_login = ? WHERE id = ?",
  ).run(agora, conta.id);

  const token = crypto.randomBytes(32).toString("hex");
  db.prepare(
    `
  INSERT INTO sessoes (token, conta_id, criada_em, expira_em, ip) VALUES (?,?,?,?,?)
  `,
  ).run(token, conta.id, agora, agora + DURACAO_SESSAO, ip);

  return {
    ok: true,
    token,
    expiraEm: agora + DURACAO_SESSAO,
    usuario: montarUsuario(conta),
  };
}

function montarUsuario(conta) {
  const alvo = conta.telegram_id ?? "";
  const plano = alvo
    ? planoDe(alvo)
    : {
        chave: "free",
        nome: "Free",
        emoji: "leaf",
        limiteDiario: 50,
        cooldown: 5,
      };
  return {
    id: conta.id,
    email: conta.email,
    nome: conta.nome || conta.email.split("@")[0],
    papel: conta.papel,
    telegramId: conta.telegram_id,
    vip: alvo ? ehVip(alvo) : false,
    plano,
  };
}

export function validarSessao(token) {
  if (!token || typeof token !== "string") return null;

  const linha = db.prepare("SELECT * FROM sessoes WHERE token = ?").get(token);
  if (!linha) return null;

  if (linha.expira_em < Date.now()) {
    db.prepare("DELETE FROM sessoes WHERE token = ?").run(token);
    return null;
  }

  const conta = contaPorId(linha.conta_id);
  if (!conta) {
    db.prepare("DELETE FROM sessoes WHERE token = ?").run(token);
    return null;
  }

  return montarUsuario(conta);
}

export function encerrarSessao(token) {
  return (
    db.prepare("DELETE FROM sessoes WHERE token = ?").run(token).changes > 0
  );
}

export function encerrarTodasSessoes(contaId) {
  return db
    .prepare("DELETE FROM sessoes WHERE conta_id = ?")
    .run(Number(contaId)).changes;
}

export function limparSessoesExpiradas() {
  return db.prepare("DELETE FROM sessoes WHERE expira_em < ?").run(Date.now())
    .changes;
}

export function lerToken(req) {
  const header = req.headers.authorization ?? "";
  if (header.startsWith("Bearer ")) return header.slice(7);

  const cookie = (req.headers.cookie ?? "")
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("kw_token="));

  try {
    return cookie ? decodeURIComponent(cookie.slice(9)) : "";
  } catch {
    return "";
  }
}

export function exigirAuth(papeis = null) {
  return (req, res, next) => {
    const usuario = validarSessao(lerToken(req));

    if (!usuario) {
      res.status(401).json({ erro: "Nao autenticado", code: "UNAUTHORIZED" });
      return;
    }
    if (papeis && !papeis.includes(usuario.papel)) {
      res
        .status(403)
        .json({ erro: "Sem permissao pra isso", code: "FORBIDDEN" });
      return;
    }
    req.usuario = usuario;
    next();
  };
}

export function garantirContaInicial() {
  const email = normalizarEmail(botConfig.painel.adminEmail);
  const senha = botConfig.painel.adminSenha;
  const primeiroDono = botConfig.owners[0] ?? null;

  if (!email || !senha) return null;

  const existente = contaPorEmail(email);

  if (existente) {
    if (!existente.telegram_id && primeiroDono) {
      vincularTelegram(email, primeiroDono);
    }
    if (existente.papel !== "dono") {
      db.prepare("UPDATE contas SET papel = 'dono' WHERE id = ?").run(
        existente.id,
      );
    }
    return null;
  }

  const r = criarConta({
    email,
    senha,
    nome: "Administrador",
    papel: "dono",
    telegramId: primeiroDono,
  });

  return r.ok ? r.conta : null;
}
