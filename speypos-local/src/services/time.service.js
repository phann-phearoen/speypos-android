import { getStore } from "../storage/repositories/store.repo.js";
import { toZonedTime, format } from "date-fns-tz";

let storeTimezone = "Asia/Phnom_Penh"; // Default fallback

// This should be called once on application startup.
export function initializeStoreTimezone() {
  try {
    const store = getStore(); // Fetches the primary store's settings
    if (store && store.timezone) {
      storeTimezone = store.timezone;
    }
  } catch (error) {
    // In case the database is not ready, we stick with the default.
    console.error("Could not initialize store timezone. Using default.", error);
  }
}

/**
 * Returns critical time information based on the store's configured timezone.
 * @returns {{utcDate: Date, todayStoreDate: string}}
 * utcDate: A standard JavaScript Date object representing the current moment in UTC.
 * todayStoreDate: The 'YYYY-MM-DD' string for the store's current business day.
 */
export function getNowInStoreTime() {
  const utcDate = new Date(); // Get current time from the server clock
  const todayStoreDate = format(utcDate, "yyyy-MM-dd", {
    timeZone: storeTimezone,
  });

  return {
    utcDate,
    todayStoreDate,
  };
}

