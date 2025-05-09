import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, UserPlus, LogIn, Loader2, Key } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertUserSchema, UserRole } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

// Login schema
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

// Registration schema with password confirmation
const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RegisterValues = z.infer<typeof registerSchema>;

const AuthPage = () => {
  const [activeTab, setActiveTab] = useState<string>("login");
  const [location, navigate] = useLocation();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const { user, loginMutation, registerMutation, isLoading } = useAuth();
  const { toast } = useToast();

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Login form
  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "merchandiser", // Default role
    },
  });

  // Reset errors when switching tabs
  useEffect(() => {
    setLoginError(null);
    setRegisterError(null);
  }, [activeTab]);

  const onLogin = (values: LoginValues) => {
    setLoginError(null);
    loginMutation.mutate(values, {
      onError: (error) => {
        setLoginError(error.message || "Login failed. Please check your credentials.");
      }
    });
  };

  const onRegister = (values: RegisterValues) => {
    setRegisterError(null);
    const { confirmPassword, ...registerData } = values;
    registerMutation.mutate(registerData, {
      onError: (error) => {
        setRegisterError(error.message || "Registration failed. Please try again.");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side - Hero/Info (60%) */}
      <div className="hidden md:flex md:w-[60%] bg-primary flex-col justify-center items-center p-8 text-white">
        <div className="max-w-xl">
          <div className="flex items-center space-x-3 mb-8">
            <Package className="h-10 w-10 text-white" />
            <h1 className="text-3xl font-bold">InvenTrack</h1>
          </div>
          
          <h2 className="text-4xl font-bold mb-6">Inventory Management Made Simple</h2>
          <p className="text-xl mb-6">Streamline your merchandising operations with our powerful inventory management solution.</p>
          
          <div className="space-y-4 mt-10">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-full">
                <Package className="h-5 w-5" />
              </div>
              <p className="text-lg">Fixed user-specific work item permissions</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-full">
                <UserPlus className="h-5 w-5" />
              </div>
              <p className="text-lg">Enhanced process form with improved validations</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-full">
                <LogIn className="h-5 w-5" />
              </div>
              <p className="text-lg">Optimized inventory tracking for faster performance</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right side - Form (40%) */}
      <div className="flex flex-col justify-center items-center w-full md:w-[40%] p-6 bg-white">
        <div className="md:hidden flex items-center space-x-2 mb-8">
          <Package className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">InvenTrack</h1>
        </div>

        <Card className="w-full max-w-md shadow-none border-0 md:border md:shadow-sm">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <CardHeader>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent>
              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter your password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      <LogIn className="mr-2 h-4 w-4" />
                      Login
                    </Button>
                    
                    {loginError && (
                      <div className="mt-4 p-3 bg-destructive/15 border border-destructive text-destructive rounded">
                        {loginError}
                      </div>
                    )}
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Choose a username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Enter your email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Create a password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Confirm your password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      <UserPlus className="mr-2 h-4 w-4" />
                      Register
                    </Button>
                    
                    {registerError && (
                      <div className="mt-4 p-3 bg-destructive/15 border border-destructive text-destructive rounded">
                        {registerError}
                      </div>
                    )}
                  </form>
                </Form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
      
      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t py-2 px-4 text-xs text-center text-muted-foreground">
        <div className="container max-w-7xl mx-auto flex justify-between items-center">
          <div>&copy; {new Date().getFullYear()} InvenTrack. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <Link 
              href="/changelog" 
              className="hover:text-primary hover:underline transition-colors flex items-center gap-1"
            >
              <span>Changelog</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
