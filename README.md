# Garden & Kitchen Kit

> 开源模板文件：农场 × 商店 × 厨房的可修改基础框架。
>
> 本目录只包含示例数据，不含任何真实存档、私人信息、服务器地址或密钥。

## 文件

- `catalog.json`：规则与内容。作物、种子价格、商店调料、饮料、厨具、菜谱都在这里。
- `state.json`：示例存档。可以直接改，也可以删掉后重新写一份。
- `engine.js`：本地 Node.js 引擎，负责买东西、种植、收获、出售、做饭和推进时间。
- `render.js`：读取两个 JSON 文件，生成静态 `index.html` 预览。
- `index.html`：最近一次生成的预览页面。

## 本地运行

需要 Node.js 18 或更高版本。进入本目录后运行：

```bash
node engine.js
node render.js
```

然后用浏览器打开 `index.html`。修改 `catalog.json` 或 `state.json` 后，再运行 `node render.js` 刷新页面。

## 修改内容

### 添加作物

在 `catalog.json` 的 `crops` 下复制一项，修改：

- `name`：显示名称
- `season`：必须是 `meta.seasons` 里的值
- `grow_days`：成长天数
- `value`：收获后的出售价格
- `seed_price`：种子价格
- `flower`：可选，仅用于标记花类作物

只要有 `seed_price`，引擎就会自动把它识别为种子商品，不需要再维护第二张商店表。

### 添加调料、饮料和厨具

分别在 `supplies`、`drinks`、`utensils` 下添加。调料购买后按 `portions` 入柜；饮料购买后按 `amount` 入柜；厨具只购买一次，不会被消耗。

### 添加菜谱

在 `recipes` 下添加：

```json
{
  "name": "示例料理",
  "crops": { "tomato": 1 },
  "supplies": { "salt": 1 },
  "utensils": ["plate"]
}
```

三个材料字段都可以为空：`{}` 或 `[]`。引用的 id 必须存在于对应目录，否则 `engine.validate()` 会报错。

## 给 AI 的使用约定

让 AI 修改前先读取 `catalog.json` 和 `state.json`，修改后运行：

```bash
node -e "const e=require('./engine'); console.log(e.validate())"
node render.js
```

AI 不应凭空增加不存在的 id；不应直接覆盖未知存档；不应把密钥、服务器地址或私人数据写进这个模板。

## 服务器 / MCP 版

本仓库的本地版不需要 MCP、HTTP 服务、反向代理或门禁密钥。若要做服务器版，可以复用这套 JSON 与引擎，再自行添加 MCP/HTTP 适配层；服务器凭证应通过环境变量提供，不要写进仓库。
