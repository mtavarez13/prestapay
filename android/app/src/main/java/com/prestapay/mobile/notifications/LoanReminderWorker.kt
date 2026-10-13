package com.prestapay.mobile.notifications

import android.Manifest
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.prestapay.mobile.MainActivity
import com.prestapay.mobile.R
import com.prestapay.mobile.data.SessionStore
import kotlinx.coroutines.tasks.await
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

class LoanReminderWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        if (FirebaseAuth.getInstance().currentUser == null) return Result.success()
        val tenantId = SessionStore(applicationContext).tenantId() ?: return Result.success()
        return runCatching {
            val today = LocalDate.now(ZONE)
            val loans = FirebaseFirestore.getInstance().collection("tenants/$tenantId/loans").get().await()
            val open = loans.documents.filter { it.getString("status") != "pagado" }
            val dueToday = open.count { dueDate(it.getString("nextPaymentDate") ?: it.getString("dueDate")) == today }
            val overdue = open.count { dueDate(it.getString("nextPaymentDate") ?: it.getString("dueDate"))?.isBefore(today) == true }
            if (dueToday + overdue > 0) notify(dueToday, overdue)
            Result.success()
        }.getOrElse { Result.retry() }
    }

    private fun notify(today: Int, overdue: Int) {
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(applicationContext, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
        val intent = Intent(applicationContext, MainActivity::class.java)
        val pending = PendingIntent.getActivity(applicationContext, 0, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val message = "$today cobros para hoy · $overdue atrasados"
        val notification = NotificationCompat.Builder(applicationContext, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification).setContentTitle("PrestaPay · Cobros pendientes")
            .setContentText(message).setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setContentIntent(pending).setAutoCancel(true).build()
        NotificationManagerCompat.from(applicationContext).notify(REMINDER_ID, notification)
    }

    private fun dueDate(value: String?): LocalDate? = value?.let { text ->
        runCatching { Instant.parse(text).atZone(ZONE).toLocalDate() }
            .recoverCatching { LocalDate.parse(text.take(10)) }.getOrNull()
    }

    companion object {
        const val CHANNEL_ID = "loan_reminders"
        const val WORK_NAME = "daily_loan_reminders"
        private const val REMINDER_ID = 2107
        private val ZONE: ZoneId = ZoneId.of("America/Santo_Domingo")
    }
}
