---
title: mixin 使用方法
description: 使用 menuRespMixin 在前端局部调整菜单和模型元数据。
---

# mixin 使用方法

`mixin` 是 Ako 菜单响应的前端修改器。它运行在 `menu/list/{channel}` 返回之后、模型交给主界面之前，适合做展示层的局部调整：改名称、改节点、隐藏字段或补充前端菜单。

它不会改变后端数据、权限、查询范围和保存行为。敏感字段、数据脱敏和授权必须在后端处理。

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

回调可以直接修改传入对象，也可以返回一个新的对象；不返回值时会继续使用原对象。

## `menuRespMixin` API

| 方法 | 参数 | 作用 |
| --- | --- | --- |
| `model(id, callback)` | 模型 ID、模型回调 | 只修改指定模型。 |
| `menu(identifier, callback)` | 菜单标识、菜单回调 | 只修改指定菜单组或自定义菜单项。 |
| 返回值 | — | 仍然是可继续链式调用的 mixin 函数。 |

`callback` 的类型分别接收 `DbModel` 和 `RespMenuItem`。模型和菜单不存在时不会调用对应回调。

## 常用场景

### 替换一个模型的 View

```ts
app.component('member-page', MemberPage)

const mixin = menuRespMixin().model('Student', model => {
  model.pageNode = 'member-page'
})
```

组件名必须先注册到同一个 Vue App。节点可选值和页面组件契约见 [前端参考](/frontend/reference)。

### 局部隐藏字段

```ts
const mixin = menuRespMixin().model('Student', model => {
  model.fields = model.fields.filter(field => field.id !== 'internalNote')
})
```

这只会让当前前端不渲染该字段；如果字段不应该暴露给浏览器，必须让后端不要把它放进模型元数据和实体 JSON。

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

模型菜单通常使用模型自身的 `id` 作为标识；菜单组使用 `identifier`。请以接口实际返回值为准。

## 与 `menuItems` 的区别

| 能力 | `mixin` | `menuItems` |
| --- | --- | --- |
| 修改后端返回的模型/菜单 | 可以 | 不负责 |
| 添加前端固定页面 | 不负责 | 可以 |
| 影响后端权限和数据 | 不可以 | 不可以 |
| 适合场景 | 展示层局部覆盖 | 报表、仪表盘、设置页 |

固定页面配置见 [前端配置](/frontend/configuration)，用 Ako View 构建固定页面见 [使用 Ako View 构建页面](/frontend/views)。

## 不要用 mixin 做安全控制

以下做法都不能替代服务端安全控制：

- 用 `mixin` 隐藏一个字段来实现数据保密。
- 用 `mixin` 删除按钮来实现接口授权。
- 用 `mixin` 修改模型名称或节点来隔离租户。
- 用前端判断决定是否允许保存、删除或批量操作。

正确做法是后端按当前用户在 `page`、`save`、`delete` 和自定义业务接口中分别鉴权；mixin 只负责把最终展示调整成适合当前前端应用的样子。
