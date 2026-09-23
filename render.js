/* 开源模板文件：读取 catalog.json 和 state.json，生成可查看的静态 HTML。 */
const fs = require('fs');
const path = require('path');
const root = __dirname;
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'catalog.json'), 'utf8'));
const state = JSON.parse(fs.readFileSync(path.join(root, 'state.json'), 'utf8'));
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const keys = o => Object.keys(o || {}).filter(k => !k.startsWith('_'));
const season = catalog.meta.seasons[Math.floor((state.meta.day - 1) / catalog.meta.days_per_season) % catalog.meta.seasons.length];
const seasonName = (catalog.meta.season_names || {})[season] || season;
const player = state.players[0];
const cropRows = keys(catalog.crops).map(id => { const c = catalog.crops[id]; return `<tr><td>${esc(c.name)}</td><td>${esc(c.season)}</td><td>${c.grow_days} 天</td><td>${c.value} 金</td><td>${c.seed_price} 金</td></tr>`; }).join('');
const recipeRows = keys(catalog.recipes).map(id => { const r = catalog.recipes[id]; return `<tr><td>${esc(r.name)}</td><td>${esc(Object.keys(r.crops || {}).map(k => (catalog.crops[k] || {}).name || k).join('、'))}</td><td>${esc(Object.keys(r.supplies || {}).map(k => (catalog.supplies[k] || {}).name || k).join('、') || '—')}</td><td>${esc((r.utensils || []).map(k => (catalog.utensils[k] || {}).name || k).join('、') || '—')}</td></tr>`; }).join('');
const plotCards = state.plots.map(p => { const c = p.item && catalog.crops[p.item]; const age = p.item ? state.meta.day - p.planted_day : 0; const ready = c && age >= c.grow_days; return `<article class="plot ${ready ? 'ready' : ''}"><b>#${p.id}</b><strong>${esc(c ? c.name : '空地')}</strong><small>${c ? (ready ? '可以收获' : `成长中 · 第 ${age}/${c.grow_days} 天`) : '等待种植'}</small></article>`; }).join('');
const storage = (player.storage || []).map(x => `<li>${esc((catalog.crops[x.item] || {}).name || x.item)} × ${x.count}</li>`).join('') || '<li>空</li>';
const pantry = Object.keys(player.pantry || {}).map(k => `<li>${esc((catalog.supplies[k] || {}).name || k)} × ${player.pantry[k]}</li>`).join('') || '<li>空</li>';
const drinks = Object.keys(player.drinks || {}).map(k => `<li>${esc((catalog.drinks[k] || {}).name || k)} × ${player.drinks[k]}</li>`).join('') || '<li>空</li>';
const utensils = (player.utensils || []).map(k => `<li>${esc((catalog.utensils[k] || {}).name || k)}</li>`).join('') || '<li>空</li>';
const log = (state.log || []).slice(-12).reverse().map(x => `<li><b>第 ${esc(x.day)} 天</b> ${esc(x.actor)}：${esc(x.text)}</li>`).join('') || '<li>暂无记录</li>';
const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(catalog.meta.title)} · 开源模板</title><style>
:root{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#2e3040;background:#f5f1eb}*{box-sizing:border-box}body{margin:0;max-width:1100px;margin:auto;padding:24px}header{padding:28px;border-radius:24px;background:linear-gradient(135deg,#dcefe4,#f7dfcc);box-shadow:0 8px 24px #806d5424}h1{margin:0 0 8px}h2{margin:0 0 14px}section{background:#fffaf5;border:1px solid #eadfd2;border-radius:18px;padding:18px;margin-top:18px;box-shadow:0 4px 14px #806d5412}.stats,.plots{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}.stat,.plot{padding:14px;border-radius:14px;background:#f4eee6}.stat b,.plot strong,.plot small{display:block}.plot.ready{background:#e4f4df;border:1px solid #acd399}.plot small{margin-top:7px;color:#6b6870}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:9px;border-bottom:1px solid #eee4d9}th{color:#756c60}ul{padding-left:20px;line-height:1.8}.columns{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px}.note{color:#716c67;font-size:.92rem}footer{padding:22px 0;color:#79716a;font-size:.85rem}@media(max-width:600px){body{padding:12px}section,header{padding:15px;overflow:auto}table{font-size:.86rem;min-width:620px}}
</style></head><body><header><h1>${esc(catalog.meta.title)}</h1><p>可自由修改的开源农场 × 厨房模板 · 当前第 ${state.meta.day} 天 · ${esc(seasonName)}季</p></header>
<section><h2>当前状态</h2><div class="stats"><div class="stat"><b>玩家</b>${esc(player.name)}</div><div class="stat"><b>金币</b>${player.coins} 金</div><div class="stat"><b>地块</b>${state.plots.length} 块</div><div class="stat"><b>作物</b>${keys(catalog.crops).length} 种</div><div class="stat"><b>菜谱</b>${keys(catalog.recipes).length} 道</div></div></section>
<section><h2>农场</h2><div class="plots">${plotCards}</div></section>
<section><h2>库存</h2><div class="columns"><div><h3>仓库</h3><ul>${storage}</ul></div><div><h3>调料柜</h3><ul>${pantry}</ul></div><div><h3>饮料柜</h3><ul>${drinks}</ul></div><div><h3>厨具</h3><ul>${utensils}</ul></div></div></section>
<section><h2>作物目录</h2><p class="note">修改 catalog.json 后重新运行 node render.js 即可刷新。</p><table><thead><tr><th>作物</th><th>季节</th><th>成长</th><th>售价</th><th>种子价</th></tr></thead><tbody>${cropRows}</tbody></table></section>
<section><h2>菜谱目录</h2><table><thead><tr><th>菜名</th><th>作物</th><th>调料</th><th>厨具</th></tr></thead><tbody>${recipeRows}</tbody></table></section>
<section><h2>最近记录</h2><ul>${log}</ul></section><footer>这是开源模板生成的静态预览，不含任何真实存档、密钥或私人数据。</footer></body></html>`;
fs.writeFileSync(path.join(root, 'preview.html'), html);
console.log(`HTML_OK ${Buffer.byteLength(html)} bytes`);
