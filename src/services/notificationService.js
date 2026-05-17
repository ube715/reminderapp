import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

const REMINDER_CHANNEL_ID = "reminders";
const REMINDER_BODY_AFTER_DELAY = "You have a reminder. Click to view it.";
const WELLNESS_CHANNEL_ID = "wellness";
const WATER_REMINDER_BODY = "You should drink water.";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

const configureAndroidChannel = async () => {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: "Reminders",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 300, 200, 300],
    sound: "default"
  });
};

const requestPushPermission = async () => {
  if (Platform.OS === "web") {
    if ("Notification" in window && Notification.permission !== "granted") {
      await Notification.requestPermission();
    }
    return true;
  }

  if (!Device.isDevice && Platform.OS === "android") {
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === "granted";
};

export const configureNotifications = async () => {
  await configureAndroidChannel();
  await requestPushPermission();
};

const sendWebNotification = (title, body, data) => {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  const notification = new Notification(title, { body, data });
  notification.onclick = () => {
    localStorage.setItem("lastReminderMessage", data?.reminderMessage ?? "");
    window.focus();
  };
};

export const scheduleReminderNotifications = async (reminderMessage) => {
  const payload = {
    reminderMessage
  };

  if (Platform.OS === "web") {
    sendWebNotification("Reminder", "Reminder Set", payload);
    setTimeout(() => {
      sendWebNotification("Reminder", REMINDER_BODY_AFTER_DELAY, payload);
    }, 30000);
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Reminder",
      body: "Reminder Set",
      data: payload
    },
    trigger: null
  });

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Reminder",
      body: REMINDER_BODY_AFTER_DELAY,
      data: payload
    },
    trigger: {
      seconds: 30,
      channelId: REMINDER_CHANNEL_ID
    }
  });
};

export const scheduleWaterReminderNotifications = async (contactNumber) => {
  const payload = {
    contactNumber
  };

  if (Platform.OS === "web") {
    sendWebNotification("Water Reminder", WATER_REMINDER_BODY, payload);
    setTimeout(() => {
      sendWebNotification("Water Reminder", WATER_REMINDER_BODY, payload);
    }, 30000);
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Water Reminder",
      body: WATER_REMINDER_BODY,
      data: payload
    },
    trigger: null
  });

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Water Reminder",
      body: WATER_REMINDER_BODY,
      data: payload
    },
    trigger: {
      seconds: 30,
      channelId: WELLNESS_CHANNEL_ID
    }
  });
};

export const getReminderMessageFromResponse = (response) => {
  if (!response) {
    if (Platform.OS === "web") {
      const stored = localStorage.getItem("lastReminderMessage");
      if (stored) {
        localStorage.removeItem("lastReminderMessage");
        return stored;
      }
    }
    return null;
  }

  return response.notification.request.content.data?.reminderMessage ?? null;
};
