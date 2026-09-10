---
title: 按钮与操作
description: Ako 模型级按钮、行级按钮、编辑面板和自定义操作协议。
---

# 按钮与操作

模型元数据中的 `modelButtons` 显示在搜索区域，`operateButtons` 显示在表格行内。两者都使用 `ButtonEntry`，区别在于可获得的选中数据不同。

## 默认按钮

当后端没有覆盖按钮列表时，JVM 元数据转换器会生成：

| 位置 | 默认按钮 | 行为 |
| --- | --- | --- |
| 页面级 | 查询 | 重新执行当前搜索。 |
| 页面级 | 新增 | 打开空编辑表单。 |
| 页面级 | 批量删除 | 读取多选行 ID，调用 `model/delete/{model}`。 |
| 行级 | 编辑 | 用当前行数据打开编辑表单。 |
| 行级 | 删除 | 读取当前行 ID，调用删除接口。 |

如果提供 `ModelButtons` 或 `OperateButtons`，当前列表会替换默认列表；自定义列表需要自己补上想保留的查询、新增或删除能力。

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

常用属性：

| 属性 | 作用 |
| --- | --- |
| `name` | 按钮文字。 |
| `index` | 按钮排序。 |
| `url` + `method` | 发送请求；不填写 `eval` 时使用。 |
| `eval` | 在浏览器中执行一段异步函数体。 |
| `reconfirm` | 点击前显示二次确认。 |
| `type` | 映射到 Element Plus 按钮类型。 |
| `component` | 使用 Vue 注册的自定义按钮组件。 |
| `edit` | 打开模型编辑面板。 |
| `dialog` | 打开自定义 Dialog 组件。 |
| `panel` | 根据字段声明生成一个操作面板。 |

## URL 参数

当前前端按钮解析器支持以下占位符：

| 占位符 | 数据来源 |
| --- | --- |
| `${id}` | 当前单选行的 `id`。需要单选。 |
| `${ids}` | 多选行的 ID 数组。需要至少一条多选。 |
| `${single}` | 当前单选行对象。 |
| `${multi}` | 多选行对象数组。 |
| `${multi.field}` | 多选行中每条记录的某个字段数组。 |
| `${field}` | 当前单选行的字段值。 |
| `${__BASE_URL}` | Ako 当前配置的 `baseUrl`。 |

占位符放在 `#` 前时替换到 URL 路径；放在 `#` 后时序列化为请求体。例如：

```text
/api/student/${id}/point
/api/student/batch#${multi}
```

`method: "popup"` 会在新窗口打开 URL，只适用于 GET。路径参数应由后端再次校验，不能把按钮 URL 当作权限控制。

## eval

`eval` 会被前端包装为异步函数。页面级按钮可以使用 `multi`，行级按钮通常使用 `single`：

```kotlin
@ModelButton(
    name = "刷新统计",
    eval = "await props.api.model.page(props.model.id, {}, {}, 1, 20)",
    type = "primary"
)
```

按钮函数可以使用 `props.model`、`props.search()`、`props.edit()`、`props.api` 和 `props.dialog()` 等对象。上面的 Kotlin 注解只是 `ako-rain` 的写法；任何后端都可以直接输出同等的 `ButtonEntry` JSON。

由于 `eval` 在浏览器中执行：

- 不要把服务端密钥、内部 URL 或未脱敏数据放入其中。
- 不要用它代替后端权限和业务校验。
- 如果业务操作重要，优先使用后端 URL，再由后端返回统一结果。

## 编辑、Dialog 与 Panel

- `edit` 适合打开当前模型或另一个模型的标准编辑表单。
- `dialog` 适合完全自定义的 Vue 组件；组件名必须已注册。
- `panel` 适合用 `fields` 快速声明一段表单，并通过 `url` 或模型保存逻辑提交。

`panel.fields` 使用与普通字段相同的 `type`、`options`、`edit` 结构。关联字段、枚举和校验可以复用现有 TypeProvider。

## 自定义按钮组件

当操作需要复杂交互时，可以让后端输出 `component`，前端注册同名组件。组件会收到模型、当前行、分页数据和 `search`/`edit` 回调。这样可以保持模型元数据驱动，同时把复杂体验留在前端组件中。
