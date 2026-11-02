import { responderCaptcha } from '../core/entrada.js';
import { download, OkarunError } from "../core/api.js";
import { recuperar } from "../core/cache.js";
import { cortar, escapeHtml, tamanhoLegivel } from "../utils/helpers.js";
import { logErro } from "../utils/logger.js";
async function tratarPlay(ctx, partes) {
  const [acao, token, donoId] = partes;
  const clicouId = String(ctx.from?.id ?? "");
  if (donoId && clicouId !== donoId) {
    await ctx.answerCbQuery("Esse card nao e seu! Manda o teu /play ", {
      show_alert: true,
    });
    return;
  }
  const dados = token ? recuperar(token) : undefined;
  if (!dados) {
    await ctx.answerCbQuery(" Esse card expirou. Faz a busca de novo.", {
      show_alert: true,
    });
    return;
  }
  const ehAudio = acao === "audio";
  await ctx.answerCbQuery(
    ehAudio ? " Baixando o audio..." : " Baixando o video...",
  );
  const chatId = ctx.chat?.id;
  if (chatId === undefined) return;
  let aviso;
  try {
    aviso = await ctx.telegram.sendMessage(
      chatId,
      ehAudio
        ? " Preparando o audio, aguenta ai..."
        : " Preparando o video, aguenta ai...",
    );
  } catch {}
  const limpar = async () => {
    if (aviso) {
      await ctx.telegram
        .deleteMessage(chatId, aviso.message_id)
        .catch(() => undefined);
    }
  };
  try {
    const resultado = ehAudio
      ? await download.ytaudio(dados.url)
      : await download.ytvideo(dados.url);
    const arquivo =
      (ehAudio ? resultado.audioUrl : resultado.videoUrl) ??
      resultado.arquivoUrl;

    const LIMITE_TG = 50 * 1024 * 1024;
    if (resultado.tamanho > LIMITE_TG) {
      await limpar();
      await ctx.telegram.sendMessage(
        chatId,
        `<b>Arquivo grande demais</b>\n\nEsse tem ${tamanhoLegivel(resultado.tamanho)} ` +
          `e o Telegram so aceita 50MB.\n\n<a href="${escapeHtml(arquivo)}">Baixar pelo navegador</a>`,
        { parse_mode: "HTML" },
      );
      return;
    }
    if (!arquivo) {
      await limpar();
      await ctx.telegram.sendMessage(
        chatId,
        " A API nao devolveu o link do arquivo. Tenta outro video.",
      );
      return;
    }
    const titulo = resultado.titulo || dados.titulo;
    const canal = resultado.canal || dados.canal;
    const legenda = `<b>${escapeHtml(cortar(titulo, 200))}</b>\n<i>${escapeHtml(canal)}</i>`;
    if (ehAudio) {
      await ctx.telegram.sendAudio(
        chatId,
        { url: arquivo },
        {
          title: cortar(titulo, 64),
          performer: cortar(canal, 64),
          caption: legenda,
          parse_mode: "HTML",
          ...(dados.thumbnail ? { thumbnail: { url: dados.thumbnail } } : {}),
        },
      );
    } else {
      await ctx.telegram.sendVideo(
        chatId,
        { url: arquivo },
        { caption: legenda, parse_mode: "HTML", supports_streaming: true },
      );
    }
    await limpar();
  } catch (err) {
    await limpar();
    const msg =
      err instanceof OkarunError
        ? err.paraUsuario()
        : " Nao consegui baixar. O arquivo pode passar de 50MB (limite do Telegram).";
    await ctx.telegram
      .sendMessage(chatId, msg, { parse_mode: "HTML" })
      .catch(() => undefined);
  }
}
export function criarHandlerCallback(_waguri) {
  return async function handlerCallback(ctx) {
    const query = ctx.callbackQuery;
    if (!query || !("data" in query) || typeof query.data !== "string") return;
    const partes = query.data.split(":");
    const acao = partes[0];
    try {
      if (await responderCaptcha(ctx)) return;
      if (acao === "del") {
        const donoId = partes[1];
        const clicouId = String(ctx.from?.id ?? "");
        if (donoId && clicouId !== donoId) {
          await ctx.answerCbQuery("Essa mensagem nao e sua!", {
            show_alert: true,
          });
          return;
        }
        await ctx.answerCbQuery("Apagado!");
        await ctx.deleteMessage().catch(() => undefined);
        return;
      }
      if (acao === "play") {
        await tratarPlay(ctx, partes.slice(1));
        return;
      }
      await ctx.answerCbQuery(" Esse botao expirou.", { show_alert: true });
    } catch (err) {
      logErro(`Erro no callback "${query.data}"`, err);
      await ctx
        .answerCbQuery(" Deu erro nesse botao.", { show_alert: true })
        .catch(() => undefined);
    }
  };
}
