import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export type PublicAuthSession = {
  email: string;
  expires_at: string;
  user_id: string;
};

export type AccessCheck = {
  access: boolean;
  auth: boolean;
  error: string | null;
  subscription: boolean;
};

export function getAuthSession() {
  return invoke<PublicAuthSession | null>("get_auth_session");
}

export function logoutAuthSession() {
  return invoke<void>("logout_auth_session");
}

export function checkAppAccess() {
  return invoke<AccessCheck>("check_app_access_detailed");
}

export function onAuthSessionUpdated(callback: (session: PublicAuthSession) => void) {
  return listen<PublicAuthSession>("auth-session-updated", (event) => callback(event.payload));
}
