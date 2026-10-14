import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
}

val localFirebase = Properties().apply {
    val file = rootProject.file("firebase.properties")
    if (file.exists()) file.inputStream().use { load(it) }
}
fun env(name: String, fallback: String = "") = providers.gradleProperty(name)
    .orElse(System.getenv(name) ?: localFirebase.getProperty(name) ?: fallback).get()

android {
    namespace = "com.prestapay.mobile"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.prestapay.mobile"
        minSdk = 26
        targetSdk = 35
        versionCode = 4
        versionName = "1.2.0"
        buildConfigField("String", "API_BASE_URL", "\"${env("PRESTAPAY_API_URL", "http://10.0.2.2:8080/")}\"")
        buildConfigField("String", "FIREBASE_API_KEY", "\"${env("PRESTAPAY_FIREBASE_API_KEY")}\"")
        buildConfigField("String", "FIREBASE_APP_ID", "\"${env("PRESTAPAY_FIREBASE_APP_ID")}\"")
        buildConfigField("String", "FIREBASE_PROJECT_ID", "\"${env("PRESTAPAY_FIREBASE_PROJECT_ID", "prestamo-27ccb")}\"")
        buildConfigField("String", "FIREBASE_WEB_CLIENT_ID", "\"${env("PRESTAPAY_FIREBASE_WEB_CLIENT_ID", "1098192394227-r0c4ma9pnu3dcli9qtj90ih51e3fbc1i.apps.googleusercontent.com")}\"")
    }
    buildFeatures { compose = true; buildConfig = true }
    packaging { resources.excludes += "/META-INF/{AL2.0,LGPL2.1}" }
    buildTypes { release { isMinifyEnabled = true; isShrinkResources = true; signingConfig = signingConfigs.getByName("debug"); proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro") } }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation(platform("com.google.firebase:firebase-bom:33.12.0"))
    implementation("com.google.firebase:firebase-auth-ktx")
    implementation("com.google.firebase:firebase-firestore")
    implementation("androidx.credentials:credentials:1.6.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.6.0")
    implementation("com.google.android.libraries.identity.googleid:googleid:1.1.1")
    implementation("androidx.activity:activity-compose:1.10.1")
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.compose.material3:material3:1.3.2")
    implementation("androidx.compose.material:material-icons-extended:1.7.8")
    implementation("androidx.compose.ui:ui-tooling-preview:1.7.8")
    debugImplementation("androidx.compose.ui:ui-tooling:1.7.8")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("androidx.navigation:navigation-compose:2.8.9")
    implementation("androidx.datastore:datastore-preferences:1.1.4")
    implementation("androidx.work:work-runtime-ktx:2.10.1")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.10.2")
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")
    implementation("com.jakewharton.retrofit:retrofit2-kotlinx-serialization-converter:1.0.0")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.8.0")
    testImplementation("junit:junit:4.13.2")
}
