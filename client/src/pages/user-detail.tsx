import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Loader2, 
  Mail, 
  Phone, 
  Shield, 
  UserCog, 
  Camera, 
  ArrowLeft,
  Store,
  Activity,
  KeyRound,
  Trash2,
  User
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserRole, type User as UserType } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

const UserDetailPage = () => {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [_, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const userId = parseInt(id);
  
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [masqueradeDialogOpen, setMasqueradeDialogOpen] = useState(false);
  
  // Check if current user has permission to view this page
  const canManageUser = currentUser && (
    currentUser.role === UserRole.ADMIN || 
    (currentUser.role === UserRole.MANAGER && currentUser.id !== userId)
  );
  
  const canDelete = currentUser?.role === UserRole.ADMIN && currentUser.id !== userId;
  const canMasquerade = currentUser?.role === UserRole.ADMIN && currentUser.id !== userId;
  const canResetPassword = currentUser && (
    currentUser.role === UserRole.ADMIN || 
    (currentUser.role === UserRole.MANAGER && currentUser.id !== userId)
  );

  // Get user details
  const { 
    data: user, 
    isLoading, 
    error, 
    isError 
  } = useQuery<UserType>({
    queryKey: [`/api/users/${userId}`],
    enabled: !!userId && !!currentUser,
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/reset-password", { userId });
      return await res.json();
    },
    onSuccess: () => {
      setResetPasswordDialogOpen(false);
      toast({
        title: "Password reset email sent",
        description: "A password reset link has been sent to the user's email.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to send reset password email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/users/${userId}`);
      return await res.json();
    },
    onSuccess: () => {
      setDeleteUserDialogOpen(false);
      toast({
        title: "User deleted",
        description: "The user has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setLocation("/users");
    },
    onError: (error) => {
      toast({
        title: "Failed to delete user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Masquerade as user mutation
  const masqueradeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/masquerade", { userId });
      return await res.json();
    },
    onSuccess: () => {
      setMasqueradeDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Masquerading as user",
        description: `You are now masquerading as ${user?.name}. Log out to return to your account.`,
      });
      // Redirect to dashboard
      setLocation("/");
    },
    onError: (error) => {
      toast({
        title: "Failed to masquerade as user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle reset password
  const handleResetPassword = () => {
    resetPasswordMutation.mutate();
  };

  // Handle delete user
  const handleDeleteUser = () => {
    deleteUserMutation.mutate();
  };

  // Handle masquerade as user
  const handleMasquerade = () => {
    masqueradeMutation.mutate();
  };

  // If not an admin or manager, redirect to home
  if (currentUser && !canManageUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <Shield className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-semibold mb-2">Access Denied</h1>
        <p className="text-muted-foreground text-center mb-4">
          You don't have permission to access this page.
        </p>
        <Button asChild variant="default">
          <Link href="/">
            Go to Dashboard
          </Link>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mb-4">
          <UserCog className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-xl font-semibold mb-2">User Not Found</h1>
        <p className="text-muted-foreground text-center mb-4">
          The user you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <Button asChild variant="default">
          <Link href="/users">
            Back to User Management
          </Link>
        </Button>
      </div>
    );
  }

  // Get role badge color
  const getRoleColor = (role: string) => {
    switch (role) {
      case UserRole.ADMIN:
        return "bg-primary text-primary-foreground";
      case UserRole.MANAGER:
        return "bg-orange-500 text-white";
      case UserRole.MERCHANDISER:
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" asChild className="mr-2">
            <Link href="/users">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">User Details</h1>
        </div>
        <div className="flex gap-2">
          {canMasquerade && (
            <Button variant="outline" onClick={() => setMasqueradeDialogOpen(true)}>
              <User className="h-4 w-4 mr-2" />
              Masquerade as User
            </Button>
          )}
          {canDelete && (
            <Button variant="destructive" onClick={() => setDeleteUserDialogOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete User
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* User Summary Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center">
              <Avatar className="h-20 w-20">
                <AvatarImage src="" alt={user.name} />
                <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <h2 className="text-xl font-semibold mt-4">{user.name}</h2>
              <div className={`px-3 py-1 rounded-full text-xs font-medium mt-1 ${getRoleColor(user.role)}`}>
                {user.role}
              </div>
              
              <div className="w-full mt-6 space-y-3">
                <div className="flex items-center text-sm">
                  <UserCog className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-muted-foreground">Username:</span>
                  <span className="ml-auto font-medium">{user.username}</span>
                </div>
                
                <div className="flex items-center text-sm">
                  <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-muted-foreground">Email:</span>
                  <span className="ml-auto font-medium">{user.email}</span>
                </div>
                
                <div className="flex items-center text-sm">
                  <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="ml-auto font-medium">{user.phoneNumber || "Not set"}</span>
                </div>
                
                <Separator className="my-3" />
                
                <div className="flex items-center text-sm">
                  <Shield className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-muted-foreground">Member since:</span>
                  <span className="ml-auto font-medium">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                  </span>
                </div>
              </div>
              
              {canResetPassword && (
                <Button 
                  variant="outline" 
                  className="mt-4 w-full"
                  onClick={() => setResetPasswordDialogOpen(true)}
                >
                  <KeyRound className="h-4 w-4 mr-2" />
                  Reset Password
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* User Details Tabs */}
        <Card className="md:col-span-3">
          <CardContent className="pt-6">
            <Tabs defaultValue="details">
              <TabsList className="mb-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="stores">Assigned Stores</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium mb-2">User Information</h3>
                    <div className="space-y-3">
                      <div className="bg-muted/40 p-3 rounded-md flex justify-between">
                        <span className="text-sm text-muted-foreground">Full Name:</span>
                        <span className="text-sm font-medium">{user.name}</span>
                      </div>
                      <div className="bg-muted/40 p-3 rounded-md flex justify-between">
                        <span className="text-sm text-muted-foreground">Username:</span>
                        <span className="text-sm font-medium">{user.username}</span>
                      </div>
                      <div className="bg-muted/40 p-3 rounded-md flex justify-between">
                        <span className="text-sm text-muted-foreground">Email:</span>
                        <span className="text-sm font-medium">{user.email}</span>
                      </div>
                      <div className="bg-muted/40 p-3 rounded-md flex justify-between">
                        <span className="text-sm text-muted-foreground">Role:</span>
                        <span className="text-sm font-medium">{user.role}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Contact &amp; Status</h3>
                    <div className="space-y-3">
                      <div className="bg-muted/40 p-3 rounded-md flex justify-between">
                        <span className="text-sm text-muted-foreground">Phone Number:</span>
                        <span className="text-sm font-medium">{user.phoneNumber || "Not set"}</span>
                      </div>
                      <div className="bg-muted/40 p-3 rounded-md flex justify-between">
                        <span className="text-sm text-muted-foreground">Created Date:</span>
                        <span className="text-sm font-medium">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                        </span>
                      </div>
                      <div className="bg-muted/40 p-3 rounded-md flex justify-between">
                        <span className="text-sm text-muted-foreground">Status:</span>
                        <Badge variant="outline" className="text-xs">Active</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="stores">
                <div className="rounded-md border p-6 flex flex-col items-center justify-center">
                  <Store className="h-8 w-8 text-muted-foreground mb-2" />
                  <h3 className="text-lg font-medium">No Stores Assigned</h3>
                  <p className="text-sm text-muted-foreground text-center mt-1">
                    This user doesn't have any stores assigned to them yet.
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="activity">
                <div className="rounded-md border p-6 flex flex-col items-center justify-center">
                  <Activity className="h-8 w-8 text-muted-foreground mb-2" />
                  <h3 className="text-lg font-medium">No Activity</h3>
                  <p className="text-sm text-muted-foreground text-center mt-1">
                    No recent activity found for this user.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset User Password</DialogTitle>
            <DialogDescription>
              This will send a password reset link to the user's email address. 
              The link will expire in 24 hours.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center space-x-2 bg-muted p-3 rounded-md">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div className="text-sm font-medium">{user.email}</div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setResetPasswordDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleResetPassword}
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Send Reset Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <AlertDialog open={deleteUserDialogOpen} onOpenChange={setDeleteUserDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user account for <strong>{user.name}</strong>. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteUser}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Masquerade Dialog */}
      <AlertDialog open={masqueradeDialogOpen} onOpenChange={setMasqueradeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log in as this user?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be logged in as <strong>{user.name}</strong>. To return to your account, 
              you will need to log out and log back in with your credentials.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMasquerade}
              disabled={masqueradeMutation.isPending}
            >
              {masqueradeMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Log in as User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserDetailPage;