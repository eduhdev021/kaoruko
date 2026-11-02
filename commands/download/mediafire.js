import { download, acharUrl, acharCampo } from "../../core/api.js";
import { cortar, escapeHtml, extrairUrl, links } from "../../utils/helpers.js";
export const description = "Baixa arquivo do MediaFire";
export const aliases = ["mf"];
export const uso = "/mediafire https://www.mediafire.com/file/ID/a/file";
export const cooldown = 5;
export default async function cmdmediafire(ctx) {
  const url = extrairUrl(ctx.q) || ctx.q.trim();
  if (!url) {
    await ctx.uso(
      "/mediafire https://www.mediafire.com/file/ID/a/file",
      "Manda o link junto com o comando.",
    );
    return;
  }
  if (!links.mediafire(url)) {
    await ctx.erro("Esse link nao e do MediaFire.");
    return;
  }
  const carregando = await ctx.carregando(" Baixando...");
  try {
    const bruto = await download.mediafire(url);
    const midia = acharUrl(bruto, ["downloadLink"]);
    await carregando.apagar();
    if (!midia) {
      await ctx.erro("A API nao devolveu nenhum arquivo pra esse link.");
      return;
    }
    const titulo = acharCampo(bruto, ["filename", "nome", "name", "title"]);
    const legenda = titulo
      ? `<b>${escapeHtml(cortar(String(titulo), 200))}</b>`
      : "<b>Download concluido</b>";
    try {
      await ctx.enviarDocumento(midia, {
        caption: legenda,
        reply_markup: ctx.tecladoApagar(),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/too big|failed to get http url content/i.test(msg)) {
        await ctx.responderComApagar(`O arquivo excede o limite ou nao pode ser enviado. <a href="${escapeHtml(midia)}">Abrir o download no navegador</a>`);
        return;
      }
      throw err;
    }
  } catch (err) {
    await carregando.apagar();
    throw err;
  }
}
