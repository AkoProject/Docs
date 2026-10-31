---
title: 运行时与工具
description: Ako 前端的运行时对象、内置 API、弹窗、字段类型工具和按钮工具。
---

# 运行时与工具

`@ako-dev/ako` 除了根页面组件，还提供运行时对象、默认 View、字段 TypeProvider、弹窗，以及一些处理接口数据的工具函数。

这里介绍日常开发最常用的部分。完整的类型、组件 props 和节点名见 [前端参考](/frontend/reference)；想调整后端返回的菜单和模型，见 [使用 mixin](/frontend/mixins)。

## 运行时 `Ako`

`Ako` 既是 Vue 插件，也是保存 API、配置和模型元数据的运行时对象：

| 成员 | 用途 |
| --- | --- |
| `install(app, options?)` | 设置 `app`，在需要时设置配置，提供依赖注入，并安装 Element Plus。通常通过 `app.use(new Ako(), options)` 调用。 |
| `app` | 关联的 Vue App。不调用 `install` 时要先手动赋值。 |
| `options` | 合并默认值后的 `AkoOptions`。赋值时会重新合并默认值、创建 API、注册图标和自定义字段类型，要求已经设置 `app`。 |
| `api` | 当前 API，包含 `auth`、`menu`、`model`。 |
| `models` | 最近一次请求菜单得到的模型元数据。 |
| `findComponent(name)` | 按节点名查找内置组件，找不到时查找 Vue App 中注册的组件。 |
| `findTypeProvider(name)` | 按字段的 `type` 查找 TypeProvider。 |
| `createEntityView(model, selectFun?)` | 创建标准模型页面；传入 `selectFun` 时作为关联选择页使用。 |
| `createEditView(model, data, save, page)` | 创建标准编辑 View。 |
| `createSaveFun(model)` | 创建标准保存函数，保存前会处理空值。 |

```ts
import { Ako } from '@ako-dev/ako'

const ako = new Ako()
app.use(ako, { baseUrl: '/api/ako/' })

const menus = await ako.api.menu.all()
const student = ako.models.find(model => model.id === 'Student')
const page = student ? ako.createEntityView(student) : undefined
```

`options`、`api` 和依赖注入都要在安装插件（或按 [安装与挂载](/frontend/quick-start) 中的方式手动设置 `app` 和 `options`）之后才能用。`createEntityView` 返回 VNode，可以交给路由、弹窗或自定义的页面容器。

`createSaveFun` 生成的函数在保存前会检查每个字段：必填且允许空值（`allowEmpty`）的字段，值为 `undefined` 时改成空字符串；非必填字段的值为空字符串时改成 `null`。

## 内置 API

默认实现使用 Axios，把相对路径拼接到 `baseUrl` 后面：

```ts
await ako.api.auth.isAuth()
await ako.api.auth.login(username, password)
await ako.api.menu.all()
await ako.api.model.page('Student', { name_like: 'Alice' }, { id: 'desc' }, 1, 20)
await ako.api.model.save('Student', { name: 'Alice' })
await ako.api.model.delete('Student', [12])
```

| API | 返回值 | 说明 |
| --- | --- | --- |
| `auth.isAuth()` | `Promise<boolean>` | 返回 `true` 进入主界面，`false` 显示登录页。 |
| `auth.login(username, password)` | `Promise<boolean>` | 默认只要请求成功就返回 `true`。 |
| `menu.all()` | `Promise<MenuAble[]>` | 请求菜单，应用 `mixin`，把模型写入 `ako.models`，返回菜单树。 |
| `model.page(model, search, sort, page, size)` | `Promise<ModelPage>` | 页码从 1 开始；以 `_like` 结尾的条件会包上 `%`，空字符串会被去掉。 |
| `model.save(model, data)` | `Promise<any>` | 保存一个模型对象。 |
| `model.delete(model, ids)` | `Promise<any>` | 删除一组 ID；UUID 请保持字符串。 |

默认客户端把 2xx 视为成功，其他状态码抛出异常，遇到 `401` 会刷新页面。需要统一 Token、错误提示或适配网关时，参考 [前端配置](/frontend/configuration) 替换 `AkoApi`。

## 弹窗 `dialog`

`dialog` 把一个弹窗加入全局的 `dialogList`，由默认的 `DialogManager` 负责渲染：

```ts
import { createVNode } from 'vue'
import { dialog } from '@ako-dev/ako'
import UserPicker from './UserPicker.vue'

const current = dialog({
  title: '选择用户',
  showClose: true,
  style: { width: '1200px' },
  content: () => createVNode(UserPicker, {
    onSelect(user) {
      console.log(user)
      current.close()
    },
  }),
})
```

`content` 可以是 VNode，也可以是返回 VNode 的函数。返回对象的 `close()` 用来关闭弹窗；弹窗内的组件也可以触发 `close` 事件关闭自己，或触发 `title` 事件修改标题。如果你替换了 `AkoMainView`，要在自己的布局里挂载 `DialogManager`，或者自行渲染 `dialogList`。

## 字段类型工具

Ako 默认注册以下字段类型：

