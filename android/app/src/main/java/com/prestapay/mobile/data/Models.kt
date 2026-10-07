package com.prestapay.mobile.data

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

@Serializable data class Membership(val id: String, val tenantId: String, val role: String, val status: String)
@Serializable data class MeResponse(val user: ApiUser, val memberships: List<Membership>)
@Serializable data class ApiUser(val uid: String, val email: String? = null, val superAdmin: Boolean = false)
@Serializable data class Summary(val clients: Int, val activeLoans: Int, val heldArticles: Int, val outstandingBalance: Double)
@Serializable data class ApiList<T>(val data: List<T>)
@Serializable data class Client(val id: String = "", val name: String, val phone: String = "", val address: String = "")
@Serializable data class Loan(val id: String = "", val clientName: String? = null, val clientId: String, val type: String, val capital: Double, val rate: Double, val installments: Int, val balance: Double, val status: String, val dueDate: String)
@Serializable data class Article(val id: String = "", val name: String, val category: String, val brand: String, val state: String, val description: String = "")
@Serializable data class CashTransaction(val id: String = "", val type: String, val amount: Double, val description: String? = null)
@Serializable data class CreateResult(val id: String)
@Serializable data class ReceiptModel(val businessName: String, val taxId: String, val address: String, val phone: String, val number: String, val customer: String, val description: String, val amount: Double, val currency: String = "DOP", val footer: String = "Gracias por su pago", val paperWidth: Int = 80)
@Serializable data class ErrorBody(val error: String, val details: JsonElement? = null)
