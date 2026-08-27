import React from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../services/api-client";
import type { SlotDTO } from "../../types/slot";

export default function ParkingScreen() {
  const slotsQuery = useQuery({
    queryKey: ["mobile-slots"],
    queryFn: async () => {
      const res = await apiClient.get<SlotDTO[]>("/integration/slots");
      return res.data || [];
    },
    refetchInterval: 5000,
  });

  const slots = slotsQuery.data || [];
  const isLoading = slotsQuery.isLoading;
  const isRefreshing = slotsQuery.isRefetching;

  const renderSlotItem = ({ item }: { item: SlotDTO }) => {
    const rawState = (item.state || "free").toLowerCase();
    let badgeBg = "#10B981"; // Free / Green
    let statusText = "FREE";

    if (rawState === "occupied") {
      badgeBg = "#EF4444"; // Occupied / Red
      statusText = "OCCUPIED";
    } else if (rawState === "reserved" || item.is_reserved) {
      badgeBg = "#F59E0B"; // Reserved / Yellow
      statusText = "RESERVED";
    } else if (rawState === "unknown") {
      badgeBg = "#64748B"; // Unknown / Gray
      statusText = "UNKNOWN";
    }

    return (
      <View style={styles.slotCard}>
        <View style={styles.slotHeader}>
          <Text style={styles.slotId}>{item.slot_id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        </View>
        <Text style={styles.slotMeta}>Zone: {item.zone || "A"}</Text>
        <Text style={styles.slotMeta}>Cam: {item.camera_id || "CAM-001"}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Live Parking Slots</Text>
        <Text style={styles.headerSubtitle}>Real-time Slot Occupancy Grid</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={slots}
          keyExtractor={(item) => item.slot_id}
          renderItem={renderSlotItem}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => slotsQuery.refetch()}
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No parking slots configured.</Text>
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
  listContent: {
    paddingBottom: 24,
  },
  columnWrapper: {
    justifyContent: "space-between",
    marginBottom: 12,
  },
  slotCard: {
    width: "48%",
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#334155",
  },
  slotHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  slotId: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  slotMeta: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  emptyText: {
    color: "#64748B",
    textAlign: "center",
    marginTop: 40,
    fontSize: 14,
  },
});
