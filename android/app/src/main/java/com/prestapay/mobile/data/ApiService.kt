package com.prestapay.mobile.data

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface ApiService {
    @GET("v1/me") suspend fun me(): MeResponse
    @GET("v1/summary") suspend fun summary(): Summary
    @GET("v1/clients") suspend fun clients(): ApiList<Client>
    @POST("v1/clients") suspend fun createClient(@Body client: Client): CreateResult
    @GET("v1/loans") suspend fun loans(): ApiList<Loan>
    @GET("v1/articles") suspend fun articles(): ApiList<Article>
    @GET("v1/transactions") suspend fun transactions(): ApiList<CashTransaction>
}
