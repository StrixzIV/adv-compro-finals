'use client';

import Link from 'next/link';
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/Card";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { Label } from "../../components/Label";
import { Alert, AlertDescription } from "../../components/Alert";
import { Mail, AlertCircle, Image } from "lucide-react";

export function RequestPasswordResetPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");
        setMessage("");

        try {
            
            const response = await fetch('http://localhost:8000/api/v1/auth/request-password-reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'An unexpected error occurred.');
            }

            setMessage(data.message);
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
                        <CardTitle className="text-2xl">Forgot Password?</CardTitle>
                        <CardDescription>
                            No worries, we'll send you reset instructions.
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
                                    <Mail className="h-4 w-4" />
                                    <AlertDescription>{message}</AlertDescription>
                                </Alert>
                            )}
                            <div>
                                <Label htmlFor="email">Email</Label>
                                <div className="relative mt-2">
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="your.email@example.com"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10"
                                    />
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={isLoading || !!message}
                            >
                                {isLoading ? "Sending..." : "Send Reset Link"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="text-center">
                    <p className="text-muted-foreground">
                        Remembered your password?{" "}
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

export default RequestPasswordResetPage;
