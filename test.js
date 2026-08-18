const fs = require('fs');
const os = require('os');
const path = require('path');
const src = __dirname;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'garden-kit-test-'));
for (const name of ['catalog.json','state.json','engine.js','render.js']) fs.copyFileSync(path.join(src,name),path.join(tmp,name));
process.chdir(tmp);
const e = require(path.join(tmp,'engine.js'));
const checks=[];
function check(name, fn){
  try { const detail=fn(); checks.push({name,ok:true,detail}); }
  catch(err){ checks.push({name,ok:false,error:err.message}); }
}
check('catalog 校验',()=>{const v=e.validate();if(v.length)throw new Error(v.join('; '));return '无错误';});
check('购买种子',()=>{const r=e.buy('user','seed_pea',1);if(!r.ok)throw new Error(r.message);return r;});
check('种植',()=>{const r=e.plant('user',1,'pea');if(!r.ok)throw new Error(r.message);return r;});
check('无种子拦截',()=>{const r=e.plant('user',2,'pea');if(r.ok)throw new Error('无种子仍能种植');return r;});
check('成熟与收获',()=>{e.advance(3);const r=e.harvest('user',1);if(!r.ok)throw new Error(r.message);return r;});
check('出售',()=>{const r=e.sell('user','pea',1);if(!r.ok)throw new Error(r.message);return r;});
check('饮料按 amount 入柜',()=>{const r=e.buy('user','soda',1);if(!r.ok||e.state.players[0].drinks.soda!==2)throw new Error(JSON.stringify(r));return e.state.players[0].drinks;});
check('厨具多件购买拦截',()=>{e.state.players[0].coins=500;const before=e.state.players[0].coins;const r=e.buy('user','plate',2);if(r.ok||e.state.players[0].coins!==before)throw new Error(JSON.stringify(r));return r;});
check('正常做饭',()=>{const p=e.state.players[0];p.storage.push({item:'tomato',count:1});p.pantry.sugar=1;p.utensils.push('plate');const r=e.cook('user','tomato_salad');if(!r.ok)throw new Error(r.message);return r;});
check('生成 HTML',()=>{delete require.cache[require.resolve(path.join(tmp,'render.js'))];require(path.join(tmp,'render.js'));const html=fs.readFileSync(path.join(tmp,'index.html'),'utf8');if(!html.includes('我的小院子')||!html.includes('玉米浓汤'))throw new Error('HTML 内容不完整');return html.length+' chars';});
console.log(JSON.stringify(checks,null,2));
fs.rmSync(tmp,{recursive:true,force:true});
if(checks.some(x=>!x.ok)) process.exit(1);
