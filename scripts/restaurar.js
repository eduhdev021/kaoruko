import fs from 'node:fs/promises';
import path from 'node:path';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
dotenv.config();
const origem=process.argv[2];
if(!origem){console.error('Uso: npm run restaurar -- /caminho/backup.db (pare a bot antes)');process.exit(1);}
const destino=path.resolve(process.env.DATABASE_PATH||'database/kaoruko.db');
const lock=path.join(path.dirname(destino),'runtime.lock');
try {
  const pid=Number(await fs.readFile(lock,'utf8'));
  let vivo=false;try{process.kill(pid,0);vivo=true;}catch(e){if(e.code!=='ESRCH')vivo=true;}
  if(vivo)throw new Error('Bot em execucao. Pare-a antes de restaurar.');
}catch(e){if(e.code!=='ENOENT')throw e;}
if(path.resolve(origem)===destino)throw new Error('Origem e destino devem ser diferentes');
const teste=new Database(path.resolve(origem),{readonly:true,fileMustExist:true});
try {if(teste.pragma('integrity_check',{simple:true})!=='ok')throw new Error('Backup falhou na verificacao de integridade');
  const tabelas=teste.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(x=>x.name);
  if(!['usuarios','grupos','contas'].every(t=>tabelas.includes(t)))throw new Error('Arquivo nao e um banco Kaoruko reconhecido');
}finally{teste.close();}
await fs.mkdir(path.dirname(destino),{recursive:true});
const temporario=destino+'.restaurando';
await fs.copyFile(path.resolve(origem),temporario);
await fs.chmod(temporario,0o600);
// Sessao/reenvio de rascunho antigo nao deve voltar a ser valido apos restaurar.
const restaurado=new Database(temporario);
try {
 const tem=nome=>Boolean(restaurado.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(nome));
 restaurado.transaction(()=>{
  for(const tabela of ['sessoes','platform_mini_sessions','platform_drafts'])if(tem(tabela))restaurado.exec(`DELETE FROM ${tabela}`);
  if(tem('platform_business'))restaurado.exec('UPDATE platform_business SET ativo=0');
 })();
}finally{restaurado.close();}

// Banco atual e preservado via API SQLite (inclui WAL) antes de substituir.
try {await fs.access(destino);const atual=new Database(destino);try{await atual.backup(destino+`.antes-${Date.now()}.db`);}finally{atual.close();}}catch(e){if(e.code!=='ENOENT')throw e;}
await fs.unlink(destino+'-wal').catch(e=>{if(e.code!=='ENOENT')throw e;});
await fs.unlink(destino+'-shm').catch(e=>{if(e.code!=='ENOENT')throw e;});
await fs.rename(temporario,destino);
console.log('Restauracao concluida. Banco anterior preservado, quando existente. Inicie a bot e valide o funcionamento.');
