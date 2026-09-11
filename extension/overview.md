---
title: 扩展参考
description: Ako 协议、后端适配器和前端扩展能力的入口。
---

# 扩展参考

Ako 的日常使用从 [前端开始方式](/frontend/quick-start)、[后端（JVM）项目创建](/backend/rain/project) 或 [后端（JavaScript）项目创建](/backend/javascript/project) 开始。只有在需要接入其他后端、替换前端渲染器或设计新字段类型时，才需要阅读本组扩展内容。

## 三种扩展方向

| 需求 | 从哪里开始 |
| --- | --- |
| 用自己的语言或 Web 框架提供 Ako 后端 | [交互规则](/protocol/http-api) → [模型定义](/protocol/metadata) |
| 使用 Node.js/Bun 与 TypeScript 提供 Ako 后端 | [后端（JavaScript）](/backend/javascript/) |
| 增加枚举、关联或自定义字段类型 | [模型定义](/protocol/metadata) → [前端自定义页面与类型](/frontend/customization) |
| 让 Rain 之外的 JVM/ORM 接入 Ako | [后端适配器](/backend/overview) |
| 自定义按钮和业务操作 | [模型定义](/protocol/metadata) 中的按钮定义 |

## 协议优先

后端适配器只需要输出前端消费的 JSON，不需要复制 `ako-rain` 的包名、注解或 Access 类型。推荐把适配器拆成：

```text
业务模型 / ORM
        ↓
元数据生成器
        ↓
Ako HTTP 接口
        ↓
@ako-dev/ako
```

这样，业务应用可以使用成熟的 Rain 或 Spring 适配器，未来再把同一套模型声明映射到其他框架，而不用改写管理后台。

## 扩展时的最低闭环

先只实现一个文本模型：

1. `menu/list/{channel}` 返回一个模型和一个 `ako:text` 字段。
2. `model/page/{model}` 返回分页对象。
3. `model/save/{model}` 和 `model/delete/{model}` 返回正确的状态码。
4. 用前端默认页面验证菜单、搜索、表格、编辑和删除。
5. 再逐步加入枚举、关联、校验、按钮和自定义节点。

## 安全边界

扩展协议不会自动带来权限、租户隔离和审计。每个适配器都要独立实现：

- 模型和字段白名单。
- 查询操作符和排序方向白名单。
- `page`、`save`、`delete` 的逐请求授权。
- 主键类型转换和输入校验。
- 错误脱敏与审计日志。

Rain 适配器的完整用户手册仍然是 [后端（JVM）项目创建](/backend/rain/project)、[数据访问与事务](/backend/rain/data-access) 和 [注解功能](/backend/rain/annotations)。
