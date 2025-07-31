"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, LogIn, User, Lock } from "lucide-react";
import Image from "next/image";
import { CookieCleaner } from "@/components/cookie-cleaner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  console.log("LoginPage component loaded")

  // Flag para evitar doble submit
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || hasSubmitted) return; // Previene doble submit
    setIsLoading(true);
    setHasSubmitted(true);
    setError("");

    try {
      // Limpiar cookies previas para evitar conflictos JWT
      document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      console.log("🧹 Cleared existing cookies");
      console.log("🔐 Attempting to sign in...");

      // Usar signIn sin redirect automático para mejor control
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false, // No redirigir automáticamente
      });

      console.log("📝 SignIn result:", result);

      if (result?.error) {
        // Manejo especial para diferentes tipos de errores
        if (result.error === "CredentialsSignin") {
          setError("Credenciales inválidas o sesión previa corrupta. Por favor, intenta nuevamente. Si el problema persiste, borra las cookies del navegador.");
        } else if (result.error === "USER_INACTIVE") {
          setError("Tu cuenta ha sido desactivada. Por favor, contacta al administrador del sistema.");
        } else {
          setError("Error: " + result.error);
        }
        setIsLoading(false);
        setHasSubmitted(false);
        return;
      }

      if (result?.ok) {
        console.log("✅ Login successful, waiting for session...");
        // Esperar un poco para que la sesión se establezca
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Obtener la sesión actualizada
        const session = await getSession();
        console.log("📱 Session after login:", session);
        if (session?.user) {
          console.log("✅ Session established, redirecting user with role:", session.user.role);
          // Redirigir basado en el rol
          switch (session.user.role) {
            case "ADMIN":
              router.push("/admin");
              break;
            case "TEACHER":
              router.push("/teacher");
              break;
            case "STUDENT":
              router.push("/student");
              break;
            default:
              router.push("/");
          }
        } else {
          setError("Error al establecer la sesión. Por favor, intenta nuevamente.");
          setIsLoading(false);
          setHasSubmitted(false);
        }
      } else {
        setError("Error de autenticación. Por favor, intenta nuevamente.");
        setIsLoading(false);
        setHasSubmitted(false);
      }
    } catch (error) {
      setError("Error de conexión. Por favor, intenta nuevamente.");
      setIsLoading(false);
      setHasSubmitted(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 flex items-center justify-center p-4">
      <CookieCleaner />
      <div className="w-full max-w-md">
        {/* Header con logo */}
        <div className="text-center mb-6">
          {/* Logos container */}
          <div className="flex items-center justify-center space-x-6 mb-4">
            {/* Dance Academy Logo */}
            <div className="flex flex-col items-center">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 shadow-xl border-2 border-blue-400 flex items-center justify-center mb-2">
                <Image
                  src="/dance.png"
                  alt="Paradise Dance Academy"
                  width={80}
                  height={80}
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            {/* Divider */}
            <div className="w-px h-24 bg-gradient-to-b from-transparent via-blue-400 to-transparent"></div>

            {/* Volleyball Logo */}
            <div className="flex flex-col items-center">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 shadow-xl border-2 border-yellow-400 flex items-center justify-center mb-2">
                <Image
                  src="/volleyball.png"
                  alt="Paradise Volleyball"
                  width={96}
                  height={96}
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl font-bold text-white mb-2 tracking-wide">
            Paradise
          </h1>
          <p className="text-blue-300 text-lg font-medium">Sistema de Gestión</p>
        </div>

        {/* Card de Login */}
        <Card className="border-0 bg-gray-800/90 shadow-2xl backdrop-blur-sm border border-gray-600">
          <CardHeader className="space-y-1 pb-6">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                <LogIn className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-white">
                Iniciar Sesión
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert className="border-red-500 bg-red-500/10">
                <AlertDescription className="text-red-400">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">
                  Email
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">
                  Contraseña
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 pr-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading || hasSubmitted}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Iniciando sesión...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <LogIn className="h-4 w-4" />
                    <span>Iniciar Sesión</span>
                  </div>
                )}
                             </Button>
             </form>

             {/* Registrarse Link - Texto simple */}
             <div className="text-center pt-2">
               <span className="text-gray-400 text-sm">
                 ¿No tienes una cuenta?{" "}
                 <a
                   href="/enrollment"
                   className="text-blue-400 hover:text-blue-300 transition-colors duration-200 underline"
                 >
                   Registrarse
                 </a>
               </span>
             </div>
           </CardContent>
         </Card>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-gray-400 text-sm">
            © 2025 Paradise - Sistema de Gestión
          </p>
        </div>
      </div>
    </div>
  );
}
