import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    kotlin("jvm") version "2.4.0"
    application
}

group = "com.ako-dev"
version = "0.0.1"

val akoVersion = "0.0.17"
val rainVersion = "1.0.0-DEV7"
val smartWebVersion = "1.0.0-DEV9"
val smartAccessVersion = "1.0.0-DEV11"

repositories {
    mavenLocal()
    mavenCentral()
    maven("https://maven.cnb.cool/IceCream/maven/-/packages/")
}

dependencies {
    implementation("com.ako-dev:ako-rain:$akoVersion")

    implementation("com.IceCreamQAQ.Rain:application:$rainVersion")
    implementation("com.IceCreamQAQ.Rain:controller:$rainVersion")
    implementation("com.IceCreamQAQ.SmartWeb.Server:SmartHTTP:$smartWebVersion")
    implementation("com.IceCreamQAQ.SmartAccess:hibernate5:$smartAccessVersion")

    runtimeOnly("com.h2database:h2:2.4.240")
}

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}

application {
    mainClass.set("showcase.MainKt")
}

// Rain 也会读取工作目录下的 conf/，H2 数据库同样写在工作目录里
tasks.named<JavaExec>("run") {
    val runDir = layout.projectDirectory.dir("run").asFile
    doFirst { runDir.mkdirs() }
    workingDir = runDir
}
