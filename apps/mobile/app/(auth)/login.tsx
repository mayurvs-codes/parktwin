import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { apiClient } from "../../services/api-client";
import { useAuthStore } from "../../store/auth";

export default function LoginScreen() {
  const router = useRouter();
  const setToken = useAuthStore((state) => state.setToken);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert("Error", "Please enter both username/email and password");
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post("/auth/login", {
        username,
        password,
      });
      if (response.data && response.data.access_token) {
        setToken(response.data.access_token);
        router.replace("/(tabs)");
      } else {
        Alert.alert("Login Failed", "Invalid response from server");
      }
    } catch (error: any) {
      const msg =
        error.response?.data?.detail || "Could not sign in. Check credentials and backend server.";
      Alert.alert("Login Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>ParkTwin AI</Text>
        <Text style={styles.subtitle}>Mobile Operations Center</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Username / Email</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            placeholder="admin"
            placeholderTextColor="#8E8E93"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor="#8E8E93"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#334155",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#F8FAFC",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    marginBottom: 24,
    marginTop: 4,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#CBD5E1",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#F8FAFC",
    fontSize: 16,
  },
  button: {
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
