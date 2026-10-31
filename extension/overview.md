---
title: 扩展参考
description: 接入其他后端、替换前端渲染、设计新字段类型时从哪里开始。
---

# 扩展参考

日常使用 Ako，从 [前端安装与挂载](/frontend/quick-start)、[后端（JVM）项目创建](/backend/rain/project) 或 [后端（JavaScript）项目创建](/backend/javascript/project) 入手就够了。只有在要接入其他后端、替换前端渲染器或设计新字段类型时，才需要读这一组内容。

## 按需求找入口

| 需求 | 从哪里开始 |
| --- | --- |
| 用自己的语言或 Web 框架提供 Ako 后端 | [交互规则](/protocol/http-api) → [模型定义](/protocol/metadata) |
| 用 Node.js/Bun 和 TypeScript 提供 Ako 后端 | [后端（JavaScript）](/backend/javascript/) |
| 增加枚举、关联或自定义字段类型 | [模型定义](/protocol/metadata) → [前端自定义页面与类型](/frontend/customization) |
| 让 Rain 之外的 JVM 框架或 ORM 接入 Ako | [后端实现概览](/backend/overview) |
| 自定义按钮和业务操作 | [模型定义](/protocol/metadata) 中的按钮定义 |

## 以协议为准

适配器只需要输出前端要用的 JSON，不必照搬 `ako-rain` 的包名、注解或 Access 类型。建议把适配器拆成几层：

```text
业务模型 / ORM
        ↓
元数据生成器
        ↓
Ako HTTP 接口
        ↓
@ako-dev/ako
```

这样分层后，业务应用现在可以用成熟的 Rain 或 Spring 适配器，以后要换框架，也只需把同一套模型声明映射过去，管理后台不用改。

## 先跑通一个最小示例

先只实现一个只有文本字段的模型：

1. `menu/list/{channel}` 返回一个模型，模型里有一个 `ako:text` 字段。
2. `model/page/{model}` 返回分页对象。
3. `model/save/{model}` 和 `model/delete/{model}` 返回正确的状态码。
4. 用前端默认页面检查菜单、搜索、表格、编辑和删除是否正常。
5. 再逐步加入枚举、关联、校验、按钮和自定义页面节点。

## 安全

实现协议并不会自动带来权限控制、租户隔离和审计。每个适配器都要自己做好下面几件事：

- 模型和字段白名单
- 查询操作符和排序方向白名单
- `page`、`save`、`delete` 每次请求都做授权
- 主键类型转换和输入校验
- 错误信息脱敏和审计日志

`ako-rain` 的完整使用说明见 [后端（JVM）项目创建](/backend/rain/project)、[数据访问与事务](/backend/rain/data-access) 和 [注解功能](/backend/rain/annotations)。
