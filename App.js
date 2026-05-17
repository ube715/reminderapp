import React, { useCallback, useEffect, useRef, useState } from "react";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Pressable, Text } from "react-native";
import * as Notifications from "expo-notifications";
import CreateReminderScreen from "./src/screens/CreateReminderScreen";
import ReminderDetailsScreen from "./src/screens/ReminderDetailsScreen";
import LoginScreen from "./src/screens/LoginScreen";
import LoadingScreen from "./src/screens/LoadingScreen";
import { configureNotifications, getReminderMessageFromResponse } from "./src/services/notificationService";

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [pendingReminderMessage, setPendingReminderMessage] = useState(null);
  const mountedRef = useRef(true);

  const openReminderDetails = useCallback((message) => {
    if (!message) {
      return;
    }

    if (navigationRef.isReady()) {
      navigationRef.navigate("ReminderDetails", { reminderMessage: message });
      return;
    }

    setPendingReminderMessage(message);
  }, []);

  // Initialize app: check auth state and configure notifications
  useEffect(() => {
    mountedRef.current = true;

    const bootstrap = async () => {
      try {
        // Configure notifications first
        await configureNotifications();

        // Check for pending notification from cold start
        const initialResponse = await Notifications.getLastNotificationResponseAsync();
        const initialReminder = getReminderMessageFromResponse(initialResponse);

        if (mountedRef.current && initialReminder) {
          openReminderDetails(initialReminder);
        }

        // For now, assume no persistent auth (demo mode)
        // In production, check AsyncStorage for auth token
        if (mountedRef.current) {
          setIsLoggedIn(false);
          setIsLoading(false);
        }
      } catch (error) {
        if (mountedRef.current) {
          setIsLoading(false);
          setIsLoggedIn(false);
        }
      }
    };

    bootstrap();

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const message = getReminderMessageFromResponse(response);
      openReminderDetails(message);
    });

    return () => {
      mountedRef.current = false;
      subscription.remove();
    };
  }, [openReminderDetails]);

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        if (pendingReminderMessage) {
          navigationRef.navigate("ReminderDetails", { reminderMessage: pendingReminderMessage });
          setPendingReminderMessage(null);
        }
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerTitleAlign: "center",
          animationEnabled: true,
        }}
      >
        {isLoading ? (
          <Stack.Screen
            name="Loading"
            component={LoadingScreen}
            options={{ headerShown: false }}
          />
        ) : isLoggedIn ? (
          <>
            <Stack.Screen
              name="CreateReminder"
              component={CreateReminderScreen}
              options={{
                title: "Create Reminder",
                headerRight: () => (
                  <Pressable
                    onPress={() => setIsLoggedIn(false)}
                    style={{ paddingRight: 16 }}
                  >
                    <Text style={{ color: "#EF4444", fontSize: 16, fontWeight: "600" }}>
                      Logout
                    </Text>
                  </Pressable>
                ),
              }}
            />
            <Stack.Screen
              name="ReminderDetails"
              component={ReminderDetailsScreen}
              options={{ title: "Reminder Details" }}
            />
          </>
        ) : (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{
              headerShown: false,
              animationEnabled: false,
            }}
            initialParams={{
              setIsLoggedIn: setIsLoggedIn,
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
