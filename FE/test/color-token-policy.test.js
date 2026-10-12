import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=new URL('../src/',import.meta.url);
function collect(path){return readdirSync(path,{withFileTypes:true}).flatMap(file=>file.isDirectory()?collect(join(path,file.name)):file.name.endsWith('.css')?[join(path,file.name)]:[]);}
test('UI colors are defined in palette files rather than individual screen declarations',()=>{
  const violations=[];
  for(const file of collect(fileURLToPath(root))){
    if(/(?:foundation|theme|utilities)\.css$/.test(file))continue;
    const source=readFileSync(file,'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
    for(const match of source.matchAll(/[\w-]+\s*:\s*([^;{}]+)/g))if(/#[a-f\d]{3,8}\b|rgba?\(|\b(?:white|black)\b/i.test(match[1]))violations.push(file+': '+match[0]);
  }
  assert.deepEqual(violations,[],'A hardcoded color can reintroduce an unthemed tab, form or hover state');
});
