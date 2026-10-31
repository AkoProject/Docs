---
title: 前端内置工具
description: Ako 前端运行时、默认视图、类型提供者和常用工具函数的完整参考（旧地址）。
---

# 前端内置工具

> 这是旧地址，内容保留供查阅。日常使用请看 [运行时与工具](/frontend/tools)。

除了一组 HTTP 接口，Ako 前端包还提供运行时对象、默认页面、类型提供者和一些可复用的工具函数。后端（JVM）的工具集中在 [JVM 内置工具](/backend/rain/tools)。

## 前端运行时 `Ako`

`Ako` 既是 Vue 插件，也是前端存放元数据和 API 的运行时对象。

| 成员 | 作用 |
| --- | --- |
| `install(app, options?)` | 注册依赖注入、Element Plus、默认图标和配置。一般通过 `app.use(new Ako(), options)` 调用。 |
| `api` | 当前的 API 实例，包含 `auth`、`menu`、`model`。 |
| `options` | 合并默认值后的 `AkoOptions`。 |
| `models` | 最近一次 `menu.all()` 拿到的模型元数据。 |
| `findComponent(name)` | 按页面节点名查找默认组件，或在 Vue App 中注册的组件。 |
| `findTypeProvider(name)` | 按 `type` 查找字段的类型提供者。 |
| `createEntityView(model, selectFun?)` | 为模型创建标准实体页面的 VNode；传入 `selectFun` 时可用作关联选择页。 |
| `createEditView(model, data, save, page)` | 创建标准编辑面板的 VNode。 |
| `createSaveFun(model)` | 创建标准保存函数：先处理空值，再调用模型保存 API。 |

示例：

```ts
const ako = new Ako()
app.use(ako, { baseUrl: '/api/ako/' })

const menus = await ako.api.menu.all()
const student = ako.models.find(model => model.id === 'Student')
const view = student ? ako.createEntityView(student) : undefined
```

使用 `options`、`api` 和依赖注入之前，必须先安装插件。`createEntityView` 返回的是 VNode，可以交给 Dialog、路由或自定义页面使用。

## 依赖注入键与内置视图

Ako 安装时会提供三个注入键，编写自定义页面节点时可以直接使用：

| 注入键 | 注入值 |
| --- | --- |
| `AkoSymbol` | 当前的 `Ako` 实例。 |
| `AkoOptionsSymbol` | 合并后的 `AkoOptions`。 |
| `AkoApiSymbol` | 当前的 `AkoApi`。 |

默认视图组件：

| 组件 | 作用 |
| --- | --- |
| `AkoApp` | 提供 Ako 实例和插槽容器，适合嵌入已有布局。 |
| `AkoBootView` | 检查认证状态，在登录页和主界面之间切换。 |
| `AkoAuthView` | 默认的账号密码登录页。 |
| `AkoMainView` | 侧边栏、标签页、菜单和页面容器。 |
| `EntityView` | 单个模型的搜索、表格、分页和编辑组合页。 |
| `DialogManager` | 读取 `dialogList` 并渲染弹窗。 |

自定义视图应通过 `inject(AkoSymbol)`、`inject(AkoApiSymbol)` 拿到运行时，不要再创建第二个 `Ako` 实例。组件 props 详见 [自定义页面与类型](/frontend/customization)。

## 内置 API

默认的 `DefaultAkoApi` 基于 Axios，会把相对路径拼接到 `baseUrl` 后面：

```ts
await ako.api.auth.isAuth()
await ako.api.auth.login(username, password)
await ako.api.menu.all()
await ako.api.model.page('Student', { name_like: 'Alice' }, { id: 'desc' }, 1, 20)
await ako.api.model.save('Student', { name: 'Alice' })
await ako.api.model.delete('Student', [12])
```

各 API 的返回值：

