import { aplicarModeracao } from './moderacao.js';
import { db } from "./db.js";
import botConfig from "../config/index.js";
import { registrarLog } from "./logs.js";
import { adicionarVip, removerVip, obterVip, PLANOS } from "./vip.js";
import { bloquear, desbloquear, salvarMembros } from "./storage.js";
import { sleep } from "../utils/helpers.js";

let telegram = null;
let usernameBot = "";

export function ligarTelegram(instancia, username) {
  telegram = instancia;
  usernameBot = username ?? "";
}

function exigirTelegram() {
  if (!telegram) throw new Error("O bot ainda nao esta conectado ao Telegram");
  return telegram;
}

function log(acao, dados, quem, erro = "") {
  registrarLog({
    nivel: erro ? "erro" : "ok",
    comando: `painel:${acao}`,
    argumento: JSON.stringify(dados).slice(0, 280),
    userId: String(quem?.id ?? ""),
    nome: quem?.email ?? "painel",
    erro,
  });
}

export function linkParaAdicionar() {
  return usernameBot ? `https://t.me/${usernameBot}?startgroup=true` : "";
}

export async function trocarPlano({ userId, plano, dias, vitalicio }, quem) {
  const alvo = String(userId);

  if (plano === "free") {
    const tinha = Boolean(obterVip(alvo));
    removerVip(alvo, quem?.email ?? "painel");
    log("plano", { userId: alvo, plano: "free" }, quem);
    return { ok: true, removido: tinha, plano: "free" };
  }

  if (!PLANOS[plano]) throw new Error(`Plano invalido: ${plano}`);

  const registro = adicionarVip(alvo, {
    plano,
    duracaoMs: vitalicio ? null : Math.max(Number(dias) || 30, 1) * 86400000,
    por: quem?.email ?? "painel",
  });

  log("plano", { userId: alvo, plano, dias, vitalicio }, quem);
  return { ok: true, vip: registro };
}

export async function sairDoGrupo(grupoId, quem) {
  const tg = exigirTelegram();
  const alvo = String(grupoId);

  try {
    await tg.leaveChat(Number(alvo));
  } catch (err) {
    const msg = err?.response?.description ?? err.message;
    if (!/chat not found|bot is not a member|kicked/i.test(msg)) {
      log("sairGrupo", { grupoId: alvo }, quem, msg);
      throw new Error(msg);
    }
  }

  db.prepare("DELETE FROM usuario_grupos WHERE grupo_id = ?").run(alvo);
  db.prepare("DELETE FROM grupos WHERE id = ?").run(alvo);

  log("sairGrupo", { grupoId: alvo }, quem);
  return { ok: true };
}

export async function enviarMensagem({ destino, texto, imagem, botoes }, quem) {
  const tg = exigirTelegram();
  const alvo = String(destino);

  if (!texto?.trim() && !imagem?.trim()) {
    throw new Error("Escreva um texto ou informe uma imagem");
  }

  const opcoes = { parse_mode: "HTML" };

  if (Array.isArray(botoes) && botoes.length > 0) {
    const validos = botoes.filter((b) => b?.text?.trim() && b?.url?.trim());
    if (validos.length > 0) {
      opcoes.reply_markup = {
        inline_keyboard: validos.map((b) => [
          { text: b.text.trim(), url: b.url.trim() },
        ]),
      };
    }
  }

  try {
    const enviada = imagem?.trim()
      ? await tg.sendPhoto(Number(alvo), imagem.trim(), {
          caption: texto?.slice(0, 1024) ?? "",
          ...opcoes,
        })
      : await tg.sendMessage(Number(alvo), texto, {
          ...opcoes,
          link_preview_options: { is_disabled: true },
        });

    log("enviarMsg", { destino: alvo, comImagem: Boolean(imagem) }, quem);
    return { ok: true, messageId: enviada.message_id };
  } catch (err) {
    const msg = err?.response?.description ?? err.message;
    log("enviarMsg", { destino: alvo }, quem, msg);
    throw new Error(msg);
  }
}

