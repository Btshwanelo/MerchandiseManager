import { useState, useEffect } from "react";
import { useLocation } from "wouter";
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
import { Package, UserPlus, LogIn, Loader2, Key, UserCog, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertUserSchema, UserRole } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

// Demo user accounts for quick testing
const demoPredefinedUsers = [
  { username: "admin", password: "admin123", role: UserRole.ADMIN },
  { username: "manager", password: "manager123", role: UserRole.MANAGER },
  { username: "test", password: "test123", role: UserRole.MERCHANDISER }
];


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

  const handleLoginWithTestUser = (user: typeof demoPredefinedUsers[0]) => {
    setLoginError(null);
    loginMutation.mutate(
      { username: user.username, password: user.password },
      {
        onError: (error) => {
          setLoginError(error.message || "Login failed. Please check your credentials.");
          toast({
            title: "Login failed",
            description: "There was an error logging in with test account. Please try again.",
            variant: "destructive",
          });
        }
      }
    );
  };

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
              <p className="text-lg">Manage products across multiple stores</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-full">
                <UserPlus className="h-5 w-5" />
              </div>
              <p className="text-lg">Role-based access for your team</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-full">
                <LogIn className="h-5 w-5" />
              </div>
              <p className="text-lg">Intuitive interface for merchandisers</p>
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
                
                {/* Demo accounts section */}
                <div className="mt-8">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-muted" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-white px-2 text-muted-foreground">
                        Quick access demo accounts
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    {demoPredefinedUsers.map((demoUser) => (
                      <div
                        key={demoUser.username}
                        className="flex items-center space-x-2 rounded-md border p-3 text-sm hover:bg-accent transition-colors cursor-pointer"
                        onClick={() => handleLoginWithTestUser(demoUser)}
                      >
                        <div className="p-1.5 rounded-full bg-primary/10">
                          {demoUser.role === UserRole.ADMIN && <UserCog className="h-4 w-4 text-primary" />}
                          {demoUser.role === UserRole.MANAGER && <Users className="h-4 w-4 text-primary" />}
                          {demoUser.role === UserRole.MERCHANDISER && <Package className="h-4 w-4 text-primary" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{demoUser.role} Account</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Username: {demoUser.username}, Password: {demoUser.password}
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          disabled={loginMutation.isPending}
                        >
                          {loginMutation.isPending && demoUser.username === loginMutation.variables?.username && (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          )}
                          <LogIn className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
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
    </div>
  );
};

export default AuthPage;
