'use client';

import Link from 'next/link';
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/Card";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { Label } from "../../components/Label";
import { Alert, AlertDescription } from "../../components/Alert";
import { Mail, AlertCircle } from "lucide-react";

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
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="w-full max-w-md mx-auto p-4 md:p-0">
                <div className="space-y-4">
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
                                    <div className="relative">
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
