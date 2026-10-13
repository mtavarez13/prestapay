package com.prestapay.mobile

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreSettings
import com.google.firebase.firestore.PersistentCacheSettings
import com.prestapay.mobile.notifications.LoanReminderWorker
import java.util.concurrent.TimeUnit

class PrestaPayApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        if (FirebaseApp.getApps(this).isEmpty()) {
            require(BuildConfig.FIREBASE_API_KEY.isNotBlank() && BuildConfig.FIREBASE_APP_ID.isNotBlank()) {
                "Configure PRESTAPAY_FIREBASE_API_KEY y PRESTAPAY_FIREBASE_APP_ID"
            }
            FirebaseApp.initializeApp(this, FirebaseOptions.Builder()
                .setApiKey(BuildConfig.FIREBASE_API_KEY)
                .setApplicationId(BuildConfig.FIREBASE_APP_ID)
                .setProjectId(BuildConfig.FIREBASE_PROJECT_ID)
                .build())
        }
        FirebaseFirestore.getInstance().firestoreSettings = FirebaseFirestoreSettings.Builder()
            .setLocalCacheSettings(PersistentCacheSettings.newBuilder().build()).build()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getSystemService(NotificationManager::class.java).createNotificationChannel(
                NotificationChannel(LoanReminderWorker.CHANNEL_ID, "Recordatorios de cobro", NotificationManager.IMPORTANCE_DEFAULT)
            )
        }
        val reminders = PeriodicWorkRequestBuilder<LoanReminderWorker>(24, TimeUnit.HOURS).build()
        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            LoanReminderWorker.WORK_NAME, ExistingPeriodicWorkPolicy.UPDATE, reminders
        )
    }
}