| 类型 | 搜索 | 表格 | 编辑 |
| --- | --- | --- | --- |
| `ako:text` | 文本输入 | 文本 | 文本输入 |
| `ako:enum` | 下拉选择 | 显示 label | 下拉选择 |
| `ako:mapping` | 弹窗选择关联实体 | 关联实体的显示字段 | 弹窗选择关联实体 |
| `ako:timestamp` | 日期时间选择 | 按格式显示时间 | 日期时间选择 |
| `ako:binary_size` | 数值加单位 | 带单位的大小 | 数值加单位 |

内置类型中只有 `ako:binary_size` 有单独的编辑组件，其他类型的编辑都复用搜索组件。

`ako:timestamp` 的 `options` 是 dayjs 格式字符串，表格按它格式化显示。日期和时间选择器使用 `value-format="x"`，选出的值是毫秒时间戳（0.0.1-DEV11 起）。

`ako:binary_size` 的值是字节数（0.0.1-DEV12 引入，DEV15 起以 BigInt 为核心）。前端用 BigInt 计算，提交的是整数字符串，超过 JavaScript 安全整数范围也不会丢失精度。搜索和编辑框右侧有单位下拉，提交前会按所选单位换算成字节。编辑已有数据时，会自动选一个能整除该值的较大单位来显示；切换单位时，输入框里的数值会同步换算（最小为 1）。表格显示格式化后的大小，鼠标悬停可以看到原始字节数。

常用数据工具：

| 工具 | 用途 |
| --- | --- |
| `enumMap(contents)` | 把枚举定义转成“值 → label”的映射。 |
| `enumMapOf(contents, key)` | 读取一个枚举值的显示文本。 |
| `findMappingEntity(id, content, mappings)` | 查找关联实体的显示文本。 |
| `findEnumMappingEntity(...)` | 先按级联枚举取出关联配置，再查找关联实体。 |
| `safeStr(value, nullable?)` | 把数字、BigInt 或字符串安全地转成字符串。 |
| `safeBigInt(value, nullable?)` | 把整数值安全地转成 BigInt。 |
| `unitStr(num, units, radix?, places?)` | 按进制和单位格式化整数，内部用 BigInt 计算；`units` 也可以写成 `{ radix, unit }` 对象。 |
| `toByteStr(num, places?)` | 用默认的字节单位格式化大小，`places` 默认为 2。 |
| `binary`、`units` | 当前使用的进制（`1024n` 或 `1000n`）和对应的字节单位列表。 |
| `toFlexibleFixed(num, places)` | 保留指定小数位，并去掉多余的尾零。 |

字节单位的进制由模块加载时 `localStorage.__ako_default_binary` 的值决定：值为 `true` 时使用 1024 和 `KiB` 等单位，否则使用 1000 和 `KB` 等单位。这是浏览器端的设置，与后端无关。

## 按钮工具 `toProButton`

默认的搜索面板和表格面板会把接口中的 `ButtonEntry` 转成 `ProButton`，它多了 `loading` 状态和 `execute(single, multi)` 方法。只有自己写工具栏或按钮容器时，才需要直接调用它：

```ts
import { toProButton } from '@ako-dev/ako'

const button = toProButton(
  buttonEntry,
  ako,
  model,
  () => reload(),
  (data, options) => openEdit(data, options),
)

await button.execute(selectedRow, selectedRows)
```

按钮 URL 可以引用单行、多行和环境参数。带 `panel` 的按钮会以按钮名作为标题打开编辑面板。配置了 `panel.url` 时，提交的请求体是面板中编辑的数据，URL 里的单行参数则从点击时选中的那一行取值（0.0.1-DEV14 起）；没有 `panel.url` 时按 `panel.id` 走标准保存接口。

按钮中的 `eval` 在浏览器里执行，不能代替后端鉴权。复杂操作优先用后端 URL，或注册一个按钮组件。

## 依赖注入

自定义节点通过下面几个注入键拿到同一个运行时：

| 注入键 | 值 |
| --- | --- |
| `AkoSymbol` | 当前 `Ako` 实例。 |
| `AkoOptionsSymbol` | 合并后的配置。 |
| `AkoApiSymbol` | 当前 `AkoApi`。 |

不要在自定义组件里再 `new Ako()`，否则模型、配置和 API 状态会和主界面不一致。组合内置 View 的完整示例见 [使用 Ako View 构建页面](/frontend/views)。

## 安全提醒

这些工具都只作用于前端：

- `mixin`、`findComponent` 和 `findTypeProvider` 只改变前端展示。
- `eval`、`FunctionValidate` 和 `FetchValidate` 在浏览器中运行。
- `safeBigInt` 只能缓解一部分 JavaScript 数值精度问题。
- 自定义 API、按钮和字段类型组件都不能替代服务端的认证、授权、校验和审计。

## 文档中的代码切换

本站 JVM 文档里 `ako-rain` / `ako-spring` 的代码块共用一个框架选项，Java/Kotlin 代码块共用一个语言选项：在任意一处切换，其他代码块会同步切换。选择保存在浏览器 `localStorage` 的 `ako-code-switch-framework` 与 `ako-code-switch-language` 键中，刷新后仍然有效。切换后代码长度变化时，页面会保持你正在阅读的位置。
