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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">System Settings</h1>
        <Button onClick={handleSaveSettings} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>

      <Alert variant="warning" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>
          Changing system settings will affect all users and may require system restart.
          Proceed with caution.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Configure the basic system settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={appSettings.general.companyName}
                  onChange={(e) =>
                    setAppSettings({
                      ...appSettings,
                      general: {
                        ...appSettings.general,
                        companyName: e.target.value,
                      },
                    })
                  }
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={appSettings.general.contactEmail}
                  onChange={(e) =>
                    setAppSettings({
                      ...appSettings,
                      general: {
                        ...appSettings.general,
                        contactEmail: e.target.value,
                      },
                    })
                  }
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="timezone">Timezone</Label>
                <select
                  id="timezone"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={settings.general.timezone}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      general: {
                        ...settings.general,
                        timezone: e.target.value,
                      },
                    })
                  }
                >
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="defaultCurrency">Default Currency</Label>
                <select
                  id="defaultCurrency"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={settings.general.defaultCurrency}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      general: {
                        ...settings.general,
                        defaultCurrency: e.target.value,
                      },
                    })
                  }
                >
                  <option value="USD">US Dollar ($)</option>
                  <option value="EUR">Euro (€)</option>
                  <option value="GBP">British Pound (£)</option>
                  <option value="CAD">Canadian Dollar (C$)</option>
                  <option value="JPY">Japanese Yen (¥)</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Settings</CardTitle>
              <CardDescription>
                Configure inventory tracking and alert preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label htmlFor="lowStockThreshold">
                    Low Stock Threshold (%)
                  </Label>
                  <span className="text-sm">{settings.inventory.lowStockThreshold}%</span>
                </div>
                <Slider
                  id="lowStockThreshold"
                  min={5}
                  max={50}
                  step={5}
                  value={[settings.inventory.lowStockThreshold]}
                  onValueChange={(value) =>
                    setSettings({
                      ...settings,
                      inventory: {
                        ...settings.inventory,
                        lowStockThreshold: value[0],
                      },
                    })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Items will be flagged as low stock when they reach this percentage of their minimum stock level.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoReorder">Auto Reorder</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically create purchase orders for low stock items
                  </p>
                </div>
                <Switch
                  id="autoReorder"
                  checked={settings.inventory.autoReorder}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      inventory: {
                        ...settings.inventory,
                        autoReorder: checked,
                      },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="showOutOfStock">Show Out of Stock Items</Label>
                  <p className="text-sm text-muted-foreground">
                    Display out of stock items in inventory reports
                  </p>
                </div>
                <Switch
                  id="showOutOfStock"
                  checked={settings.inventory.showOutOfStock}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      inventory: {
                        ...settings.inventory,
                        showOutOfStock: checked,
                      },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="trackExpiredItems">Track Expired Items</Label>
                  <p className="text-sm text-muted-foreground">
                    Create alerts for items approaching expiration dates
                  </p>
                </div>
                <Switch
                  id="trackExpiredItems"
                  checked={settings.inventory.trackExpiredItems}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      inventory: {
                        ...settings.inventory,
                        trackExpiredItems: checked,
                      },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure system alerts and notification preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="emailAlerts">Email Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive important notifications via email
                  </p>
                </div>
                <Switch
                  id="emailAlerts"
                  checked={settings.notifications.emailAlerts}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        emailAlerts: checked,
                      },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="dailyReports">Daily Reports</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive daily inventory summary reports
                  </p>
                </div>
                <Switch
                  id="dailyReports"
                  checked={settings.notifications.dailyReports}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        dailyReports: checked,
                      },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="criticalAlerts">Critical Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive immediate alerts for critical stock issues
                  </p>
                </div>
                <Switch
                  id="criticalAlerts"
                  checked={settings.notifications.criticalAlerts}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        criticalAlerts: checked,
                      },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="weeklyReports">Weekly Reports</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive weekly performance and trend reports
                  </p>
                </div>
                <Switch
                  id="weeklyReports"
                  checked={settings.notifications.weeklyReports}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        weeklyReports: checked,
                      },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Configure authentication and security preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label htmlFor="passwordExpiryDays">
                    Password Expiry (days)
                  </Label>
                  <span className="text-sm">{settings.security.passwordExpiryDays} days</span>
                </div>
                <Slider
                  id="passwordExpiryDays"
                  min={30}
                  max={180}
                  step={15}
                  value={[settings.security.passwordExpiryDays]}
                  onValueChange={(value) =>
                    setSettings({
                      ...settings,
                      security: {
                        ...settings.security,
                        passwordExpiryDays: value[0],
                      },
                    })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Users will be required to change their password after this many days.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="twoFactorAuth">Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Require two-factor authentication for all users
                  </p>
                </div>
                <Switch
                  id="twoFactorAuth"
                  checked={settings.security.twoFactorAuth}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      security: {
                        ...settings.security,
                        twoFactorAuth: checked,
                      },
                    })
                  }
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label htmlFor="sessionTimeout">
                    Session Timeout (minutes)
                  </Label>
                  <span className="text-sm">{settings.security.sessionTimeout} minutes</span>
                </div>
                <Slider
                  id="sessionTimeout"
                  min={5}
                  max={120}
                  step={5}
                  value={[settings.security.sessionTimeout]}
                  onValueChange={(value) =>
                    setSettings({
                      ...settings,
                      security: {
                        ...settings.security,
                        sessionTimeout: value[0],
                      },
                    })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Users will be automatically logged out after this period of inactivity.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="ipRestriction">IP Restriction</Label>
                  <p className="text-sm text-muted-foreground">
                    Limit system access to specific IP addresses
                  </p>
                </div>
                <Switch
                  id="ipRestriction"
                  checked={settings.security.ipRestriction}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      security: {
                        ...settings.security,
                        ipRestriction: checked,
                      },
                    })
                  }
                />
              </div>
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground">
                Security settings changes will be logged for audit purposes.
              </p>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
