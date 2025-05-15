/**
 * Feature Flags Configuration
 * 
 * This file contains feature flags that can be toggled to enable or disable
 * specific application features.
 */

export const FeatureFlags = {
  // System-wide feature flags
  ENABLE_USER_ALERTS: false, // Controls whether the alerts system is active
  
  // Add additional feature flags as needed
};

// Helper to check if a feature is enabled
export function isFeatureEnabled(featureName: keyof typeof FeatureFlags): boolean {
  return FeatureFlags[featureName] === true;
}