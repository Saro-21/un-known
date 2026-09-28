package com.vayutrack

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vayutrack.permissions.PermissionManager
import com.vayutrack.service.SensorFusionForegroundService
import com.vayutrack.ui.VayuTrackPermissionBanner

/**
 * Drop-in MainActivity showing complete integration of VayuTrack's runtime permission system
 * and SensorFusionForegroundService.
 */
class MainActivity : ComponentActivity() {

    private lateinit var permissionManager: PermissionManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Initialize and register PermissionManager before activity transitions to RESUMED
        permissionManager = PermissionManager(applicationContext)
        permissionManager.register(this)

        setContent {
            MaterialTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = Color(0xFF0F1117)
                ) {
                    VayuTrackMainScreen(
                        permissionManager = permissionManager,
                        onStartFusionService = {
                            if (permissionManager.permissionState.value.hasFineLocation) {
                                SensorFusionForegroundService.startService(this)
                            } else {
                                permissionManager.requestCoreForegroundPermissions()
                            }
                        },
                        onStopFusionService = {
                            SensorFusionForegroundService.stopService(this)
                        }
                    )
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        // Refresh state when user returns from system Settings screen
        permissionManager.refreshPermissionState()
    }

    override fun onDestroy() {
        permissionManager.unregister()
        super.onDestroy()
    }
}

@Composable
fun VayuTrackMainScreen(
    permissionManager: PermissionManager,
    onStartFusionService: () -> Unit,
    onStopFusionService: () -> Unit
) {
    val permissionState by permissionManager.permissionState.collectAsState()

    Scaffold(
        topBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFF161A23))
                    .padding(horizontal = 20.dp, vertical = 16.dp)
            ) {
                Text(
                    text = "VayuTrack Telematics",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    fontFamily = FontFamily.Monospace
                )
                Text(
                    text = "High-Rate Sensor Fusion & Tunnel Dead-Reckoning",
                    fontSize = 12.sp,
                    color = Color(0xFF8E99AB),
                    fontFamily = FontFamily.Monospace
                )
            }
        },
        containerColor = Color(0xFF0F1117)
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            // Reactive warning banner (Zero-Pill Discipline, alerts immediately if permissions degrade)
            VayuTrackPermissionBanner(permissionManager = permissionManager)

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // 1. Permission Status Dashboard Card
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF161A23)),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = "RUNTIME PERMISSION CONTRACT",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF26A69A),
                            fontFamily = FontFamily.Monospace
                        )

                        PermissionIndicatorRow("Foreground GPS (FINE)", permissionState.hasFineLocation)
                        PermissionIndicatorRow("Tunnel Background GPS", permissionState.hasBackgroundLocation)
                        PermissionIndicatorRow("Inertial Motion Sensor", permissionState.hasActivityRecognition)
                        PermissionIndicatorRow("Foreground Service Alerts", permissionState.hasNotificationPermission)
                        PermissionIndicatorRow("Emergency Crash SMS", permissionState.hasSendSmsPermission)
                    }
                }

                // 2. Gated Emergency Alerts Setting Card
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF161A23)),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Impact Sense Emergency Alerts",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Text(
                                text = "Auto-dispatches SMS to emergency contacts on vehicle rollover or severe deceleration",
                                fontSize = 12.sp,
                                color = Color(0xFF8E99AB)
                            )
                        }

                        Switch(
                            checked = permissionState.isEmergencyAlertsEnabled,
                            onCheckedChange = { isEnabled ->
                                permissionManager.setEmergencyAlertsEnabled(isEnabled)
                            },
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = Color(0xFF26A69A),
                                checkedTrackColor = Color(0xFF134E48)
                            )
                        )
                    }
                }

                Spacer(modifier = Modifier.weight(1f))

                // 3. Service Lifecycle Controls
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Button(
                        onClick = onStartFusionService,
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF26A69A)),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text(
                            text = "Start Service",
                            fontWeight = FontWeight.Bold,
                            color = Color.Black
                        )
                    }

                    Button(
                        onClick = onStopFusionService,
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF381E24)),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text(
                            text = "Stop Service",
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFFF8B94)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun PermissionIndicatorRow(label: String, isGranted: Boolean) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            fontSize = 13.sp,
            color = Color(0xFFD1D5DB),
            fontFamily = FontFamily.Monospace
        )
        Text(
            text = if (isGranted) "GRANTED" else "MISSING",
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            color = if (isGranted) Color(0xFF34D399) else Color(0xFFF87171),
            fontFamily = FontFamily.Monospace
        )
    }
}
