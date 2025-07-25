import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Eye, EyeOff } from "lucide-react"

interface User {
  id?: number
  email: string
  name: string
  role: string
  isActive: boolean
  trainerId?: number
  trainer?: {
    id: number
    name: string
  }
  student?: {
    name: string
  }
}

interface Trainer {
  id: number
  name: string
  email: string
}

interface UserModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (userData: any) => Promise<void>
  user?: User | null
  trainers: Trainer[]
  isLoading: boolean
}

export function UserModal({ isOpen, onClose, onSave, user, trainers, isLoading }: UserModalProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    role: "STUDENT",
    isActive: true
  })

  const isEditing = !!user

  useEffect(() => {
    if (user) {
      // Si el usuario tiene relación con Student, usar ese nombre
      console.log(user)
      setFormData({
        email: user.email || "",
        password: "",
        name: user.student?.name || user.name || "",
        role: user.role || "STUDENT",
        isActive: user.isActive ?? true
      });
    } else {
      setFormData({
        email: "",
        password: "",
        name: "",
        role: "STUDENT",
        isActive: true
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validaciones: nombre, email y rol no pueden estar vacíos
    if (!formData.name.trim() || !formData.email.trim() || !formData.role.trim()) {
      alert("Por favor completa todos los campos obligatorios (nombre, email y rol).");
      return;
    }
    if (formData.password && formData.password.length > 0 && formData.password.length < 8) {
      alert("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    await onSave(formData);
  }

  const handleClose = () => {
    setFormData({
      email: "",
      password: "",
      name: "",
      role: "STUDENT",
      isActive: true
    });
    setShowPassword(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-gray-800 border-gray-600">
        <DialogHeader>
          <DialogTitle className="text-white">
            {isEditing ? "Editar Usuario" : "Crear Nuevo Usuario"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label htmlFor="password" className="text-white">
                {isEditing ? "Nueva Contraseña (opcional)" : "Contraseña"}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={isEditing ? "Dejar vacío para mantener actual" : "••••••••"}
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required={!isEditing}
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
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({
                  ...formData,
                  role: value
                })}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                  <SelectItem value="TEACHER">Profesor</SelectItem>
                  <SelectItem value="STUDENT">Estudiante</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isEditing && (
              <div className="flex items-center space-x-2 md:col-span-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
                />
                <Label htmlFor="isActive" className="text-white">
                  Usuario activo
                </Label>
              </div>
            )}
          </div>

          <div className="flex space-x-4 pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white"
            >
              {(() => {
                if (isLoading) return "Guardando..."
                return isEditing ? "Actualizar Usuario" : "Crear Usuario"
              })()}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
              disabled={isLoading}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
