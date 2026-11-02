import { criarBackup } from '../../core/manutencao.js';
export const description='Cria backup consistente do SQLite para download no painel';export const soDono=true;export const soPrivado=true;
export default async ctx=>{const b=await criarBackup();return ctx.responderComApagar(`Backup criado: ${b.nome}. Baixe na Gestao > Operacao do painel. Contem dados privados; guarde com seguranca.`);};
