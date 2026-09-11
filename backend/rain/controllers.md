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

### Rain 与 Spring：菜单与模型路由

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
    language: 'Java',
    framework: 'ako-rain',
    code: `import ako.rain.controller.IMenuController;
import ako.rain.controller.IModelController;
import java.util.List;
import java.util.Map;
import rain.controller.annotation.Path;
import smartweb.annotation.GetAction;
import smartweb.annotation.PostAction;
import smartweb.annotation.WebController;

@Path("api/ako")
public class AkoController {}

@Path("menu")
@WebController
public class MenuController extends AkoController implements IMenuController {
  @Override
  @GetAction("list/{channel}")
  public Map<String, Object> list(String channel) {
    return IMenuController.super.list(channel);
  }
}

@Path("model")
@WebController
public class ModelController extends AkoController implements IModelController {
  @Override
  @PostAction("page/{model}")
  public ModelPageResp page(ModelPageReq data, String model) {
    return IModelController.super.page(data, model);
  }

  @Override
  @PostAction("save/{model}")
  public void save(String model, String data) {
    IModelController.super.save(model, data);
  }

  @Override
  @PostAction("delete/{model}")
  public void delete(String model, List<String> ids) {
    IModelController.super.delete(model, ids);
  }
}`,
    note: 'Java 实现接口默认方法时需要显式 override，并通过 IMenuController.super/IModelController.super 委托 Ako 的默认实现。',
  },
  {
    language: 'Kotlin',
    framework: 'ako-spring',
    code: `import ako.AkoService
import ako.controller.Menu
import ako.controller.Model
import ako.model.req.ModelPageReq
import ako.spring.\`fun\`.transaction
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import tools.jackson.databind.JsonNode
import tools.jackson.databind.ObjectMapper

@RestController
@RequestMapping("/api/ako/menu")
open class AkoMenuController {
  @GetMapping("/list/{channel}")
  fun list(@PathVariable channel: String) = Menu.list(channel)
}

@RestController
@RequestMapping("/api/ako/model")
open class AkoModelController(
  private val objectMapper: ObjectMapper,
) {
  @PostMapping("/page/{model}")
  fun page(
    @PathVariable model: String,
    @RequestBody data: ModelPageReq,
  ) = transaction { Model.page(model, data) }

  @PostMapping("/save/{model}")
  fun save(
    @PathVariable model: String,
    @RequestBody data: JsonNode,
  ) = transaction {
    val mc = AkoService.modelOf(model)
    Model.save(model, objectMapper.treeToValue(data, mc.type))
  }

  @PostMapping("/delete/{model}")
  fun delete(
    @PathVariable model: String,
    @RequestBody ids: List<String>,
  ) = transaction { Model.delete(model, ids) }
}`,
    note: '这是 ako-springboot-springdata 测试中验证过的写法：Spring MVC 负责路由和 JSON 绑定，AkoService.modelOf 校验模型并取得实体类型，ObjectMapper 再把通用 JSON 转成实体。',
  },
  {
    language: 'Java',
    framework: 'ako-spring',
    code: `import ako.AkoService;
import ako.controller.Menu;
import ako.controller.Model;
import ako.model.base.AkoModel;
import ako.model.base.ModelContext;
import ako.model.req.ModelPageReq;
import ako.model.resp.ModelPageResp;
import java.util.List;
import java.util.Map;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/ako/menu")
public class AkoMenuController {
  @GetMapping("/list/{channel}")
  public Map<String, Object> list(@PathVariable String channel) {
    return Menu.INSTANCE.list(channel);
  }
}

@RestController
@RequestMapping("/api/ako/model")
@Transactional
public class AkoModelController {
  private final ObjectMapper objectMapper;

  public AkoModelController(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  @PostMapping("/page/{model}")
  public ModelPageResp page(
      @PathVariable String model,
      @RequestBody ModelPageReq data) {
    return Model.INSTANCE.page(model, data);
  }

  @PostMapping("/save/{model}")
  public void save(
      @PathVariable String model,
      @RequestBody JsonNode data) throws Exception {
    ModelContext<?> context = AkoService.INSTANCE.modelOf(model);
    AkoModel entity = (AkoModel) objectMapper.treeToValue(data, context.getType());
    Model.INSTANCE.save(model, entity);
  }

  @PostMapping("/delete/{model}")
  public void delete(
      @PathVariable String model,
      @RequestBody List<String> ids) {
    Model.INSTANCE.delete(model, ids);
  }
}`,
    note: 'Java 直接调用 Kotlin object 的 INSTANCE；事务使用 Spring 的 @Transactional，通用保存仍通过 AkoService.INSTANCE.modelOf 做类型白名单转换。',
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
    language: 'Java',
    framework: 'ako-rain',
    code: `import rain.controller.annotation.Path;
import smartweb.annotation.GetAction;
import smartweb.annotation.WebController;

@Path("auth")
@WebController
public class AuthController extends AkoController {
  @GetAction("isAuth")
  public boolean isAuth() {
    return currentSessionIsAuthenticated();
  }

  // 按同样方式添加 @PostAction("login")。登录实现属于业务系统。
}`,
    note: 'Java 使用 SmartWeb 的 GetAction/PostAction；Rain DI、Session 和实际认证服务按应用配置接入。',
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
  {
    language: 'Java',
    framework: 'ako-spring',
    code: `import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ako/auth")
public class AuthController {
  @GetMapping("/isAuth")
  public boolean isAuth() {
    return currentSessionIsAuthenticated();
  }

  @PostMapping("/login")
  public void login(@RequestBody LoginRequest request) {
    authenticateAndCreateSession(request.username(), request.password());
  }
}`,
    note: 'Java 使用 Spring MVC 的 GetMapping/PostMapping；可以接入 Spring Security、Session 或自定义 Token。',
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
    language: 'Java',
    framework: 'ako-rain',
    code: `import rain.controller.annotation.Path;
import smartweb.annotation.PatchAction;
import smartweb.annotation.WebController;

@Path("api/student/{studentId}")
@WebController
public class StudentItemController {
  @PatchAction("point")
  public void point(int studentId, int point, int mode) {
    // 通过 Rain DI 获取 Access，读取学生、校验权限、更新积分并提交事务。
  }
}`,
    note: 'Java 使用 SmartWeb 的 PatchAction；路径参数绑定和事务由 Rain 适配器负责。',
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
  {
    language: 'Java',
    framework: 'ako-spring',
    code: `import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/student/{studentId}")
public class StudentItemController {
  @Transactional
  @PatchMapping("/point")
  public void point(
      @PathVariable int studentId,
      @RequestParam int point,
      @RequestParam int mode) {
    // 读取学生、校验权限、更新积分并提交事务。
  }
}`,
    note: 'Java Spring 使用 PatchMapping、PathVariable、RequestParam 和 @Transactional；结构化命令也可以改用 RequestBody DTO。',
  },
]

const springDataSetupExamples = [
  {
    language: 'Kotlin',
    framework: 'ako-spring',
    code: `import ako.spring.data.AkoJpaRepository
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.data.jpa.repository.config.EnableJpaRepositories

@SpringBootApplication
@EnableJpaRepositories(basePackageClasses = [TestEntityRepository::class])
open class AkoSpringDataApplication

interface TestEntityRepository : AkoJpaRepository<TestEntity, Int>`,
    note: '测试通过 basePackageClasses 显式指定 Repository 扫描范围；Kotlin 项目使用 open class 或 kotlin-spring 插件。',
  },
  {
    language: 'Java',
    framework: 'ako-spring',
    code: `import ako.spring.data.AkoJpaRepository;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@EnableJpaRepositories(basePackageClasses = TestEntityRepository.class)
public class AkoSpringDataApplication {}

public interface TestEntityRepository
    extends AkoJpaRepository<TestEntity, Integer> {}`,
    note: 'Java 使用 TestEntityRepository.class 指定扫描位置；Repository Bean 由 Spring Data 创建，不需要 Kotlin 的 open 关键字。',
  },
]

const springDataModelExamples = [
  {
    language: 'Kotlin',
    framework: 'ako-spring',
    code: `import ako.model.base.CompleteModel
import ako.spring.\`fun\`.findAccess
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table

@Entity
@Table(name = "ako_spring_test_entity")
open class TestEntity : CompleteModel() {
  @Column(nullable = false)
  open var name: String = ""

  companion object : TestEntityRepository by findAccess()
}`,
    note: '测试使用 companion object + findAccess() 获取延迟代理；JPA 代理字段和类需要可打开。',
  },
  {
    language: 'Java',
    framework: 'ako-spring',
    code: `import ako.model.base.CompleteModel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "ako_spring_test_entity")
public class TestEntity extends CompleteModel {
  @Column(nullable = false)
  private String name = "";

  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
}`,
    note: 'Java 不需要 companion object；在 Controller 或 Service 中通过构造器注入 TestEntityRepository。',
  },
]
</script>

<CodeSwitch :variants="controllerExamples" />

两段代码不同，是因为 `IMenuController`/`IModelController` 是 SmartWeb 的接口默认方法，而 Spring MVC 需要在 `@RestController` 中显式声明每条路由。路径、请求体和返回对象仍然遵循同一份 [交互规则](/protocol/http-api)。

Spring 的 `{model}` 是通用模型控制器的关键。`page` 使用固定的 `ModelPageReq`，`delete` 使用 `List<String>` 接收前端传来的 ID 列表；`save` 则先通过 `AkoService.modelOf(model)` 从已注册模型中取得类型，再用注入的 `ObjectMapper` 转换 `JsonNode`。这样模型名和实体类型都来自服务端注册表，不要让客户端提交 Java 类名后直接反射加载。

上面的 Spring Data 示例默认按当前测试配置使用 Spring Boot 4，因此导入的是 Jackson 3 的 `tools.jackson.databind.JsonNode` 和 `tools.jackson.databind.ObjectMapper`。如果项目使用 Spring Boot 3，把这两个导入改为 `com.fasterxml.jackson.databind.JsonNode` 和 `com.fasterxml.jackson.databind.ObjectMapper`；控制器路由、`treeToValue` 调用和 Ako 协议不变。

## 认证控制器

### Rain 与 Spring 的路由差异

<CodeSwitch :variants="authExamples" />

`currentSessionIsAuthenticated` 和 `authenticateAndCreateSession` 只是业务占位符。测试应用可以返回固定 `true` 跑通页面，但生产环境必须接入真实认证，并确保 `401`、`403` 和登录失败响应符合前端预期。

## Spring Data JPA 的装配与绑定

`ako-springboot-springdata` 会从 Spring `ApplicationContext` 中发现 `JpaRepository` Bean，并根据 Repository 的泛型参数确定它负责的 Ako 模型。控制器可以使用下面的基础接口；测试项目还显式声明了 Repository 扫描范围：

<CodeSwitch :variants="springDataSetupExamples" />

如果 Repository 位于 `@SpringBootApplication` 的组件扫描范围内，可以按项目结构省略显式的 `@EnableJpaRepositories`；跨包或多模块项目建议像测试一样指定 `basePackageClasses`，确保 Repository 成为 Spring Bean。`AkoSpringDataDatabase` 只有在拿到这些 Bean 后，才能把模型放入 `AkoSpringRuntime.modelMap`。

测试中的模型与伴生对象写法如下：

<CodeSwitch :variants="springDataModelExamples" />

`findAccess()` 返回的是延迟解析的 Spring Access 代理；真正调用 Repository 时才从 ApplicationContext 取得 Bean。Kotlin 项目应使用 `kotlin-spring`/`all-open` 插件，或者像测试代码一样将 Spring 管理的类和可代理属性声明为 `open`。

### 用 HTTP 验证控制器

Spring Data 测试使用随机端口直接请求这些接口，并验证它们保持 Rain 适配器使用的同一份 HTTP 合约：

```bash
curl http://localhost:<port>/api/ako/menu/list/default

curl -X POST http://localhost:<port>/api/ako/model/page/TestEntity \
  -H 'Content-Type: application/json' \
  -d '{"page":1,"size":20,"params":{"name_like":"A%"},"sort":{"id":"ASC"}}'

curl -X POST http://localhost:<port>/api/ako/model/save/TestEntity \
  -H 'Content-Type: application/json' \
  -d '{"name":"Bob"}'

curl -X POST http://localhost:<port>/api/ako/model/delete/TestEntity \
  -H 'Content-Type: application/json' \
  -d '["1"]'
```

测试验证了菜单返回 `TestEntity`、分页能按 `name_like` 查询、保存能从通用 JSON 创建实体，以及删除后分页总数和剩余数据正确。实际项目还应在这些控制器中补上认证、授权、字段白名单、审计和统一异常处理。

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
