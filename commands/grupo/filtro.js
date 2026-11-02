import { listarRespostas, salvarResposta, removerResposta } from '../../core/automacao.js';
import { escapeHtml } from '../../utils/helpers.js';
export const description = 'Configura respostas automaticas por frase exata';
export const soGrupo = true;
export const soAdmin = true;
export const uso = '/filtro adicionar bom dia | Bom dia, pessoal! | /filtro apagar bom dia | /filtro listar';
export default async function filtro(ctx) {
  const [acao, ...args] = ctx.args;
  const texto = args.join(' ');
  if (!acao || acao === 'listar') return ctx.responderComApagar(escapeHtml(listarRespostas(ctx.chatId, 'filtro').map(x => x.chave).join('\n') || 'Nenhum filtro configurado.'));
  if (acao === 'apagar') return ctx.responderComApagar(removerResposta(ctx.chatId, 'filtro', texto) ? 'Filtro removido.' : 'Filtro nao encontrado.');
  const indice = texto.indexOf('|');
  if (acao !== 'adicionar' || indice < 1) return ctx.erro(escapeHtml(uso));
  try { salvarResposta(ctx.chatId, 'filtro', texto.slice(0, indice), texto.slice(indice + 1)); }
  catch (e) { return ctx.erro(escapeHtml(e.message)); }
  return ctx.responderComApagar('Filtro salvo. O gatilho e a frase inteira, sem diferenciar maiusculas. Respostas limitadas a uma a cada 5s por grupo.');
}
