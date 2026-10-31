// 用本机 Chrome（无头模式 + CDP）给演示后台截图，不需要安装任何依赖。
// 用法：node showcase/capture.mjs [前端地址] [输出目录]
// 视口固定 1600×900（16:9），按 2 倍像素密度输出 PNG。
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const APP = process.argv[2] ?? 'http://localhost:7777/'
const OUT = process.argv[3] ?? new URL('../public/showcase/', import.meta.url).pathname
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORT = 9333
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

mkdirSync(OUT, { recursive: true })
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, '--hide-scrollbars', '--no-first-run',
  `--user-data-dir=${mkdtempSync(join(tmpdir(), 'ako-capture-'))}`, 'about:blank',
], { stdio: 'ignore' })

async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const pages = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
      const page = pages.find((p) => p.type === 'page')
      if (page) return new WebSocket(page.webSocketDebuggerUrl)
    } catch {}
    await sleep(200)
  }
  throw new Error('无法连接 Chrome')
}

const ws = await connect()
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let seq = 0
const pending = new Map()
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data)
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id)
    pending.delete(msg.id)
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result)
  }
})
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++seq
  pending.set(id, { resolve, reject })
  ws.send(JSON.stringify({ id, method, params }))
})

// 注入页面的小工具：按文字查找元素、点击、输入
const HELPERS = `
window.__s = (ms) => new Promise(r => setTimeout(r, ms));
window.__find = (sel, text, root = document) => [...root.querySelectorAll(sel)].filter(e => e.offsetParent !== null && e.innerText.trim() === text).pop();
window.__click = async (sel, text, root) => { const el = __find(sel, text, root); if (!el) throw new Error('找不到 ' + sel + ' ' + text); el.click(); await __s(500); };
window.__open = async (group, item) => { await __click('.el-sub-menu__title', group); await __click('.el-menu-item', item); await __s(900); };
window.__item = (root, label) => { const l = [...root.querySelectorAll('.el-form-item__label')].find(e => e.offsetParent !== null && e.innerText.trim() === label); if (!l) throw new Error('找不到字段 ' + label); return l.closest('.el-form-item'); };
window.__input = async (root, label, value) => { const el = __item(root, label).querySelector('input'); el.focus(); el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); await __s(200); };
window.__select = async (root, label, option) => { __item(root, label).querySelector('.el-select__wrapper').click(); await __s(400); __find('.el-select-dropdown__item', option).click(); await __s(400); };
window.__dialog = () => [...document.querySelectorAll('.el-dialog')].filter(e => e.offsetParent !== null).pop();
`

async function run(js) {
  const r = await send('Runtime.evaluate', { expression: `(async () => { ${js} })()`, awaitPromise: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
}

const scenes = {
  // 订单列表：关联字段显示名称、枚举、时间格式、页面级与行级按钮
  'orders': `await __open('交易中心', '订单');`,
  // 存储空间：二进制容量自动换算单位、仅日期字段
  'storage': `await __open('运维中心', '存储空间');`,
  // 组合搜索：金额 ≥ 1000 且状态为“待发货”
  'search': `await __open('交易中心', '订单');
    const root = document.querySelector('.el-main');
    await __input(root, '金额（元）', '1000');
    await __select(root, '状态', '待发货');
    await __click('button', '查询'); await __s(800);`,
  // 新增商品：直接保存，触发后端声明的校验规则
  'validate': `await __open('商品中心', '商品');
    await __click('button', '新增');
    const d = __dialog();
    await __input(d, '库存', '12');
    await __click('button', '保存', d); await __s(400);`,
  // 关联选择：在订单表单里选客户，弹出客户模型自己的搜索和表格
  'mapping': `await __open('交易中心', '订单');
    await __click('button', '新增');
    const d = __dialog();
    __item(d, '客户').querySelector('.el-input-group__append button').click();
    await __s(1200);
    const picker = __dialog();
    await __input(picker, '客户名称', '张');
    await __click('button', '查询', picker); await __s(800);`,
  // 自定义按钮面板：选中一行订单，点“发货”，面板字段来自 @PanelField
  'panel': `await __open('交易中心', '订单');
    document.querySelectorAll('.el-table__body tr')[1].querySelector('td:nth-child(3)').click(); await __s(300);
    await __click('button', '发货');
    const d = __dialog();
    await __select(d, '物流公司', '顺丰');
    await __input(d, '运单号', 'SF1428570236');`,
  // 行级按钮的二次确认
  'confirm': `await __open('交易中心', '订单');
    [...document.querySelectorAll('.el-table__body tr')[1].querySelectorAll('button')].find(b => b.innerText.trim() === '退款').click(); await __s(600);`,
}

const only = process.env.SCENES?.split(',')
await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 2, mobile: false })
for (const [name, js] of Object.entries(scenes)) {
  if (only && !only.includes(name)) continue
  await send('Page.navigate', { url: APP })
  await sleep(1800)
  await run(HELPERS)
  try {
    await run(js)
  } catch (e) {
    console.error(`✗ ${name}: ${e.message}`)
    continue
  }
  await sleep(500)
  const { data } = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(join(OUT, `${name}.png`), Buffer.from(data, 'base64'))
  console.log(`✓ ${name}.png`)
}
ws.close()
chrome.kill()
