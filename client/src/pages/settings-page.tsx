import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSettings } from "@/hooks/use-settings";
import { Loader2, Plus, Trash } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function SettingsPage() {
  const { settings, isLoading, error, createSetting, updateSetting, deleteSetting, createSettingPending } = useSettings();
  const [open, setOpen] = useState(false);

  // Form schema for creating a new setting
  const formSchema = z.object({
    key: z.string().min(2, "Key must be at least 2 characters").max(50, "Key must be less than 50 characters"),
    value: z.string().min(1, "Value is required"),
    description: z.string().optional(),
  });

  // Create form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      key: "",
      value: "",
      description: ""
    },
  });

  // Submit handler for creating a new setting
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    try {
      // Parse the value as JSON if possible
      let parsedValue;
      try {
        parsedValue = JSON.parse(values.value);
      } catch (e) {
        // If not valid JSON, use as string
        parsedValue = values.value;
      }
      
      createSetting({
        key: values.key,
        value: parsedValue,
        description: values.description || undefined
      }, {
        onSuccess: () => {
          setOpen(false);
          form.reset();
        }
      });
    } catch (error) {
      console.error("Failed to create setting:", error);
    }
  };

  // Update a setting's value
  const handleUpdateSetting = (key: string, currentValue: any) => {
    const newValue = prompt("Enter new value:", JSON.stringify(currentValue));
    if (newValue === null) return; // User cancelled
    
    try {
      // Parse the value as JSON if possible
      let parsedValue;
      try {
        parsedValue = JSON.parse(newValue);
      } catch (e) {
        // If not valid JSON, use as string
        parsedValue = newValue;
      }
      
      updateSetting({ key, value: parsedValue });
    } catch (error) {
      console.error("Failed to update setting:", error);
    }
  };

  // Delete a setting
  const handleDeleteSetting = (key: string) => {
    if (confirm(`Are you sure you want to delete setting "${key}"?`)) {
      deleteSetting(key);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load settings: {error.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Application Settings</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Setting
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Setting</DialogTitle>
              <DialogDescription>
                Create a new application setting. Settings can be used to configure system behavior without code changes.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Key</FormLabel>
                      <FormControl>
                        <Input placeholder="setting_key" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Value</FormLabel>
                      <FormControl>
                        <Input placeholder="Setting value" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="What this setting controls" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createSettingPending}>
                    {createSettingPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Setting
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {settings && settings.length > 0 ? (
          settings.map((setting) => (
            <Card key={setting.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-mono">{setting.key}</CardTitle>
                    {setting.description && (
                      <CardDescription>{setting.description}</CardDescription>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteSetting(setting.key)}
                  >
                    <Trash className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <pre className="bg-muted p-2 rounded text-sm overflow-x-auto">
                  {JSON.stringify(setting.value, null, 2)}
                </pre>
              </CardContent>
              <CardFooter className="bg-muted/50 py-2">
                <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
                  <span>Updated: {new Date(setting.updatedAt).toLocaleString()}</span>
                  <Button variant="ghost" size="sm" onClick={() => handleUpdateSetting(setting.key, setting.value)}>
                    Edit Value
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full">
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No settings found. Add your first setting to get started.</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}