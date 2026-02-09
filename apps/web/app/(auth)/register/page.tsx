'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { FaceRecognition } from '@/components/FaceRecognition';
import { supabase } from '@/lib/supabase';

export default function RegisterPage() {
  const router = useRouter();
  const { register, loading } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    department: '',
    position: '',
  });
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setStep(2);
  };

  const handleFaceCapture = (descriptor: number[]) => {
    setFaceDescriptor(descriptor);
    setStep(3);
  };

  const handleFinalSubmit = async () => {
    setError('');

    const result = await register(formData.email, formData.password, formData.fullName);
    
    if (result.success) {
      if (faceDescriptor) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('users').insert({
              id: user.id,
              email: formData.email,
              name: formData.fullName,
              department: formData.department,
              position: formData.position,
              role: 'employee',
              face_descriptor: faceDescriptor,
            });
          }
        } catch (err) {
          console.error('Error saving user profile:', err);
        }
      }
      router.push('/check-in');
    } else {
      setError(result.error || 'Registration failed');
      setStep(1);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Create Account
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Join our commute management system
          </p>
        </div>

        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <CardTitle>Registration - Step {step} of 3</CardTitle>
              <div className="flex gap-2">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`w-8 h-1 rounded ${
                      s <= step ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                ))}
              </div>
            </div>
            <CardDescription>
              {step === 1 && 'Enter your personal information'}
              {step === 2 && 'Register your face for secure check-in'}
              {step === 3 && 'Review and confirm your registration'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {step === 1 && (
              <form onSubmit={handleStep1Submit} className="space-y-4">
                <Input
                  label="Full Name"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  required
                />

                <Input
                  label="Email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="you@example.com"
                  required
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Department"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    placeholder="Engineering"
                  />

                  <Input
                    label="Position"
                    name="position"
                    value={formData.position}
                    onChange={handleInputChange}
                    placeholder="Software Developer"
                  />
                </div>

                <Input
                  label="Password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  required
                />

                <Input
                  label="Confirm Password"
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  required
                />

                <Button type="submit" className="w-full">
                  Continue to Face Registration
                </Button>
              </form>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <FaceRecognition mode="register" onCapture={handleFaceCapture} />
                <Button
                  onClick={() => setStep(1)}
                  variant="ghost"
                  className="w-full"
                >
                  Back
                </Button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <p className="text-sm text-green-600 dark:text-green-400">
                    ✓ Face registered successfully
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">Review Your Information</h4>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Name:</span> {formData.fullName}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Email:</span> {formData.email}
                    </p>
                    {formData.department && (
                      <p className="text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Department:</span> {formData.department}
                      </p>
                    )}
                    {formData.position && (
                      <p className="text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Position:</span> {formData.position}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => setStep(1)}
                    variant="outline"
                    className="flex-1"
                  >
                    Edit Information
                  </Button>
                  <Button
                    onClick={handleFinalSubmit}
                    className="flex-1"
                    isLoading={loading}
                    disabled={loading}
                  >
                    Complete Registration
                  </Button>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Already have an account?{' '}
                  <Link
                    href="/login"
                    className="font-medium text-primary-600 hover:text-primary-500"
                  >
                    Sign in here
                  </Link>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
