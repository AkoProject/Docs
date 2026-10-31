---
title: 使用 mixin
description: 用 menuRespMixin 在前端局部调整菜单和模型元数据。
---

# 使用 mixin

`mixin` 是一个处理菜单响应的函数。默认 API 在拿到 `menu/list/{channel}` 的响应后先调用它，再把模型交给主界面。它适合做展示上的局部调整，比如改名称、换页面节点、隐藏字段。

`mixin` 不会改变后端的数据、权限、查询范围和保存行为。敏感字段、数据脱敏和授权都必须在后端处理。

## 最小用法

```ts
import { Ako, menuRespMixin } from '@ako-dev/ako'

const mixin = menuRespMixin()
  .model('Student', model => {
    model.name = '成员'
    model.pageNode = 'member-page'
  })
  .menu('reports', menu => {
    menu.name = '经营报表'
  })

app.use(new Ako(), { mixin })
```

回调可以直接修改传入的对象，也可以返回一个新对象；没有返回值时继续使用原对象。

`mixin` 的类型就是 `(resp: MenuResp) => MenuResp`。`menuRespMixin` 只能逐项修改已有的模型和菜单；如果要增删菜单项，可以直接写一个这样的函数。

## `menuRespMixin` API

| 方法 | 参数 | 作用 |
| --- | --- | --- |
| `model(id, callback)` | 模型 ID、回调 | 只修改 `models` 中 `id` 匹配的模型。 |
| `menu(identifier, callback)` | 菜单标识、回调 | 只修改 `menus` 中 `identifier` 匹配的菜单组或菜单项。 |

两个方法都返回 mixin 函数本身，可以继续链式调用。回调分别接收 `DbModel` 和 `RespMenuItem`；对应的模型或菜单不存在时，回调不会被调用。

## 常用场景

### 替换一个模型的 View

```ts
app.component('member-page', MemberPage)

const mixin = menuRespMixin().model('Student', model => {
  model.pageNode = 'member-page'
})
```

组件要先注册到同一个 Vue App。页面组件会收到哪些属性见 [前端参考](/frontend/reference)。

### 局部隐藏字段

```ts
const mixin = menuRespMixin().model('Student', model => {
  model.fields = model.fields.filter(field => field.id !== 'internalNote')
})
```

这只是让当前前端不渲染这个字段。如果字段根本不该出现在浏览器里，要让后端不把它放进模型元数据和实体 JSON。

### 修改后端菜单名称

```ts
const mixin = menuRespMixin()
  .menu('school', menu => {
    menu.name = '组织管理'
  })
  .model('Student', model => {
    model.name = '成员'
  })
```

模型对应的菜单项来自响应中的 `models`，要用 `.model(id)` 修改；`.menu()` 只匹配 `menus` 数组里的 `identifier`。具体标识请以接口实际返回的值为准。

## 与 `menuItems` 的区别

| 能力 | `mixin` | `menuItems` |
| --- | --- | --- |
| 修改后端返回的模型和菜单 | 可以 | 不负责 |
| 添加前端固定页面 | 不负责 | 可以 |
| 影响后端权限和数据 | 不可以 | 不可以 |
| 适合场景 | 局部调整展示 | 报表、仪表盘、设置页 |

`mixin` 不会作用于 `menuItems` 中的菜单。固定页面的配置见 [前端配置](/frontend/configuration)，用 Ako View 构建固定页面见 [使用 Ako View 构建页面](/frontend/views)。

另外，`mixin` 是在默认的 `DefaultAkoMenu` 里调用的。如果替换了 `menu.all()`，需要在自己的实现里调用 `ako.options.mixin`。

## 安全控制放在后端

隐藏字段、删除按钮、改模型名称或节点、在前端判断能否保存和删除，这些都只影响界面，不能用来实现数据保密、接口授权或租户隔离。

正确的做法是：后端在 `page`、`save`、`delete` 和自定义业务接口里按当前用户分别鉴权，mixin 只负责把最终的展示调整成适合当前前端应用的样子。
