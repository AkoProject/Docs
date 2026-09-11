---
title: 前端工具
description: Ako 前端运行时、内置 API、弹窗、类型工具和按钮工具。
---

# 前端工具

`@ako-dev/ako` 不只是一个根页面组件。安装 `Ako` 后，你可以直接使用运行时对象、默认 View、字段 TypeProvider、弹窗和一些处理协议数据的工具函数。

本页介绍日常开发最常用的工具。完整的类型、组件 props 和节点约定见 [前端参考](/frontend/reference)；如果要调整后端返回的菜单和模型，阅读 [mixin 使用方法](/frontend/mixins)。

## 文档代码块的语言与框架选择

JVM 文档中的 `ako-rain` / `ako-spring` 代码块使用同一个全局选择项。点击任意一个框架按钮后，其他 JVM 代码块会同步切换；Java/Kotlin 代码块还可以统一切换语言。页面刷新或重新打开文档后仍会保留选择，框架和语言分别保存在浏览器 `localStorage` 的 `ako-code-switch-framework` 与 `ako-code-switch-language` 键中。

不同语言或框架的代码长度不一致时，切换器会在切换完成后重新计算自身的页面位置，并把视口恢复到切换前的相对位置，不会额外创建内部滚动条或把当前阅读内容挤走。

## 运行时 `Ako`

`Ako` 是 Vue 插件，也是前端 API 和元数据的运行时容器：

| 成员 | 用途 |
| --- | --- |
| `install(app, options?)` | 注册依赖注入、Element Plus、默认图标和配置。通常通过 `app.use(new Ako(), options)` 调用。 |
| `api` | 当前 API，包含 `auth`、`menu`、`model`。 |
| `options` | 合并后的 `AkoOptions`。 |
| `models` | 最近一次菜单请求得到的模型元数据。 |
| `findComponent(name)` | 按节点名查找内置组件或 Vue App 中注册的组件。 |
| `findTypeProvider(name)` | 按字段 `type` 查找 TypeProvider。 |
| `createEntityView(model, selectFun?)` | 创建标准模型页面；传入 `selectFun` 时可作为关联选择页。 |
| `createEditView(model, data, save, page)` | 创建标准编辑 View。 |
| `createSaveFun(model)` | 创建带空值处理的标准保存函数。 |

```ts
import { Ako } from '@ako-dev/ako'

const ako = new Ako()
app.use(ako, { baseUrl: '/api/ako/' })

const menus = await ako.api.menu.all()
const student = ako.models.find(model => model.id === 'Student')
const page = student ? ako.createEntityView(student) : undefined
```

必须先安装插件，再使用 `Ako` 的 `options`、`api` 和依赖注入。`createEntityView` 返回 VNode，适合交给路由、弹窗或自定义页面容器。

## 内置 API

默认实现使用 Axios，并把相对路径拼接到 `baseUrl`：

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
| `auth.isAuth()` | `Promise<boolean>` | `true` 进入主界面，`false` 显示登录页。 |
| `auth.login(username, password)` | `Promise<boolean>` | 默认只要请求成功就返回 `true`。 |
| `menu.all()` | `Promise<MenuAble[]>` | 请求菜单并把模型写入 `ako.models`。 |
| `model.page(model, search, sort, page, size)` | `Promise<ModelPage>` | 页码按 1 开始；默认实现会处理 `_like`。 |
| `model.save(model, data)` | `Promise<any>` | 保存一个模型对象。 |
| `model.delete(model, ids)` | `Promise<any>` | 删除一组 ID；UUID 请保持字符串。 |

默认客户端把 2xx 当作成功，非 2xx 抛出异常，遇到 `401` 会刷新页面。需要统一 Token、错误提示或网关适配时，在 [前端配置](/frontend/configuration) 中替换 `AkoApi`。

## 弹窗 `dialog`

`dialog` 把一个弹窗加入全局 `dialogList`，默认 `DialogManager` 会负责渲染：

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

`content` 可以是 VNode 或返回 VNode 的函数；返回对象的 `close()` 会关闭当前弹窗。如果自己替换 `AkoMainView`，需要在布局中挂载 `DialogManager`，或自行消费 `dialogList`。

## 字段类型工具

Ako 默认注册以下字段类型：

| 类型 | 搜索 | 表格 | 编辑 |
| --- | --- | --- | --- |
| `ako:text` | 文本 | 文本 | 文本输入 |
| `ako:enum` | 下拉 | label | 下拉 |
| `ako:mapping` | 关联选择 | 关联名称 | 关联选择 |
| `ako:timestamp` | 日期/时间 | 格式化时间 | 日期/时间 |
| `ako:binary_size` | 大小 | 带单位大小 | 大小输入 |

常用数据工具：

| 工具 | 用途 |
| --- | --- |
| `enumMap(contents)` | 把枚举定义转成值到 label 的映射。 |
| `enumMapOf(contents, key)` | 读取一个枚举值的显示文本。 |
| `findMappingEntity(id, content, mappings)` | 查找关联实体的显示文本。 |
| `findEnumMappingEntity(...)` | 处理级联枚举后再查找关联实体。 |
| `safeStr(value, nullable?)` | 把数字、BigInt 或字符串安全转成字符串。 |
| `safeBigInt(value, nullable?)` | 把整数值安全转成 BigInt。 |
| `unitStr(num, units, radix, places)` | 按进制和单位格式化数字。 |
| `toByteStr(num, places?)` | 使用默认字节单位格式化大小。 |
| `toFlexibleFixed(num, places)` | 去掉多余尾零的数字字符串。 |

`toByteStr` 的默认进制由浏览器加载模块时的 `localStorage.__ako_default_binary` 决定：`true` 使用 1024 和 `KiB` 等单位，否则使用 1000 和 `KB` 等单位。这不是后端配置。

## 按钮工具 `toProButton`

默认搜索面板和表格面板会把协议中的 `ButtonEntry` 转成带 `loading` 和 `execute(single, multi)` 的 `ProButton`。只有在编写自己的工具栏或按钮容器时，才需要直接调用它：

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

按钮 URL 支持单行、批量和环境参数。按钮中的 `eval` 会在浏览器执行，不能代替后端鉴权；复杂操作优先使用后端 URL 或注册一个按钮组件。

## 依赖注入

自定义节点通过以下键读取同一个运行时：

| 注入键 | 值 |
| --- | --- |
| `AkoSymbol` | 当前 `Ako` 实例。 |
| `AkoOptionsSymbol` | 合并后的配置。 |
| `AkoApiSymbol` | 当前 `AkoApi`。 |

不要在自定义组件中再次 `new Ako()`，否则会产生与主界面不同的模型、配置和 API 状态。组合内置 View 的完整示例见 [使用 Ako View 构建页面](/frontend/views)。

## 安全边界

内置工具只负责前端交互：

- `mixin`、`findComponent` 和 `findTypeProvider` 只改变前端展示。
- `eval`、`FunctionValidate` 和 `FetchValidate` 在浏览器中运行。
- `safeBigInt` 只能缓解部分 JavaScript 数值精度问题。
- 自定义 API、按钮和类型组件都不能替代服务端的认证、授权、校验和审计。
