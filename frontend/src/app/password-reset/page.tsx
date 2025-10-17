'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/Card";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { Label } from "../../components/Label";
import { Alert, AlertDescription } from "../../components/Alert";
import { Eye, EyeOff, AlertCircle, CheckCircle, KeyRound, Image } from "lucide-react";

function ResetPasswordComponent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [token, setToken] = useState<string | null>(null);
    const [formData, setFormData] = useState({ password: "", confirmPassword: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    useEffect(() => {
        const urlToken = searchParams!.get('token');
        if (urlToken) {
            setToken(urlToken);
        } else {
            setError("No reset token found. Please request a new link.");
        }
    }, [searchParams]);

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError("");
    };

    const passwordsMatch = formData.password && formData.password === formData.confirmPassword;
    const isFormValid = passwordsMatch && formData.password.length >= 8;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid || !token) {
            setError("Please ensure passwords match and are at least 8 characters long.");
            return;
        }
        setIsLoading(true);
        setError("");
        setMessage("");

        try {
            const response = await fetch('http://localhost:8000/api/v1/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: token, new_password: formData.password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to reset password.');
            }

            setMessage(data.message + " You can now sign in.");
            setTimeout(() => router.push('/login'), 3000); // Redirect to login after 3s
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left side - Image */}
            <div className="hidden lg:flex lg:flex-1 relative">
                <img
                    src="https://images.unsplash.com/photo-1728234040187-61651ec91d4e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBwaG90b2dyYXBoeSUyMHdvcmtzcGFjZXxlbnwxfHx8fDE3NTc2NTQ3OTZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                    alt="Professional photography workspace"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex items-end p-12">
            </div>
        </div>

        {/* Right side - Form */}
        <div className="flex-1 flex items-center justify-center p-8 bg-background">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-6">
                    <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                        <Image className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <span className="text-2xl font-semibold">Memo</span>
                    </div>
                </div>

                <Card>
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl">Create New Password</CardTitle>
                            <CardDescription>
                            Your new password must be at least 8 characters long.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}
                            {message && (
                                    <Alert variant="default">
                                    <CheckCircle className="h-4 w-4" />
                                    <AlertDescription>{message}</AlertDescription>
                                </Alert>
                            )}
                            <div>
                                <Label htmlFor="password">New Password</Label>
                                <div className="relative mt-2">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={formData.password}
                                        onChange={(e) => handleInputChange('password', e.target.value)}
                                        className="pr-10 pl-10"
                                        disabled={!!message}
                                    />
                                    <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                <div className="relative mt-2">
                                    <Input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={formData.confirmPassword}
                                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                                        className="pr-10 pl-10"
                                        disabled={!!message}
                                    />
                                        <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 w-7" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                        {formData.confirmPassword && (
                                        <div className="absolute right-10 top-1/2 transform -translate-y-1/2 pr-2">
                                            {passwordsMatch ? (
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                            ) : (
                                            <AlertCircle className="h-4 w-4 text-red-500" />
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={!isFormValid || isLoading || !!message}
                            >
                                {isLoading ? "Resetting..." : "Reset Password"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
                    <div className="text-center">
                    <p className="text-muted-foreground">
                        <Link href="/login">
                            <Button className="p-0 h-auto" variant="link">
                                &larr; Back to Sign in
                            </Button>
                        </Link>
                    </p>
                </div>
            </div>
        </div>
        </div>
    );
}


export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ResetPasswordComponent />
        </Suspense>
    );
}
