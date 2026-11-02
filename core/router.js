import { obterConteudo,enviarConteudo } from './recursos.js';
import botConfig from "../config/index.js";
import { commandRegistry, getCommand } from "../commands/registry.js";
import { registrarUsoComando } from "./storage.js";
import { registrarLog } from "./logs.js";
import { planoDe, consumirUso, ehVip } from "./vip.js";
import { OkarunError } from "./api.js";
import { logComando, logErro, logAviso } from "../utils/logger.js";
import { escapeHtml, similaridade } from "../utils/helpers.js";

const cooldowns = new Map();

export function sugerir(nome) {
  const alvo = String(nome).toLowerCase();
  if (alvo.length < 2) return null;

  let melhor = null;
  let melhorNota = 0;

  for (const chave of commandRegistry.keys()) {
    let nota = similaridade(alvo, chave);
    if (chave.startsWith(alvo) || alvo.startsWith(chave)) nota += 0.25;
    else if (chave.includes(alvo)) nota += 0.15;

    if (nota > melhorNota) {
      melhorNota = nota;
      melhor = chave;
    }
  }
  return melhorNota >= 0.5 ? melhor : null;
}

export function checarCooldown(userId, cmd, plano) {
  if (botConfig.ehDono(userId)) return 0;

  const segundos = Math.max(cmd.cooldown ?? 0, plano.cooldown ?? 0);
  if (segundos <= 0) return 0;

  const chave = `${userId}:${cmd.canonicalName ?? cmd.name}`;
  const agora = Date.now();
  const ultimo = cooldowns.get(chave) ?? 0;
  const restante = ultimo + segundos * 1000 - agora;

  if (restante > 0) return Math.ceil(restante / 1000);

  cooldowns.set(chave, agora);

  if (cooldowns.size > 5000) {
    for (const [k, v] of cooldowns) {
      if (agora - v > 600000) cooldowns.delete(k);
    }
  }
  return 0;
}

async function tratarErro(err, contexto, cmd) {
  registrarUsoComando(cmd.name, true);

  registrarLog({
    nivel: "erro",
    comando: cmd.name,
    argumento: contexto.q,
    userId: contexto.userId,
    nome: contexto.nome,
    chatId: contexto.chatId,
    chatNome: contexto.nomeChat,
    emGrupo: contexto.isGroup,
    erro:
      err instanceof OkarunError
        ? `${err.code}: ${err.message}`
        : (err?.response?.description ?? err?.message ?? String(err)),
  });

  if (err instanceof OkarunError) {
    logAviso(`[${cmd.name}] API: ${err.code} - ${err.message}`);
    await contexto.responderComApagar(err.paraUsuario()).catch(() => undefined);
    return;
  }

  const desc =
    err && typeof err === "object" && "description" in err
      ? String(err.description)
      : err instanceof Error
        ? err.message
        : String(err);

  if (
    /message to delete not found|message is not modified|query is too old/i.test(
      desc,
    )
  )
    return;

  if (
    /file is too big|request entity too large|failed to get http url content/i.test(
      desc,
    )
  ) {
    await contexto
      .responderComApagar(
        " O arquivo passa do limite do Telegram (50MB) ou o link expirou.",
      )
      .catch(() => undefined);
    return;
  }

  logErro(`Erro no comando /${cmd.name}`, err);
  await contexto
    .responderComApagar(
      " <b>Deu ruim aqui</b>\n\nAlgo falhou nesse comando. Tenta de novo; se persistir, avisa o dono.",
    )
    .catch(() => undefined);
}

export async function despachar(contexto) {
  let cmd = getCommand(contexto.comando);
  if(!cmd&&contexto.isGroup){
    const conteudo=obterConteudo(contexto.chatId,'comando',contexto.comando);
    if(conteudo)cmd={name:contexto.comando,canonicalName:`custom:${contexto.chatId}:${contexto.comando}`,soGrupo:true,cooldown:5,handler:ctx=>enviarConteudo(ctx.waguri.telegram,ctx.chatId,conteudo)};
  }

  if (!cmd) {
    const sugestao = sugerir(contexto.comando);

    const linhas = [
      `<b>${escapeHtml(contexto.botConfig.name).toUpperCase()}</b>`,
      "",
      `O comando <code>${escapeHtml(contexto.prefix + contexto.comando)}</code> nao existe.`,
    ];

    if (sugestao) {
      linhas.push(
        "",
        `Voce quis dizer <code>${escapeHtml(contexto.prefix + sugestao)}</code>?`,
      );
    }

    linhas.push(
      "",
      `Veja tudo que eu faco em <code>${escapeHtml(contexto.prefix)}menu</code>.`,
    );

    await contexto.sendTextWithMedia(
      contexto.botConfig.assets.errorImage,
      linhas.join("\n"),
    );
    return false;
  }

  if (cmd.soDono && !contexto.isDono) {
    registrarLog({
      nivel: "negado",
      comando: cmd.name,
      argumento: contexto.q,
      userId: contexto.userId,
      nome: contexto.nome,
      chatId: contexto.chatId,
      chatNome: contexto.nomeChat,
      emGrupo: contexto.isGroup,
      erro: "tentou usar comando de dono",
    });
    await contexto.erro("Esse comando e so pro dono do bot.");
    return true;
  }
  if (cmd.soGrupo && !contexto.isGroup) {
    await contexto.erro("Esse comando so funciona em grupo.");
    return true;
  }
  if (cmd.soPrivado && !contexto.isPrivate) {
    await contexto.erro("Esse comando so funciona no privado.");
    return true;
  }
  if (cmd.soAdmin && contexto.isGroup && !contexto.isDono) {
    const admin = await contexto.garantirAdmin();
    if (!admin) {
      await contexto.erro("Esse comando e so pros administradores do grupo.");
      return true;
    }
  }

  if (cmd.premium && !contexto.isDono && !ehVip(contexto.userId)) {
    await contexto.responderComApagar(
      " <b>Comando VIP</b>\n\nEsse comando e exclusivo pra membros VIP.\n" +
        `Veja os planos: <code>${contexto.prefix}vip</code>`,
    );
    return true;
  }

  const plano = planoDe(contexto.userId);

  const espera = checarCooldown(contexto.userId, cmd, plano);
  if (espera > 0) {
    await contexto.erro(
      `Calma la! Espera ${espera}s pra usar esse comando de novo.`,
    );
    return true;
  }

  const uso = consumirUso(contexto.userId);
  if (!uso.permitido) {
    await contexto.responderComApagar(
      ` <b>Limite diario atingido</b>\n\n` +
        `Voce usou ${uso.usados}/${uso.limite} comandos hoje no plano ${plano.emoji} ${plano.nome}.\n\n` +
        `O limite reseta a meia-noite. Pra aumentar, veja <code>${contexto.prefix}vip</code>.`,
    );
    return true;
  }

  logComando({
    comando: cmd.name,
    usuario: contexto.nome,
    userId: contexto.userId,
    chat: contexto.nomeChat,
    chatId: contexto.chatId,
  });

  const inicio = Date.now();

  try {
    await cmd.handler(contexto);
    registrarUsoComando(cmd.name, false);

    registrarLog({
      nivel: "ok",
      comando: cmd.name,
      argumento: contexto.q,
      userId: contexto.userId,
      nome: contexto.nome,
      chatId: contexto.chatId,
      chatNome: contexto.nomeChat,
      emGrupo: contexto.isGroup,
      duracao: Date.now() - inicio,
    });
  } catch (err) {
    await tratarErro(err, contexto, cmd);
  }
  return true;
}
