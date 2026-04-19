import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { parentApi } from "../../services/api";
import { useAuthStore } from "../../store/authStore";

interface BusLocation { lat: number; lng: number; speed: number; heading: number; lastUpdated: string; driverName: string; vehicleNo: string; eta: string; }
interface RouteStop { name: string; lat: number; lng: number; estimatedTime: string; status: "PASSED" | "NEXT" | "UPCOMING"; }

export default function TransportTrackingScreen() {
  const { user } = useAuthStore();
  const mapRef = useRef<MapView>(null);
  const [busLocation, setBusLocation] = useState<BusLocation | null>(null);
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchLocation() {
    try {
      // In production: vehicleId comes from child's transport assignment
      const vehicleId = "vehicle-1";
      const [locRes, routeRes] = await Promise.all([
        parentApi.busLocation(vehicleId),
        parentApi.busRoute("route-1"),
      ]);
      setBusLocation(locRes.data);
      setStops(routeRes.data.stops ?? []);
      // Pan map to bus
      if (locRes.data && mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: locRes.data.lat, longitude: locRes.data.lng,
          latitudeDelta: 0.02, longitudeDelta: 0.02,
        }, 500);
      }
    } catch { /* keep showing last known */ }
    finally { setLoading(false); }
  }

  useEffect(() => {
    fetchLocation();
    // Poll every 15 seconds for live location
    pollRef.current = setInterval(fetchLocation, 15_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator color="#3b82f6" size="large" /></View>;

  const routeCoords = stops.map((s) => ({ latitude: s.lat, longitude: s.lng }));

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        initialRegion={{
          latitude: busLocation?.lat ?? 17.385,
          longitude: busLocation?.lng ?? 78.4867,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation
        showsTraffic
      >
        {/* Bus marker */}
        {busLocation && (
          <Marker
            coordinate={{ latitude: busLocation.lat, longitude: busLocation.lng }}
            title={`Bus: ${busLocation.vehicleNo}`}
            description={`Speed: ${busLocation.speed} km/h · Driver: ${busLocation.driverName}`}
          >
            <View style={styles.busMarker}><Text style={{ fontSize: 20 }}>🚌</Text></View>
          </Marker>
        )}
        {/* Stop markers */}
        {stops.map((stop, i) => (
          <Marker key={i} coordinate={{ latitude: stop.lat, longitude: stop.lng }} title={stop.name} description={stop.estimatedTime}>
            <View style={[styles.stopMarker, stop.status === "NEXT" ? styles.stopNext : stop.status === "PASSED" ? styles.stopPassed : {}]}>
              <Text style={styles.stopNum}>{i + 1}</Text>
            </View>
          </Marker>
        ))}
        {/* Route polyline */}
        {routeCoords.length > 1 && (
          <Polyline coordinates={routeCoords} strokeColor="#3b82f6" strokeWidth={3} lineDashPattern={[8, 4]} />
        )}
      </MapView>

      {/* Bottom panel */}
      <View style={styles.panel}>
        {busLocation ? (
          <>
            <View style={styles.busInfo}>
              <View>
                <Text style={styles.vehicleNo}>{busLocation.vehicleNo}</Text>
                <Text style={styles.driverName}>{busLocation.driverName}</Text>
              </View>
              <View style={styles.etaBox}>
                <Text style={styles.etaLabel}>ETA</Text>
                <Text style={styles.etaValue}>{busLocation.eta}</Text>
              </View>
            </View>
            <Text style={styles.lastUpdated}>Updated {new Date(busLocation.lastUpdated).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</Text>
          </>
        ) : (
          <Text style={styles.noData}>Bus location unavailable</Text>
        )}

        {/* Stops list */}
        <Text style={styles.stopsTitle}>Route Stops</Text>
        {stops.map((stop, i) => (
          <View key={i} style={styles.stopRow}>
            <View style={[styles.stopDot, stop.status === "PASSED" ? styles.dotPassed : stop.status === "NEXT" ? styles.dotNext : styles.dotUpcoming]} />
            <Text style={styles.stopName}>{stop.name}</Text>
            <Text style={[styles.stopTime, stop.status === "NEXT" ? { color: "#3b82f6", fontWeight: "700" } : {}]}>{stop.estimatedTime}</Text>
          </View>
        ))}

        <TouchableOpacity style={styles.refreshBtn} onPress={fetchLocation}>
          <Text style={styles.refreshBtnText}>Refresh Location</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0f172a" },
  map: { flex: 1 },
  busMarker: { backgroundColor: "#1e3a8a", borderRadius: 20, padding: 4, borderWidth: 2, borderColor: "#3b82f6" },
  stopMarker: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#334155", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#475569" },
  stopNext: { backgroundColor: "#1e3a8a", borderColor: "#3b82f6" },
  stopPassed: { backgroundColor: "#064e3b", borderColor: "#10b981", opacity: 0.6 },
  stopNum: { color: "#fff", fontSize: 11, fontWeight: "700" },
  panel: { backgroundColor: "#1e293b", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "45%" },
  busInfo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  vehicleNo: { color: "#f1f5f9", fontSize: 18, fontWeight: "800" },
  driverName: { color: "#64748b", fontSize: 13, marginTop: 2 },
  etaBox: { backgroundColor: "#1e3a8a", borderRadius: 10, padding: 10, alignItems: "center" },
  etaLabel: { color: "#93c5fd", fontSize: 10, fontWeight: "600" },
  etaValue: { color: "#fff", fontSize: 18, fontWeight: "800" },
  lastUpdated: { color: "#475569", fontSize: 11, marginBottom: 12 },
  noData: { color: "#64748b", textAlign: "center", paddingVertical: 8 },
  stopsTitle: { color: "#94a3b8", fontSize: 12, fontWeight: "700", textTransform: "uppercase", marginBottom: 10 },
  stopRow: { flexDirection: "row", alignItems: "center", paddingVertical: 7, gap: 10 },
  stopDot: { width: 10, height: 10, borderRadius: 5 },
  dotPassed: { backgroundColor: "#10b981" },
  dotNext: { backgroundColor: "#3b82f6" },
  dotUpcoming: { backgroundColor: "#334155" },
  stopName: { flex: 1, color: "#e2e8f0", fontSize: 13 },
  stopTime: { color: "#64748b", fontSize: 12 },
  refreshBtn: { marginTop: 12, backgroundColor: "#0f172a", borderRadius: 10, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "#334155" },
  refreshBtnText: { color: "#3b82f6", fontWeight: "700" },
});
