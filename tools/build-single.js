/* 生成单文件版 slowgarden.html：把 catalog.json 和 state.json 塞进 tools/single-template.html。
 * 改了规则（catalog.json）以后重新跑一次：node tools/build-single.js */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const tpl = fs.readFileSync(path.join(__dirname, 'single-template.html'), 'utf8');
const catalog = fs.readFileSync(path.join(ROOT, 'catalog.json'), 'utf8').trim();
const state = fs.readFileSync(path.join(ROOT, 'state.json'), 'utf8').trim();
const out = tpl.replace('/*CATALOG*/null', catalog).replace('/*STATE*/null', state);
fs.writeFileSync(path.join(ROOT, 'slowgarden.html'), out);
console.log('写好了 slowgarden.html（' + Math.round(out.length / 1024) + ' KB）');
