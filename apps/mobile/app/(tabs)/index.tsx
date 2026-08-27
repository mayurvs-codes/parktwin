import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../services/api-client";
import type { OccupancyDTO, StatisticsDTO } from "../../types/occupancy";

export default function DashboardScreen() {
  const occupancyQuery = useQuery({
    queryKey: ["mobile-occupancy"],
    queryFn: async () => {
      const res = await apiClient.get<OccupancyDTO>("/integration/occupancy");
      return res.data;
    },
    refetchInterval: 5000,
  });

  const statsQuery = useQuery({
    queryKey: ["mobile-statistics"],
    queryFn: async () => {
      const res = await apiClient.get<StatisticsDTO>("/integration/statistics");
      return res.data;
    },
    refetchInterval: 5000,
  });

  const isLoading = occupancyQuery.isLoading || statsQuery.isLoading;
  const isRefreshing = occupancyQuery.isRefetching || statsQuery.isRefetching;

  const handleRefresh = () => {
    occupancyQuery.refetch();
    statsQuery.refetch();
  };

  const occupancy = occupancyQuery.data;
  const stats = statsQuery.data;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>System Dashboard</Text>
        <Text style={styles.headerSubtitle}>Real-time Lot & Session Overview</Text>
      </View>

      {isLoading && !occupancy ? (
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.grid}>
          <View style={[styles.kpiCard, { borderColor: "#3B82F6" }]}>
            <Text style={styles.kpiLabel}>TOTAL CAPACITY</Text>
            <Text style={styles.kpiValue}>{occupancy?.total_slots ?? "—"}</Text>
            <Text style={styles.kpiHint}>Total Configured Slots</Text>
          </View>

          <View style={[styles.kpiCard, { borderColor: "#EF4444" }]}>
            <Text style={styles.kpiLabel}>OCCUPIED SLOTS</Text>
            <Text style={[styles.kpiValue, { color: "#EF4444" }]}>
              {occupancy?.occupied ?? "—"}
            </Text>
            <Text style={styles.kpiHint}>Currently Parked</Text>
          </View>

          <View style={[styles.kpiCard, { borderColor: "#10B981" }]}>
            <Text style={styles.kpiLabel}>AVAILABLE SLOTS</Text>
            <Text style={[styles.kpiValue, { color: "#10B981" }]}>
              {occupancy?.free ?? "—"}
            </Text>
            <Text style={styles.kpiHint}>Open for Parking</Text>
          </View>

          <View style={[styles.kpiCard, { borderColor: "#F59E0B" }]}>
            <Text style={styles.kpiLabel}>OCCUPANCY RATE</Text>
            <Text style={[styles.kpiValue, { color: "#F59E0B" }]}>
              {occupancy != null
                ? `${Math.round((occupancy.occupancy_rate || 0) * 100)}%`
                : "—"}
            </Text>
            <Text style={styles.kpiHint}>Lot Utilization</Text>
          </View>

          <View style={[styles.kpiCard, { borderColor: "#8B5CF6", width: "100%" }]}>
            <Text style={styles.kpiLabel}>ACTIVE SESSIONS</Text>
            <Text style={[styles.kpiValue, { color: "#8B5CF6" }]}>
              {stats?.active_sessions ?? "—"}
            </Text>
            <Text style={styles.kpiHint}>Live Parking Sessions</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 20,
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  kpiCard: {
    width: "48%",
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 32,
    fontWeight: "800",
    color: "#F8FAFC",
    marginVertical: 8,
  },
  kpiHint: {
    fontSize: 12,
    color: "#64748B",
  },
});
