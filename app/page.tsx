"use client";

<<<<<<< HEAD
import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { ParadiseSkeleton } from "@/components/ui/paradise-skeleton"

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

=======
import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Receipt,
  MessageSquare,
  Clock,
  BarChart3,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  GraduationCap,
  UserPlus,
  Users,
} from "lucide-react";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ParadiseSkeleton } from "@/components/ui/paradise-skeleton";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  // ✅ OPTIMIZACIÓN: Cache para evitar llamadas duplicadas
  let debtsCache: { count: number; timestamp: number } | null = null;
>>>>>>> a27d72b416061a86f4a9e1664e2da8e641b0a93c
  useEffect(() => {
    // ⚡ Si no hay sesión, el middleware ya redirige al login
    // ⚡ Si hay sesión, redirigir según el rol
    if (status === "authenticated" && session?.user?.role) {
<<<<<<< HEAD
      switch (session.user.role) {
        case "ADMIN":
          router.replace("/admin")
          break
        case "TEACHER":
          router.replace("/teacher")
          break
        case "STUDENT":
          router.replace("/student")
          break
        default:
          router.replace("/login")
      }
=======
      const redirectUrl = session.user.role === "ADMIN" ? "/admin" : "/teacher";
      router.replace(redirectUrl);
>>>>>>> a27d72b416061a86f4a9e1664e2da8e641b0a93c
    }
  }, [session, status, router]);

  // ⚡ Mostrar loading mientras se procesa la redirección
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-gray-700 shadow-2xl border-4 border-blue-500 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-20 animate-pulse"></div>
          <div className="text-3xl font-bold text-white">P</div>
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-white">Paradise Academy</h1>
          <p className="text-blue-300">Redirigiendo al sistema...</p>
        </div>

        <ParadiseSkeleton />
      </div>
    </div>
  );
}
