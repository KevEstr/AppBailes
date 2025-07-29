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
    phone: "",
    role: "STUDENT",
    isActive: true
  })

  const [errors, setErrors] = useState({
    name: "",
    email: "",
    password: "",
    phone: ""
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
        phone: "",
        role: user.role || "STUDENT",
        isActive: user.isActive ?? true
      });
    } else {
      setFormData({
        email: "",
        password: "",
        name: "",
        phone: "",
        role: "STUDENT",
        isActive: true
      });
    }
    
    // Limpiar errores cuando cambie el usuario
    setErrors({
      name: "",
      email: "",
      password: "",
      phone: ""
    });
  }, [user]);

  const validateForm = () => {
    const newErrors = {
      name: "",
      email: "",
      password: "",
      phone: ""
    }

    // Validar nombre
    if (!formData.name.trim()) {
      newErrors.name = "El nombre es obligatorio";
    }

    // Validar email
    if (!formData.email.trim()) {
      newErrors.email = "El email es obligatorio";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "El email no tiene un formato válido";
    }

    // Validar contraseña
    if (!isEditing && !formData.password) {
      newErrors.password = "La contraseña es obligatoria";
    } else if (formData.password && formData.password.length > 0 && formData.password.length < 8) {
      newErrors.password = "La contraseña debe tener al menos 8 caracteres";
    }

    // Validar teléfono para TEACHER
    if (formData.role === "TEACHER") {
      if (!formData.phone.trim()) {
        newErrors.phone = "El teléfono es obligatorio para usuarios con rol de Profesor";
      } else if (!/^\d{10}$/.test(formData.phone)) {
        newErrors.phone = "El teléfono debe tener exactamente 10 dígitos";
      }
    }

    setErrors(newErrors)
    return !Object.values(newErrors).some(error => error !== "")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    await onSave(formData);
  }

  const handleClose = () => {
    setFormData({
      email: "",
      password: "",
      name: "",
      phone: "",
      role: "STUDENT",
      isActive: true
    });
    setErrors({
      name: "",
      email: "",
      password: "",
      phone: ""
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
                onChange={(e) => {
                  setFormData({...formData, name: e.target.value});
                  if (errors.name) setErrors({...errors, name: ""});
                }}
                required
                className={`bg-gray-700 border-gray-600 text-white placeholder-gray-400 ${
                  errors.name ? 'border-red-500' : ''
                }`}
              />
              {errors.name && (
                <p className="text-xs text-red-400">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@email.com"
                value={formData.email}
                onChange={(e) => {
                  setFormData({...formData, email: e.target.value});
                  if (errors.email) setErrors({...errors, email: ""});
                }}
                required
                className={`bg-gray-700 border-gray-600 text-white placeholder-gray-400 ${
                  errors.email ? 'border-red-500' : ''
                }`}
              />
              {errors.email && (
                <p className="text-xs text-red-400">{errors.email}</p>
              )}
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
                  onChange={(e) => {
                    setFormData({...formData, password: e.target.value});
                    if (errors.password) setErrors({...errors, password: ""});
                  }}
                  required={!isEditing}
                  className={`pr-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400 ${
                    errors.password ? 'border-red-500' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-400">{errors.password}</p>
              )}
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
          </div>

          {/* Campo de teléfono fuera del grid para mejor layout */}
          {formData.role === "TEACHER" && (
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-white">Teléfono</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="3001234567"
                value={formData.phone}
                onChange={(e) => {
                  // Solo permitir números, sin espacios ni caracteres especiales
                  const cleanValue = e.target.value.replace(/[^0-9]/g, '');
                  setFormData({...formData, phone: cleanValue});
                  if (errors.phone) setErrors({...errors, phone: ""});
                }}
                required={formData.role === "TEACHER"}
                className={`bg-gray-700 border-gray-600 text-white placeholder-gray-400 ${
                  errors.phone ? 'border-red-500' : ''
                }`}
              />
              {errors.phone && (
                <p className="text-xs text-red-400">{errors.phone}</p>
              )}
              <p className="text-xs text-gray-400">Ingresa solo números (ej: 3001234567)</p>
            </div>
          )}

          {isEditing && (
            <div className="flex items-center space-x-2">
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
