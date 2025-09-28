'use client';

import { Button } from '../components/Button'

import React from 'react'
import Link from 'next/link'

import {
  Image,
  Shield,
  Zap,
  BarChart3,
  Users,
  Cloud,
  Upload,
  Search,
  Monitor,
  Check,
  Star,
  ChevronRight,
  Play
} from "lucide-react";

export default function App() {

   return (

    <div>

        <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">

                <div className="flex justify-between items-center h-16">
                
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <Image className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <span className="font-semibold text-xl">Memo</span>
                </div>

                <div className="flex items-center gap-4">
                    
                    <Link href="/login">
                        <Button variant="ghost">
                            Sign In
                        </Button>
                    </Link>

                    <Link href="/register">
                        <Button>
                            Get Started
                        </Button>
                    </Link>
                
                </div>
                </div>
            </div>
        </nav>

        {/* Updated section with flex and min-h-screen to center content vertically */}
        <section className="relative overflow-hidden flex items-center min-h-screen">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-2 gap-12 items-center">

                    <div className="space-y-8">
                        <div className="space-y-4">

                            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight">
                                Your Memory,
                                <span className="text-primary"> Perfectly</span> Organized
                            </h1>

                            <p className="text-xl text-muted-foreground max-w-lg">
                            Professional photo management with cloud storage, smart search, and advanced system monitoring. Perfect for photographers, teams, and creators.
                            </p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link href="/register">
                                <Button size="lg" className="gap-2">
                                    Try it for free
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </Link>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="relative rounded-xl overflow-hidden shadow-2xl">
                            <img
                            src="https://images.unsplash.com/photo-1728234040187-61651ec91d4e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBwaG90b2dyYXBoeSUyMHdvcmtzcGFjZXxlbnwxfHx8fDE3NTc2NTQ3OTZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                            alt="Professional photography workspace"
                            className="w-full h-auto"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                        </div>
                    </div>
    
                </div>
            </div>
        </section>

    </div>
  )

}
