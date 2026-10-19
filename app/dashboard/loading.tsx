"use client"

import LoadingSpinner from "@/app/components/loading-spinner"

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-muted/40">
      <div className="text-center animate-fade-in-up">
        <LoadingSpinner size="lg" className="mb-4" />
        <p className="text-lg text-muted-foreground animate-fade-in-delayed">Loading your dashboard...</p>
      </div>
    </div>
  )
}
