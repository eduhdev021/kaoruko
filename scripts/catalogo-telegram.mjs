import fs from 'node:fs/promises';
import ts from 'typescript';
const base=new URL('../',import.meta.url),path=new URL('node_modules/@grammyjs/types/methods.d.ts',base);
const texto=await fs.readFile(path,'utf8'),sf=ts.createSourceFile('methods.d.ts',texto,ts.ScriptTarget.Latest,true);
const api=sf.statements.find(n=>ts.isTypeAliasDeclaration(n)&&n.name.text==='ApiMethods');
if(!api||!ts.isTypeLiteralNode(api.type))throw new Error('Formato de catalogo inesperado');
const versao=JSON.parse(await fs.readFile(new URL('node_modules/@grammyjs/types/package.json',base),'utf8')).version;
const methods=api.type.members.filter(ts.isMethodSignature).map(m=>{
 const nome=m.name.getText(sf).replace(/["']/g,''),arg=m.parameters[0],tipo=arg?.type;
 const campos=tipo&&ts.isTypeLiteralNode(tipo)?tipo.members.filter(ts.isPropertySignature):[];
 const docs=ts.getJSDocCommentsAndTags(m).map(x=>typeof x.comment==='string'?x.comment:'').join('\n');
 return{nome,referencia:`https://core.telegram.org/bots/api#${nome.toLowerCase()}`,descricao:docs.split('\n')[0],obrigatorios:campos.filter(p=>!p.questionToken).map(p=>p.name.getText(sf)),opcionais:campos.filter(p=>p.questionToken).map(p=>p.name.getText(sf))};
}).sort((a,b)=>a.nome.localeCompare(b.nome));
await fs.mkdir(new URL('docs/',base),{recursive:true});
await fs.writeFile(new URL('docs/telegram-metodos.json',base),JSON.stringify({fonte:'@grammyjs/types',versao,metodos:methods},null,2)+'\n');
const md=['# Catalogo de referencia da Bot API','',`Fonte de tipos: @grammyjs/types ${versao} (MIT). ${methods.length} metodos catalogados.`,`Este e um indice de referencia, NAO uma afirmacao de implementacao ou homologacao de todos os metodos. Nao existe endpoint publico para executa-los arbitrariamente. Use os modulos autorizados da plataforma.`, '', '| Metodo | Campos obrigatorios de primeiro nivel |','|---|---|',...methods.map(m=>`| [${m.nome}](${m.referencia}) | ${m.obrigatorios.join(', ')||'—'} |`)];
await fs.writeFile(new URL('docs/TELEGRAM-CATALOGO.md',base),md.join('\n')+'\n');console.log(`${methods.length} metodos catalogados; dependencia ${versao}.`);
