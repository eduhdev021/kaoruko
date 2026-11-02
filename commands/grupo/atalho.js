import { gerenciarConteudo } from '../../core/comando-conteudo.js';
export const description='Cria comandos personalizados por grupo, com texto, midia e botoes';export const soGrupo=true;
export const uso='/atalho salvar contato | Nosso atendimento: ...';
export default ctx=>gerenciarConteudo(ctx,'comando');
