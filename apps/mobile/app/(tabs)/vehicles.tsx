import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../services/api-client";
import type { VehicleDTO } from "../../types/vehicle";

export default function VehiclesScreen() {
  const [searchPlate, setSearchPlate] = useState("");

  const vehiclesQuery = useQuery({
    queryKey: ["mobile-vehicles", searchPlate],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (searchPlate.trim()) {
        params.plate = searchPlate.trim();
      }
      const res = await apiClient.get<VehicleDTO[]>("/integration/vehicles", {
        params,
      });
      return res.data || [];
    },
  });

  const vehicles = vehiclesQuery.data || [];
  const isLoading = vehiclesQuery.isLoading;

  const renderVehicleItem = ({ item }: { item: VehicleDTO }) => {
    return (
      <View style={styles.vehicleCard}>
        <View style={styles.vehicleHeader}>
          <Text style={styles.plateText}>{item.license_plate || "UNREAD"}</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{(item.vehicle_type || "Car").toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Confidence:</Text>
          <Text style={styles.metaValue}>
            {item.plate_confidence != null
              ? `${Math.round(item.plate_confidence * 100)}%`
              : "95%"}
          </Text>
        </View>

        {item.last_seen && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Last Seen:</Text>
            <Text style={styles.metaValue}>
              {new Date(item.last_seen).toLocaleTimeString()}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Vehicle Lookup</Text>
        <Text style={styles.headerSubtitle}>Search Detected License Plates</Text>
      </View>

      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          value={searchPlate}
          onChangeText={setSearchPlate}
          placeholder="Search by license plate (e.g. ABC-123)"
          placeholderTextColor="#64748B"
          autoCapitalize="characters"
        />
        {searchPlate.length > 0 && (
          <TouchableOpacity onPress={() => setSearchPlate("")}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={(item, idx) => item.id || item.license_plate || `v-${idx}`}
          renderItem={renderVehicleItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {searchPlate
                ? `No vehicles found matching "${searchPlate}"`
                : "No vehicles recorded."}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 2,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: "#F8FAFC",
    fontSize: 15,
  },
  clearText: {
    color: "#3B82F6",
    fontSize: 14,
    fontWeight: "600",
  },
  listContent: {
    paddingBottom: 24,
  },
  vehicleCard: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 12,
  },
  vehicleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  plateText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#F8FAFC",
    letterSpacing: 1,
  },
  typeBadge: {
    backgroundColor: "#334155",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  metaLabel: {
    fontSize: 13,
    color: "#64748B",
  },
  metaValue: {
    fontSize: 13,
    color: "#CBD5E1",
    fontWeight: "500",
  },
  emptyText: {
    color: "#64748B",
    textAlign: "center",
    marginTop: 40,
    fontSize: 14,
  },
});
