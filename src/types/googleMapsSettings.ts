/**
 * Google Maps Settings Configuration & Types
 * DrifX Autonomous Navigation & Telematics Platform
 */

export type GoogleMapType = 'roadmap' | 'satellite' | 'hybrid' | 'terrain';

export type MapNavigationTheme =
  | 'dark_cyberpunk'
  | 'midnight_blue'
  | 'silver_high_contrast'
  | 'google_standard'
  | 'retro_nav';

export interface GoogleMapsSettings {
  mapId?: string;
  mapType: GoogleMapType;
  theme: MapNavigationTheme;
  showTraffic: boolean;
  showTransit: boolean;
  showBicycling: boolean;
  enableHighAccuracy: boolean;
  autoCenterOnMove: boolean;
  followHeading: boolean; // Rotate camera with vehicle heading
  showAccuracyCircle: boolean;
  showHeadingCone: boolean;
  tilt3D: boolean;
  tiltAngle: number; // 0 - 67.5 degrees
  speedUnit: 'kmh' | 'mph';
  distanceUnit: 'metric' | 'imperial';
  updateFrequency: 'continuous' | '1s' | '5s';
}

export const DEFAULT_GOOGLE_MAPS_SETTINGS: GoogleMapsSettings = {
  mapId: (import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string) || 'DEMO_MAP_ID',
  mapType: 'roadmap',
  theme: 'dark_cyberpunk',
  showTraffic: true,
  showTransit: false,
  showBicycling: false,
  enableHighAccuracy: true,
  autoCenterOnMove: true,
  followHeading: false,
  showAccuracyCircle: true,
  showHeadingCone: true,
  tilt3D: true,
  tiltAngle: 45,
  speedUnit: 'kmh',
  distanceUnit: 'metric',
  updateFrequency: 'continuous',
};

// Map Styles for custom navigation themes
export const MAP_THEME_STYLES: Record<MapNavigationTheme, google.maps.MapTypeStyle[] | null> = {
  google_standard: null,

  dark_cyberpunk: [
    { elementType: 'geometry', stylers: [{ color: '#0d1117' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1117' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#8b949e' }] },
    {
      featureType: 'administrative.locality',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#58a6ff' }],
    },
    {
      featureType: 'poi',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#7ee787' }],
    },
    {
      featureType: 'poi.park',
      elementType: 'geometry',
      stylers: [{ color: '#161b22' }],
    },
    {
      featureType: 'poi.park',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#3fb950' }],
    },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#21262d' }],
    },
    {
      featureType: 'road',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#30363d' }],
    },
    {
      featureType: 'road',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#c9d1d9' }],
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry',
      stylers: [{ color: '#f78166' }],
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#da3633' }],
    },
    {
      featureType: 'road.highway',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#ffa657' }],
    },
    {
      featureType: 'transit',
      elementType: 'geometry',
      stylers: [{ color: '#1f242c' }],
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#090d13' }],
    },
    {
      featureType: 'water',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#388bfd' }],
    },
  ],

  midnight_blue: [
    { elementType: 'geometry', stylers: [{ color: '#192538' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#192538' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#7488a1' }] },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#2c3b52' }],
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry',
      stylers: [{ color: '#3c5a80' }],
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#0e1626' }],
    },
  ],

  silver_high_contrast: [
    { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#ffffff' }],
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry',
      stylers: [{ color: '#dadada' }],
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#c9c9c9' }],
    },
  ],

  retro_nav: [
    { elementType: 'geometry', stylers: [{ color: '#ebe3cd' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#523735' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f1e6' }] },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#f5f1e6' }],
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry',
      stylers: [{ color: '#f8c967' }],
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#b9d3c2' }],
    },
  ],
};
