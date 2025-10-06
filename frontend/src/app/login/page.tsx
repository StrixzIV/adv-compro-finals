'use client';

import { useState } from "react";
import { useRouter } from 'next/navigation'

import Link from 'next/link'

import { Card, CardContent, CardHeader, CardTitle } from "../../components/Card";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { Label } from "../../components/Label";
import { Separator } from "../../components/Separator";
import { Alert, AlertDescription, AlertTitle } from "../../components/Alert";
import { Eye, EyeOff, Image, AlertCircle } from "lucide-react";

const FASTAPI_URL = "http://localhost:8000"

export function LoginPage() {

    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {

        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {

            const formData = new FormData();

            formData.append('username', email); 
            formData.append('password', password);

            const response = await fetch(`${FASTAPI_URL}/auth/v1/auth/login`, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMessage = data.detail || "Login failed due to server error.";
                setError(errorMessage);
                return;
            }

            const token = data.access_token;
            if (token) {
                localStorage.setItem('accessToken', token);
                router.push('/gallery'); 
            }
            
            else {
                setError("Login successful, but no access token was returned.");
            }
            
        } 
        
        catch (err) {
            console.error("Login request failed:", err);
            setError("Could not connect to the server. Please check your network.");
        }
        
        finally {
            setIsLoading(false);
        }

    };

    return (
        <div className="min-h-screen flex">
    
        {/* Left side - Hero image */}
        <div className="hidden lg:flex lg:flex-1 relative">
            <img
            src="https://images.unsplash.com/photo-1728234040187-61651ec91d4e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBwaG90b2dyYXBoeSUyMHdvcmtzcGFjZXxlbnwxfHx8fDE3NTc2NTQ3OTZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            alt="Photography showcase"
            className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 flex items-end p-12" />
        </div>

        {/* Right side - Login form */}
        <div className="flex-1 flex items-center justify-center p-8 bg-background">
            <div className="w-full max-w-md space-y-8">
            <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-6">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                    <Image className="w-6 h-6 text-primary-foreground" />
                </div>
                <span className="text-2xl font-semibold">Memo</span>
                </div>
                <h2 className="text-3xl">Sign in to your account</h2>
                <p className="text-muted-foreground mt-2">
                Welcome back! Please enter your details.
                </p>
            </div>

            <Card>
                <CardHeader className="space-y-1">
                <CardTitle className="text-center">Login</CardTitle>
                </CardHeader>
                <CardContent>

                {error && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Login Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    </div>
                    
                    <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                        <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
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
                    </div>

                    <Button 
                    type="submit" 
                    className="w-full bg-amber-400"
                    disabled={isLoading}
                    variant="outline"
                    >
                    {isLoading ? "Signing in..." : "Sign in"}
                    </Button>

                    <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                        Or continue with
                        </span>
                    </div>
                    </div>

                    <Link href="http://localhost:8000/api/v1/oauth/redirect">
                    <div className="flex justify-center"> 
                        <Button variant="outline" type="button" className="w-full">
                            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                fill="#4285F4"
                                />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                                />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                fill="#FBBC05"
                                />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                                />
                            </svg>
                            Google
                        </Button>
                    </div>
                    </Link>

                    <div className="flex justify-center"> 
                        <Link href="/register">
                            <Button variant="link" className="p-0 h-auto">
                                No account?
                            </Button>
                        </Link>
                    </div>

                    <div className="flex justify-center"> 
                        <Button variant="link" className="p-0 h-auto">
                            Forgot password?
                        </Button>
                    </div>

                    <div className="flex justify-center"> 
                        <Link href="/">
                            <Button variant="link" className="p-0 h-auto" onClick={() => {window.location.href = "http://localhost:3000"}}>
                                Return to landing page
                            </Button>
                        </Link>
                    </div>

                </form>
                </CardContent>
            </Card>
            </div>
        </div>
        </div>
    );
}

export default LoginPage;