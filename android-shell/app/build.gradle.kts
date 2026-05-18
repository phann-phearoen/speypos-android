import java.io.File

plugins {
  id("com.android.application")
  id("org.jetbrains.kotlin.android")
}

val repoRoot = rootProject.projectDir.parentFile
val frontendDistDir = File(repoRoot, "speypos-pwa/dist")
val assetsDir = layout.projectDirectory.dir("src/main/assets/web")
val generatedLauncherIconsDir = layout.buildDirectory.dir("generated/launcher-icons")

android {
  namespace = "com.speypos.shell"
  compileSdk = 34

  defaultConfig {
    applicationId = "com.speypos.shell"
    minSdk = 26
    targetSdk = 34
    versionCode = 2
    versionName = "0.1.1"
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

  sourceSets.getByName("main").res.srcDir(generatedLauncherIconsDir)
}

dependencies {
  implementation("androidx.core:core-ktx:1.13.1")
  implementation("androidx.appcompat:appcompat:1.7.0")
  implementation("com.google.android.material:material:1.12.0")
  implementation("androidx.work:work-runtime-ktx:2.9.1")
  implementation("androidx.webkit:webkit:1.11.0")
}

val buildFrontendForAndroid = tasks.register<Exec>("buildFrontendForAndroid") {
  workingDir = repoRoot
  commandLine("npm", "run", "pwa:build:android-webview")
}

val syncWebAssets = tasks.register<Copy>("syncWebAssets") {
  dependsOn(buildFrontendForAndroid)
  from(frontendDistDir)
  into(assetsDir)
  
  // Force copy every time to ensure fresh assets
  outputs.upToDateWhen { false }
}

val syncLauncherIcons = tasks.register("syncLauncherIcons") {
  val sourceIcon = File(repoRoot, "speypos-pwa/public/pwa-192x192.png")
  inputs.file(sourceIcon)
  outputs.dir(generatedLauncherIconsDir)
  doLast {
    listOf("mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi").forEach { density ->
      val dir = generatedLauncherIconsDir.get().dir("mipmap-$density").asFile
      dir.mkdirs()
      sourceIcon.copyTo(File(dir, "ic_launcher.png"), overwrite = true)
      sourceIcon.copyTo(File(dir, "ic_launcher_round.png"), overwrite = true)
    }
  }
}

tasks.named("preBuild") {
  dependsOn(syncWebAssets)
  dependsOn(syncLauncherIcons)
}