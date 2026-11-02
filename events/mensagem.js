import { processarEntrada } from '../core/entrada.js';
import { processarAntispam } from '../core/antispam.js';
import { registrarAnalise } from '../core/recursos.js';
import { processarAutomacao } from "../core/automacao.js";
import { processarComunidade } from "../core/comunidade.js";
import { criarContexto } from "../core/contexto.js";
import { escapeHtml } from "../utils/helpers.js";
import { despachar } from "../core/router.js";
import {
  registrarGrupo,
  registrarUsuario,
  registrarUsuarioNoGrupo,
  estaBloqueado,
} from "../core/storage.js";
export function criarHandlerMensagem(waguri) {
  return async function handlerMensagem(ctx) {
    const msg = ctx.message;
    if (!msg) return;
    if (ctx.from?.is_bot && !msg.new_chat_members?.length) return;
    if ("date" in msg && Date.now() / 1000 - msg.date > 300) return;
    if (['group','supergroup'].includes(ctx.chat?.type) && 'title' in ctx.chat) {
      registrarGrupo({id:ctx.chat.id,title:ctx.chat.title,type:ctx.chat.type});
    }
    if (await processarEntrada(ctx)) return;
    if (await processarAntispam(ctx)) return;
    if (await processarComunidade(ctx)) return;
    if (await processarAutomacao(ctx)) return;
    registrarAnalise(ctx);
    const contexto = criarContexto(ctx, waguri);
    if (!contexto) return;
    if (!contexto.prefix) return;

    if (!contexto.comando) {
      if (estaBloqueado(contexto.userId) && !contexto.isDono) return;

      await contexto.sendTextWithMedia(
        contexto.botConfig.assets.errorImage,
        [
          `<b>${escapeHtml(contexto.botConfig.name).toUpperCase()}</b>`,
          "",
          "Voce mandou so o prefixo, sem nenhum comando.",
          "",
          `Digite <code>${escapeHtml(contexto.prefix)}menu</code> pra ver tudo que eu faco.`,
        ].join("\n"),
      );
      return;
    }

    if (estaBloqueado(contexto.userId) && !contexto.isDono) return;
    registrarUsuario({
      id: contexto.userId,
      nome: contexto.nome,
      username: contexto.username,
      ehBot: Boolean(ctx.from?.is_bot),
      idioma: ctx.from?.language_code ?? "",
      tgPremium: Boolean(ctx.from?.is_premium),
      tipoChat: contexto.isGroup ? "group" : "private",
    });
    if (contexto.isGroup)
      registrarUsuarioNoGrupo(contexto.userId, contexto.chatId);

    await despachar(contexto);
  };
}
