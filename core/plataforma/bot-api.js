import fs from 'node:fs';
// Indice local gerado; nao consulta codigo remoto nem expoe endpoint de execucao arbitraria.
const catalogo=JSON.parse(fs.readFileSync(new URL('../../docs/telegram-metodos.json',import.meta.url),'utf8'));
const methods=new Map(catalogo.metodos.map(m=>[m.nome,m]));
export function metodosDisponiveis(){return [...methods.keys()];}
export function criarClienteBotApi(telegram){
 if(typeof telegram?.callApi!=='function')throw new Error('Adaptador Telegram invalido');
 return {async call(metodo,params={}){
  const spec=methods.get(metodo);if(!spec)throw new Error('Metodo fora do catalogo local da Bot API');
  if(!params||typeof params!=='object'||Array.isArray(params))throw new Error('Parametros devem ser um objeto');
  const faltam=spec.obrigatorios.filter(k=>params[k]===undefined||params[k]===null);if(faltam.length)throw new Error('Parametros obrigatorios ausentes: '+faltam.join(', '));
  // Autorizacao pertence ao fluxo chamador, nao a esta biblioteca interna.
  return telegram.callApi(metodo,params);
 }};
}
