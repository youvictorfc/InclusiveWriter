import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Loader2 } from 'lucide-react';

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordChangeForm = z.infer<typeof passwordChangeSchema>;

export default function Settings() {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordChangeForm>({
    resolver: zodResolver(passwordChangeSchema),
  });

  const passwordChangeMutation = useMutation({
    mutationFn: async (data: PasswordChangeForm) => {
      const response = await apiRequest('POST', '/api/change-password', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
        className: "bg-green-100 border-green-500",
      });
      reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Password Change Failed",
        description: error.message || "Failed to change password. Please try again.",
        className: "bg-red-100 border-red-500",
      });
    },
  });

  const onSubmit = (data: PasswordChangeForm) => {
    passwordChangeMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center text-sm text-muted-foreground mb-6">
          <span>Settings</span>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-6">Change Password</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-2">
                  Current Password
                </label>
                <Input
                  type="password"
                  {...register('currentPassword')}
                  className={errors.currentPassword ? 'border-red-500' : ''}
                />
                {errors.currentPassword && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.currentPassword.message}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">
                  New Password
                </label>
                <Input
                  type="password"
                  {...register('newPassword')}
                  className={errors.newPassword ? 'border-red-500' : ''}
                />
                {errors.newPassword && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.newPassword.message}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">
                  Confirm New Password
                </label>
                <Input
                  type="password"
                  {...register('confirmPassword')}
                  className={errors.confirmPassword ? 'border-red-500' : ''}
                />
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={passwordChangeMutation.isPending}
              >
                {passwordChangeMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Changing Password...
                  </>
                ) : (
                  'Change Password'
                )}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
