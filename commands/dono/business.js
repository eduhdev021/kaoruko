import {db,plataforma} from '../../core/plataforma/store.js';
import {ativarBusiness,salvarRegraBusiness} from '../../core/plataforma/business.js';
import {escapeHtml} from '../../utils/helpers.js';
export const description='Controla conexoes Business e respostas explicitas';export const soDono=true;export const soPrivado=true;
export default async ctx=>{
 const [header,...partes]=ctx.q.split('|'),[acao,id]=header.trim().split(/\s+/);
 if(!acao||acao==='listar')return ctx.responderComApagar(escapeHtml(`Modulo: ${plataforma.business?'on':'off'}\n`+db.prepare('SELECT id,owner_id,is_enabled,ativo FROM platform_business').all().map(x=>`${x.id} · conexao ${x.is_enabled?'ativa':'inativa'} · respostas ${x.ativo?'on':'off'}`).join('\n')));
 if(['on','off'].includes(acao)){ativarBusiness(id,acao==='on');return ctx.responderComApagar('Conexao atualizada.');}
 if(acao==='filtro'){salvarRegraBusiness(id,partes[0]?.trim(),partes.slice(1).join('|').trim());return ctx.responderComApagar('Resposta Business salva. Gatilho por frase inteira, sem executar comandos.');}
 return ctx.erro('/business listar | on ID | off ID | filtro ID | GATILHO | RESPOSTA');
};
