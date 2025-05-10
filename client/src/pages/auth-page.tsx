import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Package, LogIn, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

// Login schema
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

const AuthPage = () => {
  const [location, navigate] = useLocation();
  const [loginError, setLoginError] = useState<string | null>(null);
  const { user, loginMutation, isLoading } = useAuth();
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

  const onLogin = (values: LoginValues) => {
    setLoginError(null);
    loginMutation.mutate(values, {
      onError: (error) => {
        // Extract and format the error message
        let errorMessage = "Login failed. Please check your credentials.";
        
        if (error.message) {
          // Try to extract the message from the error
          if (error.message.includes("401:")) {
            // Remove status code from error message
            errorMessage = error.message.replace("401: ", "");
          } else if (error.message.includes("400:")) {
            // Remove status code from error message
            errorMessage = error.message.replace("400: ", "");
          } else {
            errorMessage = error.message;
          }
        }
        
        setLoginError(errorMessage);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#7ccd57]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side - Hero/Info (60%) */}
      <div className="hidden md:flex md:w-[60%] relative flex-col justify-center items-center p-8 text-white overflow-hidden">
        {/* Background image */}
        <div 
          className="absolute inset-0 bg-cover bg-center z-0" 
          style={{ backgroundImage: "url('/images/hero-background.png')" }}
        />
        
        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#000000cc] to-[#00000080] z-10"></div>
        
        <div className="max-w-xl relative z-20">
          <div className="flex items-center mb-8">
            <img src="/images/reimagined-logo.png" alt="Re-Imagined Excellence Logo" className="h-16" />
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
                <Package className="h-5 w-5" />
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
        <div className="md:hidden flex items-center justify-center mb-8">
          <img src="/images/reimagined-logo.png" alt="Re-Imagined Excellence Logo" className="h-14" />
        </div>

        <Card className="w-full max-w-md shadow-none border-0 md:border md:shadow-sm">
          <CardHeader>
            <CardTitle className="text-center">Login</CardTitle>
          </CardHeader>

          <CardContent>
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
                        <PasswordInput placeholder="Enter your password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-[#7ccd57] hover:bg-[#6db84a]"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <LogIn className="mr-2 h-4 w-4" />
                  Login
                </Button>
                
                {loginError && (
                  <div className="mt-4 p-4 bg-destructive/15 border border-destructive text-destructive rounded flex items-start">
                    <div className="mr-2 mt-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium mb-1">Login Failed</div>
                      <div className="text-sm">{loginError}</div>
                    </div>
                  </div>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
      
      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t py-2 px-4 text-xs text-center text-muted-foreground">
        <div className="container max-w-7xl mx-auto flex justify-between items-center">
          <div>&copy; {new Date().getFullYear()} Re-Imagined Excellence. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <Link 
              href="/changelog" 
              className="hover:text-[#7ccd57] hover:underline transition-colors flex items-center gap-1"
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