export async function transmitir(
  { texto, imagem, alvo = "grupos" },
  quem,
  aoProgredir,
) {
  const tg = exigirTelegram();

  const destinos =
    alvo === "usuarios"
      ? db
          .prepare(
            "SELECT id FROM usuarios WHERE eh_bot = 0 AND tipo_chat = 'private'",
          )
          .all()
      : alvo === "vips"
        ? db.prepare("SELECT id FROM vip").all()
        : db.prepare("SELECT id FROM grupos").all();

  let enviados = 0;
  let falhas = 0;

  for (const [i, d] of destinos.entries()) {
    try {
      if (imagem?.trim()) {
        await tg.sendPhoto(Number(d.id), imagem.trim(), {
          caption: texto?.slice(0, 1024) ?? "",
          parse_mode: "HTML",
        });
      } else {
        await tg.sendMessage(Number(d.id), texto, { parse_mode: "HTML" });
      }
      enviados += 1;
    } catch {
      falhas += 1;
    }

    aoProgredir?.({ feitos: i + 1, total: destinos.length, enviados, falhas });
    await sleep(120);
  }

  log("transmitir", { alvo, total: destinos.length, enviados, falhas }, quem);
  return { ok: true, total: destinos.length, enviados, falhas };
}

export async function removerDoGrupo({ grupoId, userId, banir }, quem) {
  const tg = exigirTelegram();

  if (botConfig.ehDono(userId))
    throw new Error("Nao da pra remover um dono do bot");

  try {
    await aplicarModeracao(tg,{chatId:Number(grupoId),userId,ator:quem?.email||quem?.id||'painel',tipo:banir?'banir':'expulsar',motivo:'Acao pelo painel administrativo'});

    log("removerMembro", { grupoId, userId, banir }, quem);
    return { ok: true };
  } catch (err) {
    const msg = err?.response?.description ?? err.message;
    log("removerMembro", { grupoId, userId }, quem, msg);
    throw new Error(msg);
  }
}

export async function alternarBloqueio(
  { userId, bloquear: deveBloquear, motivo },
  quem,
) {
  const alvo = String(userId);

  if (deveBloquear && botConfig.ehDono(alvo))
    throw new Error("Nao da pra bloquear um dono");

  if (deveBloquear) bloquear(alvo, motivo || "Bloqueado pelo painel");
  else desbloquear(alvo);

  log("bloqueio", { userId: alvo, bloqueado: deveBloquear }, quem);
  return { ok: true };
}

export async function infoDoChat(chatId) {
  const tg = exigirTelegram();
  const alvo = Number(chatId);

  const chat = await tg.getChat(alvo);
  let membros = null;
  let ehAdmin = false;

  try {
    membros = await tg.getChatMemberCount(alvo);
  } catch {
    membros = null;
  }

  try {
    const eu = await tg.getMe();
    const meuStatus = await tg.getChatMember(alvo, eu.id);
    ehAdmin = ["administrator", "creator"].includes(meuStatus.status);
  } catch {
    ehAdmin = false;
  }

  return {
    id: String(chat.id),
    titulo: chat.title ?? chat.first_name ?? "",
    tipo: chat.type,
    username: chat.username ?? "",
    descricao: chat.description ?? "",
    convite: chat.invite_link ?? "",
    membros,
    botEhAdmin: ehAdmin,
  };
}

export async function criarConvite(grupoId, quem) {
  const tg = exigirTelegram();

  try {
    const link = await tg.exportChatInviteLink(Number(grupoId));
    log("convite", { grupoId }, quem);
    return { ok: true, link };
  } catch (err) {
    const msg = err?.response?.description ?? err.message;
    throw new Error(
      /not enough rights|CHAT_ADMIN_REQUIRED/i.test(msg)
        ? "O bot precisa ser admin com permissao de convidar"
        : msg,
    );
  }
}

export async function sincronizarMembros({
  apenasVelhos = true,
  horas = 6,
} = {}) {
  const tg = exigirTelegram();
  const corte = Date.now() - horas * 3600000;

  const grupos = apenasVelhos
    ? db.prepare("SELECT id FROM grupos WHERE membros_em < ?").all(corte)
    : db.prepare("SELECT id FROM grupos").all();

  let atualizados = 0;
  let falhas = 0;

  for (const g of grupos) {
    try {
      const total = await tg.getChatMemberCount(Number(g.id));

      let admin = false;
      let username = "";

      try {
        const eu = await tg.getMe();
        const status = await tg.getChatMember(Number(g.id), eu.id);
        admin = ["administrator", "creator"].includes(status.status);
      } catch {
        admin = false;
      }

      try {
        const chat = await tg.getChat(Number(g.id));
        username = chat.username ?? "";
      } catch {
        username = "";
      }

      salvarMembros(g.id, { membros: total, botAdmin: admin, username });
      atualizados += 1;
    } catch {
      falhas += 1;
    }

    await sleep(60);
  }

  return { total: grupos.length, atualizados, falhas };
}
