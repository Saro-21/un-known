package com.vayutrack.ui

import android.os.Build
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vayutrack.permissions.PermissionManager
import com.vayutrack.permissions.VayuTrackPermissionState

/**
 * Reactive Jetpack Compose UI component for VayuTrack.
 *
 * Observes PermissionManager.permissionState StateFlow and presents actionable warning banners,
 * preventing silent degradation of dead-reckoning fusion accuracy.
 */
@Composable
fun VayuTrackPermissionBanner(
    permissionManager: PermissionManager,
    modifier: Modifier = Modifier
) {
    val state by permissionManager.permissionState.collectAsState()

    Column(modifier = modifier.fillMaxWidth()) {
        AnimatedVisibility(
            visible = state.activeBannerType != null,
            enter = fadeIn() + expandVertically(),
            exit = fadeOut() + shrinkVertically()
        ) {
            when (state.activeBannerType) {
                VayuTrackPermissionState.BannerType.LOCATION_DENIED -> {
                    PermissionAlertBanner(
                        title = "Location Access Required",
                        message = "GNSS coordinates are needed to calibrate initial vehicle position and initialize IMU pre-integration.",
                        icon = Icons.Default.LocationOn,
                        buttonLabel = "Grant Location",
                        containerColor = Color(0xFF3E1F1F),
                        contentColor = Color(0xFFFFB4AB),
                        onAction = { permissionManager.requestCoreForegroundPermissions() }
                    )
                }
                VayuTrackPermissionState.BannerType.BACKGROUND_LOCATION_MISSING -> {
                    PermissionAlertBanner(
                        title = "Background Location Missing",
                        message = "Background location is required for uninterrupted tunnel dead-reckoning when the screen is off or navigating in background.",
                        icon = Icons.Default.Warning,
                        buttonLabel = "Fix Degradation",
                        containerColor = Color(0xFF332A15),
                        contentColor = Color(0xFFFFDF9E),
                        onAction = { permissionManager.promptBackgroundLocationRationale() }
                    )
                }
                VayuTrackPermissionState.BannerType.NOTIFICATION_MISSING -> {
                    PermissionAlertBanner(
                        title = "Notifications Disabled",
                        message = "VayuTrack requires notification permission to run the persistent sensor fusion foreground service.",
                        icon = Icons.Default.Notifications,
                        buttonLabel = "Enable Alerts",
                        containerColor = Color(0xFF1E2838),
                        contentColor = Color(0xFFB8C8E8),
                        onAction = { permissionManager.requestCoreForegroundPermissions() }
                    )
                }
                VayuTrackPermissionState.BannerType.SMS_MISSING_FOR_EMERGENCY -> {
                    PermissionAlertBanner(
                        title = "Impact Sense SMS Disabled",
                        message = "Emergency Alerts are enabled in settings, but SMS permission is missing. Crash alerts cannot be transmitted.",
                        icon = Icons.Default.Info,
                        buttonLabel = "Grant SMS",
                        containerColor = Color(0xFF3D2314),
                        contentColor = Color(0xFFFFB68C),
                        onAction = { permissionManager.requestSmsPermission() }
                    )
                }
                null -> Unit
            }
        }

        // =====================================================================
        // DIALOG 1: BACKGROUND LOCATION RATIONALE (Android 10+ Two-Step Rule)
        // =====================================================================
        if (state.showBackgroundLocationRationaleDialog) {
            AlertDialog(
                onDismissRequest = { permissionManager.dismissBackgroundLocationRationale() },
                icon = {
                    Icon(
                        imageVector = Icons.Default.LocationOn,
                        contentDescription = null,
                        tint = Color(0xFFE5A93C),
                        modifier = Modifier.size(32.dp)
                    )
                },
                title = {
                    Text(
                        text = "Enable Background Location for Tunnels",
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp
                    )
                },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(
                            text = "VayuTrack's factor-graph dead-reckoning engine tracks your vehicle dynamics through mountain tunnels and underground passes where satellite signals are blocked.",
                            fontSize = 14.sp,
                            lineHeight = 20.sp
                        )
                        Text(
                            text = "To keep tracking without degrading when you lock your screen or switch apps, Android requires selecting 'Allow all the time' in permission settings.",
                            fontSize = 13.sp,
                            color = Color(0xFFCCCCCC),
                            lineHeight = 18.sp
                        )
                    }
                },
                confirmButton = {
                    Button(
                        onClick = {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                                permissionManager.proceedWithBackgroundLocationRequest()
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE5A93C), contentColor = Color.Black)
                    ) {
                        Text("Continue", fontWeight = FontWeight.Bold)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { permissionManager.dismissBackgroundLocationRationale() }) {
                        Text("Later (Degraded Mode)", color = Color.Gray)
                    }
                }
            )
        }

        // =====================================================================
        // DIALOG 2: PERMANENT DENIAL SETTINGS REDIRECT
        // =====================================================================
        if (state.showPermanentDenialSettingsDialog) {
            AlertDialog(
                onDismissRequest = { permissionManager.dismissPermanentDenialDialog() },
                icon = {
                    Icon(
                        imageVector = Icons.Default.Warning,
                        contentDescription = null,
                        tint = Color(0xFFFF5252),
                        modifier = Modifier.size(32.dp)
                    )
                },
                title = {
                    Text(
                        text = "Permission Required in Settings",
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp
                    )
                },
                text = {
                    Text(
                        text = state.permanentlyDeniedRationaleMessage
                            ?: "A required permission was permanently denied. Please grant it in system app settings to restore sensor telemetry fusion.",
                        fontSize = 14.sp,
                        lineHeight = 20.sp
                    )
                },
                confirmButton = {
                    Button(
                        onClick = { permissionManager.openAppSettings() },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF26A69A), contentColor = Color.White)
                    ) {
                        Text("Open Settings", fontWeight = FontWeight.Bold)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { permissionManager.dismissPermanentDenialDialog() }) {
                        Text("Cancel", color = Color.Gray)
                    }
                }
            )
        }
    }
}

@Composable
private fun PermissionAlertBanner(
    title: String,
    message: String,
    icon: ImageVector,
    buttonLabel: String,
    containerColor: Color,
    contentColor: Color,
    onAction: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .background(containerColor, RoundedCornerShape(14.dp))
            .padding(14.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = contentColor,
                modifier = Modifier.size(24.dp)
            )

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    color = contentColor,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = message,
                    color = contentColor.copy(alpha = 0.85f),
                    fontSize = 12.sp,
                    lineHeight = 16.sp
                )
            }

            Button(
                onClick = onAction,
                colors = ButtonDefaults.buttonColors(
                    containerColor = contentColor,
                    contentColor = containerColor
                ),
                shape = RoundedCornerShape(8.dp),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 12.dp, vertical = 6.dp)
            ) {
                Text(
                    text = buttonLabel,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.ExtraBold,
                    fontFamily = FontFamily.Monospace
                )
            }
        }
    }
}
