plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// The wish list's address is fixed at build time: -PappUrl=https://example.github.io/family-registry/
val appUrl = (findProperty("appUrl") as String?) ?: "https://craigpen.github.io/family-registry/"

android {
    namespace = "app.familyregistry.helper"
    compileSdk = 35

    defaultConfig {
        applicationId = "app.familyregistry.helper"
        minSdk = 26
        targetSdk = 35
        versionCode = 10
        versionName = "0.2.1"
        buildConfigField("String", "APP_URL", "\"$appUrl\"")
        // The app icon opens this address; the site's origin is declared for Android's app links check.
        resValue("string", "app_url", appUrl)
        val origin = Regex("^(https?://[^/]+)").find(appUrl)!!.value
        resValue("string", "asset_statements",
            "[{\\\"relation\\\": [\\\"delegate_permission/common.handle_all_urls\\\"], \\\"target\\\": {\\\"namespace\\\": \\\"web\\\", \\\"site\\\": \\\"$origin\\\"}}]")
    }

    buildFeatures { buildConfig = true }

    // Release builds are signed with the family's own key, from CI secrets (see .github/workflows/android.yml).
    // Updates only install over the old app if they're signed with the same key: keep a backup of it.
    signingConfigs {
        create("release") {
            val store = System.getenv("ANDROID_KEYSTORE_FILE")
            if (store != null) {
                storeFile = file(store)
                storeType = "pkcs12"
                storePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("ANDROID_KEY_ALIAS")
                keyPassword = System.getenv("ANDROID_KEY_PASSWORD")
            }
        }
    }
    buildTypes {
        release {
            isMinifyEnabled = false
            if (System.getenv("ANDROID_KEYSTORE_FILE") != null) signingConfig = signingConfigs.getByName("release")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    // Opens the site full-screen in Chrome (Trusted Web Activity).
    implementation("com.google.androidbrowserhelper:androidbrowserhelper:2.5.0")
}

// The same extract.js the browser extension and the iOS Shortcut use.
val copyExtract by tasks.registering(Copy::class) {
    from(rootProject.file("../packages/extract/extract.js"))
    into(layout.projectDirectory.dir("src/main/assets"))
}
tasks.named("preBuild") { dependsOn(copyExtract) }
