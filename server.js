/* slowgarden 本地服务：把 engine.js 包成 HTTP 接口，网页和 AI 共用同一份 state.json。
 * 纯本地，无需 VPS / 数据库 / 域名 / 联网。 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const ENGINE = path.join(ROOT, 'engine.js');

// engine.js 读取 state.json 是在加载时一次性读入的，所以每个请求都重新加载模块，
// 保证网页操作和 AI 直接改文件之间看到的是同一份最新存档。
function engine() { delete require.cache[require.resolve(ENGINE)]; return require(ENGINE); }
function send(res, code, obj) { res.writeHead(code, {'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(obj)); }
function body(req) { return new Promise(r => { let b=''; req.on('data',c=>b+=c); req.on('end',()=>{ try{r(b?JSON.parse(b):{});}catch(e){r({});} }); }); }

const routes = {
  'POST /api/buy':     (e,a) => e.buy(a.player||'user', a.itemId, a.amount),
  'POST /api/plant':   (e,a) => e.plant(a.player||'user', a.plotId, a.cropId),
  'POST /api/harvest': (e,a) => e.harvest(a.player||'user', a.plotId),
  'POST /api/sell':    (e,a) => e.sell(a.player||'user', a.cropId, a.amount),
  'POST /api/cook':    (e,a) => e.cook(a.player||'user', a.recipeId),
  'POST /api/advance': (e,a) => e.advance(a.days)
};

const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];
  if (req.method === 'GET' && (url === '/' || url === '/index.html')) {
    return fs.readFile(path.join(ROOT,'public','index.html'), (err,data) => err ? send(res,404,{error:'index.html 缺失，先运行 npm start 前确认 public/ 存在'}) : (res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}), res.end(data)));
  }
  if (req.method === 'GET' && url === '/api/state') {
    const e = engine(); return send(res, 200, { ok:true, catalog:e.catalog, state:e.state, validation:e.validate() });
  }
  const key = req.method + ' ' + url;
  if (routes[key]) { const a = await body(req); try { return send(res,200,routes[key](engine(),a)); } catch(err){ return send(res,500,{ok:false,message:String(err.message||err)}); } }
  send(res, 404, { ok:false, message:'未知接口 '+key });
});

server.listen(PORT, '127.0.0.1', () => console.log('slowgarden 本地服务: http://127.0.0.1:'+PORT));
