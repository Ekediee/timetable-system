/**
 * Central application configuration and environment variables.
 */

export const CURRENT_SESSION = "2026 / 2027";
export const CURRENT_SEMESTER = "First Semester";

export const TOKEN_KEY = "bupulse_token";
export const DEFAULT_TIMEOUT_MS = 45000;

export function getBackendBaseUrl(): string {
  const rawBaseUrl =
    process.env.API_URL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim();

  if (!rawBaseUrl) {
    throw new Error(
      "Backend API URL is not configured. Please set NEXT_PUBLIC_API_URL or API_URL in your environment.",
    );
  }

  const cleanBaseUrl = rawBaseUrl.replace(/\/+$/, "");
  return cleanBaseUrl.endsWith("/api/v1")
    ? cleanBaseUrl
    : `${cleanBaseUrl}/api/v1`;
}

/**
 * Normalized aliases for departments whose display names in allocations or academic structure
 * diverge between disparate backend subsystems.
 */
export const DEPARTMENT_ALIASES: Record<string, string[]> = {
  "Agriculture and Industrial Technology": ["Agriculture"],
  "Business Administration and Marketing": [
    "Business Administration",
    "Marketing",
  ],
  "Electrical Engineering": ["Electrical and Electronic Engineering"],
  "History and International Studies": ["History & International Studies"],
  "Information Resource Management": ["Information Resources Management"],
  "International Law and Security Studies": ["International Law and Diplomacy"],
  "Medical Laboratory": ["Medical Laboratory Science"],
  "Nutrition and Dietetics": ["Nutrition And Dietetics"],
  "Political Science and Public Administration": [
    "Political Science",
    "Public Administration",
  ],
  "Private and Commercial Law": ["Law"],
};
