---
title: 模型定义
description: DbModel、DbField、菜单项以及默认页面节点的 JSON 结构。
---

# 模型定义

元数据是 Ako 前后端之间最核心的约定。后端通过反射、注解或配置生成 JSON，前端根据这份 JSON 决定页面上显示什么。

## 模型元数据

一个模型的主要结构如下：

```json
{
  "id": "Student",
  "name": "学生",
  "previous": "school",
  "permission": "student:read",
  "index": 100,
  "displayAble": false,
  "pageNode": "default-entity-page-node",
  "searchNode": "default-entity-search-node",
  "tableNode": "default-entity-table-node",
  "editNode": "default-entity-edit-node",
  "iconNode": "default-entity-icon-node",
  "idField": {
    "id": "id",
    "name": "编号",
    "description": null,
    "type": "ako:text",
    "options": null,
    "search": {
      "component": "default-entity-search-property-node",
      "entries": [
        {
          "component": "default-entity-search-input-node",
          "opt": "eq",
          "placeholder": "编号",
          "width": "200px"
        }
      ]
    },
    "column": {
      "component": "default-entity-table-column-node",
      "width": 100
    }
  },
  "fields": [],
  "modelButtons": [],
  "operateButtons": []
}
```

| 属性 | 类型 | 作用 |
| --- | --- | --- |
| `id` | string | 模型的 API 标识，接口路径和前端查找模型都用它，应保持稳定。 |
| `name` | string | 菜单标题和页面上显示的名称。 |
| `previous` | string/null | 父菜单标识，必须等于 `menus` 中某一项的 `identifier`。没有父级时为 `null`。 |
| `permission` | string/null | 权限标识。默认前端不读取，也不能代替后端授权。 |
| `index` | number | 在同级菜单中的排序值，越小越靠前。 |
| `displayAble` | boolean | 默认前端不读取。后端（JVM）和后端（JavaScript）都默认输出 `false`。 |
| `pageNode` | string | 页面根节点的组件名。 |
| `searchNode` | string | 搜索区域的组件名。 |
| `tableNode` | string | 表格的组件名。 |
| `editNode` | string | 编辑面板的组件名。 |
| `iconNode` | string | 菜单图标的组件名。 |
| `idField` | object | 主键字段的元数据。两个后端实现都会单独输出它，默认前端不读取。 |
| `fields` | array | 字段元数据，前端按数组顺序处理。 |
| `modelButtons` | array | 页面级按钮。 |
| `operateButtons` | array | 行级按钮。 |

后端（JVM）的 `DbModel` 中还有模型的 `Class`、反射字段和关联映射缓存，这些只在后端内部使用，不会序列化。两个后端实现都会把 `idField` 再放到 `fields` 的第一个位置，所以主键字段也会出现在搜索、表格和编辑表单中。

## 字段元数据

```json
{
  "id": "name",
  "name": "姓名",
  "description": "用户在后台中看到的姓名",
  "type": "ako:text",
  "options": null,
  "search": {
    "component": "default-entity-search-property-node",
    "entries": [
      {
        "component": "default-entity-search-input-node",
        "opt": "like",
        "placeholder": "姓名",
        "width": "200px"
      }
    ]
  },
  "column": {
    "component": "default-entity-table-column-node",
    "width": 200,
    "index": 10
  },
  "edit": {
    "propertyComponent": "default-entity-edit-property-node",
    "inputComponent": "default-entity-edit-input-node",
    "require": true,
    "allowEmpty": false,
    "editable": true,
    "placeholder": "姓名",
    "validate": []
  }
}
```

| 属性 | 说明 |
| --- | --- |
| `search` | 为 `null` 时，这个字段不出现在搜索表单中。`entries` 中每一项生成一个输入框，`opt` 决定提交时的查询键。 |
| `column` | 为 `null` 时，这个字段不出现在表格中。`width` 是列的最小宽度；`index` 决定列的顺序，可以为 `null`，此时按字段顺序排列。 |
| `edit` | 为 `null` 时，这个字段不出现在编辑表单中。 |
| `type` | 决定搜索、表格和编辑三处使用哪个类型提供者。 |
| `options` | 传给类型提供者的类型专属配置，可以为 `null`。 |
| `description` | 显示在编辑项下方的说明文字，可以为 `null`。 |

`search`、`column`、`edit` 三者互不影响。例如只读字段通常保留 `column`，把 `edit` 设为 `null`；只用来筛选的字段可以保留 `search`，把 `column` 设为 `null`。

## 菜单项

`menus` 中的自定义菜单项结构如下：

```json
{
  "channel": "",
  "identifier": "reports",
  "name": "报表",
  "displayAble": true,
  "previous": null,
  "pageNode": "reports-page",
  "searchNode": null,
  "tableNode": null,
  "editNode": null,
  "iconNode": "reports-icon",
  "index": 20
}
```

默认前端读取其中的 `identifier`、`name`、`previous`、`pageNode`、`iconNode`、`index` 和 `displayAble`：

- 如果某个菜单项的 `identifier` 被其他菜单项或模型的 `previous` 引用，它就成为菜单分组，`pageNode` 不再使用。
- 其余菜单项是普通页面，点击后用 `pageNode` 打开一个标签页。
- `displayAble` 决定这个标签页能否关闭。

`channel`、`permission`、`searchNode`、`tableNode`、`editNode` 目前前端都不读取。后端（JVM）用 `@MenuGroup` 生成的菜单项不带 `displayAble`；后端（JavaScript）默认输出 `displayAble: true`、`index: 100`。

前端通过 `findComponent` 按名称查找节点：先查内置的默认节点，再查 Vue App 中注册的全局组件。自定义节点必须提前注册，否则对应位置无法正常渲染。

## 默认页面节点

默认节点名在后端（JVM）中定义在 `ako-core` 的 `AkoDefaultNode`，后端（JavaScript）使用同一组名称。前端把这些名称映射到 `EntityView`、搜索面板、表格面板和编辑面板。元数据里只有节点名，不包含 Vue 组件本身，所以协议不会和某一份前端打包产物绑在一起。

## 生成元数据的建议

后端适配器可以用反射、编译期代码生成、显式 schema 或数据库描述来生成元数据，但最好遵守以下几条：

- `id` 用稳定的 API 标识，不随显示名称变化。
- 显示名称放在 `name` 里，不要让前端从字段名猜。
- 不支持的部分返回 `null`，不要返回缺字段的对象。
- `type` 和 `options` 要一起设计，并在前端注册对应的类型提供者。
- 不想暴露给浏览器的属性，既不要放进 `fields`，也不要出现在实体 JSON 里。

## 延伸阅读

模型定义中有两部分单独成页：

- [字段类型与选项](/protocol/types)：文本、枚举、关联、时间、字节大小和自定义类型提供者。
- [按钮与操作](/protocol/buttons)：页面级按钮、行级按钮、Dialog、Panel 和 URL 参数。
