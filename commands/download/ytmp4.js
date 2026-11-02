import { download } from "../../core/api.js";
import {
  cortar,
  escapeHtml,
  extrairUrl,
  links,
  tamanhoLegivel,
} from "../../utils/helpers.js";
export const description = "Baixa o video de um link do YouTube";
export const aliases = ["ytvideo"];
export const uso = "/ytmp4 https://youtu.be/aqz-KE-bpKQ";
export const cooldown = 5;
export default async function ytmp4(ctx) {
  const url = extrairUrl(ctx.q) || ctx.q.trim();
  if (!url) {
    await ctx.uso(
      `${ctx.prefix}ytmp4 https://youtu.be/aqz-KE-bpKQ`,
      "Manda o link do video.",
    );
    return;
  }
  if (!links.youtube(url)) {
    await ctx.erro(
      "Esse link nao e do YouTube. Pra buscar por nome usa o /play.",
    );
    return;
  }
  const carregando = await ctx.carregando(" Baixando...");
  try {
    const r = await download.ytvideo(url);
    const arquivo = r.videoUrl ?? r.arquivoUrl;
    await carregando.apagar();
    if (!arquivo) {
      await ctx.erro("A API nao devolveu o arquivo desse video.");
      return;
    }
    const LIMITE_TG = 50 * 1024 * 1024;
    if (r.tamanho > LIMITE_TG) {
      await ctx.responderComApagar(
        `<b>Arquivo grande demais</b>\n\n` +
          `Esse tem ${tamanhoLegivel(r.tamanho)} e o Telegram so aceita 50MB.\n\n` +
          `<a href="${escapeHtml(arquivo)}">Baixar direto pelo navegador</a>`,
      );
      return;
    }

    const legenda = `<b>${escapeHtml(cortar(r.titulo, 200))}</b>\n<i>${escapeHtml(r.canal)}</i>`;
    await ctx.enviarVideo(arquivo, legenda, {
      reply_markup: ctx.tecladoApagar(),
    });
  } catch (err) {
    await carregando.apagar();

    const desc = err?.response?.description ?? err?.message ?? "";
    if (
      /too big|file is too big|entity too large|failed to get http url content/i.test(
        desc,
      )
    ) {
      const link = extrairUrl(ctx.q) || ctx.q.trim();
      await ctx.responderComApagar(
        "<b>Arquivo grande demais</b>\n\n" +
          "O Telegram so aceita 50MB e esse video passa disso.\n\n" +
          `Tenta um video mais curto, ou baixa pelo site: ${escapeHtml(link)}`,
      );
      return;
    }
    throw err;
  }
}
