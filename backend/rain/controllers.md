---
title: 控制器与接口
description: 在 ako-rain 和 ako-spring 中挂载 Ako 的菜单、模型和认证接口。
---

# 控制器与接口

Ako 前端只认固定的 HTTP 路径和 JSON 结构。Rain 和 Spring 的控制器写法不同，但提供的接口必须一致。

## 接口清单

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| `GET` | `/api/ako/auth/isAuth` | 返回当前会话是否已认证。 |
| `POST` | `/api/ako/auth/login` | 接收登录凭据并建立会话。 |
| `GET` | `/api/ako/menu/list/{channel}` | 返回菜单组和模型元数据。 |
| `POST` | `/api/ako/model/page/{model}` | 分页、查询和排序。 |
| `POST` | `/api/ako/model/save/{model}` | 新增或保存实体。 |
| `POST` | `/api/ako/model/delete/{model}` | 按 ID 列表删除实体。 |

前端默认的 `baseUrl` 是 `/api/ako/`，`channel` 是 `manager`。改了前端配置，控制器的根路径也要跟着改。

## 菜单与模型控制器

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
    note: 'IMenuController 和 IModelController 已经声明好 SmartWeb 路由，并在 Rain 事务中调用 Model.page/save/delete，继承即可使用。',
  },
  {
    language: 'Java',
    framework: 'ako-rain',
    code: `import ako.model.req.ModelPageReq;
import ako.model.resp.ModelPageResp;
import ako.rain.controller.IMenuController;
import ako.rain.controller.IModelController;
import java.util.List;
import java.util.Map;
import javax.inject.Named;
import rain.controller.annotation.Path;
import smartweb.annotation.GetAction;
import smartweb.annotation.PostAction;
import smartweb.annotation.RequestBody;
import smartweb.annotation.WebController;

@Path("api/ako")
@WebController
public class AkoController {}

@Path("menu")
@WebController
public class MenuController extends AkoController implements IMenuController {
  @Override
  @GetAction("list/{channel}")
  public Map<String, Object> list(@Named("channel") String channel) {
    return IMenuController.super.list(channel);
  }
}

@Path("model")
@WebController
public class ModelController extends AkoController implements IModelController {
  @Override
  @PostAction("page/{model}")
  public ModelPageResp page(@RequestBody ModelPageReq data, @Named("model") String model) {
    return IModelController.super.page(data, model);
  }

  @Override
  @PostAction("save/{model}")
  public void save(@Named("model") String model, @RequestBody String data) {
    IModelController.super.save(model, data);
  }

  @Override
  @PostAction("delete/{model}")
  public void delete(@Named("model") String model, @RequestBody List<String> ids) {
    IModelController.super.delete(model, ids);
  }
}`,
    note: 'Java 示例显式覆盖每个方法，路由和参数注解与接口中的声明保持一致，方法体通过 IMenuController.super/IModelController.super 调用 Ako 的默认实现。',
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
    note: '与 ako-springboot-springdata 测试中的 TestAkoModelController 写法一致：Spring MVC 负责路由和 JSON 绑定，AkoService.modelOf 校验模型名并取得实体类型，再由 ObjectMapper 把 JSON 转成实体。',
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
    note: 'Java 通过 INSTANCE 调用 Kotlin object；事务改用 Spring 的 @Transactional，保存时同样先用 AkoService.INSTANCE.modelOf 取得已注册的实体类型。',
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
    note: 'GetAction/PostAction 来自 SmartWeb；两个认证函数是业务占位，需要接入真实的用户系统。',
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

  // 用同样的方式添加 @PostAction("login")，登录逻辑由业务系统实现。
}`,
    note: 'Java 同样使用 SmartWeb 的 GetAction/PostAction；依赖注入、Session 和认证服务按应用自身情况接入。',
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
    note: 'GetMapping/PostMapping 来自 Spring MVC；认证可以接 Spring Security、Session 或自定义 Token。',
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
    note: 'Java 同样使用 Spring MVC 的 GetMapping/PostMapping；认证可以接 Spring Security、Session 或自定义 Token。',
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
    note: '路径参数和动作注解由 SmartWeb 处理；方法体用 transaction { } 包裹。',
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
    // 通过 Rain 依赖注入获取 Access，在事务中读取学生、校验权限、更新积分。
  }
}`,
    note: 'Java 使用 SmartWeb 的 PatchAction 绑定路径参数；Rain 不会自动开启事务，需要在方法里通过 AkoRain 的 transaction 显式包裹。',
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
    note: 'Spring MVC 使用 PatchMapping、PathVariable 和 RequestParam；参数较多时也可以用 RequestBody 接收一个对象。',
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
    note: 'Java 使用 PatchMapping、PathVariable、RequestParam 和 @Transactional；参数较多时也可以改用 RequestBody DTO。',
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
    note: '测试用 basePackageClasses 显式指定 Repository 的扫描范围；Kotlin 项目需要 open class 或 kotlin-spring 插件。',
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
    note: 'Java 用 TestEntityRepository.class 指定扫描位置；Repository Bean 由 Spring Data 创建，也不需要 open 关键字。',
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
    note: '测试用 companion object + findAccess() 获取延迟代理；为了让 JPA 能生成代理，类和属性都要声明为 open。',
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
    note: 'Java 不需要 companion object，在 Controller 或 Service 中通过构造器注入 TestEntityRepository 即可。',
  },
]
</script>

