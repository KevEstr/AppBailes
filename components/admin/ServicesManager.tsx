"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings,
  Plus,
  Edit2,
  DollarSign,
  Calendar,
  Users,
  Activity,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface Service {
  id: number;
  name: string;
  description?: string;
  basePrice: number;
  category: string;
  isActive: boolean;
  createdAt: Date;
  _count: {
    serviceOrders: number;
  };
}

interface ServiceOrder {
  id: number;
  studentId: number;
  serviceId: number;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: string;
  scheduledDate?: Date;
  completedDate?: Date;
  notes?: string;
  createdAt: Date;
  student: {
    name: string;
    phone: string;
    email?: string;
  };
  service: {
    name: string;
    category: string;
  };
  payments: any[];
}

const SERVICE_CATEGORIES = [
  { value: "TRAINING", label: "Entrenamiento Físico" },
  { value: "PRIVATE_CLASS", label: "Clases Particulares" },
  { value: "WORKSHOP", label: "Talleres Especiales" },
  { value: "EVENT", label: "Eventos y Presentaciones" },
  { value: "EQUIPMENT", label: "Alquiler de Equipos" },
  { value: "OTHER", label: "Otros Servicios" },
];

export function ServicesManager() {
  const [services, setServices] = useState<Service[]>([]);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState("services");

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    basePrice: "",
    category: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadServices(), loadOrders()]);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    const response = await fetch("/api/admin/services");
    if (response.ok) {
      const data = await response.json();
      setServices(data);
    }
  };

  const loadOrders = async () => {
    const response = await fetch("/api/admin/service-orders");
    if (response.ok) {
      const data = await response.json();
      setOrders(data);
    }
  };

  const handleCreateService = async () => {
    if (!formData.name || !formData.basePrice || !formData.category) {
      toast.error("Todos los campos son requeridos");
      return;
    }

    try {
      setCreating(true);
      const response = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          basePrice: parseFloat(formData.basePrice),
          category: formData.category,
        }),
      });

      if (response.ok) {
        await loadServices();
        setShowCreateDialog(false);
        setFormData({ name: "", description: "", basePrice: "", category: "" });
        toast.success("Servicio creado exitosamente");
      } else {
        const error = await response.json();
        toast.error(error.message || "Error al crear servicio");
      }
    } catch (error) {
      console.error("Error creating service:", error);
      toast.error("Error al crear servicio");
    } finally {
      setCreating(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    return (
      SERVICE_CATEGORIES.find((c) => c.value === category)?.label || category
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any }> = {
      PENDING: { label: "Pendiente", variant: "secondary" },
      CONFIRMED: { label: "Confirmado", variant: "default" },
      IN_PROGRESS: { label: "En Progreso", variant: "default" },
      COMPLETED: { label: "Completado", variant: "default" },
      CANCELLED: { label: "Cancelado", variant: "destructive" },
    };

    const config = statusMap[status] || { label: status, variant: "secondary" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Settings className="h-8 w-8 text-purple-400" />
          <h1 className="text-3xl font-bold text-white">
            Gestión de Servicios
          </h1>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Crear Servicio
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-800 border-gray-600 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Plus className="h-5 w-5 text-purple-400" />
                <span>Crear Nuevo Servicio</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-white">
                  Nombre del Servicio
                </Label>
                <Input
                  id="name"
                  placeholder="Ej: Entrenamiento Personal"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>

              <div>
                <Label htmlFor="category" className="text-white">
                  Categoría
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="basePrice" className="text-white">
                  Precio Base
                </Label>
                <Input
                  id="basePrice"
                  type="number"
                  placeholder="0.00"
                  value={formData.basePrice}
                  onChange={(e) =>
                    setFormData({ ...formData, basePrice: e.target.value })
                  }
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-white">
                  Descripción (Opcional)
                </Label>
                <Textarea
                  id="description"
                  placeholder="Descripción del servicio..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <Button
                  onClick={handleCreateService}
                  disabled={creating}
                  className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white"
                >
                  {creating ? "Creando..." : "Crear Servicio"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-800">
          <TabsTrigger
            value="services"
            className="data-[state=active]:bg-purple-600"
          >
            Servicios
          </TabsTrigger>
          <TabsTrigger
            value="orders"
            className="data-[state=active]:bg-purple-600"
          >
            Órdenes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4">
          <div className="grid gap-6">
            {services.map((service) => (
              <Card
                key={service.id}
                className="border-0 bg-gray-800/90 shadow-2xl backdrop-blur-sm border border-gray-600"
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center space-x-3">
                      <Activity className="h-5 w-5 text-purple-400" />
                      <span>{service.name}</span>
                      <Badge
                        variant={service.isActive ? "default" : "secondary"}
                      >
                        {service.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </CardTitle>

                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-green-400" />
                        <span className="text-gray-300 text-sm">
                          Precio Base
                        </span>
                      </div>
                      <p className="text-white font-semibold">
                        {formatCurrency(service.basePrice)}
                      </p>
                    </div>

                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <Activity className="h-4 w-4 text-blue-400" />
                        <span className="text-gray-300 text-sm">Categoría</span>
                      </div>
                      <p className="text-white font-semibold">
                        {getCategoryLabel(service.category)}
                      </p>
                    </div>

                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-purple-400" />
                        <span className="text-gray-300 text-sm">Órdenes</span>
                      </div>
                      <p className="text-white font-semibold">
                        {service._count.serviceOrders}
                      </p>
                    </div>

                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-yellow-400" />
                        <span className="text-gray-300 text-sm">Creado</span>
                      </div>
                      <p className="text-white font-semibold">
                        {new Date(service.createdAt).toLocaleDateString(
                          "es-ES"
                        )}
                      </p>
                    </div>
                  </div>

                  {service.description && (
                    <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500 rounded-lg">
                      <p className="text-blue-400 text-sm">
                        {service.description}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {services.length === 0 && (
              <Card className="border-0 bg-gray-800/90 shadow-2xl backdrop-blur-sm border border-gray-600">
                <CardContent className="py-12">
                  <div className="text-center">
                    <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-white text-lg font-semibold mb-2">
                      No hay servicios creados
                    </h3>
                    <p className="text-gray-400 mb-6">
                      Crea tu primer servicio adicional
                    </p>
                    <Button
                      onClick={() => setShowCreateDialog(true)}
                      className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Primer Servicio
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <div className="grid gap-4">
            {orders.map((order) => (
              <Card
                key={order.id}
                className="border-0 bg-gray-800/90 shadow-2xl backdrop-blur-sm border border-gray-600"
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-white font-semibold">
                        {order.service.name}
                      </h3>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold text-lg">
                        {formatCurrency(order.totalAmount)}
                      </p>
                      <p className="text-gray-400 text-sm">Orden #{order.id}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-gray-400 text-sm">Cliente</p>
                      <p className="text-white font-medium">
                        {order.student.name}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {order.student.phone}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Cantidad</p>
                      <p className="text-white font-medium">
                        {order.quantity} x {formatCurrency(order.unitPrice)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Fecha</p>
                      <p className="text-white font-medium">
                        {new Date(order.createdAt).toLocaleDateString("es-ES")}
                      </p>
                    </div>
                  </div>

                  {order.notes && (
                    <div className="mt-4 p-3 bg-gray-700/50 rounded-lg">
                      <p className="text-gray-300 text-sm">{order.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {orders.length === 0 && (
              <Card className="border-0 bg-gray-800/90 shadow-2xl backdrop-blur-sm border border-gray-600">
                <CardContent className="py-12">
                  <div className="text-center">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-white text-lg font-semibold mb-2">
                      No hay órdenes de servicios
                    </h3>
                    <p className="text-gray-400">
                      Las órdenes aparecerán aquí cuando se creen
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
