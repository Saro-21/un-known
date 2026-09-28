package com.vayutrack.permissions

/**
 * Immutable state representation of all runtime permissions required by VayuTrack.
 *
 * Observable via StateFlow in Jetpack Compose to display reactive warning banners,
 * degradation indicators, and action dialogs.
 */
data class VayuTrackPermissionState(
    val hasFineLocation: Boolean = false,
    val hasCoarseLocation: Boolean = false,
    val hasBackgroundLocation: Boolean = false,
    val hasActivityRecognition: Boolean = false,
    val hasNotificationPermission: Boolean = false,
    val hasSendSmsPermission: Boolean = false,
    val isEmergencyAlertsEnabled: Boolean = false,
    val permanentlyDeniedPermissions: Set<String> = emptySet(),
    val showBackgroundLocationRationaleDialog: Boolean = false,
    val showPermanentDenialSettingsDialog: Boolean = false,
    val permanentlyDeniedRationaleMessage: String? = null
) {
    /**
     * Determines whether core foreground sensor and GNSS acquisition can operate.
     */
    val hasCoreForegroundClearance: Boolean
        get() = hasFineLocation && hasActivityRecognition && hasNotificationPermission

    /**
     * Determines whether dead-reckoning fusion can continue uninterrupted through long
     * tunnels when the screen is locked or the driver switches to another app (e.g. music/calls).
     */
    val hasFullTunnelFusionClearance: Boolean
        get() = hasCoreForegroundClearance && hasBackgroundLocation

    /**
     * Reactive banner display indicator for Jetpack Compose UI.
     */
    val activeBannerType: BannerType?
        get() = when {
            !hasFineLocation -> BannerType.LOCATION_DENIED
            !hasBackgroundLocation -> BannerType.BACKGROUND_LOCATION_MISSING
            !hasNotificationPermission -> BannerType.NOTIFICATION_MISSING
            isEmergencyAlertsEnabled && !hasSendSmsPermission -> BannerType.SMS_MISSING_FOR_EMERGENCY
            else -> null
        }

    enum class BannerType {
        LOCATION_DENIED,
        BACKGROUND_LOCATION_MISSING,
        NOTIFICATION_MISSING,
        SMS_MISSING_FOR_EMERGENCY
    }
}