<CodeSwitch :variants="controllerExamples" />

两边写法不同：Rain 的 `IMenuController`/`IModelController` 在接口默认方法里声明好了 SmartWeb 路由，继承即可；Spring MVC 则要在 `@RestController` 里逐条声明路由。路径、请求体和返回值都遵循同一份 [交互规则](/protocol/http-api)。

Spring 的通用模型控制器靠路径中的 `{model}` 区分模型。`page` 用固定的 `ModelPageReq` 接收请求，`delete` 用 `List<String>` 接收 ID 列表；`save` 先通过 `AkoService.modelOf(model)` 从已注册的模型里取得实体类型，再用注入的 `ObjectMapper` 把 `JsonNode` 转成实体。模型名和实体类型都来自服务端的注册表。不要让客户端提交 Java 类名，再由服务端反射加载。

Spring Data 测试默认使用 Spring Boot 4，所以示例导入的是 Jackson 3 的 `tools.jackson.databind.JsonNode` 和 `tools.jackson.databind.ObjectMapper`。如果项目用的是 Spring Boot 3，把这两个导入换成 `com.fasterxml.jackson.databind.JsonNode` 和 `com.fasterxml.jackson.databind.ObjectMapper` 即可，路由、`treeToValue` 调用和 Ako 协议都不用改。

## 认证控制器

<CodeSwitch :variants="authExamples" />

`currentSessionIsAuthenticated` 和 `authenticateAndCreateSession` 只是占位函数。测试时可以固定返回 `true` 先把页面跑通；生产环境必须接入真实的认证，并保证 `401`、`403` 和登录失败的响应符合前端的预期。

## Spring Data JPA 的装配

`ako-springboot-springdata` 会从 Spring `ApplicationContext` 中找出所有 `JpaRepository` Bean，再根据 Repository 的泛型参数判断它对应哪个 Ako 模型。Repository 继承下面的基础接口即可；测试项目还显式指定了 Repository 的扫描范围：

<CodeSwitch :variants="springDataSetupExamples" />

如果 Repository 在 `@SpringBootApplication` 的扫描范围内，一般可以省略 `@EnableJpaRepositories`。跨包或多模块的项目，建议像测试一样指定 `basePackageClasses`，确保 Repository 注册成 Spring Bean。`AkoSpringDataDatabase` 拿到这些 Bean 之后，才能把模型放进 `AkoSpringRuntime.modelMap`。

测试中的模型和伴生对象写法如下：

<CodeSwitch :variants="springDataModelExamples" />

`findAccess()` 返回的是一个延迟代理，真正调用方法时才从 ApplicationContext 取出 Repository Bean。Kotlin 项目要么使用 `kotlin-spring`/`all-open` 插件，要么像测试代码那样把 Spring 管理的类和需要代理的属性都声明为 `open`。

### 用 HTTP 验证

Spring Data 测试在随机端口上直接请求这些接口，确认它们与 Rain 适配器遵循同一份 HTTP 约定：

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

测试覆盖了这几点：菜单返回 `TestEntity`，分页能按 `name_like` 查询，保存能从 JSON 创建实体，删除后分页总数和剩余数据正确。实际项目还要在这些控制器里补上认证、授权、字段白名单、审计和统一的异常处理。

## 自定义业务接口

自动生成的页面只负责通用的增删改查。复杂操作可以通过模型按钮或前端的固定页面，调用一个普通的业务控制器：

<CodeSwitch :variants="businessExamples" />

按钮 URL 中可以使用 `${id}`、`${ids}` 等占位符。不管用哪套框架，业务接口都要自己完成鉴权、参数校验、事务和审计。按钮写在元数据里，并不意味着可以放宽权限。

## 跨域与部署

开发时可以让 Vite 代理转发 `/api`；生产环境优先前后端同源部署。如果前后端不在同一个域名下：

- Rain：在 SmartWeb 或网关上配置 CORS。
- Spring：在 Spring MVC/Spring Security 或网关上配置 CORS。
- 明确 Cookie 的 `SameSite`、`Secure` 设置和凭据传递方式。
- 只放行实际使用的前端来源；携带凭据时不能使用 `*`。
- 未登录时返回 `401`，前端才会重新进入登录流程。

## 检查清单

- [ ] Ako 运行时已初始化：`AkoRain` 或 `AkoSpringRuntime`。
- [ ] 菜单和模型路由与前端 `baseUrl` 拼接后完全一致。
- [ ] `auth/isAuth` 返回 JSON 布尔值。
- [ ] 分页把 `page: 1` 当作第一页。
- [ ] 有关联字段时，分页响应中包含正确的 `information`。
- [ ] `save`、`delete` 有服务端校验、授权和事务。
- [ ] 错误状态码与 [交互规则](/protocol/http-api) 一致。
