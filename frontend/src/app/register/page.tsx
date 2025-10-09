'use client';

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "../../components/Card";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { Label } from "../../components/Label";
import { Separator } from "../../components/Separator";
import { Alert, AlertDescription } from "../../components/Alert";
import { Eye, EyeOff, Image, AlertCircle, CheckCircle } from "lucide-react";

export function RegisterPage() {

    const router = useRouter();

    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        confirmPassword: ""
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(""); // Clear error on new input
    };

    const getPasswordStrength = (password: string) => {
        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        return strength;
    };

    const passwordStrength = getPasswordStrength(formData.password);
    const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword !== "";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            const response = await fetch('http://localhost:8000/auth/v1/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: formData.username,
                    email: formData.email,
                    password: formData.password,
                }),
            });

            if (response.ok) {
                // Registration successful, redirect to login
                router.push('/login');
            } else {
                // Handle errors from the backend
                const errorData = await response.json();
                setError(errorData.detail || "An unexpected error occurred.");
            }
        } catch (err) {
            // Handle network errors
            setError("Failed to connect to the server. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    };

    const isFormValid = 
        formData.username &&
        formData.email &&
        formData.password &&
        passwordsMatch &&
        passwordStrength >= 3

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

        {/* Right side - Registration form */}
        <div className="flex-1 flex items-center justify-center p-8 bg-background">
            <div className="w-full max-w-md space-y-8">
            <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-6">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                    <Image className="w-6 h-6 text-primary-foreground" />
                </div>
                <span className="text-2xl font-semibold">Memo</span>
                </div>
                <h2 className="text-3xl">Create your account</h2>
                <p className="text-muted-foreground mt-2">
                Join thousands of photographers and creators.
                </p>
            </div>

            {error && (
                <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader className="space-y-1">
                <CardTitle className="text-center">Sign Up</CardTitle>
                </CardHeader>
                <CardContent>
        
                <form onSubmit={handleSubmit} className="space-y-4">
                    
                    <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                        id="username"
                        placeholder="John"
                        value={formData.username}
                        onChange={(e) => handleInputChange("username", e.target.value)}
                        required
                        />
                    </div>

                    <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        required
                    />
                    </div>
                    
                    <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                        <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a strong password"
                        value={formData.password}
                        onChange={(e) => handleInputChange("password", e.target.value)}
                        required
                        />
                        <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        >
                        {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                        ) : (
                            <Eye className="h-4 w-4" />
                        )}
                        </Button>
                    </div>
                    
                    {formData.password && (
                        <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span>Password strength:</span>
                            <span className={
                            passwordStrength < 2 ? "text-red-500" :
                            passwordStrength < 4 ? "text-yellow-500" :
                            "text-green-500"
                            }>
                            {passwordStrength < 2 ? "Weak" :
                            passwordStrength < 4 ? "Medium" :
                            "Strong"}
                            </span>
                        </div>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((level) => (
                            <div
                                key={level}
                                className={`h-2 flex-1 rounded ${
                                level <= passwordStrength 
                                    ? passwordStrength < 2 ? "bg-red-500" :
                                    passwordStrength < 4 ? "bg-yellow-500" :
                                    "bg-green-500"
                                    : "bg-muted"
                                }`}
                            />
                            ))}
                        </div>
                        </div>
                    )}
                    </div>

                    <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                        <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                        required
                        />
                        <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                        {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                        ) : (
                            <Eye className="h-4 w-4" />
                        )}
                        </Button>
                        {formData.confirmPassword && (
                        <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
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
                    disabled={!isFormValid || isLoading}
                    >
                    {isLoading ? "Creating account..." : "Create account"}
                    </Button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <Separator className="w-full" />
                        </div>
                    </div>

                </form>
                </CardContent>
            </Card>

            <div className="text-center">
                <p className="text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login">
                    <Button className="p-0 h-auto" variant="link">
                        Sign in
                    </Button>
                </Link>
                </p>
            </div>
            </div>
        </div>
        </div>
    );
}

export default RegisterPage;
