"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  UserPlus, 
  GraduationCap, 
  ArrowLeft,
  Eye,
  EyeOff,
  Trash2,
  Edit
} from "lucide-react"
import Link from "next/link"
import { Loading } from "@/components/ui/loading"

interface User {
  id: number
  email: string
  name: string
  role: string
  isActive: boolean
  trainerId?: number
  trainer?: {
    id: number
    name: string
  }
  createdAt: string
}

interface Trainer {
  id: number
  name: string
  email: string
}

export default function UsersManagementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    role: "",
    trainerId: ""
  })

  useEffect(() => {
    if (status === "loading") return

    if (!session) {
      router.push("/login")
      return
    }

    if (session.user.role !== "ADMIN") {
      router.push("/login")
      return
    }

    fetchUsers()
    fetchTrainers()
  }, [session, status, router])

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users")
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTrainers = async () => {
    try {
      const response = await fetch("/api/trainers")
      if (response.ok) {
        const data = await response.json()
        setTrainers(data)
      }
    } catch (error) {
      console.error("Error fetching trainers:", error)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("Usuario creado exitosamente")
        setFormData({
          email: "",
          password: "",
          name: "",
          role: "",
          trainerId: ""
        })
        setShowCreateForm(false)
        fetchUsers()
      } else {
        setError(data.error || "Error al crear usuario")
      }
    } catch (error) {
      setError("Error de conexión")
    } finally {
      setIsCreating(false)
    }
  }

  const getRoleBadge = (role: string) => {
    if (role === "ADMIN") {
      return <Badge className="bg-purple-500 text-white">Admin</Badge>
    } else if (role === "TEACHER") {
      return <Badge className="bg-blue-500 text-white">Profesor</Badge>
    }
    return <Badge variant="secondary">{role}</Badge>
  }

  if (status === "loading" || isLoading) {
    return <Loading message="Cargando gestión de usuarios..." />
  }

  if (!session || session.user.role !== "ADMIN") {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
      <div className="container mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/admin">
                <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver al Panel
                </Button>
              </Link>
            </div>
            <Button 
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Crear Usuario
            </Button>
          </div>

          {/* Alerts */}
          {error && (
            <Alert className="border-red-500 bg-red-500/10">
              <AlertDescription className="text-red-400">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-500 bg-green-500/10">
              <AlertDescription className="text-green-400">{success}</AlertDescription>
            </Alert>
          )}

          {/* Create User Form */}
          {showCreateForm && (
            <Card className="border-0 bg-gray-800/90 shadow-2xl backdrop-blur-sm border border-gray-600">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <UserPlus className="h-5 w-5" />
                  <span>Crear Nuevo Usuario</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-white">Nombre Completo</Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Nombre del usuario"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        required
                        className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-white">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="usuario@email.com"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        required
                        className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-white">Contraseña</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={formData.password}
                          onChange={(e) => setFormData({...formData, password: e.target.value})}
                          required
                          className="pr-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-gray-400 hover:text-white"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role" className="text-white">Rol</Label>
                      <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value, trainerId: value === "ADMIN" ? "" : formData.trainerId})}>
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                          <SelectValue placeholder="Seleccionar rol" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">Administrador</SelectItem>
                          <SelectItem value="TEACHER">Profesor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.role === "TEACHER" && (
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="trainerId" className="text-white">Profesor Asociado</Label>
                        <Select value={formData.trainerId} onValueChange={(value) => setFormData({...formData, trainerId: value})}>
                          <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                            <SelectValue placeholder="Seleccionar profesor" />
                          </SelectTrigger>
                          <SelectContent>
                            {trainers.map((trainer) => (
                              <SelectItem key={trainer.id} value={trainer.id.toString()}>
                                {trainer.name} - {trainer.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-4">
                    <Button
                      type="submit"
                      disabled={isCreating}
                      className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white"
                    >
                      {isCreating ? "Creando..." : "Crear Usuario"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreateForm(false)}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Users List */}
          <Card className="border-0 bg-gray-800/90 shadow-2xl backdrop-blur-sm border border-gray-600">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Usuarios del Sistema</span>
                <Badge className="bg-purple-500 text-white">{users.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-700/50 rounded-lg border border-gray-600"
                  >
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0">
                        <GraduationCap className="h-6 w-6 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-white font-semibold truncate max-w-[180px] sm:max-w-none">{user.name}</h3>
                        <p className="text-gray-400 text-sm truncate max-w-[220px] sm:max-w-none">{user.email}</p>
                        {user.trainer && (
                          <p className="text-blue-400 text-sm truncate max-w-[220px] sm:max-w-none">Profesor: {user.trainer.name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center flex-wrap gap-2 sm:gap-3">
                      {getRoleBadge(user.role)}
                      <Badge variant={user.isActive ? "default" : "secondary"}>
                        {user.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {users.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">No hay usuarios registrados</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 