---
title: 开始
description: 使用 ako-rain 或 ako-spring 启动 JVM 后端，并接通 Ako 管理后台接口。
---

# 开始

项目创建完成后，这一页负责把 JVM 后端真正启动起来。`ako-rain` 和 `ako-spring` 都要完成同一条 Ako 链路：注册 Runtime、发现模型、提供菜单/模型接口，再让前端打开页面。

本页的差异代码使用统一的框架选择器。它会沿用你在其他 JVM 页面中的选择，并保存到浏览器 `localStorage`。

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
    note: 'Rain 依赖 SmartWeb 和 SmartAccess；完整仓库配置与版本说明见项目创建。',
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
    note: '这是 Boot 3 示例；Boot 4 把 ako-springboot-3 换成 ako-springboot-4。Boot 2 见项目创建的兼容说明。',
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
    note: 'Rain 完整启动器负责模块初始化；ako-rain 通过 Rain 模块配置注册 AkoRain。',
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
    note: 'Spring Boot 自动配置负责创建 AkoSpringRuntime；不要手工再 new 一个 Runtime。',
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
    note: 'Rain 的扫描、Web 和 SmartAccess 配置由 Rain 生态解释；ako-rain 的模块配置会注册 AkoRain。',
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
    note: 'Spring Boot 由 application.yml 创建数据源、JPA 和 Web 环境；Spring 自动配置会注册 AkoSpringRuntime 与 Spring Data 数据库实现。',
  },
]
</script>

<CodeSwitch :variants="dependencyExamples" />

## 启动应用

<CodeSwitch :variants="launcherExamples" />

两段启动代码不能互换：Rain 使用自己的 ApplicationService/ClassRegister 生命周期，Spring 使用 ApplicationContext 和自动配置。两者最终都会初始化 Ako Runtime，但初始化入口不同。

## 配置宿主框架

<CodeSwitch :variants="configurationExamples" />

Rain 使用 `rain.scanPackages` 和 SmartAccess 的配置键；Spring 使用组件扫描、`spring.datasource`、`spring.jpa` 和可选的 `@EnableJpaRepositories`。差异来自宿主框架配置模型，不是 Ako 协议差异。

## 模型发现

| 检查项 | `ako-rain` | `ako-spring` |
| --- | --- | --- |
| Runtime | `AkoRain` | `AkoSpringRuntime` |
| 模型来源 | Rain 发现的 `AkoAccess` 接口 | Spring 容器中的 `AkoSpringDatabase`；Spring Data 时来自 Repository Bean |
| 排除模型 | `@NoAkoModel` | `@NoAkoModel`，在 Runtime 建立模型表时过滤 |
| 模型初始化 | 访问 `modelMap` 时按 Access 延迟创建 | `ContextRefreshedEvent` 后或首次访问 `modelMap` 时创建 |
| 失败重点 | 包未扫描、Access 未注册、SmartAccess 不可用 | Repository 未扫描、数据库 Bean 缺失、事务管理器/JPA 未配置 |

两边都使用 `model.id` 作为前端模型标识，并把同一组 `DbModel`/`DbField` 返回给前端。

## 挂载 Ako 路由

两种实现都要提供：

```text
GET  /api/ako/auth/isAuth
POST /api/ako/auth/login
GET  /api/ako/menu/list/{channel}
POST /api/ako/model/page/{model}
POST /api/ako/model/save/{model}
POST /api/ako/model/delete/{model}
```

具体的控制器代码见 [控制器与接口](/backend/rain/controllers)。Rain 可以直接实现 `IMenuController`/`IModelController`；Spring 当前使用普通 `@RestController` 调用 Ako 核心的 `Menu` 和 `Model` 服务。这是 Web 框架路由机制不同造成的差异。

## 运行检查

启动后，按顺序检查：

```bash
curl http://localhost:17777/api/ako/auth/isAuth
curl http://localhost:17777/api/ako/menu/list/manager
curl -X POST http://localhost:17777/api/ako/model/page/Student \
  -H 'Content-Type: application/json' \
  -d '{"page":1,"size":20,"params":{},"sort":{}}'
```

如果 `models` 为空：

- Rain：检查 `rain.scanPackages`、Access 是否被 ClassRegister 发现，以及 SmartAccess/JPA 服务。
- Spring：检查 `@SpringBootApplication` 的扫描范围、Repository 是否被 `@EnableJpaRepositories` 扫描，以及 `AkoSpringDatabase` 是否成为 Bean。

如果菜单已有模型但分页失败，先对照 [交互规则](/protocol/http-api) 检查请求体，再检查对应数据访问层的字段白名单、类型转换和事务。

## 事务与软删除

两种实现都支持 `CompleteModel` 的模型生命周期，但底层策略不同：

- Rain 使用 `AkoRain.instance.transaction`，并尝试启用 Hibernate `_ako_soft_delete` Filter；`SoftDeleteAccess` 通过 QueryRewriter 处理删除。
- Spring 使用 `AkoSpringRuntime.transaction` 和 Spring `PlatformTransactionManager`；Spring Data 数据库实现对 `SoftDeleteModel` 显式更新 `deleteTime`，并在 Criteria 查询中排除已删除数据。

详细对照见 [数据访问与事务](/backend/rain/data-access)。不要因为两边方法名相同，就假设软删除、事务传播或异常回滚行为完全相同。

## 进一步使用

- [项目创建](/backend/rain/project)：依赖、Boot 版本和配置文件。
- [实体模型](/backend/rain/models)：两种框架下的 Entity、Access/Repository 和字段声明。
- [注解功能](/backend/rain/annotations)：与框架无关的 Ako 注解及其前端效果。
- [前端联动](/backend/rain/frontend)：从元数据到页面的完整链路。
