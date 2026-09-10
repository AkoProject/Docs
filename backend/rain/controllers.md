---
title: 控制器与接口
description: 对比 ako-rain 与 ako-spring 如何挂载 Ako 菜单、模型和认证接口。
---

# 控制器与接口

Ako 前端只关心固定的 HTTP 路径和 JSON 形状；Rain 与 Spring 的控制器写法不同，但必须提供同一组接口。

## 接口清单

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| `GET` | `/api/ako/auth/isAuth` | 返回当前会话是否已认证。 |
| `POST` | `/api/ako/auth/login` | 接收登录凭据并建立会话。 |
| `GET` | `/api/ako/menu/list/{channel}` | 返回菜单组和模型元数据。 |
| `POST` | `/api/ako/model/page/{model}` | 分页、查询和排序。 |
| `POST` | `/api/ako/model/save/{model}` | 新增或保存实体。 |
| `POST` | `/api/ako/model/delete/{model}` | 按 ID 列表删除实体。 |

默认前端 `baseUrl` 是 `/api/ako/`，`channel` 是 `manager`。修改前端配置后，控制器根路径必须同步。

## 菜单与模型控制器

### Rain：实现 Ako 控制器接口

<script setup lang="ts">
const controllerExamples = [
  {
    language: 'Kotlin',
    framework: 'ako-rain',
    code: `import ako.rain.controller.IMenuController
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
class ModelController : AkoController(), IModelController`,
    note: 'IMenuController 和 IModelController 已经把 SmartWeb 路由、Model.page/save/delete 和 Rain 事务接起来。',
  },
  {
    language: 'Kotlin',
    framework: 'ako-spring',
    code: `import ako.controller.Menu
import ako.controller.Model
import ako.model.req.ModelPageReq
import ako.spring.\`fun\`.transaction
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/ako/menu")
class AkoMenuController {
  @GetMapping("/list/{channel}")
  fun list(@PathVariable channel: String) = Menu.list(channel)
}

@RestController
@RequestMapping("/api/ako/model")
class AkoModelController {
  @PostMapping("/page/{model}")
  fun page(@PathVariable model: String, @RequestBody data: ModelPageReq) =
    transaction { Model.page(model, data) }
}`,
    note: 'ako-spring 当前不提供 Rain 风格的控制器接口；用 Spring MVC 注解注册路由，并调用 Ako 核心服务。save/delete 以你的 JSON 绑定策略补上。',
  },
]

const authExamples = [
  {
    language: 'Kotlin',
    framework: 'ako-rain',
    code: `@Path("auth")
@WebController
class AuthController : AkoController() {
  @GetAction("isAuth")
  fun isAuth(): Boolean = currentSessionIsAuthenticated()

  @PostAction("login")
  fun login(@RequestBody request: LoginRequest) {
    authenticateAndCreateSession(request.username, request.password)
  }
}`,
    note: 'GetAction/PostAction 来自 SmartWeb；认证函数是业务代码，需要接入真实用户系统。',
  },
  {
    language: 'Kotlin',
    framework: 'ako-spring',
    code: `@RestController
@RequestMapping("/api/ako/auth")
class AuthController {
  @GetMapping("/isAuth")
  fun isAuth(): Boolean = currentSessionIsAuthenticated()

  @PostMapping("/login")
  fun login(@RequestBody request: LoginRequest) {
    authenticateAndCreateSession(request.username, request.password)
  }
}`,
    note: 'GetMapping/PostMapping 来自 Spring MVC；可以接入 Spring Security、Session 或自定义 Token。',
  },
]

