import React, { useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { getReminder, markReminderDone } from "../services/apiService";

export default function ReminderDetailsScreen({ route, navigation }) {
  const message = route.params?.reminderMessage ?? "No reminder message found.";
  const reminderId = route.params?.reminderId ?? null;

  const [reminder, setReminder] = useState(null);
  const [loading, setLoading] = useState(false);

  // Animation values
  const cardScale = new Animated.Value(0.9);
  const cardFade = new Animated.Value(0);
  const contentSlide = new Animated.Value(30);

  useEffect(() => {
    // Card entrance animation: fade in + scale up
    Animated.parallel([
      Animated.timing(cardFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(cardScale, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Content slide up animation
    Animated.sequence([
      Animated.delay(200),
      Animated.timing(contentSlide, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [cardScale, cardFade, contentSlide]);

  useEffect(() => {
    if (!reminderId) return;

    const load = async () => {
      setLoading(true);
      try {
        const data = await getReminder(reminderId);
        setReminder(data);
      } catch {
        // Backend might be offline – just show the message from params
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [reminderId]);

  const handleMarkDone = async () => {
    if (!reminderId) return;
    try {
      const updated = await markReminderDone(reminderId);
      setReminder(updated);
    } catch {
      // silent fail
    }
  };

  const displayMessage = reminder?.message ?? message;
  const status = reminder?.status ?? "pending";
  const createdAt = reminder?.created_at
    ? new Date(reminder.created_at).toLocaleString()
    : null;

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.card,
          {
            opacity: cardFade,
            transform: [{ scale: cardScale }, { translateY: contentSlide }],
          },
        ]}
      >
        <Text style={styles.heading}>Your Reminder</Text>
        <Text style={styles.message}>{displayMessage}</Text>

        {createdAt && (
          <Text style={styles.meta}>Created: {createdAt}</Text>
        )}

        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            {status === "done" ? "✅ Completed" : "⏳ Pending"}
          </Text>
        </View>

        {status !== "done" && reminderId && (
          <Pressable style={styles.doneButton} onPress={handleMarkDone}>
            <Text style={styles.doneButtonText}>Mark as Done</Text>
          </Pressable>
        )}

        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back to Reminders</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#EEF2FF",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E1B4B",
    marginBottom: 12,
  },
  message: {
    fontSize: 18,
    color: "#312E81",
    lineHeight: 26,
    marginBottom: 16,
  },
  meta: {
    fontSize: 13,
    color: "#94A3B8",
    marginBottom: 12,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    marginBottom: 20,
  },
  statusText: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "500",
  },
  doneButton: {
    backgroundColor: "#16A34A",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  doneButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  backButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  backButtonText: {
    color: "#6366F1",
    fontWeight: "500",
    fontSize: 15,
  },
});
