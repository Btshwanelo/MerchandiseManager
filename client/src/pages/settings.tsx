import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@shared/schema";
import SettingsPage from "./settings-page";

const Settings = () => {
  const { user } = useAuth();

  // For admin users, show the detailed settings page
  // For now we will only show the settings page, but we could implement
  // role-specific settings views in the future
  if (user?.role === UserRole.ADMIN) {
    return <SettingsPage />;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <p>You don't have permission to access settings. Please contact an administrator.</p>
    </div>
  );
};

export default Settings;