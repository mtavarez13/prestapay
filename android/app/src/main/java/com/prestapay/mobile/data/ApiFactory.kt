package com.prestapay.mobile.data

import com.google.firebase.auth.FirebaseAuth
import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import com.prestapay.mobile.BuildConfig
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.tasks.await
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit

object ApiFactory {
    fun create(auth: FirebaseAuth, tenantId: () -> String?): ApiService {
        val client = OkHttpClient.Builder().addInterceptor { chain ->
            val token = runBlocking { auth.currentUser?.getIdToken(false)?.await()?.token }
                ?: throw IllegalStateException("Sesión no disponible")
            val request = chain.request().newBuilder().header("Authorization", "Bearer $token")
            tenantId()?.let { request.header("X-Tenant-Id", it) }
            chain.proceed(request.build())
        }.apply { if (BuildConfig.DEBUG) addInterceptor(HttpLoggingInterceptor().setLevel(HttpLoggingInterceptor.Level.BASIC)) }.build()
        val json = Json { ignoreUnknownKeys = true; explicitNulls = false }
        return Retrofit.Builder().baseUrl(BuildConfig.API_BASE_URL).client(client)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType())).build().create(ApiService::class.java)
    }
}
