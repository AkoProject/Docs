---
title: 接入控制器
description: 在 Rain SmartWeb 中挂载 Ako 菜单、模型和认证接口。
---

# 接入控制器

`ako-rain` 已经提供 `IMenuController` 和 `IModelController`。应用只需要把它们挂到自己的 Web Controller 根路径下，再补上认证控制器。

## 控制器根路径

下面是当前 JVM 测试代码采用的最小挂载方式：

```kotlin
package example.controller

import ako.rain.controller.IMenuController
import ako.rain.controller.IModelController
import rain.controller.annotation.Path
import smartweb.annotation.WebController

@Path("api/ako")
@WebController
open class AkoController

@Path("menu")
@WebController
class MenuController : AkoController(), IMenuController

@Path("model")
@WebController
class ModelController : AkoController(), IModelController
```

这组控制器提供：

| Controller | 路由 |
| --- | --- |
| `IMenuController` | `GET /api/ako/menu/list/{channel}` |
| `IModelController` | `POST /api/ako/model/page/{model}` |
|  | `POST /api/ako/model/save/{model}` |
|  | `POST /api/ako/model/delete/{model}` |

`IModelController` 的默认方法会调用 Ako 核心模型服务，并在 `ako-rain` 中通过事务包装。Rain SmartWeb 的注解、路径和参数绑定规则请参考 [SmartWeb 快速开始](https://rain.icecreamqaq.com/smartweb/getting-started)、[路由与控制器](https://rain.icecreamqaq.com/smartweb/controllers)。

## 认证控制器

前端启动需要 `auth/isAuth`。如果要使用 Ako 自带登录页，还需要 `auth/login`：

```kotlin
package example.controller

import rain.controller.annotation.Path
import smartweb.annotation.GetAction
import smartweb.annotation.PostAction
import smartweb.annotation.RequestBody
import smartweb.annotation.WebController

data class LoginRequest(
    val username: String,
    val password: String,
)

@Path("auth")
@WebController
class AuthController : AkoController() {

    @GetAction("isAuth")
    fun isAuth(): Boolean {
        return currentSessionIsAuthenticated()
    }

    @PostAction("login")
    fun login(@RequestBody request: LoginRequest) {
        authenticateAndCreateSession(request.username, request.password)
    }
}
```

`currentSessionIsAuthenticated` 和 `authenticateAndCreateSession` 是业务伪代码，需要替换为你的账号系统。当前仓库的测试控制器返回固定 `true`，只用于跑通页面，不应直接用于生产。

## 请求体与参数

- `page` 的请求体是 `ModelPageReq` 形状。
- `save` 的请求体是模型 JSON；`ako-rain` 当前控制器会把 JSON 字符串解析成对应模型类型。
- `delete` 的请求体是 ID 数组；适配器按实际主键类型转换。
- `model` 和 `channel` 来自路径，必须校验，不要直接用于拼接查询。

请求和响应的跨框架定义见 [交互规则](/protocol/http-api)。

## 自定义业务接口

自动生成页面只负责通用 CRUD。复杂操作可以写一个普通 SmartWeb 控制器，再通过 `ModelButton`、`OperateButton` 或前端固定页面调用它：

```kotlin
@Path("api/student/{studentId}")
@WebController
class StudentItemController {

    @PatchAction("point")
    fun point(studentId: Int, point: Int, mode: Int) = transaction {
        // 读取学生、校验权限、更新积分并提交事务
    }
}
```

按钮 URL 可以使用 `${id}` 等占位符，详见 [模型定义](/protocol/metadata) 中的按钮定义。业务接口仍然必须独立完成鉴权和参数校验。

## CORS 与部署

开发时可以让 Vite proxy 转发 `/api`；生产环境优先使用同源部署。若前后端不同域：

- 配置 SmartWeb 或网关的 CORS。
- 明确 Cookie 的 `SameSite`、`Secure` 和凭据传递策略。
- 只允许实际前端来源，不要使用宽泛的 `*` 搭配凭据。
- 确认 `401` 能被前端识别并重新进入认证流程。

## 控制器检查清单

- [ ] `AkoRain` 已注册并能发现模型 Access。
- [ ] `menu` 和 `model` 路径与前端 `baseUrl` 拼接后完全一致。
- [ ] `auth/isAuth` 返回 JSON 布尔值。
- [ ] 分页第一页按 `page: 1` 处理。
- [ ] `information` 在关联字段存在时返回正确结构。
- [ ] `save`、`delete` 有服务端校验、授权和事务。
- [ ] 错误状态码与 [交互规则](/protocol/http-api) 约定一致。
