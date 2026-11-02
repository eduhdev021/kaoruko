import { gerenciarConteudo } from '../../core/comando-conteudo.js';
export const description='Notas de texto, midia e botoes compartilhadas pelo grupo';export const soGrupo=true;
export const uso='/notas salvar nome | texto (ou responda a uma midia)';
export default ctx=>gerenciarConteudo(ctx,'nota');
