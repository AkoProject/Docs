---
title: 模型定义
description: DbModel、DbField 以及前端默认页面节点的 JSON 结构。
---

# 模型定义

页面元数据是 Ako 前后端之间最重要的边界。后端把模型反射、注解或配置转换成 JSON；前端根据这些 JSON 决定显示什么。

## Model 元数据

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
| `id` | string | 模型 API 标识，也用于前端查找模型。应保持稳定。 |
| `name` | string | 菜单标题和页面展示名称。 |
| `previous` | string/null | 父菜单标识。没有父级时为 `null`。 |
| `permission` | string/null | 权限标识的传输位置；不等于后端授权。 |
| `index` | number | 菜单或字段排序值，越小越靠前。 |
| `displayAble` | boolean | 模型/菜单是否可显示的协议字段；实际可见性仍由适配器与前端组合决定。 |
| `pageNode` | string | 页面根节点组件名。 |
| `searchNode` | string | 搜索区域组件名。 |
| `tableNode` | string | 表格组件名。 |
| `editNode` | string | 编辑面板组件名。 |
| `iconNode` | string | 菜单图标组件名。 |
| `idField` | object | 当前模型的主键字段元数据；当前 JVM 响应会将它单独返回。 |
| `fields` | array | 字段元数据。 |
| `modelButtons` | array | 页面级按钮。 |
| `operateButtons` | array | 行级按钮。 |

当前 JVM `DbModel` 的内部 `Class`、反射字段和映射缓存不会序列化；它们只用于后端运行时。`fields` 通常会把 `idField` 作为第一个字段再次列出，这是当前响应结构的一部分。

## Field 元数据

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

| 属性 | 为空时的效果 |
| --- | --- |
| `search` | 不在搜索表单中展示这个字段。 |
| `column` | 不在表格中展示这个字段。 |
| `edit` | 不在编辑表单中展示这个字段。 |
| `type` | 决定字段的搜索、表格和编辑 TypeProvider。 |
| `options` | 给 TypeProvider 的类型专属配置。 |
| `description` | 默认显示在编辑项下方。 |

这三个显示对象可以独立存在。例如只读字段通常保留 `column`，同时将 `edit` 设为 `null`；只用于过滤的字段可以保留 `search` 而隐藏 `column`。

## 菜单元数据

`menus` 中的自定义菜单项使用以下结构：

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

前端会通过 `findComponent` 按名称寻找节点。自定义节点必须提前注册到 Vue App，否则页面只能显示找不到组件的结果。

## 默认渲染链

默认节点名称来自 `ako-core` 的 `AkoDefaultNode`，前端会将它们映射到 `EntityView`、搜索面板、表格面板和编辑面板。模型元数据只描述节点名，不携带 Vue 组件本身，这保证了协议不会与某个前端打包产物绑定。

## 生成元数据的建议

后端适配器可以使用反射、编译期代码生成、显式 schema 或数据库描述生成元数据，但建议遵守以下规则：

- `id` 使用 API 稳定标识，不要随着显示名称改变。
- 展示名称放在 `name`，不要让前端猜测字段名。
- 不支持的场景返回 `null`，不要返回半成品对象。
- `type` 与 `options` 必须成对设计，并在前端注册对应 TypeProvider。
- 任何不希望暴露给浏览器的字段都不要放进 `fields` 或实体 JSON。

## 模型定义的详细组成

模型定义中的两个部分有独立的详细说明：

- [字段类型与选项](/protocol/types)：文本、枚举、关联、时间、大小和自定义 TypeProvider。
- [按钮与操作](/protocol/buttons)：页面级按钮、行级按钮、Dialog、Panel 和 URL 参数。
