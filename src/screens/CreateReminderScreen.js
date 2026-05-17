import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { scheduleReminderNotifications } from "../services/notificationService";
import {
  createReminder,
  listReminders,
  deleteReminder,
  markReminderDone,
  healthCheck,
  getWellnessProfile,
  updateWellnessProfile,
  sendWaterReminderSms,
} from "../services/apiService";

export default function CreateReminderScreen({ navigation }) {
  const [message, setMessage] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [waterIntake, setWaterIntake] = useState(0);
  const [stepCount, setStepCount] = useState(0);
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [bmi, setBmi] = useState(null);
  const [isSetting, setIsSetting] = useState(false);
  const [isSavingWellness, setIsSavingWellness] = useState(false);
  const [reminders, setReminders] = useState([]);
  const [backendOnline, setBackendOnline] = useState(true);

  // Animation values
  const inputSectionFade = new Animated.Value(0);
  const inputSectionSlide = new Animated.Value(30);
  const listFade = new Animated.Value(0);
  const bannerSlide = new Animated.Value(-50);

  useEffect(() => {
    // Input section animation: fade in + slide up
    Animated.timing(inputSectionFade, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    Animated.timing(inputSectionSlide, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // List animation: fade in (staggered)
    Animated.sequence([
      Animated.delay(300),
      Animated.timing(listFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Banner animation: slide down
    if (!backendOnline) {
      Animated.timing(bannerSlide, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(bannerSlide, {
        toValue: -50,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [inputSectionFade, inputSectionSlide, listFade, bannerSlide, backendOnline]);

  const fetchReminders = useCallback(async () => {
    try {
      const data = await listReminders();
      setReminders(data);
      setBackendOnline(true);
    } catch {
      setBackendOnline(false);
    }
  }, []);

  const checkBackend = useCallback(async () => {
    try {
      await healthCheck();
      setBackendOnline(true);
    } catch {
      setBackendOnline(false);
    }
  }, []);

  const fetchWellnessProfile = useCallback(async () => {
    try {
      const profile = await getWellnessProfile();
      setContactNumber(profile.contact_number || "");
      setWaterIntake(Number(profile.water_intake || 0));
      setStepCount(Number(profile.step_count || 0));
      setWeight(
        profile.weight_kg !== null && profile.weight_kg !== undefined
          ? String(profile.weight_kg)
          : ""
      );
      setHeight(
        profile.height_cm !== null && profile.height_cm !== undefined
          ? String(profile.height_cm)
          : ""
      );
      setBmi(profile.bmi ?? null);
    } catch {
      // Keep local defaults when the backend is unavailable.
    }
  }, []);

  const saveWellnessProfile = useCallback(
    async (nextValues = {}) => {
      const nextProfile = {
        contact_number: nextValues.contactNumber ?? contactNumber,
        water_intake: nextValues.waterIntake ?? waterIntake,
        step_count: nextValues.stepCount ?? stepCount,
        weight_kg: nextValues.weight ?? weight,
        height_cm: nextValues.height ?? height,
      };

      try {
        setIsSavingWellness(true);
        const response = await updateWellnessProfile(nextProfile);
        setBmi(response.bmi ?? null);
        setBackendOnline(true);
      } catch {
        setBackendOnline(false);
      } finally {
        setIsSavingWellness(false);
      }
    },
    [contactNumber, waterIntake, stepCount, weight, height]
  );

  useEffect(() => {
    fetchReminders();
    checkBackend();
    fetchWellnessProfile();
  }, [checkBackend, fetchReminders, fetchWellnessProfile]);

  // Refresh list when navigating back to this screen
  useEffect(() => {
    const unsubscribe = navigation?.addListener?.("focus", fetchReminders);
    return unsubscribe;
  }, [navigation, fetchReminders]);

  const handleSetReminder = async () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      Alert.alert("Reminder message required", "Please enter a reminder before setting it.");
      return;
    }

    try {
      setIsSetting(true);

      // Save to backend
      try {
        await createReminder(trimmedMessage);
      } catch {
        // Backend might be offline – continue with local notification anyway
      }

      // Schedule local notifications (existing behaviour)
      await scheduleReminderNotifications(trimmedMessage);

      setMessage("");
      await fetchReminders();
    } catch (error) {
      Alert.alert("Unable to set reminder", "Please try again.");
    } finally {
      setIsSetting(false);
    }
  };

  const handleWaterProgress = async () => {
    const trimmedNumber = contactNumber.trim();

    if (!trimmedNumber) {
      Alert.alert(
        "Phone number required",
        "Enter a phone number so the water reminder can be sent to the right contact."
      );
      return;
    }

    Alert.alert(
      "Water Reminder",
      `You should drink water. Reminder contact: ${trimmedNumber}`
    );

    try {
      await saveWellnessProfile({ contactNumber: trimmedNumber });
      await sendWaterReminderSms(trimmedNumber, "You should drink water.");
      Alert.alert("Water reminder sent", `SMS sent to ${trimmedNumber}.`);
    } catch {
      Alert.alert(
        "Water reminder failed",
        "Twilio SMS could not be sent. Make sure the backend Twilio credentials are configured."
      );
    }
  };

  const updateWaterIntake = async (delta) => {
    const nextValue = Math.max(0, waterIntake + delta);
    setWaterIntake(nextValue);
    await saveWellnessProfile({ waterIntake: nextValue });
  };

  const updateStepCount = async (delta) => {
    const nextValue = Math.max(0, stepCount + delta);
    setStepCount(nextValue);
    await saveWellnessProfile({ stepCount: nextValue });
  };

  const parsedWeight = Number(weight);
  const parsedHeight = Number(height);
  const bodyMassIndex =
    parsedWeight > 0 && parsedHeight > 0
      ? (parsedWeight / ((parsedHeight / 100) * (parsedHeight / 100))).toFixed(1)
      : null;

  const renderTrackerCard = () => (
    <View style={styles.trackerSection}>
      <Text style={styles.sectionTitle}>Body Tracking</Text>
      <View style={styles.trackerGrid}>
        <View style={styles.trackerCard}>
          <Text style={styles.trackerLabel}>Water intake</Text>
          <Text style={styles.trackerValue}>{waterIntake} cups</Text>
          <Text style={styles.trackerMeta}>Goal: 8 cups daily</Text>
          <View style={styles.trackerButtons}>
            <Pressable style={styles.smallButton} onPress={() => updateWaterIntake(-1)}>
              <Text style={styles.smallButtonText}>-1</Text>
            </Pressable>
            <Pressable style={styles.smallButton} onPress={() => updateWaterIntake(1)}>
              <Text style={styles.smallButtonText}>+1</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.trackerCard}>
          <Text style={styles.trackerLabel}>Walk steps</Text>
          <Text style={styles.trackerValue}>{stepCount.toLocaleString()}</Text>
          <Text style={styles.trackerMeta}>Goal: 10,000 steps</Text>
          <View style={styles.trackerButtons}>
            <Pressable style={styles.smallButton} onPress={() => updateStepCount(-1000)}>
              <Text style={styles.smallButtonText}>-1k</Text>
            </Pressable>
            <Pressable style={styles.smallButton} onPress={() => updateStepCount(1000)}>
              <Text style={styles.smallButtonText}>+1k</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.bodyCard}>
        <Text style={styles.trackerLabel}>Body metrics</Text>
        <View style={styles.metricsRow}>
          <TextInput
            value={weight}
            onChangeText={setWeight}
            placeholder="Weight (kg)"
            placeholderTextColor="#CBD5E1"
            style={[styles.input, styles.metricInput]}
            keyboardType="numeric"
          />
          <TextInput
            value={height}
            onChangeText={setHeight}
            placeholder="Height (cm)"
            placeholderTextColor="#CBD5E1"
            style={[styles.input, styles.metricInput]}
            keyboardType="numeric"
          />
        </View>
        <Text style={styles.bmiText}>
          BMI: {bodyMassIndex ? bodyMassIndex : bmi ? bmi : "Enter weight and height"}
        </Text>
        <Pressable
          style={[styles.button, isSavingWellness && styles.buttonDisabled]}
          onPress={() => saveWellnessProfile()}
          disabled={isSavingWellness}
        >
          <Text style={styles.buttonText}>
            {isSavingWellness ? "Saving..." : "Save Wellness Data"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.bodyCard}>
        <Text style={styles.trackerLabel}>Water reminder contact</Text>
        <TextInput
          value={contactNumber}
          onChangeText={setContactNumber}
          placeholder="Phone number for water pop-up"
          placeholderTextColor="#CBD5E1"
          style={styles.input}
          keyboardType="phone-pad"
        />
        <Pressable style={styles.waterButton} onPress={handleWaterProgress}>
          <Text style={styles.buttonText}>Send Water SMS</Text>
        </Pressable>
      </View>
    </View>
  );

  const handleDelete = async (id) => {
    try {
      await deleteReminder(id);
      await fetchReminders();
    } catch {
      Alert.alert("Error", "Could not delete reminder.");
    }
  };

  const handleMarkDone = async (id) => {
    try {
      await markReminderDone(id);
      await fetchReminders();
    } catch {
      Alert.alert("Error", "Could not update reminder.");
    }
  };

  const renderReminder = ({ item }) => (
    <View style={styles.reminderCard}>
      <Pressable
        style={styles.reminderContent}
        onPress={() =>
          navigation.navigate("ReminderDetails", {
            reminderMessage: item.message,
            reminderId: item.id,
          })
        }
      >
        <Text
          style={[
            styles.reminderText,
            item.status === "done" && styles.reminderTextDone,
          ]}
          numberOfLines={2}
        >
          {item.message}
        </Text>
        <Text style={styles.reminderMeta}>
          {item.status === "done" ? "✅ Done" : "⏳ Pending"}
          {"  •  "}
          {new Date(item.created_at).toLocaleString()}
        </Text>
      </Pressable>

      <View style={styles.reminderActions}>
        {item.status !== "done" && (
          <Pressable
            style={styles.actionBtn}
            onPress={() => handleMarkDone(item.id)}
          >
            <Text style={styles.actionText}>✓</Text>
          </Pressable>
        )}
        <Pressable
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={() => handleDelete(item.id)}
        >
          <Text style={[styles.actionText, styles.deleteText]}>✕</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <ImageBackground
      source={require("../../assets/create-reminder-background.avif")}
      resizeMode="cover"
      style={styles.container}
    >
      <View style={styles.overlay}>
        <FlatList
          data={reminders}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderReminder}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={(
            <>
              <Animated.View
                style={[
                  styles.inputSection,
                  {
                    opacity: inputSectionFade,
                    transform: [{ translateY: inputSectionSlide }],
                  },
                ]}
              >
                <Text style={styles.label}>Reminder message</Text>
                <TextInput
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Enter your reminder..."
                  placeholderTextColor="#CBD5E1"
                  style={styles.input}
                  editable={!isSetting}
                  autoCapitalize="sentences"
                />
                <Pressable
                  style={[styles.button, isSetting && styles.buttonDisabled]}
                  onPress={handleSetReminder}
                  disabled={isSetting}
                >
                  <Text style={styles.buttonText}>
                    {isSetting ? "Setting..." : "Set Reminder"}
                  </Text>
                </Pressable>
              </Animated.View>

              {renderTrackerCard()}

              {!backendOnline && (
                <Animated.View
                  style={[
                    styles.offlineBanner,
                    {
                      transform: [{ translateY: bannerSlide }],
                    },
                  ]}
                >
                  <Text style={styles.offlineText}>
                    ⚠ Backend offline – reminders won't be saved
                  </Text>
                </Animated.View>
              )}

              <Animated.View
                style={[
                  styles.listSection,
                  {
                    opacity: listFade,
                  },
                ]}
              >
                <Text style={styles.listTitle}>
                  Your Reminders ({reminders.length})
                </Text>
              </Animated.View>
            </>
          )}
          ListEmptyComponent={(
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No reminders yet.</Text>
            </View>
          )}
        />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.78)",
  },
  inputSection: {
    padding: 20,
    paddingBottom: 10,
  },
  label: {
    fontSize: 16,
    color: "#E2E8F0",
    marginBottom: 8,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.45)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    color: "#F8FAFC",
  },
  button: {
    marginTop: 14,
    backgroundColor: "#EC4899",
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#EC4899",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 8,
    },
  },
  buttonDisabled: {
    opacity: 0.75,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  offlineBanner: {
    marginHorizontal: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(250, 204, 21, 0.18)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(250, 204, 21, 0.35)",
  },
  offlineText: {
    color: "#FDE68A",
    fontSize: 13,
    textAlign: "center",
  },
  listContent: {
    paddingBottom: 24,
  },
  listSection: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#E2E8F0",
    marginBottom: 10,
  },
  reminderCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
  },
  reminderContent: {
    flex: 1,
  },
  reminderText: {
    fontSize: 15,
    color: "#F8FAFC",
  },
  reminderTextDone: {
    textDecorationLine: "line-through",
    color: "#94A3B8",
  },
  reminderMeta: {
    fontSize: 12,
    color: "#CBD5E1",
    marginTop: 4,
  },
  reminderActions: {
    flexDirection: "row",
    marginLeft: 10,
    gap: 6,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(6, 182, 212, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    fontSize: 16,
    color: "#67E8F9",
    fontWeight: "700",
  },
  deleteBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.18)",
  },
  deleteText: {
    color: "#FCA5A5",
  },
  trackerSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  sectionTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  trackerGrid: {
    flexDirection: "row",
    gap: 12,
  },
  trackerCard: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(236, 72, 153, 0.25)",
  },
  trackerLabel: {
    color: "#CBD5E1",
    fontSize: 13,
    marginBottom: 6,
    fontWeight: "600",
  },
  trackerValue: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
  },
  trackerMeta: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 4,
  },
  trackerButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  smallButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "rgba(6, 182, 212, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(6, 182, 212, 0.25)",
  },
  smallButtonText: {
    color: "#67E8F9",
    fontWeight: "700",
  },
  bodyCard: {
    marginTop: 12,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(8, 145, 178, 0.25)",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 12,
  },
  metricInput: {
    flex: 1,
  },
  bmiText: {
    color: "#E2E8F0",
    marginTop: 12,
    fontSize: 14,
    fontWeight: "600",
  },
  waterButton: {
    marginTop: 14,
    backgroundColor: "#06B6D4",
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#06B6D4",
    shadowOpacity: 0.32,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 8,
    },
  },
  emptyState: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  emptyStateText: {
    color: "#CBD5E1",
    textAlign: "center",
    paddingVertical: 18,
  },
});