| API | 返回值 | 说明 |
| --- | --- | --- |
| `auth.isAuth()` | `Promise<boolean>` | `true` 进入主界面，`false` 显示登录页。 |
| `auth.login(username, password)` | `Promise<boolean>` | 默认只要请求成功就返回 `true`。 |
| `menu.all()` | `Promise<MenuAble[]>` | 同时把经过 `mixin` 处理后的 `models` 写入 `ako.models`。 |
| `model.page(model, search, sort, page, size)` | `Promise<ModelPage>` | 页码从 1 开始。默认实现会把 `_like` 的值包成 `%...%`，空值直接去掉。 |
| `model.save(model, data)` | `Promise<any>` | 保存一个模型对象。 |
| `model.delete(model, ids)` | `Promise<any>` | 删除一组 ID；接入 UUID 时保持字符串。 |

默认客户端把所有 2xx 视为成功，非 2xx 抛出异常，遇到 `401` 会刷新页面。如果需要 Token、特殊的错误格式或非 HTTP 网关，替换 `AkoApi` 即可，不必逐个修改默认组件。

## 前端类型与底层导出

前端包导出了协议对象的 TypeScript 类型，编写自定义 API、页面和类型组件时可以直接用：

| 类型 | 用途 |
| --- | --- |
| `AkoOptions` | 插件配置。 |
| `AkoApi` / `AuthApi` / `MenuApi` / `ModelApi` | 替换 API 和约束类型。 |
| `MenuResp` / `RespMenuItem` | 菜单接口响应。 |
| `ModelPage` | 分页接口响应。 |
| `DbModel` / `DbField` | 模型和字段元数据。 |
| `MenuAble` / `MenuItem` / `MenuGroup` | 前端菜单树。 |
| `TypeProvider` | 自定义字段类型。 |
| `ButtonEntry` / `ButtonDialogInfo` / `ButtonPanelInfo` | 按钮及其嵌套配置。 |

另外还导出了 `DefaultAkoApi`、`DefaultAkoMenu`、`DefaultModelApi` 和 `DefaultAuthApi`，方便复用默认实现。`defaultOptions` 是默认配置；`margeOptions`（源码原有拼写）负责合并配置，一般不需要直接调用。

`setModels`/`getModels` 和 `dialogList` 是底层的模块状态。标准用法是通过 `Ako.models` 和 `dialog()` 管理状态，只有编写自定义容器或调试工具时才需要直接操作它们。

## 默认页面节点

后端没有指定页面节点时，前端使用以下映射：

| 节点名 | 默认组件 | 用途 |
| --- | --- | --- |
| `default-entity-page-node` | `EntityView` | 搜索、表格、分页和编辑的组合页面。 |
| `default-entity-icon-node` | Element Plus 的 `Menu` 图标 | 模型菜单项的默认图标。 |
| `default-entity-search-node` | `AkoEntitySearchPanel` | 搜索字段和页面级按钮。 |
| `default-entity-table-node` | `AkoEntityTablePanel` | 数据表格、多选和行级按钮。 |
| `default-entity-edit-node` | `AkoEntityEditPanel` | 标准编辑表单。 |
| `default-entity-search-property-node` | `AkoEntitySearchProperty` | 单个搜索字段的外层。 |
| `default-entity-search-input-node` | `AkoEntitySearchColumnPanel` | 单个搜索输入。 |
| `default-entity-table-column-node` | `AkoEntityTableColumnPanel` | 按字段类型分发单元格组件。 |
| `default-entity-edit-property-node` | `AkoEntityEditPropertyPanel` | 编辑字段的外层、说明和校验。 |
| `default-entity-edit-input-node` | `AkoEntityEditColumnPanel` | 按字段类型分发编辑输入组件。 |
| `default-entity-table-hide-column-node` | `AkoEntityTableHideColumn` | 隐藏内容的提示。 |

可以用 `app.component(name, component)` 注册同名组件做全局替换，也可以通过模型的 `*Node` 元数据逐个模型替换。详见 [自定义页面与类型](/frontend/customization)。

## 内置字段类型

