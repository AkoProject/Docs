---
title: 快速开始
description: 用 ako-rain 或 ako-spring 启动后端（JVM），接通 Ako 管理后台需要的接口。
---

# 快速开始

项目建好之后，接下来要把后端跑起来。不论用 `ako-rain` 还是 `ako-spring`，步骤都一样：注册 Ako 运行时、发现模型、提供菜单和模型接口，最后用前端打开页面。

## 依赖速查

<script setup lang="ts">
const dependencyExamples = [
  {
    language: 'Kotlin DSL',
    framework: 'ako-rain',
    code: `dependencies {
  implementation("com.ako-dev:ako-rain:<ako-version>")
  implementation("com.IceCreamQAQ.Rain:application:<rain-version>")
  implementation("com.IceCreamQAQ.Rain:controller:<rain-version>")
  implementation("com.IceCreamQAQ.SmartWeb.Server:SmartHTTP:<smartweb-version>")
  implementation("com.IceCreamQAQ.SmartAccess:hibernate5:<smartaccess-version>")
}`,
    note: 'Rain 还需要 SmartWeb 和 SmartAccess；仓库地址和版本说明见“项目创建”。',
  },
  {
    language: 'Kotlin DSL',
    framework: 'ako-spring',
    code: `dependencies {
  implementation("com.ako-dev:ako-springboot-3:<ako-version>")
  implementation("com.ako-dev:ako-springboot-springdata:<ako-version>")
  implementation("org.springframework.boot:spring-boot-starter-web")
  implementation("org.springframework.boot:spring-boot-starter-data-jpa")
}`,
    note: '这是 Boot 3 的写法；Boot 4 把 ako-springboot-3 换成 ako-springboot-4。Boot 2 见“项目创建”。',
  },
]

const launcherExamples = [
  {
    language: 'Kotlin',
    framework: 'ako-rain',
    code: `import rain.application.FullStackApplicationLauncher

fun main() {
  FullStackApplicationLauncher.launch()
}`,
    note: 'FullStackApplicationLauncher 负责模块初始化；AkoRain 由 ako-rain 自带的 Rain 模块配置注册。',
  },
  {
    language: 'Java',
    framework: 'ako-rain',
    code: `import rain.application.FullStackApplicationLauncher;

public final class Application {
  public static void main(String[] args) {
    FullStackApplicationLauncher.launch();
  }
}`,
    note: 'Java 直接调用 Rain 的启动器；AkoRain 同样由 Rain 模块配置注册。',
  },
  {
    language: 'Kotlin',
    framework: 'ako-spring',
    code: `import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class Application

fun main(args: Array<String>) {
  runApplication<Application>(*args)
}`,
    note: 'AkoSpringRuntime 由 Spring Boot 自动配置创建，不要再手动 new 一个。',
  },
  {
    language: 'Java',
    framework: 'ako-spring',
    code: `import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Application {
  public static void main(String[] args) {
    SpringApplication.run(Application.class, args);
  }
}`,
    note: 'Java 用 SpringApplication.run 启动；AkoSpringRuntime 由 Spring Boot 自动配置创建。',
  },
]

const configurationExamples = [
  {
    language: 'Properties',
    framework: 'ako-rain',
    code: `# src/main/resources/conf/application.properties
rain.scanPackages=example
webServer.port=17777

db.provider=smartaccess.hibernate.HibernateService
db.driver=org.h2.Driver
db.url=jdbc:h2:./h2db/ako
db.username=h2
db.password=h2
db.dialect=org.hibernate.dialect.H2Dialect`,
    note: '扫描、Web 端口和数据库配置分别由 Rain、SmartWeb 和 SmartAccess 读取；AkoRain 由 ako-rain 的模块配置注册。',
  },
  {
    language: 'YAML',
    framework: 'ako-spring',
    code: `# src/main/resources/application.yml
server:
  port: 17777

spring:
  datasource:
    url: jdbc:h2:mem:ako;DB_CLOSE_DELAY=-1
    driver-class-name: org.h2.Driver
    username: sa
    password:
  jpa:
    hibernate:
      ddl-auto: update`,
    note: 'Spring Boot 根据 application.yml 创建数据源、JPA 和 Web 环境；自动配置会注册 AkoSpringRuntime 和基于 Spring Data 的数据库实现。',
  },
]
</script>

<CodeSwitch :variants="dependencyExamples" />

## 启动应用

<CodeSwitch :variants="launcherExamples" />

