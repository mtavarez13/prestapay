package com.prestapay.mobile.data

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface ApiService {
    @GET("v1/me") suspend fun me(): MeResponse
    @POST("v1/tenants") suspend fun createTenant(@Body value: TenantCreate): TenantCreateResponse
    @GET("v1/tenant") suspend fun tenant(): TenantContextResponse
    @GET("v1/summary") suspend fun summary(): Summary
    @GET("v1/clients") suspend fun clients(): ApiList<Client>
    @POST("v1/clients") suspend fun createClient(@Body client: ClientCreate): CreateResult
    @GET("v1/loans") suspend fun loans(): ApiList<Loan>
    @POST("v1/loans") suspend fun createLoan(@Body loan: LoanCreate): CreateResult
    @GET("v1/articles") suspend fun articles(): ApiList<Article>
    @POST("v1/articles") suspend fun createArticle(@Body article: ArticleCreate): CreateResult
    @GET("v1/transactions") suspend fun transactions(): ApiList<CashTransaction>
    @POST("v1/transactions") suspend fun createTransaction(@Body transaction: TransactionCreate): CreateResult
}
