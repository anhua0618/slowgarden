const fs=require('fs');
const path=require('path');
const root=__dirname;
const catalog=JSON.parse(fs.readFileSync(path.join(root,'catalog.json'),'utf8'));
const target=path.join(root,'state.json');
if(fs.existsSync(target)&&!process.argv.includes('--force')){
  console.error('state.json 已存在；如需重置，请运行 node init.js --force');
  process.exit(1);
}
const players=(catalog.meta.players||[{id:'user',name:'玩家'}]).map(p=>({id:p.id,name:p.name,coins:catalog.meta.start_coins,seeds:{},storage:[],pantry:{},drinks:{},utensils:[],dishes:[]}));
const plots=Array.from({length:catalog.meta.plot_count},(_,i)=>({id:i+1,item:null,planted_day:null,by:null}));
const state={_readme:'开源模板示例存档：可以清空后重新开始，不含真实数据。',meta:{day:1},players,plots,log:[{day:1,actor:'系统',text:'新的小院子开始了'}]};
fs.writeFileSync(target,JSON.stringify(state,null,2)+'\n');
console.log('INIT_OK players='+players.length+' plots='+plots.length);
