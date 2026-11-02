import express from 'express';
import path from 'node:path';
import { db } from '../core/db.js';
import { exigirAuth } from '../core/auth.js';
import botConfig from '../config/index.js';
import { configGestao,salvarGestao,validarGestao,historicoModeracao,analiseGrupo,registrarAcao } from '../core/gestao-store.js';
import { configGrupo,configurarGrupo } from '../core/comunidade.js';
import { obterAutomacao,salvarAutomacao,validarAutomacao,listarRespostas,salvarResposta,removerResposta } from '../core/automacao.js';
import { listarConteudos,salvarConteudo,removerConteudo,validarConteudo,listarPublicacoes,agendarPublicacao,cancelarPublicacao,reputacaoGrupo } from '../core/recursos.js';
import { aplicarModeracao,desfazerModeracao,advertirComAcao } from '../core/moderacao.js';
import { criarBackup,listarBackups,pastaBackups,saudeDetalhada } from '../core/manutencao.js';
import { rankingGrupo } from '../core/automacao.js';
import { limitarHttp } from '../core/limite-http.js';

export async function podeGerirGrupo(usuario,chatId,telegram){
  if(!/^-\d+$/.test(String(chatId)))return false;
  if(usuario?.papel==='dono')return true;
  if(!usuario?.telegramId||!/^\d+$/.test(String(usuario.telegramId)))return false;
  try {const m=await telegram.getChatMember(String(chatId),Number(usuario.telegramId));return ['creator','administrator'].includes(m.status);}
  catch{return false;}
}
const envolver=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
function pacoteConfig(chatId){return{gestao:configGestao(chatId),automacao:obterAutomacao(chatId),comunidade:configGrupo(chatId)};}
export function validarPacote(dados){
  if(!dados||typeof dados!=='object')return null;
  const gestao=validarGestao(dados.gestao),automacao=validarAutomacao(dados.automacao),c=dados.comunidade;
  if(!gestao||!automacao||!c||typeof c.boasvindas!=='string'||c.boasvindas.length>1500||typeof c.regras!=='string'||c.regras.length>2000||![0,1].includes(c.antilink))return null;
  return {gestao,automacao,comunidade:{boasvindas:c.boasvindas,regras:c.regras,antilink:c.antilink}};
}
function aplicarPacote(chatId,dados){
  db.transaction(()=>{salvarGestao(chatId,dados.gestao);salvarAutomacao(chatId,dados.automacao);for(const key of ['boasvindas','regras','antilink'])configurarGrupo(chatId,key,dados.comunidade[key]);})();
}
export function criarGestaoApi(telegram){
  const router=express.Router();
  router.use(exigirAuth());
  router.use(limitarHttp({max:180,janelaMs:60000}));
  router.use((req,res,next)=>{
    if(!['GET','HEAD','OPTIONS'].includes(req.method)){
      const origin=req.get('origin');
      let valido=true;
      if(origin)try {const url=new URL(origin);valido=url.host===req.get('host')||Boolean(botConfig.painel.urlPublica&&origin===new URL(botConfig.painel.urlPublica).origin);}catch{valido=false;}
      if(!valido||req.get('sec-fetch-site')==='cross-site')return res.status(403).json({erro:'Origem nao permitida'});
      if(!req.is('application/json'))return res.status(415).json({erro:'Use application/json'});
    }
    next();
  });
  const dono=(req,res,next)=>req.usuario.papel==='dono'?next():res.status(403).json({erro:'Somente o dono'});
  router.get('/saude',dono,(_req,res)=>res.json(saudeDetalhada()));
  router.get('/backups',dono,envolver(async(_req,res)=>res.json(await listarBackups())));
  router.post('/backups',dono,envolver(async(_req,res)=>res.json(await criarBackup())));
  router.get('/backups/:nome',dono,envolver(async(req,res)=>{
    const lista=await listarBackups();if(!lista.some(x=>x.nome===req.params.nome))return res.status(404).json({erro:'Backup inexistente'});
    res.download(path.join(pastaBackups(),req.params.nome));
  }));
  router.get('/grupos',envolver(async(req,res)=>{
    const grupos=db.prepare('SELECT id,titulo FROM grupos ORDER BY desde DESC LIMIT 200').all();
    const permitidos=[];
    // Lotes pequenos: nao dispara centenas de consultas simultaneas ao Telegram.
    for(let i=0;i<grupos.length;i+=4)await Promise.all(grupos.slice(i,i+4).map(async g=>{if(await podeGerirGrupo(req.usuario,g.id,telegram))permitidos.push(g);}));
    res.json({grupos:permitidos,usuario:{nome:req.usuario.nome,papel:req.usuario.papel,vinculado:Boolean(req.usuario.telegramId)}});
  }));
  router.use('/:chatId',(req,res,next)=>{
    podeGerirGrupo(req.usuario,req.params.chatId,telegram).then(ok=>{
      if(!ok)return res.status(403).json({erro:'Sem permissao para este grupo. O dono deve vincular sua conta ao Telegram e voce deve ser admin no grupo.'});
      req.grupoAutorizado=req.params.chatId;next();
    }).catch(next);
  });
  router.get('/:chatId/config',(req,res)=>res.json(pacoteConfig(req.params.chatId)));
  router.put('/:chatId/config',(req,res)=>{
    const pacote=validarPacote(req.body);if(!pacote)return res.status(400).json({erro:'Configuracao invalida'});
    aplicarPacote(req.params.chatId,pacote);registrarAcao({chatId:req.params.chatId,ator:req.usuario.email,tipo:'configuracao'});res.json({ok:true});
  });
  router.get('/:chatId/exportar',(req,res)=>res.json({formato:'kaoruko-grupo-v1',config:pacoteConfig(req.params.chatId),notas:listarConteudos(req.params.chatId,'nota'),comandos:listarConteudos(req.params.chatId,'comando'),filtros:listarRespostas(req.params.chatId,'filtro')}));
  router.post('/:chatId/importar',(req,res)=>{
    const d=req.body,c=validarPacote(d?.config);
    if(d?.formato!=='kaoruko-grupo-v1'||!c||!['notas','comandos','filtros'].every(k=>Array.isArray(d[k])&&d[k].length<=50))return res.status(400).json({erro:'Arquivo de configuracao invalido'});
    try{db.transaction(()=>{
      aplicarPacote(req.params.chatId,c);
      for(const [campo,tipo]of [['notas','nota'],['comandos','comando']])for(const item of d[campo])salvarConteudo(req.params.chatId,tipo,item.chave,item);
      for(const item of d.filtros)salvarResposta(req.params.chatId,'filtro',item.chave,item.texto);
    })();}catch(e){return res.status(400).json({erro:e.message});}
    registrarAcao({chatId:req.params.chatId,ator:req.usuario.email,tipo:'importar_config'});res.json({ok:true});
  });
  router.get('/:chatId/conteudos',(req,res)=>res.json({notas:listarConteudos(req.params.chatId,'nota'),comandos:listarConteudos(req.params.chatId,'comando'),filtros:listarRespostas(req.params.chatId,'filtro')}));
  router.put('/:chatId/conteudos',(req,res)=>{
    const {tipo,chave,dados}=req.body||{};
    try{if(tipo==='filtro')salvarResposta(req.params.chatId,'filtro',chave,dados?.texto);else salvarConteudo(req.params.chatId,tipo,chave,dados);}
    catch(e){return res.status(400).json({erro:e.message});}res.json({ok:true});
  });
  router.delete('/:chatId/conteudos',(req,res)=>{
    const {tipo,chave}=req.body||{};
    if(!['filtro','nota','comando'].includes(tipo)||typeof chave!=='string')return res.status(400).json({erro:'Tipo/chave invalidos'});
    res.json({ok:tipo==='filtro'?removerResposta(req.params.chatId,tipo,chave):removerConteudo(req.params.chatId,tipo,chave)});
  });
  router.get('/:chatId/historico',(req,res)=>res.json({acoes:historicoModeracao(req.params.chatId),avisos:db.prepare('SELECT user_id,total FROM comunidade_avisos WHERE chat_id=? ORDER BY total DESC LIMIT 100').all(req.params.chatId)}));
  router.post('/:chatId/moderar',envolver(async(req,res)=>{
    const {userId,tipo,motivo='',duracao=600}=req.body||{};
    if(typeof motivo!=='string'||motivo.length>500||!/^\d+$/.test(String(userId)))return res.status(400).json({erro:'Alvo/motivo invalidos'});
    try{const args={chatId:req.params.chatId,userId,ator:req.usuario.email,tipo,motivo,duracao};
      const resultado=['advertir','avisos_limpar'].includes(tipo)?await advertirComAcao(telegram,{...args,acao:tipo==='advertir'?'adicionar':'limpar'}):await aplicarModeracao(telegram,args);
      res.json({ok:true,...resultado});
    }catch(e){res.status(400).json({erro:e.message});}
  }));
  router.post('/:chatId/desfazer',envolver(async(req,res)=>{try{await desfazerModeracao(telegram,req.params.chatId,req.body?.id,req.usuario.email);res.json({ok:true});}catch(e){res.status(400).json({erro:e.message});}}));
  router.get('/:chatId/publicacoes',(req,res)=>res.json(listarPublicacoes(req.params.chatId)));
  router.post('/:chatId/publicacoes',(req,res)=>{try{res.json({id:agendarPublicacao(req.params.chatId,req.usuario.email,req.body||{})});}catch(e){res.status(400).json({erro:e.message});}});
  router.delete('/:chatId/publicacoes/:id',(req,res)=>res.json({ok:cancelarPublicacao(req.params.chatId,req.params.id)}));
  router.delete('/:chatId/dados',(req,res)=>{
    const tipo=req.body?.tipo;
    if(!['atividade','reputacao'].includes(tipo))return res.status(400).json({erro:'Tipo invalido'});
    const tabelas=tipo==='atividade'?['atividade_diaria','atividade_grupo']:['reputacao_grupo','votos_reputacao'];
    db.transaction(()=>{for(const tabela of tabelas)db.prepare(`DELETE FROM ${tabela} WHERE chat_id=?`).run(req.params.chatId);})();
    registrarAcao({chatId:req.params.chatId,ator:req.usuario.email,tipo:'apagar_dados',dados:{tipo}});res.json({ok:true});
  });
  router.get('/:chatId/analise',(req,res)=>res.json({dias:analiseGrupo(req.params.chatId),ranking:rankingGrupo(req.params.chatId),reputacao:reputacaoGrupo(req.params.chatId)}));
  return router;
}
