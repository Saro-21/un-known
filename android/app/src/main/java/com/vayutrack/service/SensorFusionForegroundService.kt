package com.vayutrack.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Binder
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

/**
 * Foreground Service hosting continuous high-rate inertial sensor telemetry acquisition.
 *
 * Runs with FOREGROUND_SERVICE_TYPE_LOCATION to guarantee unthrottled background execution
 * on Android 10-14+ when the app is backgrounded or screen locked during tunnel navigation.
 */
class SensorFusionForegroundService : Service(), SensorEventListener {

    companion object {
        const val NOTIFICATION_CHANNEL_ID = "vayutrack_sensor_fusion_channel"
        const val NOTIFICATION_ID = 4099
        const val WAKELOCK_TAG = "VayuTrack::SensorFusionWakeLock"

        const val ACTION_START_FUSION = "com.vayutrack.action.START_FUSION"
        const val ACTION_STOP_FUSION = "com.vayutrack.action.STOP_FUSION"

        fun startService(context: Context) {
            val intent = Intent(context, SensorFusionForegroundService::class.java).apply {
                action = ACTION_START_FUSION
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stopService(context: Context) {
            val intent = Intent(context, SensorFusionForegroundService::class.java).apply {
                action = ACTION_STOP_FUSION
            }
            context.startService(intent)
        }
    }

    data class SensorTelemetryState(
        val isRunning: Boolean = false,
        val accelSamples: Long = 0,
        val gyroSamples: Long = 0,
        val magSamples: Long = 0,
        val currentHz: Float = 0f,
        val lastTimestampNs: Long = 0,
        val isTunnelDeadReckoningActive: Boolean = false
    )

    private val binder = LocalBinder()
    private val _telemetryState = MutableStateFlow(SensorTelemetryState())
    val telemetryState: StateFlow<SensorTelemetryState> = _telemetryState.asStateFlow()

    private var sensorManager: SensorManager? = null
    private var accelerometer: Sensor? = null
    private var gyroscope: Sensor? = null
    private var magnetometer: Sensor? = null

    // Dedicated high-priority looper thread to prevent blocking main UI thread at SENSOR_DELAY_FASTEST
    private var sensorThread: HandlerThread? = null
    private var sensorHandler: Handler? = null

    private var wakeLock: PowerManager.WakeLock? = null

    // Hz calculation metrics
    private var sampleCounter = 0
    private var lastHzCalculationTime = System.currentTimeMillis()

    inner class LocalBinder : Binder() {
        fun getService(): SensorFusionForegroundService = this@SensorFusionForegroundService
    }

    override fun onBind(intent: Intent?): IBinder = binder

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()

        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        accelerometer = sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        gyroscope = sensorManager?.getDefaultSensor(Sensor.TYPE_GYROSCOPE)
        magnetometer = sensorManager?.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD)

        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, WAKELOCK_TAG).apply {
            setReferenceCounted(false)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP_FUSION -> {
                stopSensorFusion()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
                return START_NOT_STICKY
            }
            ACTION_START_FUSION, null -> {
                startForegroundWithLocationType()
                startSensorFusion()
            }
        }
        return START_STICKY
    }

    private fun startForegroundWithLocationType() {
        val notification = buildPersistentNotification()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // Android 10+ requires specifying FOREGROUND_SERVICE_TYPE_LOCATION for continuous GNSS/dead-reckoning
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun startSensorFusion() {
        if (_telemetryState.value.isRunning) return

        wakeLock?.acquire(12 * 60 * 60 * 1000L) // 12h safety timeout

        // Initialize dedicated HandlerThread for sensor callbacks
        sensorThread = HandlerThread("VayuTrack-SensorThread", android.os.Process.THREAD_PRIORITY_URGENT_DISPLAY).apply {
            start()
            sensorHandler = Handler(looper)
        }

        val handler = sensorHandler

        // Register sensors at maximum possible hardware sampling frequency
        accelerometer?.let {
            sensorManager?.registerListener(this, it, SensorManager.SENSOR_DELAY_FASTEST, handler)
        }
        gyroscope?.let {
            sensorManager?.registerListener(this, it, SensorManager.SENSOR_DELAY_FASTEST, handler)
        }
        magnetometer?.let {
            sensorManager?.registerListener(this, it, SensorManager.SENSOR_DELAY_FASTEST, handler)
        }

        _telemetryState.update { it.copy(isRunning = true) }
    }

    private fun stopSensorFusion() {
        sensorManager?.unregisterListener(this)

        sensorThread?.quitSafely()
        sensorThread = null
        sensorHandler = null

        if (wakeLock?.isHeld == true) {
            wakeLock?.release()
        }

        _telemetryState.update { it.copy(isRunning = false, currentHz = 0f) }
    }

    override fun onSensorChanged(event: SensorEvent?) {
        event ?: return

        val nowNs = event.timestamp
        sampleCounter++

        // Periodically compute Hz every 1 second
        val nowMs = System.currentTimeMillis()
        if (nowMs - lastHzCalculationTime >= 1000) {
            val deltaSec = (nowMs - lastHzCalculationTime) / 1000f
            val hz = sampleCounter / deltaSec
            sampleCounter = 0
            lastHzCalculationTime = nowMs

            _telemetryState.update { current ->
                current.copy(currentHz = hz)
            }
        }

        when (event.sensor.type) {
            Sensor.TYPE_ACCELEROMETER -> {
                _telemetryState.update { current ->
                    current.copy(
                        accelSamples = current.accelSamples + 1,
                        lastTimestampNs = nowNs
                    )
                }
            }
            Sensor.TYPE_GYROSCOPE -> {
                _telemetryState.update { current ->
                    current.copy(
                        gyroSamples = current.gyroSamples + 1,
                        lastTimestampNs = nowNs
                    )
                }
            }
            Sensor.TYPE_MAGNETIC_FIELD -> {
                _telemetryState.update { current ->
                    current.copy(
                        magSamples = current.magSamples + 1,
                        lastTimestampNs = nowNs
                    )
                }
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        // Handled for calibration changes
    }

    override fun onDestroy() {
        stopSensorFusion()
        super.onDestroy()
    }

    // =========================================================================
    // PERSISTENT LOW-PRIORITY NOTIFICATION (LOW USER DISTRACTION)
    // =========================================================================

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "VayuTrack Telematics & Sensor Fusion",
                NotificationManager.IMPORTANCE_LOW // Low priority: silent, non-intrusive
            ).apply {
                description = "Monitors vehicle dynamics & dead-reckoning kinematics inside tunnels"
                setShowBadge(false)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }

            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildPersistentNotification(): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setContentTitle("VayuTrack Fusion Engine Active")
            .setContentText("Continuous inertial dead-reckoning running in background")
            .setSmallIcon(android.R.drawable.ic_menu_compass)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setContentIntent(pendingIntent)
            .build()
    }
}
