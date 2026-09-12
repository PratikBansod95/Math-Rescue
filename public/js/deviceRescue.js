import { emptyDailyState, mergeDeviceDailyIntoProfile, normalizeDaily } from "./daily.js";
import { generatePlayerId } from "./playerIdentity.js";

const DEVICE_KEY = "deviceId";

export function getOrCreateDeviceId() {
  if (typeof localStorage === "undefined") return generatePlayerId();
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = generatePlayerId();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return generatePlayerId();
  }
}

export function emptyDeviceRescueSave() {
  return {
    deviceId: getOrCreateDeviceId(),
    deviceDaily: emptyDailyState(),
  };
}

export function normalizeDeviceRescueSave(data = {}) {
  return {
    deviceId: typeof data.deviceId === "string" && data.deviceId ? data.deviceId : getOrCreateDeviceId(),
    deviceDaily: normalizeDaily(data.deviceDaily),
  };
}

export { mergeDeviceDailyIntoProfile };
