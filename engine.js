/*
 * 开源模板文件：农场、商店、厨房的最小规则引擎。
 * 不含任何真实数据；修改 catalog.json 即可替换内容。
 */
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const read = name => JSON.parse(fs.readFileSync(path.join(ROOT, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(ROOT, name), JSON.stringify(value, null, 2) + '\n');
const keys = obj => Object.keys(obj || {}).filter(k => !k.startsWith('_'));
const catalog = read('catalog.json');
let state = read('state.json');

function player(id) { return state.players.find(p => p.id === id || p.name === id); }
function season(day) { const m = catalog.meta; return m.seasons[Math.floor((day - 1) / m.days_per_season) % m.seasons.length]; }
function count(list, id) { const row = (list || []).find(x => x.item === id); return row ? row.count : 0; }
function add(list, id, amount) {
  let row = list.find(x => x.item === id);
  if (!row && amount > 0) { list.push({ item: id, count: amount }); return; }
  if (!row) return;
  row.count += amount;
  if (row.count <= 0) list.splice(list.indexOf(row), 1);
}
function log(actor, text) { state.log.push({ day: state.meta.day, actor, text }); state.log = state.log.slice(-200); }
function save() { write('state.json', state); }
function result(ok, message, extra = {}) { return { ok, message, ...extra }; }

function validate() {
  const errors = [], m = catalog.meta;
  keys(catalog.crops).forEach(id => {
    const c = catalog.crops[id];
    if (!m.seasons.includes(c.season)) errors.push(`作物 ${id} 的 season 无效`);
    if (!(c.grow_days > 0)) errors.push(`作物 ${id} 的 grow_days 必须大于 0`);
  });
  keys(catalog.recipes).forEach(id => {
    const r = catalog.recipes[id];
    keys(r.crops).forEach(x => { if (!catalog.crops[x]) errors.push(`菜谱 ${id} 使用了不存在的作物 ${x}`); });
    keys(r.supplies).forEach(x => { if (!catalog.supplies[x]) errors.push(`菜谱 ${id} 使用了不存在的调料 ${x}`); });
    (r.utensils || []).forEach(x => { if (!catalog.utensils[x]) errors.push(`菜谱 ${id} 使用了不存在的厨具 ${x}`); });
  });
  keys(catalog.crops).forEach(id => {
    const c = catalog.crops[id];
    if (!(c.value >= 0)) errors.push(`作物 ${id} 的 value 不能为负数`);
    if (!(c.seed_price >= 0)) errors.push(`作物 ${id} 的 seed_price 不能为负数`);
  });
  keys(catalog.supplies).forEach(id => {
    const x = catalog.supplies[id];
    if (!(x.price >= 0)) errors.push(`调料 ${id} 的 price 不能为负数`);
    if (!(x.portions > 0)) errors.push(`调料 ${id} 的 portions 必须大于 0`);
  });
  keys(catalog.drinks).forEach(id => {
    const x = catalog.drinks[id];
    if (!(x.price >= 0)) errors.push(`饮料 ${id} 的 price 不能为负数`);
    if (!(x.amount > 0)) errors.push(`饮料 ${id} 的 amount 必须大于 0`);
  });
  keys(catalog.utensils).forEach(id => { if (!(catalog.utensils[id].price >= 0)) errors.push(`厨具 ${id} 的 price 不能为负数`); });
  (state.players || []).forEach(p => {
    if (!(p.coins >= 0)) errors.push(`玩家 ${p.id || p.name} 的金币不能为负数`);
    (p.storage || []).forEach(x => { if (!catalog.crops[x.item]) errors.push(`玩家 ${p.id || p.name} 的仓库含未知作物 ${x.item}`); });
  });
  (state.plots || []).forEach(p => { if (p.item && !catalog.crops[p.item]) errors.push(`地块 ${p.id} 引用了未知作物 ${p.item}`); });
  return errors;
}
function buy(id, itemId, amount = 1) {
  const p = player(id), n = Math.max(1, parseInt(amount, 10) || 1);
  if (!p) return result(false, '没有这个玩家');
  let item;
  keys(catalog.crops).forEach(k => { const c = catalog.crops[k]; if ('seed_price' in c && 'seed_' + k === itemId) item = { type: 'seed', ref: k, price: c.seed_price, name: c.name + '种子' }; });
  if (!item && catalog.supplies[itemId]) item = { type: 'supply', ref: itemId, price: catalog.supplies[itemId].price, name: catalog.supplies[itemId].name };
  if (!item && catalog.drinks[itemId]) item = { type: 'drink', ref: itemId, price: catalog.drinks[itemId].price, name: catalog.drinks[itemId].name };
  if (!item && catalog.utensils[itemId]) item = { type: 'utensil', ref: itemId, price: catalog.utensils[itemId].price, name: catalog.utensils[itemId].name };
  if (!item) return result(false, '货架上没有 ' + itemId);
  if (item.type === 'utensil' && n !== 1) return result(false, '厨具一次只能购买 1 件');
  if (item.type === 'utensil' && p.utensils.includes(item.ref)) return result(false, '已经有 ' + item.name);
  const cost = item.price * n;
  if (p.coins < cost) return result(false, '金币不够');
  p.coins -= cost;
  if (item.type === 'seed') p.seeds[item.ref] = (p.seeds[item.ref] || 0) + n;
  if (item.type === 'supply') p.pantry[item.ref] = (p.pantry[item.ref] || 0) + (catalog.supplies[item.ref].portions || 1) * n;
  if (item.type === 'drink') p.drinks[item.ref] = (p.drinks[item.ref] || 0) + (catalog.drinks[item.ref].amount || 1) * n;
  if (item.type === 'utensil') p.utensils.push(item.ref);
  log(p.name, '买了 ' + item.name); save();
  return result(true, `买下 ${item.name}，花费 ${cost} 金`, { balance: p.coins });
}
function plant(id, plotId, cropId) {
  const p = player(id), plot = state.plots.find(x => String(x.id) === String(plotId)), c = catalog.crops[cropId];
  if (!p || !plot || !c) return result(false, '玩家、地块或作物不存在');
  if (plot.item) return result(false, '地块已有作物');
  if (c.season !== season(state.meta.day)) return result(false, '不是这个作物的季节');
  if ((p.seeds[cropId] || 0) < 1) return result(false, '没有对应种子，请先购买');
  p.seeds[cropId]--; plot.item = cropId; plot.planted_day = state.meta.day; plot.by = p.id;
  log(p.name, '种下 ' + c.name); save(); return result(true, '种植成功');
}
function harvest(id, plotId) {
  const plot = state.plots.find(x => String(x.id) === String(plotId));
  if (!plot || !plot.item) return result(false, '地块为空');
  const c = catalog.crops[plot.item], age = state.meta.day - plot.planted_day;
  if (age < c.grow_days) return result(false, `还要 ${c.grow_days - age} 天`);
  const p = player(id) || player(plot.by);
  if (!p) return result(false, '找不到收获归属玩家');
  add(p.storage, plot.item, 1);
  plot.item = null; plot.planted_day = null; plot.by = null; log(p.name, '收获 ' + c.name); save(); return result(true, '收获成功');
}
function sell(id, cropId, amount = 1) {
  const p = player(id), n = Math.max(1, parseInt(amount, 10) || 1), c = catalog.crops[cropId];
  if (!p || !c || count(p.storage, cropId) < n) return result(false, '仓库数量不足');
  add(p.storage, cropId, -n); p.coins += c.value * n; log(p.name, '卖出 ' + c.name); save(); return result(true, `获得 ${c.value * n} 金`, { balance: p.coins });
}
function cook(id, recipeId) {
  const p = player(id), r = catalog.recipes[recipeId];
  if (!p || !r) return result(false, '玩家或菜谱不存在');
  for (const k of keys(r.crops)) if (count(p.storage, k) < r.crops[k]) return result(false, '作物材料不足');
  for (const k of keys(r.supplies)) if ((p.pantry[k] || 0) < r.supplies[k]) return result(false, '调料不足');
  for (const k of (r.utensils || [])) if (!p.utensils.includes(k)) return result(false, '缺少厨具');
  keys(r.crops).forEach(k => add(p.storage, k, -r.crops[k])); keys(r.supplies).forEach(k => { p.pantry[k] -= r.supplies[k]; });
  add(p.dishes, recipeId, 1); log(p.name, '做了 ' + r.name); save(); return result(true, '烹饪成功');
}
function advance(days = 1) { state.meta.day += Math.max(1, parseInt(days, 10) || 1); save(); return result(true, '时间前进'); }
function snapshot() { return { catalog, state }; }
module.exports = { catalog, get state() { return state; }, validate, buy, plant, harvest, sell, cook, advance, snapshot };

if (require.main === module) {
  console.log(JSON.stringify({ template: true, validation: validate(), day: state.meta.day, season: season(state.meta.day), crops: keys(catalog.crops).length, recipes: keys(catalog.recipes).length }, null, 2));
}