const businessExamples = [
  {
    language: 'Kotlin',
    framework: 'ako-rain',
    code: `@Path("api/student/{studentId}")
@WebController
class StudentItemController {
  @PatchAction("point")
  fun point(studentId: Int, point: Int, mode: Int) = transaction {
    // 读取学生、校验权限、更新积分并提交事务
  }
}`,
    note: 'SmartWeb 的路径参数和动作注解由 Rain 绑定。',
  },
  {
    language: 'Kotlin',
    framework: 'ako-spring',
    code: `@RestController
@RequestMapping("/api/student/{studentId}")
class StudentItemController {
  @PatchMapping("/point")
  fun point(
    @PathVariable studentId: Int,
    @RequestParam point: Int,
    @RequestParam mode: Int,
  ) = transaction {
    // 读取学生、校验权限、更新积分并提交事务
  }
}`,
    note: 'Spring MVC 使用 PatchMapping、PathVariable 和 RequestParam；也可以用 RequestBody 接收结构化命令。',
  },
]
</script>

<CodeSwitch :variants="controllerExamples" />

两段代码不同，是因为 `IMenuController`/`IModelController` 是 SmartWeb 的接口默认方法，而 Spring MVC 需要在 `@RestController` 中显式声明每条路由。路径、请求体和返回对象仍然遵循同一份 [交互规则](/protocol/http-api)。

Spring 的完整模型控制器通常还要根据请求中的 `{model}` 将 JSON 转换成对应实体。只有固定单模型的接口才适合直接写 `@RequestBody Student`；通用控制器应使用 `AkoService.modelOf(model).type` 配合 Jackson `ObjectMapper` 做白名单转换，不要让客户端决定任意 Java 类。

## 认证控制器

### Rain 与 Spring 的路由差异

<CodeSwitch :variants="authExamples" />

`currentSessionIsAuthenticated` 和 `authenticateAndCreateSession` 只是业务占位符。测试应用可以返回固定 `true` 跑通页面，但生产环境必须接入真实认证，并确保 `401`、`403` 和登录失败响应符合前端预期。

## Spring Data 的最小绑定

Spring Data 测试代码使用固定实体接收保存请求：

```kotlin
@PostMapping("/save/{model}")
fun save(
  @PathVariable model: String,
  @RequestBody data: TestEntity,
) = transaction {
  Model.save(model, data)
}

@PostMapping("/delete/{model}")
fun delete(
  @PathVariable model: String,
  @RequestBody ids: List<String>,
) = transaction {
  Model.delete(model, ids)
}
```

真实项目如果一个控制器负责多个模型，应使用统一的 JSON 到模型类型转换层；模型名、字段和主键类型都必须经过 Ako 模型注册表校验。

## 自定义业务接口

自动生成页面只负责通用 CRUD。复杂操作可以通过模型按钮或前端固定页面调用一个普通业务控制器：

<CodeSwitch :variants="businessExamples" />

按钮 URL 可以使用 `${id}`、`${ids}` 等占位符。无论哪套框架，业务接口都必须独立完成鉴权、参数校验、事务和审计；按钮来自元数据不是放宽权限的理由。

## CORS 与部署

开发时可以让 Vite proxy 转发 `/api`；生产环境优先同源部署。若前后端不同域：

- Rain：在 SmartWeb 或网关配置 CORS。
- Spring：在 Spring MVC/Security 或网关配置 CORS。
- 明确 Cookie 的 `SameSite`、`Secure` 和凭据传递策略。
- 只允许实际前端来源，不要使用宽泛的 `*` 搭配凭据。
- 确认未授权响应为 `401`，前端才能重新进入认证流程。

## 控制器检查清单

- [ ] 对应 Runtime 已初始化：`AkoRain` 或 `AkoSpringRuntime`。
- [ ] 菜单和模型路由与前端 `baseUrl` 拼接后完全一致。
- [ ] `auth/isAuth` 返回 JSON 布尔值。
- [ ] 分页第一页按 `page: 1` 解释。
- [ ] 关联字段存在时，分页响应包含正确的 `information`。
- [ ] `save`、`delete` 有服务端校验、授权和事务。
- [ ] 错误状态码与 [交互规则](/protocol/http-api) 一致。
