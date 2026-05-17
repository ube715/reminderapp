import React, { useState, useEffect } from "react";
import {
  Alert,
  Animated,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { login } from "../services/apiService";

export default function LoginScreen({ navigation, route }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const setIsLoggedIn = route?.params?.setIsLoggedIn || (() => {});

  // Floating orbs animation values
  const float1 = new Animated.Value(0);
  const float2 = new Animated.Value(0);
  const float3 = new Animated.Value(0);
  const rotate1 = new Animated.Value(0);
  const rotate2 = new Animated.Value(0);
  
  // Main animations
  const headerFade = new Animated.Value(0);
  const headerRotate = new Animated.Value(0);
  const formFade = new Animated.Value(0);
  const formSlide = new Animated.Value(50);
  const footerFade = new Animated.Value(0);
  const bgColor = new Animated.Value(0);

  useEffect(() => {
    // Background color animation
    Animated.loop(
      Animated.timing(bgColor, {
        toValue: 1,
        duration: 8000,
        useNativeDriver: false,
      })
    ).start();

    // Floating orb 1 animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(float1, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(float1, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Floating orb 2 animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(float2, {
          toValue: 1,
          duration: 5000,
          useNativeDriver: true,
        }),
        Animated.timing(float2, {
          toValue: 0,
          duration: 5000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Floating orb 3 animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(float3, {
          toValue: 1,
          duration: 6000,
          useNativeDriver: true,
        }),
        Animated.timing(float3, {
          toValue: 0,
          duration: 6000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Rotation animations
    Animated.loop(
      Animated.timing(rotate1, {
        toValue: 1,
        duration: 10000,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.timing(rotate2, {
        toValue: 1,
        duration: 15000,
        useNativeDriver: true,
      })
    ).start();

    // Header animation: fade in + 3D rotation effect
    Animated.timing(headerFade, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();

    Animated.timing(headerRotate, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Form animation: fade in + slide up (staggered)
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(formFade, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(formSlide, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Footer animation: fade in
    Animated.sequence([
      Animated.delay(700),
      Animated.timing(footerFade, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerFade, headerRotate, formFade, formSlide, footerFade, float1, float2, float3, rotate1, rotate2, bgColor]);

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert("Required Fields", "Please enter both email and password.");
      return;
    }

    try {
      setIsLoading(true);
      const result = await login(trimmedEmail, trimmedPassword);

      if (result && result.token) {
        // Update auth state, which will trigger navigation in App.js
        setIsLoggedIn(true);
      } else {
        Alert.alert("Login Failed", "Invalid credentials. Please try again.");
      }
    } catch (error) {
      Alert.alert(
        "Login Error",
        error.message || "Unable to connect to server. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    try {
      setIsLoading(true);
      // Demo account for testing
      const result = await login("demo@example.com", "demo123");

      if (result && result.token) {
        setIsLoggedIn(true);
      } else {
        Alert.alert("Demo Login Failed", "Unable to log in with demo account.");
      }
    } catch (error) {
      Alert.alert(
        "Demo Login Error",
        error.message || "Unable to connect to server. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const headerRotateValue = headerRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["-15deg", "0deg"],
  });

  return (
    <ImageBackground
      source={require("../../assets/login-background.avif")}
      style={styles.scrollContainer}
      imageStyle={styles.loginBackgroundImage}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} scrollEnabled={true}>
        <View style={styles.overlay}>
      {/* Animated Background Gradient Elements */}
      <View style={styles.backgroundContainer}>
        {/* Floating Orb 1 - Top Left */}
        <Animated.View
          style={[
            styles.floatingOrb,
            styles.orb1,
            {
              transform: [
                { translateY: float1.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 80],
                }) },
                { rotate: rotate1.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", "360deg"],
                }) },
              ],
            },
          ]}
        />

        {/* Floating Orb 2 - Top Right */}
        <Animated.View
          style={[
            styles.floatingOrb,
            styles.orb2,
            {
              transform: [
                { translateY: float2.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -60],
                }) },
                { rotate: rotate2.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", "-360deg"],
                }) },
              ],
            },
          ]}
        />

        {/* Floating Orb 3 - Bottom */}
        <Animated.View
          style={[
            styles.floatingOrb,
            styles.orb3,
            {
              transform: [
                { translateY: float3.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 100],
                }) },
              ],
            },
          ]}
        />
      </View>

      <View style={styles.container}>
        {/* Header Section with 3D-like rotation */}
        <Animated.View
          style={[
            styles.headerSection,
            {
              opacity: headerFade,
              transform: [
                { rotateX: headerRotateValue },
                { scale: headerFade },
              ],
            },
          ]}
        >
          <Animated.Text style={[styles.emoji, { transform: [{ scale: headerFade }] }]}>
            🔔
          </Animated.Text>
          <Text style={styles.title}>Reminder App</Text>
          <Text style={styles.subtitle}>Stay on top of your tasks</Text>
        </Animated.View>

        {/* Form Section */}
        <Animated.View
          style={[
            styles.formSection,
            {
              opacity: formFade,
              transform: [{ translateY: formSlide }],
            },
          ]}
        >
          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#A78BFA"
              value={email}
              onChangeText={setEmail}
              editable={!isLoading}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#A78BFA"
              value={password}
              onChangeText={setPassword}
              editable={!isLoading}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <Pressable
            style={[styles.loginButton, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? "Logging in..." : "Login"}
            </Text>
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            style={[styles.demoButton, isLoading && styles.buttonDisabled]}
            onPress={handleDemoLogin}
            disabled={isLoading}
          >
            <Text style={styles.demoButtonText}>Demo Login</Text>
          </Pressable>
        </Animated.View>

        {/* Footer Section */}
        <Animated.View
          style={[
            styles.footer,
            {
              opacity: footerFade,
            },
          ]}
        >
          <Text style={styles.footerText}>Demo credentials:</Text>
          <Text style={styles.footerSubtext}>Email: demo@example.com</Text>
          <Text style={styles.footerSubtext}>Password: demo123</Text>
        </Animated.View>
      </View>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  loginBackgroundImage: {
    opacity: 0.28,
  },
  scrollContent: {
    flexGrow: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  floatingOrb: {
    position: "absolute",
    borderRadius: 1000,
  },
  orb1: {
    width: 200,
    height: 200,
    backgroundColor: "#EC4899",
    opacity: 0.3,
    top: -50,
    left: -50,
    shadowColor: "#EC4899",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 40,
    elevation: 20,
  },
  orb2: {
    width: 150,
    height: 150,
    backgroundColor: "#8B5CF6",
    opacity: 0.25,
    top: 100,
    right: -30,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 30,
    elevation: 15,
  },
  orb3: {
    width: 180,
    height: 180,
    backgroundColor: "#06B6D4",
    opacity: 0.2,
    bottom: -80,
    right: 20,
    shadowColor: "#06B6D4",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 35,
    elevation: 18,
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    zIndex: 10,
    minHeight: 800,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 48,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.3)",
  },
  emoji: {
    fontSize: 80,
    marginBottom: 16,
    textShadowColor: "#EC4899",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
    textShadowColor: "#8B5CF6",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#A78BFA",
    fontWeight: "500",
  },
  formSection: {
    marginBottom: 32,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    padding: 28,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.2)",
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#C4B5FD",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 2,
    borderColor: "#8B5CF6",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#FFFFFF",
    backgroundColor: "rgba(139, 92, 246, 0.1)",
  },
  loginButton: {
    backgroundColor: "linear-gradient(135deg, #EC4899, #8B5CF6)",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 2,
    borderColor: "#EC4899",
    shadowColor: "#EC4899",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 17,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 28,
  },
  dividerLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: "rgba(139, 92, 246, 0.3)",
  },
  dividerText: {
    marginHorizontal: 12,
    color: "#A78BFA",
    fontSize: 14,
    fontWeight: "600",
  },
  demoButton: {
    borderWidth: 2,
    borderColor: "#06B6D4",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "rgba(6, 182, 212, 0.1)",
    shadowColor: "#06B6D4",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  demoButtonText: {
    color: "#06B6D4",
    fontWeight: "700",
    fontSize: 17,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  footer: {
    alignItems: "center",
    paddingVertical: 28,
    marginTop: 16,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderTopWidth: 1.5,
    borderTopColor: "rgba(139, 92, 246, 0.2)",
    borderRadius: 16,
  },
  footerText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#A78BFA",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  footerSubtext: {
    fontSize: 12,
    color: "#C4B5FD",
    marginBottom: 4,
    fontFamily: "Menlo",
  },
});
