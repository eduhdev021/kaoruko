import express from 'express';
import {botConfig,db,plataforma,requisitosPlataforma} from '../core/plataforma/store.js';
import {validarInitData,criarSessaoMini,usuarioMini,encerrarMini} from '../core/plataforma/mini-auth.js';
import {produtosStars,criarFatura,faturasStars,salvarProduto,reembolsarStars} from '../core/plataforma/stars.js';
import {ativarBusiness,salvarRegraBusiness} from '../core/plataforma/business.js';
import {decidirEntrada} from '../core/plataforma/fluxos.js';
import {exigirAuth} from '../core/auth.js';
import {usoDe,planoDe} from '../core/vip.js';
import {listarLembretes,criarLembrete,cancelarLembrete} from '../core/lembretes.js';
import {getAllCommands} from '../commands/registry.js';
import {limitarHttp} from '../core/limite-http.js';
import {podeGerirGrupo} from './gestao-api.js';
const asyncRoute=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
export function criarMiniApi(telegram){
 const r=express.Router();r.use(limitarHttp({max:60,janelaMs:60000}));
 r.use((_req,res,next)=>{res.setHeader('Cache-Control','no-store');if(!requisitosPlataforma().mini.pronto)return res.status(503).json({erro:'Mini App desativada ou URL HTTPS nao configurada'});next();});
 r.post('/auth',(req,res)=>{
  const u=validarInitData(req.body?.initData,botConfig.token);if(!u)return res.status(401).json({erro:'Autenticacao Telegram invalida ou expirada. Reabra a Mini App pelo Telegram.'});
  res.json({...criarSessaoMini(u),usuario:u});
 });
 r.use((req,res,next)=>{const auth=req.get('authorization')||'';req.miniToken=auth.startsWith('Mini ')?auth.slice(5):'';req.miniUser=usuarioMini(req.miniToken);if(!req.miniUser)return res.status(401).json({erro:'Sessao Mini App invalida ou expirada'});next();});
 r.get('/me',(req,res)=>res.json({usuario:req.miniUser,plano:planoDe(req.miniUser.id),uso:usoDe(req.miniUser.id),stars:requisitosPlataforma().stars.pronto,termos:plataforma.termosUrl,suporte:plataforma.suporte}));
 r.post('/logout',(req,res)=>{encerrarMini(req.miniToken);res.json({ok:true});});
 r.get('/comandos',(_req,res)=>res.json(getAllCommands().filter(c=>!c.soDono&&!c.oculto).map(c=>({nome:c.name,descricao:c.description,uso:c.uso,categoria:c.category}))));
 r.get('/lembretes',(req,res)=>res.json(listarLembretes(req.miniUser.id)));
 r.post('/lembretes',(req,res)=>{try{res.json({id:criarLembrete(req.miniUser.id,req.miniUser.id,req.body?.texto,req.body?.atrasoMs)});}catch(e){res.status(400).json({erro:e.message});}});
 r.delete('/lembretes/:id',(req,res)=>res.json({ok:cancelarLembrete(req.miniUser.id,req.params.id)}));
 r.get('/produtos',(_req,res)=>res.json(requisitosPlataforma().stars.pronto?produtosStars():[]));
 r.get('/faturas',(req,res)=>res.json(faturasStars(req.miniUser.id)));
 r.post('/faturas',asyncRoute(async(req,res)=>{try{res.json(await criarFatura(telegram,req.miniUser.id,req.body?.produto,{link:true}));}catch(e){res.status(400).json({erro:e.response?.description||e.message});}}));
 return r;
}
export function criarPlataformaAdminApi(telegram){
 const r=express.Router();r.use(exigirAuth());r.use(limitarHttp({max:120,janelaMs:60000}));
 const dono=(req,res,next)=>req.usuario.papel==='dono'?next():res.status(403).json({erro:'Somente o dono'});
 r.get('/status',(_req,res)=>res.json(requisitosPlataforma()));
 r.get('/produtos',dono,(_req,res)=>res.json(produtosStars(true)));
 r.put('/produtos',dono,(req,res)=>{try{res.json(salvarProduto(req.body));}catch(e){res.status(400).json({erro:e.message});}});
 r.get('/faturas',dono,(_req,res)=>res.json(faturasStars()));
 r.post('/faturas/:id/reembolsar',dono,asyncRoute(async(req,res)=>{if(req.body?.confirmar!==true)return res.status(400).json({erro:'Confirmacao explicita necessaria'});try{res.json(await reembolsarStars(telegram,req.params.id));}catch(e){res.status(400).json({erro:e.response?.description||e.message});}}));
 r.get('/business',dono,(_req,res)=>res.json(db.prepare('SELECT id,owner_id,is_enabled,ativo,em FROM platform_business').all().map(c=>({...c,regras:db.prepare('SELECT gatilho,resposta FROM platform_business_rules WHERE connection_id=?').all(c.id)}))));
 r.put('/business/:id',dono,(req,res)=>{try{if(typeof req.body?.ativo!=='boolean')throw new Error('Ativacao invalida');ativarBusiness(req.params.id,req.body.ativo);res.json({ok:true});}catch(e){res.status(400).json({erro:e.message});}});
 r.put('/business/:id/regras',dono,(req,res)=>{try{salvarRegraBusiness(req.params.id,req.body?.gatilho,req.body?.resposta);res.json({ok:true});}catch(e){res.status(400).json({erro:e.message});}});
 r.delete('/business/:id/regras',dono,(req,res)=>{if(typeof req.body?.gatilho!=='string')return res.status(400).json({erro:'Gatilho invalido'});db.prepare('DELETE FROM platform_business_rules WHERE connection_id=? AND gatilho=?').run(req.params.id,req.body.gatilho);res.json({ok:true});});
 r.use('/grupos/:chatId',(req,res,next)=>{podeGerirGrupo(req.usuario,req.params.chatId,telegram).then(ok=>ok?next():res.status(403).json({erro:'Sem acesso ao grupo'})).catch(next);});
 r.get('/grupos/:chatId/entradas',(req,res)=>res.json(db.prepare("SELECT user_id,nome,em,status FROM platform_join WHERE chat_id=? ORDER BY em DESC LIMIT 100").all(req.params.chatId)));
 r.post('/grupos/:chatId/entradas/:userId',asyncRoute(async(req,res)=>{
  if(typeof req.body?.aprovar!=='boolean')return res.status(400).json({erro:'Decisao invalida'});
  const ator=req.usuario.telegramId;if(!ator)return res.status(400).json({erro:'Vincule seu ID Telegram para realizar esta acao'});
  try{await decidirEntrada(telegram,req.params.chatId,req.params.userId,ator,req.body.aprovar);res.json({ok:true});}catch(e){res.status(400).json({erro:e.response?.description||e.message});}
 }));
 return r;
}
