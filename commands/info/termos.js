import {plataforma} from '../../core/plataforma/store.js';
import {escapeHtml} from '../../utils/helpers.js';
export const description='Termos de venda e uso definidos pelo operador';
export default ctx=>ctx.responderComApagar(escapeHtml(plataforma.termosUrl||'Termos comerciais nao configurados; vendas em Stars permanecem indisponiveis.'));
