import { getAllCommands } from '../registry.js';
import { escapeHtml } from '../../utils/helpers.js';
export const description = 'Encontra comandos por nome ou descricao';
export const aliases = ['buscarcomando'];
export const uso = '/buscarcmd musica';
export default async function buscarcmd(ctx) {
  const termo = ctx.q.toLocaleLowerCase('pt-BR').slice(0, 100);
  if (termo.length < 2) return ctx.erro('Digite pelo menos 2 letras. Exemplo: /buscarcmd musica');
  const lista = getAllCommands().filter(c => !c.oculto && (!c.soDono || ctx.isDono) &&
    `${c.name} ${c.description} ${c.aliases.join(' ')}`.toLocaleLowerCase('pt-BR').includes(termo));
  return ctx.responderComApagar(lista.length ? `<b>COMANDOS ENCONTRADOS (${lista.length})</b>\n\n` +
    lista.slice(0, 15).map(c => `<code>${escapeHtml(ctx.prefix + c.name)}</code> — ${escapeHtml(c.description)}`).join('\n') +
    (lista.length > 15 ? '\n\nMostrando os primeiros 15. Refine sua busca.' : '') : 'Nenhum comando encontrado. Tente outra palavra ou use /menu.');
}
