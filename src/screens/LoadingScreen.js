import React, { useEffect } from "react";
import { ActivityIndicator, Animated, StyleSheet, Text, View } from "react-native";

export default function LoadingScreen() {
  const spinValue = new Animated.Value(0);
  const fadeValue = new Animated.Value(0);

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeValue, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Continuous spin animation
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  }, [spinValue, fadeValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.spinnerWrapper,
          {
            opacity: fadeValue,
            transform: [{ rotate: spin }],
          },
        ]}
      >
        <ActivityIndicator size="large" color="#4F46E5" />
      </Animated.View>
      <Animated.Text
        style={[
          styles.loadingText,
          {
            opacity: fadeValue,
          },
        ]}
      >
        Loading...
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  spinnerWrapper: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748B",
    fontWeight: "500",
  },
});