两段启动代码不能互换。Rain 走自己的 ApplicationService/ClassRegister 生命周期，Spring 走 ApplicationContext 和自动配置。两者最后都会初始化 Ako 运行时，只是入口不同。

## 配置框架

<CodeSwitch :variants="configurationExamples" />

Rain 用 `rain.scanPackages` 和 SmartAccess 的配置项；Spring 用组件扫描、`spring.datasource`、`spring.jpa`，必要时再加 `@EnableJpaRepositories`。这些差别来自框架本身的配置方式，与 Ako 协议无关。

## 模型发现

| 检查项 | `ako-rain` | `ako-spring` |
| --- | --- | --- |
| 运行时 | `AkoRain` | `AkoSpringRuntime` |
| 模型来源 | Rain 发现的 `AkoAccess` 接口 | Spring 容器中的 `AkoSpringDatabase`；使用 Spring Data 时来自 Repository Bean |
| 排除模型 | `@NoAkoModel` | `@NoAkoModel`，运行时建立模型表时跳过 |
| 初始化时机 | 首次访问 `modelMap` 时，根据 Access 延迟创建 | `ContextRefreshedEvent` 之后，或首次访问 `modelMap` 时 |
| 常见问题 | 包没被扫描、Access 没注册、SmartAccess 不可用 | Repository 没被扫描、缺少数据库 Bean、事务管理器或 JPA 没配好 |

两边都用 `model.id` 作为前端的模型标识，返回给前端的也是同一套 `DbModel`/`DbField`。

## 挂载 Ako 路由

两种实现都要提供以下接口：

```text
GET  /api/ako/auth/isAuth
POST /api/ako/auth/login
GET  /api/ako/menu/list/{channel}
POST /api/ako/model/page/{model}
POST /api/ako/model/save/{model}
POST /api/ako/model/delete/{model}
```

控制器代码见 [控制器与接口](/backend/rain/controllers)。Rain 可以直接实现 `IMenuController`/`IModelController`；Spring 则写普通的 `@RestController`，在里面调用 Ako 核心的 `Menu` 和 `Model`。两者写法不同，是因为 Web 框架的路由机制不同。

## 验证接口

启动后依次请求：

```bash
curl http://localhost:17777/api/ako/auth/isAuth
curl http://localhost:17777/api/ako/menu/list/manager
curl -X POST http://localhost:17777/api/ako/model/page/Student \
  -H 'Content-Type: application/json' \
  -d '{"page":1,"size":20,"params":{},"sort":{}}'
```

如果菜单接口返回的 `models` 为空：

- Rain：检查 `rain.scanPackages`、Access 有没有被 ClassRegister 发现，以及 SmartAccess/JPA 服务是否正常。
- Spring：检查 `@SpringBootApplication` 的扫描范围、Repository 有没有被 `@EnableJpaRepositories` 扫描到，以及 `AkoSpringDatabase` 是否注册成了 Bean。

如果菜单里有模型，但分页请求失败，先对照 [交互规则](/protocol/http-api) 检查请求体，再检查数据访问层的字段校验、类型转换和事务。

## 事务与软删除

两种实现都支持 `CompleteModel` 的生命周期字段，但底层做法不同：

- Rain 使用 `AkoRain.instance.transaction`，并尝试启用 Hibernate 的 `_ako_soft_delete` Filter；`SoftDeleteAccess` 通过 QueryRewriter 把删除语句改写成更新 `deleteTime`。
- Spring 使用 `AkoSpringRuntime.transaction` 和 Spring 的 `PlatformTransactionManager`；基于 Spring Data 的数据库实现对 `SoftDeleteModel` 显式更新 `deleteTime`，并在 Criteria 查询中排除已删除的数据。

两边方法名相同，但软删除、事务传播和异常回滚的行为不一定一致。详细对比见 [数据访问与事务](/backend/rain/data-access)。

## 下一步

- [项目创建](/backend/rain/project)：依赖、Boot 版本和配置文件。
- [数据访问与事务](/backend/rain/data-access)：Access/Repository、查询、事务、软删除和保存钩子。
- [控制器与接口](/backend/rain/controllers)：菜单、模型和认证接口的完整写法。
- [内置工具](/backend/rain/tools)：运行时、Access 查找、元数据和错误工具。
- [实体模型](/backend/rain/models)：两种框架下的实体、Access/Repository 和字段声明。
- [注解功能](/backend/rain/annotations)：与框架无关的 Ako 注解及其前端效果。
- [前端联动](/backend/rain/frontend)：从元数据到页面的完整过程。
