import fs from 'node:fs';
import path from 'node:path';
import { ARQUIVO } from './db.js';
export function adquirirLock(){
  const arquivo=path.join(path.dirname(ARQUIVO),'runtime.lock');
  try {
    const pid=Number(fs.readFileSync(arquivo,'utf8'));
    let vivo=false;try{process.kill(pid,0);vivo=true;}catch(e){if(e.code!=='ESRCH')vivo=true;}
    if(vivo)throw new Error('Outra instancia esta em execucao com este banco');
    fs.unlinkSync(arquivo);
  }catch(e){if(e.code!=='ENOENT')throw e;}
  const fd=fs.openSync(arquivo,'wx',0o600);fs.writeFileSync(fd,String(process.pid));fs.closeSync(fd);
  const liberar=()=>{try{if(fs.readFileSync(arquivo,'utf8')===String(process.pid))fs.unlinkSync(arquivo);}catch{}};
  process.once('exit',liberar);
  return liberar;
}