| 类型 | 默认能力 | `options` 来源 |
| --- | --- | --- |
| `ako:text` | 文本搜索、文本显示、文本编辑。 | 通常为 `null`。 |
| `ako:enum` | 下拉搜索、显示 label、下拉编辑。 | `EnumOptions`。 |
| `ako:mapping` | 按关联模型搜索、显示关联名称、选择关联实体。 | `MappingOptions` 加上分页响应的 `information`。 |
| `ako:timestamp` | 日期时间搜索和格式化显示。 | dayjs 格式字符串。 |
| `ako:binary_size` | 带单位的大小搜索和显示。 | 主要由组件自身行为决定。 |

后端只需输出 `type` 和 `options`，类型组件会通过 `ako.findTypeProvider(type)` 自动分发。详见 [字段类型与选项](/protocol/types)。

## 弹窗工具 `dialog`

`dialog` 把一个弹窗放进全局的 `dialogList`，默认主界面里的 `DialogManager` 负责渲染：

```ts
import { createVNode } from 'vue'
import { dialog } from '@ako-dev/ako'
import UserPicker from './UserPicker.vue'

const d = dialog({
  title: '选择用户',
  showClose: true,
  style: { width: '1200px' },
  content: () => createVNode(UserPicker, {
    onSelect(user) {
      console.log(user)
      d.close()
    },
  }),
})
```

可用选项有 `content`、`title`、`style` 和 `showClose`；调用返回对象的 `close()` 可关闭弹窗。如果完全替换了 `AkoMainView`，需要在自己的布局里挂载 `DialogManager`，或者自己读取 `dialogList` 渲染。

## 菜单响应修改器 `menuRespMixin`

`menuRespMixin` 适合在展示层做局部修改：

```ts
import { menuRespMixin } from '@ako-dev/ako'

const mixin = menuRespMixin()
  .model('Student', model => {
    model.name = '成员'
  })
  .menu('reports', menu => {
    menu.name = '报表'
  })

app.use(new Ako(), { mixin })
```

它只修改前端收到的菜单和模型对象，不影响后端的权限、数据范围和保存行为。

## 枚举、关联和数字工具

| 工具 | 作用 |
| --- | --- |
| `enumMap(contents)` | 把 `['草稿', '已发布']` 或 `['draft:草稿']` 转成“值 → label”的映射。 |
| `enumMapOf(contents, key)` | 读取某个枚举值的显示文本；布尔值会先转成 `0/1`。 |
| `findMappingEntity(id, content, mappings)` | 按 `模型\|匹配字段\|显示字段` 查找关联实体的显示文本。 |
| `findEnumMappingEntity(...)` | 先处理级联枚举，再查找关联实体。 |
| `toFlexibleFixed(num, places)` | 返回去掉多余尾零的数字字符串。 |
| `toFlexibleFixedNumber(num, places)` | 返回去掉多余尾零的 number。 |
| `safeStr(value, nullable?)` | 把 number、bigint 或 string 安全地转成字符串。 |
| `safeBigInt(value, nullable?)` | 把整数值安全地转成 BigInt。 |
| `unitStr(num, units, radix, places)` | 按进制和单位格式化整数。 |
| `toByteStr(num, places?)` | 用默认字节单位格式化大小。 |

字节工具的默认进制，在浏览器加载模块时由 `localStorage.__ako_default_binary` 决定：值为 `true` 时使用 1024 和 `KiB` 等单位，否则使用 1000 和 `KB` 等单位。这是浏览器端的设置，与服务端无关。

## 高级按钮工具

默认的搜索面板和表格面板内部用 `toProButton` 把协议中的 `ButtonEntry` 转成带 `loading` 和 `execute(single, multi)` 的按钮对象。一般业务只需按 [按钮协议](/protocol/buttons) 输出按钮；只有编写自定义工具栏或按钮容器时，才需要直接调用 `toProButton`。

## 安全

内置工具不会替你做后端授权。尤其要注意：

- `eval`、`FunctionValidate` 和 `FetchValidate` 都在浏览器中运行。
- `mixin`、`findComponent` 和 `findTypeProvider` 只影响前端显示。
- `safeBigInt` 只能避免一部分 JavaScript 数值精度问题，后端仍要按真实的主键类型解析。
- 自定义 API、按钮和类型组件都不能绕过服务端的权限和业务校验。
