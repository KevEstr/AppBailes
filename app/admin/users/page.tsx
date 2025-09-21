"use client";

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
  ArrowLeft,
  Trash2,
  Edit,
  Search,
  RotateCcw,
  Download
} from "lucide-react"
import Link from "next/link"
import { Loading } from "@/components/ui/loading"
import { UserModal } from "@/components/users/user-modal"
import { AdvancedPagination } from "@/components/ui/advanced-pagination"
import { AuthGuard } from "@/components/auth-guard"

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  trainerId?: number;
  trainer?: {
    id: number;
    name: string;
  };
  createdAt: string;
}

interface Trainer {
  id: number;
  name: string;
  email: string;
}

interface PaginationData {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

function UsersManagementContent() {
  const [users, setUsers] = useState<User[]>([])
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isModalLoading, setIsModalLoading] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [limit, setLimit] = useState(10)

  useEffect(() => {
    loadUsers()
    loadTrainers()
  }, [currentPage, roleFilter, statusFilter, limit])

  useEffect(() => {
    loadTrainers()
  }, [])

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm !== "") {
        setCurrentPage(1)
        loadUsers()
      } else if (searchTerm === "") {
        loadUsers()
      }
    }, 500)

    return () => clearTimeout(delayedSearch)
  }, [searchTerm, roleFilter, limit])

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        role: roleFilter !== "all" ? roleFilter : "",
        search: searchTerm
      })

      // Agregar filtro de estado activo si no es "all"
      if (statusFilter !== "all") {
        params.set("active", statusFilter === "active" ? "true" : "false")
      }

      const response = await fetch(`/api/users?${params}`)
      const data = await response.json()

      if (data.success) {
        setUsers(data.users)
        setPagination(data.pagination)
      } else {
        setError(data.error || "Error al cargar usuarios")
      }
    } catch (error) {
      console.error("Error loading users:", error)
      setError("Error de conexión al cargar usuarios")
    } finally {
      setIsLoading(false);
    }
  };

  const loadTrainers = async () => {
    try {
      const response = await fetch("/api/trainers?active=true")
      const data = await response.json()
      
      if (data.success) {
        setTrainers(data.trainers)
      }
    } catch (error) {
      console.error("Error loading trainers:", error)
    }
  };

  const handleCreateUser = () => {
    setSelectedUser(null)
    setShowUserModal(true)
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setShowUserModal(true)
  }

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("¿Estás seguro de eliminar este usuario?")) return

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE"
      })
      
      const data = await response.json()
      
      if (data.success) {
        setSuccess("Usuario eliminado exitosamente")
        loadUsers()
      } else {
        setError(data.error || "Error al eliminar usuario")
      }
    } catch (error) {
      console.error("Error deleting user:", error)
      setError("Error de conexión al eliminar usuario")
    }
  }

  const handleUserSaved = async (userData: any) => {
    try {
      setIsModalLoading(true)
      
      console.log("🔄 Sending user data to update:", userData)
      
      if (selectedUser) {
        // Actualizar usuario existente
        const response = await fetch(`/api/users/${selectedUser.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(userData)
        })
        
        const data = await response.json()
        
        if (!data.success) {
          setError(data.error || "Error al actualizar usuario")
          return
        }
      } else {
        // Crear nuevo usuario
        const response = await fetch("/api/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(userData)
        })
        
        const data = await response.json()
        
        if (!data.success) {
          setError(data.error || "Error al crear usuario")
          return
        }
      }
      
      setShowUserModal(false)
      setSelectedUser(null)
      setSuccess("Usuario guardado exitosamente")
      loadUsers()
    } catch (error) {
      console.error("Error saving user:", error)
      setError("Error de conexión al guardar usuario")
    } finally {
      setIsModalLoading(false)
    }
  };

  const handleCloseModal = () => {
    setShowUserModal(false)
    setSelectedUser(null)
  }

  const clearMessages = () => {
    setError("")
    setSuccess("")
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit)
    setCurrentPage(1)
  }

  const resetFilters = () => {
    setSearchTerm("")
    setRoleFilter("all")
    setStatusFilter("all")
    setCurrentPage(1)
    setLimit(10)
  }

  const handleExportExcel = async () => {
    try {
      setIsDownloading(true)
      setError("")
      
      const response = await fetch('/api/users/export-excel', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al exportar usuarios')
      }

      // Obtener el blob del archivo
      const blob = await response.blob()
      
      // Crear URL temporal para descarga
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Obtener nombre del archivo desde los headers
      const contentDisposition = response.headers.get('content-disposition')
      let filename = 'usuarios.xlsx'
      if (contentDisposition) {
        const filenameRegex = /filename="(.+)"/
        const filenameMatch = filenameRegex.exec(contentDisposition)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }
      
      link.download = filename
      document.body.appendChild(link)
      link.click()
      
      // Limpiar
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      setSuccess(`Archivo ${filename} descargado exitosamente`)
    } catch (error) {
      console.error('Error downloading Excel file:', error)
      setError(error instanceof Error ? error.message : 'Error al descargar archivo Excel')
    } finally {
      setIsDownloading(false)
    }
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "Admin"
      case "TEACHER":
        return "Profesor"
      case "STUDENT":
        return "Deportista"
      default:
        return role
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-red-500 text-white"
      case "TEACHER":
        return "bg-blue-500 text-white"
      case "STUDENT":
        return "bg-green-500 text-white"
      default:
        return "bg-gray-500 text-white"
    }
  }

  if (isLoading && users.length === 0) {
    return <Loading message="Cargando usuarios..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
      <div className="container mx-auto px-4 sm:px-6 md:px-8 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-6 mb-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Link href="/admin">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700 px-3 py-1 rounded-md text-sm font-medium min-w-[120px]"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Volver al Panel
                  </Button>
                </Link>
                <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 leading-tight">
                  <Users className="h-6 w-6 text-purple-400" />
                  Gestión de Usuarios
                </h1>
              </div>
              <p className="text-gray-400 text-sm sm:ml-2 mt-1 sm:mt-0">Administrar usuarios y roles del sistema</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                onClick={handleExportExcel}
                disabled={isDownloading}
                size="sm"
                variant="outline"
                className="border-green-600 text-green-400 hover:bg-green-900/50 px-4 py-1.5 rounded-md text-sm font-medium min-w-[140px]"
              >
                {isDownloading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin mr-1" />
                    Descargando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-1" />
                    Exportar Excel
                  </>
                )}
              </Button>
              <Button 
                onClick={handleCreateUser}
                size="sm"
                className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white px-4 py-1.5 rounded-md text-sm font-medium min-w-[140px]"
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Nuevo Usuario
              </Button>
            </div>
          </div>

          {/* Mensajes */}
          {error && (
            <Alert className="border-red-500 bg-red-900/20">
              <AlertDescription className="text-red-400">
                {error}
                <Button variant="ghost" size="sm" onClick={clearMessages} className="ml-2 text-red-400">
                  ✕
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-500 bg-green-900/20">
              <AlertDescription className="text-green-400">
                {success}
                <Button variant="ghost" size="sm" onClick={clearMessages} className="ml-2 text-green-400">
                  ✕
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Filtros y Búsqueda */}
          <Card className="border-gray-600 bg-gray-800/90">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Search className="h-5 w-5" />
                Filtros y Búsqueda
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="search" className="text-gray-300">Buscar</Label>
                  <Input
                    id="search"
                    placeholder="Nombre o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="role" className="text-gray-300">Rol</Label>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Todos los roles" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      <SelectItem value="all">Todos los roles</SelectItem>
                      <SelectItem value="ADMIN">Administrador</SelectItem>
                      <SelectItem value="TEACHER">Profesor</SelectItem>
                      <SelectItem value="STUDENT">Estudiante</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status" className="text-gray-300">Estado</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="active">Solo activos</SelectItem>
                      <SelectItem value="inactive">Solo inactivos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="limit" className="text-gray-300">Por página</Label>
                  <Select value={limit.toString()} onValueChange={(value) => handleLimitChange(parseInt(value))}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={resetFilters}
                    className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Limpiar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Usuarios */}
          <Card className="border-gray-600 bg-gray-800/90">
            <CardHeader>
              <CardTitle className="text-white">
                Usuarios ({pagination.totalCount})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Extraer el ternario a una variable para cumplir con SonarQube y mejorar legibilidad */}
              {(() => {
                let content;
                if (isLoading) {
                  content = (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-400">Cargando usuarios...</p>
                    </div>
                  );
                } else if (users.length === 0) {
                  content = (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400 text-lg">No se encontraron usuarios</p>
                      <p className="text-gray-500">Intenta ajustar los filtros de búsqueda</p>
                    </div>
                  );
                } else {
                  content = (
                    <div className="space-y-4">
                      {users.map((user) => {
                        let userInitial = '?';
                        if (user.name && user.name.length > 0) {
                          userInitial = user.name.charAt(0).toUpperCase();
                        } else if (user.email && user.email.length > 0) {
                          userInitial = user.email.charAt(0).toUpperCase();
                        }
                        return (
                          <div
                            key={user.id}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-gray-600 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 transition-colors"
                          >
                            <div className="flex items-center space-x-4">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold">
                                {userInitial}
                              </div>
                              <div>
                                <h3 className="text-white font-semibold">{user.name || user.email || 'Sin nombre'}</h3>

                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-4 sm:mt-0 sm:flex-nowrap sm:items-center sm:space-x-3">
                              <Badge className={getRoleBadgeColor(user.role)}>
                                {getRoleDisplayName(user.role)}
                              </Badge>
                              <Badge variant={user.isActive ? "default" : "secondary"}>
                                {user.isActive ? "Activo" : "Inactivo"}
                              </Badge>
                              <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditUser(user)}
                                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="border-red-600 text-red-400 hover:bg-red-900/50"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                }
                return content;
              })()}
            </CardContent>
          </Card>

          {/* Paginación */}
          {pagination.totalPages > 1 && (
            <AdvancedPagination
              pagination={pagination}
              currentPage={currentPage}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
              itemName="usuarios"
            />
          )}
        </div>
      </div>

      {/* Modal de Usuario */}
      {showUserModal && (
        <UserModal
          isOpen={showUserModal}
          user={selectedUser}
          trainers={trainers}
          isLoading={isModalLoading}
          onSave={handleUserSaved}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}

export default function UsersManagementPage() {
  return (
    <AuthGuard requiredRole="ADMIN">
      <UsersManagementContent />
    </AuthGuard>
  )
}
