import {plataforma} from '../../core/plataforma/store.js';
import {escapeHtml} from '../../utils/helpers.js';
export const description='Contato de suporte a compras e pagamentos';
export default ctx=>ctx.responderComApagar(escapeHtml(plataforma.suporte||'Compras desativadas ou suporte ainda nao configurado. Procure o dono da bot. Nunca envie sua senha ou token.'));
