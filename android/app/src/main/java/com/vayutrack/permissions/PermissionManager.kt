package com.vayutrack.permissions

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.annotation.RequiresApi
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

/**
 * Unified runtime-permission system for VayuTrack (Android min SDK 26, target SDK 34).
 *
 * Enforces Android 10/11+ location partitioning contracts, background telemetry
 * dead-reckoning guarantees, gated SMS crash alert permissions, and permanent-denial resolution.
 */
class PermissionManager(
    private val context: Context
) {

    private val _permissionState = MutableStateFlow(VayuTrackPermissionState())
    val permissionState: StateFlow<VayuTrackPermissionState> = _permissionState.asStateFlow()

    // Activity Result Launchers registered with AndroidX contracts
    private var multiplePermissionsLauncher: ActivityResultLauncher<Array<String>>? = null
    private var backgroundLocationLauncher: ActivityResultLauncher<String>? = null
    private var smsPermissionLauncher: ActivityResultLauncher<String>? = null

    // Weak/transient reference to current host activity for rationale evaluation & navigation
    private var hostActivity: ComponentActivity? = null

    init {
        // Initial state population based on current app grants
        refreshPermissionState()
    }

    /**
     * Must be invoked during ComponentActivity.onCreate() before the activity enters RESUMED state.
     */
    fun register(activity: ComponentActivity) {
        this.hostActivity = activity

        // 1. Unified Foreground Core Launcher: FINE/COARSE LOCATION + ACTIVITY_RECOGNITION + POST_NOTIFICATIONS
        multiplePermissionsLauncher = activity.registerForActivityResult(
            ActivityResultContracts.RequestMultiplePermissions()
        ) { results: Map<String, Boolean> ->
            onForegroundPermissionsResult(activity, results)
        }

        // 2. Dedicated Step 2 Background Location Launcher (Android 10+ rule)
        backgroundLocationLauncher = activity.registerForActivityResult(
            ActivityResultContracts.RequestPermission()
        ) { isGranted: Boolean ->
            onBackgroundLocationResult(activity, isGranted)
        }

        // 3. Gated Impact Sense SMS Launcher
        smsPermissionLauncher = activity.registerForActivityResult(
            ActivityResultContracts.RequestPermission()
        ) { isGranted: Boolean ->
            onSmsPermissionResult(activity, isGranted)
        }

        refreshPermissionState()
    }

    /**
     * Clear activity reference to prevent memory leaks when activity is destroyed.
     */
    fun unregister() {
        this.hostActivity = null
        this.multiplePermissionsLauncher = null
        this.backgroundLocationLauncher = null
        this.smsPermissionLauncher = null
    }

    /**
     * Synchronizes current Android system grants with the reactive StateFlow.
     */
    fun refreshPermissionState() {
        val fineLocation = isGranted(Manifest.permission.ACCESS_FINE_LOCATION)
        val coarseLocation = isGranted(Manifest.permission.ACCESS_COARSE_LOCATION)
        val backgroundLocation = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            isGranted(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
        } else {
            true // Prior to Android 10, foreground location covered background service access
        }

        val activityRecognition = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            isGranted(Manifest.permission.ACTIVITY_RECOGNITION)
        } else {
            true // Automatically granted at install time on Android 9 and lower
        }

        val notificationPermission = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            isGranted(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            true // Notification permission was granted by default prior to Android 13
        }

        val sendSms = isGranted(Manifest.permission.SEND_SMS)

        _permissionState.update { current ->
            current.copy(
                hasFineLocation = fineLocation,
                hasCoarseLocation = coarseLocation,
                hasBackgroundLocation = backgroundLocation,
                hasActivityRecognition = activityRecognition,
                hasNotificationPermission = notificationPermission,
                hasSendSmsPermission = sendSms
            )
        }
    }

    // =========================================================================
    // 1. FOREGROUND PERMISSIONS MULTI-REQUEST (STEP 1)
    // =========================================================================

    /**
     * Requests core runtime permissions simultaneously:
     * - ACCESS_FINE_LOCATION & ACCESS_COARSE_LOCATION
     * - ACTIVITY_RECOGNITION (SDK 29+)
     * - POST_NOTIFICATIONS (SDK 33+)
     */
    fun requestCoreForegroundPermissions() {
        val launcher = multiplePermissionsLauncher
            ?: throw IllegalStateException("PermissionManager must be registered in Activity.onCreate()")

        val permissionsToRequest = mutableListOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            permissionsToRequest.add(Manifest.permission.ACTIVITY_RECOGNITION)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissionsToRequest.add(Manifest.permission.POST_NOTIFICATIONS)
        }

        val ungranted = permissionsToRequest.filterNot { isGranted(it) }

        if (ungranted.isEmpty()) {
            refreshPermissionState()
            return
        }

        launcher.launch(ungranted.toTypedArray())
    }

    private fun onForegroundPermissionsResult(
        activity: ComponentActivity,
        results: Map<String, Boolean>
    ) {
        refreshPermissionState()

        val newlyDenied = mutableSetOf<String>()
        val permanentlyDenied = mutableSetOf<String>()

        for ((perm, granted) in results) {
            if (!granted) {
                newlyDenied.add(perm)
                // If not granted and system says do NOT show rationale, user selected "Don't ask again"
                val shouldShowRationale = ActivityCompat.shouldShowRequestPermissionRationale(activity, perm)
                if (!shouldShowRationale) {
                    permanentlyDenied.add(perm)
                }
            }
        }

        if (permanentlyDenied.isNotEmpty()) {
            _permissionState.update { current ->
                current.copy(
                    permanentlyDeniedPermissions = current.permanentlyDeniedPermissions + permanentlyDenied,
                    showPermanentDenialSettingsDialog = true,
                    permanentlyDeniedRationaleMessage = "VayuTrack requires location, motion, and notification permissions to run sensor fusion navigation. Please grant them in System Settings."
                )
            }
        } else if (_permissionState.value.hasFineLocation && !_permissionState.value.hasBackgroundLocation) {
            // Once foreground location is granted, immediately stage Step 2 background location
            promptBackgroundLocationRationale()
        }
    }

    // =========================================================================
    // 2. TWO-STEP BACKGROUND LOCATION (STEP 2: ANDROID 10+ RULE)
    // =========================================================================

    /**
     * Triggers the rationale dialog explaining why background location is needed
     * for dead-reckoning inside GPS-denied tunnels before prompting system settings.
     */
    fun promptBackgroundLocationRationale() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            return
        }

        if (!isGranted(Manifest.permission.ACCESS_FINE_LOCATION)) {
            // Per Android guidelines: NEVER request background location if foreground is not yet granted
            requestCoreForegroundPermissions()
            return
        }

        if (isGranted(Manifest.permission.ACCESS_BACKGROUND_LOCATION)) {
            _permissionState.update { it.copy(showBackgroundLocationRationaleDialog = false) }
            return
        }

        _permissionState.update { it.copy(showBackgroundLocationRationaleDialog = true) }
    }

    /**
     * User confirmed rationale dialog; proceed with the system background prompt.
     */
    @RequiresApi(Build.VERSION_CODES.Q)
    fun proceedWithBackgroundLocationRequest() {
        _permissionState.update { it.copy(showBackgroundLocationRationaleDialog = false) }

        val launcher = backgroundLocationLauncher
        val activity = hostActivity
        if (launcher == null || activity == null) return

        // On Android 11+ (API 30+), requesting ACCESS_BACKGROUND_LOCATION directly opens the system settings
        // permission screen. On Android 10 (API 29), it displays the three-option dialog.
        launcher.launch(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
    }

    fun dismissBackgroundLocationRationale() {
        _permissionState.update { it.copy(showBackgroundLocationRationaleDialog = false) }
    }

    private fun onBackgroundLocationResult(activity: ComponentActivity, isGranted: Boolean) {
        refreshPermissionState()

        if (!isGranted && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val shouldShowRationale = ActivityCompat.shouldShowRequestPermissionRationale(
                activity,
                Manifest.permission.ACCESS_BACKGROUND_LOCATION
            )

            if (!shouldShowRationale) {
                // Permanently denied background location
                _permissionState.update { current ->
                    current.copy(
                        permanentlyDeniedPermissions = current.permanentlyDeniedPermissions + Manifest.permission.ACCESS_BACKGROUND_LOCATION,
                        showPermanentDenialSettingsDialog = true,
                        permanentlyDeniedRationaleMessage = "Background location is required for uninterrupted tunnel dead-reckoning. Please select 'Allow all the time' in App Permissions."
                    )
                }
            }
        }
    }

    // =========================================================================
    // 3. GATED IMPACT SENSE EMERGENCY SMS FLOW
    // =========================================================================

    /**
     * Called when the user toggles "Emergency Alerts" in the settings UI.
     * Only requests SEND_SMS at the exact point of user intent.
     */
    fun setEmergencyAlertsEnabled(enabled: Boolean) {
        _permissionState.update { it.copy(isEmergencyAlertsEnabled = enabled) }

        if (enabled && !isGranted(Manifest.permission.SEND_SMS)) {
            requestSmsPermission()
        }
    }

    fun requestSmsPermission() {
        val launcher = smsPermissionLauncher
        val activity = hostActivity
        if (launcher == null || activity == null) return

        if (isGranted(Manifest.permission.SEND_SMS)) {
            refreshPermissionState()
            return
        }

        val shouldShowRationale = ActivityCompat.shouldShowRequestPermissionRationale(
            activity,
            Manifest.permission.SEND_SMS
        )

        if (!shouldShowRationale && _permissionState.value.permanentlyDeniedPermissions.contains(Manifest.permission.SEND_SMS)) {
            // Already permanently denied, direct to settings
            _permissionState.update { current ->
                current.copy(
                    showPermanentDenialSettingsDialog = true,
                    permanentlyDeniedRationaleMessage = "SMS permission is required by Impact Sense to alert emergency contacts upon crash detection. Please enable SMS in Settings."
                )
            }
            return
        }

        launcher.launch(Manifest.permission.SEND_SMS)
    }

    private fun onSmsPermissionResult(activity: ComponentActivity, isGranted: Boolean) {
        refreshPermissionState()

        if (!isGranted) {
            val shouldShowRationale = ActivityCompat.shouldShowRequestPermissionRationale(
                activity,
                Manifest.permission.SEND_SMS
            )

            if (!shouldShowRationale) {
                _permissionState.update { current ->
                    current.copy(
                        permanentlyDeniedPermissions = current.permanentlyDeniedPermissions + Manifest.permission.SEND_SMS,
                        showPermanentDenialSettingsDialog = true,
                        permanentlyDeniedRationaleMessage = "SMS permission was permanently denied. Enable it in App Settings to use Emergency Crash Dispatch."
                    )
                }
            }
        }
    }

    // =========================================================================
    // 4. PERMANENT DENIAL & SYSTEM SETTINGS ROUTING
    // =========================================================================

    /**
     * Directs user to the system application details settings page when permissions
     * have been marked "Don't ask again" / permanently denied.
     */
    fun openAppSettings() {
        _permissionState.update {
            it.copy(
                showPermanentDenialSettingsDialog = false,
                permanentlyDeniedRationaleMessage = null
            )
        }

        val activity = hostActivity ?: return
        val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
            data = Uri.fromParts("package", activity.packageName, null)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        activity.startActivity(intent)
    }

    fun dismissPermanentDenialDialog() {
        _permissionState.update {
            it.copy(
                showPermanentDenialSettingsDialog = false,
                permanentlyDeniedRationaleMessage = null
            )
        }
    }

    // =========================================================================
    // INTERNAL HELPERS
    // =========================================================================

    private fun isGranted(permission: String): Boolean {
        return ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
    }
}
