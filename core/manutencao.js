import { limparPlataforma } from './plataforma/store.js';
import './lembretes.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { db,ARQUIVO } from './db.js';
import { expirarCaptchas } from './entrada.js';
import { entregarPublicacoes } from './recursos.js';
import { logAviso } from '../utils/logger.js';

export const runtime={iniciadoEm:Date.now(),ultimoCiclo:null,ultimoBackup:null,erros:0,ultimoErro:null,executando:false};
export function pastaBackups(){return path.resolve(process.env.BACKUP_DIR||path.join(path.dirname(ARQUIVO),'backups'));}
export async function listarBackups(){
  await fs.mkdir(pastaBackups(),{recursive:true,mode:0o700});
  const names=(await fs.readdir(pastaBackups())).filter(n=>/^kaoruko-\d+-[a-f0-9]{8}\.db$/.test(n)).sort();
  return Promise.all(names.map(async nome=>{const s=await fs.stat(path.join(pastaBackups(),nome));return{nome,tamanho:s.size,em:s.mtimeMs};}));
}
let backupEmAndamento=null;
export function criarBackup(){
  if(!backupEmAndamento)backupEmAndamento=executarBackup().finally(()=>{backupEmAndamento=null;});
  return backupEmAndamento;
}
async function executarBackup(){
  await fs.mkdir(pastaBackups(),{recursive:true,mode:0o700});
  const nome=`kaoruko-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.db`;
  const destino=path.join(pastaBackups(),nome);
  try {
    await db.backup(destino);await fs.chmod(destino,0o600);
    runtime.ultimoBackup=Date.now();
    const lista=(await listarBackups()).sort((a,b)=>b.em-a.em);
    for(const antigo of lista.slice(7))await fs.unlink(path.join(pastaBackups(),antigo.nome));
    return {nome,tamanho:(await fs.stat(destino)).size};
  }catch(err){await fs.unlink(destino).catch(()=>{});throw err;}
}
export function saudeDetalhada(){
  return {versao:'5.0.0',uptime:Math.floor(process.uptime()),memoria:process.memoryUsage().rss,
    banco:db.pragma('quick_check',{simple:true}),runtime:{...runtime},
    filas:{captchas:db.prepare('SELECT count(*) n FROM captcha_pendente').get().n,publicacoes:db.prepare("SELECT count(*) n FROM publicacoes WHERE estado='pendente'").get().n,lembretes:db.prepare('SELECT count(*) n FROM lembretes').get().n}};
}
export function iniciarManutencao(telegram,{backups=true}={}) {
  let parado=false,pendente=Promise.resolve();
  const tick=()=>{
    if(parado||runtime.executando)return;
    runtime.executando=true;
    pendente=(async()=>{
      // Cada tarefa trata seu proprio erro para nao impedir as demais.
      for(const tarefa of [()=>expirarCaptchas(telegram),()=>entregarPublicacoes(telegram),...(backups&&(!runtime.ultimoBackup||Date.now()-runtime.ultimoBackup>86400000)?[criarBackup]:[])]) {
        try{await tarefa();}catch(e){runtime.erros++;runtime.ultimoErro=String(e.message).slice(0,200);logAviso(`Manutencao: ${e.message}`);}
      }
      db.prepare("DELETE FROM atividade_diaria WHERE dia<date('now','-90 days')").run();
      db.prepare('DELETE FROM entradas_grupo WHERE em<?').run(Date.now()-60000);
      db.prepare('DELETE FROM raid_ativo WHERE ate<?').run(Date.now());
      db.prepare("DELETE FROM publicacoes WHERE estado!='pendente' AND id NOT IN (SELECT id FROM publicacoes ORDER BY id DESC LIMIT 1000)").run();
      limparPlataforma();
      runtime.ultimoCiclo=Date.now();
    })().catch(e=>{runtime.erros++;runtime.ultimoErro=String(e.message).slice(0,200);logAviso(`Worker: ${e.message}`);}).finally(()=>{runtime.executando=false;});
  };
  const timer=setInterval(tick,5000);timer.unref();tick();
  return async()=>{parado=true;clearInterval(timer);await pendente;};
}
