---
title: 按钮与操作
description: Ako 页面级按钮、行级按钮、编辑面板和自定义操作的 JSON 结构。
---

# 按钮与操作

模型元数据中的 `modelButtons` 显示在搜索区域，`operateButtons` 显示在表格每一行的操作列。两者都是 `ButtonEntry` 数组，区别在于能拿到的选中数据不同：页面级按钮可以用表格当前高亮的行和勾选的多行，行级按钮只能用所在的那一行。

## 默认按钮

后端没有自定义按钮列表时，后端（JVM）和后端（JavaScript）都会生成以下按钮：

| 位置 | 按钮 | 行为 |
| --- | --- | --- |
| 页面级 | 查询 | 按搜索条件重新查询。 |
| 页面级 | 新增 | 打开空白的编辑表单。 |
| 页面级 | 批量删除 | 二次确认后，取勾选行的 `id` 调用 `model/delete/{model}`。 |
| 行级 | 编辑 | 用这一行的数据打开编辑表单。 |
| 行级 | 删除 | 二次确认后，取这一行的 `id` 调用删除接口。 |

在后端（JVM）中，单独写的 `@ModelButton`、`@OperateButton` 会追加在默认按钮之后；使用 `@ModelButtons` 或 `@OperateButtons` 则会整体替换默认列表，想保留的查询、新增、删除按钮需要自己补上。后端（JavaScript）中，传入 `modelButtons` 或 `operateButtons` 也会替换默认列表。

## ButtonEntry

```json
{
  "name": "导出",
  "index": 10,
  "url": "/api/report/student",
  "method": "GET",
  "eval": null,
  "reconfirm": null,
  "type": "primary",
  "component": null,
  "edit": null,
  "dialog": null,
  "panel": null
}
```

| 属性 | 作用 |
| --- | --- |
| `name` | 按钮文字。 |
| `index` | 排序值。 |
| `url` + `method` | 点击后发送请求。后端（JVM）中 `method` 默认为 `GET`。 |
| `eval` | 在浏览器中执行一段异步函数体。 |
| `reconfirm` | 点击后先弹出二次确认，内容为该字符串。 |
| `type` | Element Plus 按钮的 `type`，如 `primary`、`danger`、`default`。 |
| `component` | 用一个已注册的 Vue 组件代替默认按钮。 |
| `edit` | 打开当前模型的编辑表单。 |
| `dialog` | 打开以自定义组件为内容的 Dialog。 |
| `panel` | 根据一组字段声明生成表单，提交到指定地址。 |

一个按钮只会执行一种动作。设置了 `component` 时直接渲染该组件；否则，如果同时设置了多个动作属性，前端按 `panel`、`eval`、`dialog`、`edit`、`url` 的顺序取第一个。

## URL 参数

按钮的 `url` 可以包含以下占位符：

| 占位符 | 数据来源 |
| --- | --- |
| `${id}` | 选中行的 `id`。需要选中一行。 |
| `${ids}` | 勾选行的 `id` 数组。至少要勾选一行。 |
| `${single}` | 选中行的整个对象。需要选中一行。 |
| `${multi}` | 勾选行的对象数组。至少要勾选一行。 |
| `${multi.field}` | 勾选行中某个字段的值组成的数组。至少要勾选一行。 |
| `${field}` | 选中行某个字段的值。需要选中一行。 |
| `${__BASE_URL}` | Ako 配置的 `baseUrl`。 |

不满足选中条件时，前端会提示用户选择记录，不发送请求。占位符替换到路径中时，数组用逗号连接，对象转成 JSON 字符串。按钮请求不会自动加上 `baseUrl`，需要请求 Ako 接口时请使用 `${__BASE_URL}`。

URL 中 `#` 之后的部分会作为请求体发送，例如：

```text
/api/student/${id}/point
/api/student/batch#${multi}
```

按设计，`#` 后的占位符会被序列化为请求体。但默认前端目前不会替换 `#` 之后的占位符，而是把 `#` 后的原文作为请求体发出去，所以需要传数据时，建议先用路径参数、`eval` 或 `panel` 代替。

请求返回后，前端读取响应体的 `code`：没有 `code` 或 `code` 为 `0` 时提示成功，其他值提示失败。`method: "popup"` 会在新窗口打开 URL，只适用于 GET。后端收到请求后要重新校验路径参数，按钮 URL 不能当作权限控制。

## eval

`eval` 是一段函数体，前端把它包装成 `async (single, multi, props) => { ... }` 执行。页面级按钮可以用 `multi`；行级按钮通常用 `single`，此时 `multi` 为 `null`：

```kotlin
@ModelButton(
    name = "刷新统计",
    eval = "await props.api.model.page(props.model.id, {}, {}, 1, 20)",
    type = "primary"
)
```

`props` 提供 `model`、`search()`、`edit()`、`api` 和 `dialog()`。上面的 Kotlin 注解是后端（JVM）共用的 Ako 注解，`ako-rain` 和 `ako-spring` 都会把它转换成同样的 `ButtonEntry` JSON；其他后端直接输出 JSON 即可。

`eval` 在浏览器中执行，所以：

- 里面不能出现服务端密钥、内部 URL 或未脱敏的数据。
- 它不能代替后端的权限和业务校验。
- 重要的业务操作优先走后端 URL，由后端返回统一结果。

## 编辑、Dialog 与 Panel

`edit` 打开当前模型的编辑表单，保存时调用这个模型的 `model/save/{model}`。`edit.data` 是一段 JavaScript 表达式，用来从选中行生成表单初始值，例如默认“新增”按钮使用 `({})`；不填时直接使用选中行的数据。`edit.width` 设置弹窗宽度，默认为 `640px`。

`dialog` 适合完全自定义的交互。`dialog.component` 是已注册的组件名，组件会收到 `single`、`multi`、`model`、`search` 和 `edit`。`title`、`style` 控制弹窗外观，`close` 控制是否显示关闭按钮，`needSingle`、`needMulti` 要求先选中记录。

`panel` 适合用几个字段快速搭一个表单。`panel.fields` 与普通字段使用相同的 `id`、`name`、`type`、`options`、`edit` 结构，可以直接复用枚举、关联等类型提供者和校验规则。`panel.data` 的用法与 `edit.data` 相同。提交时：

- 填了 `panel.url`，就把表单数据用 `panel.method`（默认 `post`）发送到该地址，并按上面的 `code` 规则提示结果。
- 没填 `url` 时，按 `panel.id` 调用 `model/save/{panel.id}`。

不过默认前端在初始化按钮时就会解析 `panel.url`，`url` 为空会直接报错，所以目前需要提供 `url`。提交完成后，前端会重新执行一次查询。

## 自定义按钮组件

交互比较复杂时，可以让后端输出 `component`，前端注册同名组件。页面级按钮组件会收到 `model`、`searchData`、`single` 和 `multi`；行级按钮组件会收到 `model`、`page` 和 `row`。两种组件都可以触发 `search` 和 `edit` 事件来刷新列表或打开编辑表单。这样页面仍然由元数据驱动，复杂的交互则放在前端组件里实现。
