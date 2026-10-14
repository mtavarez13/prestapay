package com.prestapay.mobile.data

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

@Serializable data class Permissions(val viewHistory: Boolean = false, val manageLoans: Boolean = false, val manageClients: Boolean = false, val manageInventory: Boolean = false, val manageCash: Boolean = false, val manageStaff: Boolean = false, val manageSettings: Boolean = false)
@Serializable data class Membership(val id: String = "", val tenantId: String, val role: String, val status: String, val permissions: Permissions = Permissions())
@Serializable data class MeResponse(val user: ApiUser, val memberships: List<Membership>)
@Serializable data class ApiUser(val uid: String, val email: String? = null, val superAdmin: Boolean = false)
@Serializable data class Summary(val clients: Int, val activeClients: Int = 0, val activeLoans: Int, val onTimeLoans: Int = 0, val overdueLoans: Int = 0, val capitalInvested: Double = 0.0, val heldArticles: Int, val outstandingBalance: Double)
@Serializable data class ApiList<T>(val data: List<T>)
@Serializable data class Client(val id: String = "", val name: String, val phone: String = "", val address: String = "", val identityNumber: String? = null, val createdAt: String? = null)
@Serializable data class ClientCreate(val name: String, val phone: String = "", val address: String = "")
@Serializable data class Loan(val id: String = "", val clientName: String? = null, val clientId: String, val type: String, val capital: Double, val rate: Double, val installments: Int, val paymentFrequency: String = "mensual", val installmentAmount: Double? = null, val interestAmount: Double? = null, val totalPayable: Double? = null, val nextPaymentDate: String? = null, val contractNumber: String? = null, val balance: Double, val status: String, val dueDate: String, val createdAt: String? = null)
@Serializable data class LoanCreate(val clientId: String, val clientName: String, val type: String, val capital: Double, val rate: Double, val installments: Int, val paymentFrequency: String = "mensual", val installmentAmount: Double? = null, val interestAmount: Double? = null, val totalPayable: Double? = null, val nextPaymentDate: String? = null, val contractNumber: String? = null, val balance: Double, val status: String = "activo", val dueDate: String)
@Serializable data class Article(val id: String = "", val name: String, val category: String, val brand: String, val state: String, val description: String = "")
@Serializable data class ArticleCreate(val name: String, val category: String, val brand: String, val state: String = "en_resguardo", val description: String = "", val contractId: String? = null, val clientId: String? = null)
@Serializable data class CashTransaction(val id: String = "", val type: String, val amount: Double, val description: String? = null)
@Serializable data class TransactionCreate(val contractId: String? = null, val type: String, val amount: Double, val description: String, val paymentMode: String = "custom", val installmentCount: Int? = null)
@Serializable data class CreateResult(val id: String, val receiptId: String? = null, val receiptNumber: String? = null, val previousBalance: Double = 0.0, val newBalance: Double = 0.0, val installmentsCovered: Int = 0)
@Serializable data class TenantCreate(val businessName: String, val legalName: String? = null, val taxId: String? = null, val phone: String? = null, val address: String? = null)
@Serializable data class TenantCreateResponse(val tenant: TenantInfo, val membership: Membership)
@Serializable data class BrandingInfo(val businessName: String = "PrestaPay", val legalName: String = "", val taxId: String = "", val address: String = "", val phone: String = "", val email: String = "", val currency: String = "DOP")
@Serializable data class PrinterInfo(val paperWidth: Int = 80, val marginMm: Int = 3, val copies: Int = 1, val footer: String = "Gracias por su pago")
@Serializable data class SubscriptionInfo(val status: String = "", val currentPeriodEnd: String = "", val accessAllowed: Boolean = false)
@Serializable data class TenantInfo(val id: String, val branding: BrandingInfo = BrandingInfo(), val printer: PrinterInfo = PrinterInfo(), val subscription: SubscriptionInfo = SubscriptionInfo())
@Serializable data class TenantContextResponse(val tenant: TenantInfo, val membership: Membership)
@Serializable data class ReceiptModel(val businessName: String, val taxId: String, val address: String, val phone: String, val number: String, val customer: String, val description: String, val amount: Double, val currency: String = "DOP", val footer: String = "Gracias por su pago", val paperWidth: Int = 80)
@Serializable data class ErrorBody(val error: String, val details: JsonElement? = null)
