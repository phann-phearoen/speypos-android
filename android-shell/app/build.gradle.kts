import java.io.File

plugins {
  id("com.android.application")
  id("org.jetbrains.kotlin.android")
}

val repoRoot = rootProject.projectDir.parentFile
val frontendDistDir = File(repoRoot, "speypos-pwa/dist")
val generatedWebAssetsDir = layout.buildDirectory.dir("generated/web-assets/main/assets")
val webAssetsDir = generatedWebAssetsDir.map { it.dir("web") }

android {
  namespace = "com.speypos.shell"
  compileSdk = 34

  defaultConfig {
    applicationId = "com.speypos.shell"
    minSdk = 26
    targetSdk = 34
    versionCode = 1
    versionName = "0.1.0"
  }

  buildTypes {
    release {
      isMinifyEnabled = false
      proguardFiles(
        getDefaultProguardFile("proguard-android-optimize.txt"),
        "proguard-rules.pro"
      )
    }
  }

  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }

  kotlinOptions {
    jvmTarget = "17"
  }

  buildFeatures {
    viewBinding = true
  }

  sourceSets.getByName("main").assets.srcDir(generatedWebAssetsDir)
}

dependencies {
  implementation("androidx.core:core-ktx:1.13.1")
  implementation("androidx.appcompat:appcompat:1.7.0")
  implementation("com.google.android.material:material:1.12.0")
}

val buildFrontendForAndroid = tasks.register<Exec>("buildFrontendForAndroid") {
  workingDir = repoRoot
  commandLine("npm", "run", "pwa:build:android-webview")
}

val syncWebAssets = tasks.register<Copy>("syncWebAssets") {
  dependsOn(buildFrontendForAndroid)
  from(frontendDistDir)
  into(webAssetsDir.map { it.asFile })
}

tasks.named("preBuild") {
  dependsOn(syncWebAssets)
}