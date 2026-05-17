/**
 * apiService.js
 * =============
 * Connects the React Native / Expo frontend to the Flask backend.
 * All reminder CRUD operations go through this module.
 */

import { Platform } from "react-native";

/**
 * Determine the correct base URL depending on the platform:
 *  - Web / Desktop  → localhost
 *  - Android emu    → 10.0.2.2 (Android emulator maps this to host machine)
 *  - iOS sim        → localhost
 *  - Physical device → replace with your machine's LAN IP
 */
const getDefaultBaseUrl = () => {
  if (Platform.OS === "android") {
    return "http://10.0.2.2:5000";
  }

  // Web, iOS simulator, and desktop all use localhost by default.
  return "http://localhost:5000";
};

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || getDefaultBaseUrl();

// ---------------------------------------------------------------------------
// Generic fetch wrapper
// ---------------------------------------------------------------------------
const apiFetch = async (path, options = {}) => {
  const url = `${BASE_URL}${path}`;

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  let response;

  try {
    response = await fetch(url, { ...options, headers });
  } catch {
    throw new Error(`Unable to reach backend at ${BASE_URL}`);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
};

// ---------------------------------------------------------------------------
// API methods
// ---------------------------------------------------------------------------

/** Check if the backend is reachable. */
export const healthCheck = () => apiFetch("/api/health");

/** Login with email and password. Returns auth token. */
export const login = (email, password) =>
  apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

/** Fetch the wellness tracking profile. */
export const getWellnessProfile = () => apiFetch("/api/wellness/profile");

/** Save wellness tracking data, body metrics, and water reminder contact. */
export const updateWellnessProfile = (fields) =>
  apiFetch("/api/wellness/profile", {
    method: "PUT",
    body: JSON.stringify(fields),
  });

/** Send a Twilio SMS water reminder to the configured contact number. */
export const sendWaterReminderSms = (contactNumber, message = "You should drink water.") =>
  apiFetch("/api/wellness/water-reminder", {
    method: "POST",
    body: JSON.stringify({
      contact_number: contactNumber,
      message,
      delayed_message: message,
      delay_seconds: 30,
    }),
  });

/** Create a new reminder. Returns the created reminder object. */
export const createReminder = (message) =>
  apiFetch("/api/reminders", {
    method: "POST",
    body: JSON.stringify({ message }),
  });

/**
 * Fetch all reminders.
 * @param {string} [status] - Optional filter: "pending" | "done"
 */
export const listReminders = (status) => {
  const query = status ? `?status=${status}` : "";
  return apiFetch(`/api/reminders${query}`);
};

/** Fetch a single reminder by id. */
export const getReminder = (id) => apiFetch(`/api/reminders/${id}`);

/**
 * Update a reminder.
 * @param {string} id
 * @param {{ message?: string, status?: string }} fields
 */
export const updateReminder = (id, fields) =>
  apiFetch(`/api/reminders/${id}`, {
    method: "PUT",
    body: JSON.stringify(fields),
  });

/** Mark a reminder as done. */
export const markReminderDone = (id) => updateReminder(id, { status: "done" });

/** Delete a reminder. */
export const deleteReminder = (id) =>
  apiFetch(`/api/reminders/${id}`, { method: "DELETE" });
