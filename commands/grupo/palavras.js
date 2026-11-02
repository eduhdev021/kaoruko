import { obterAutomacao, salvarAutomacao, normalizar } from '../../core/automacao.js';
import { escapeHtml } from '../../utils/helpers.js';
export const description = 'Remove mensagens que contem termos configurados';
export const soGrupo = true;
export const soAdmin = true;
export const uso = '/palavras adicionar termo | /palavras apagar termo | /palavras listar';
export default async function palavras(ctx) {
  const config = obterAutomacao(ctx.chatId);
  const [acao, ...args] = ctx.args;
  const termo = normalizar(args.join(' '));
  if (!acao || acao === 'listar') return ctx.responderComApagar(escapeHtml(config.palavras.join('\n') || 'Nenhum termo bloqueado.'));
  if (!['adicionar','apagar'].includes(acao) || termo.length < 2 || termo.length > 60) return ctx.erro('Use /palavras adicionar TERMO ou /palavras apagar TERMO (2 a 60 caracteres).');
  if (acao === 'adicionar' && config.palavras.length >= 50) return ctx.erro('Limite de 50 termos.');
  salvarAutomacao(ctx.chatId, {palavras: acao === 'adicionar' ? [...new Set([...config.palavras, termo])] : config.palavras.filter(x => x !== termo)});
  return ctx.responderComApagar('Lista atualizada. O filtro busca o trecho literal em texto/legenda, sem regex, e nao se aplica aos administradores.');
}
