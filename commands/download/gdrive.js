import { download, acharUrl, acharCampo } from "../../core/api.js";
import { cortar, escapeHtml, extrairUrl, links } from "../../utils/helpers.js";
export const description = "Baixa arquivo do Google Drive";
export const aliases = ["drive"];
export const uso = "/gdrive https://drive.google.com/file/d/ID/view";
export const cooldown = 5;
export default async function cmdgdrive(ctx) {
  const url = extrairUrl(ctx.q) || ctx.q.trim();
  if (!url) {
    await ctx.uso(
      "/gdrive https://drive.google.com/file/d/ID/view",
      "Manda o link junto com o comando.",
    );
    return;
  }
  if (!links.qualquer(url)) {
    await ctx.erro("Manda um link valido.");
    return;
  }
  const carregando = await ctx.carregando(" Baixando...");
  try {
    const bruto = await download.gdrive(url);
    const midia = acharUrl(bruto);
    await carregando.apagar();
    if (!midia) {
      await ctx.erro("A API nao devolveu nenhum arquivo pra esse link.");
      return;
    }
    const titulo = acharCampo(bruto, [
      "title",
      "titulo",
      "name",
      "desc",
      "nickname",
    ]);
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
