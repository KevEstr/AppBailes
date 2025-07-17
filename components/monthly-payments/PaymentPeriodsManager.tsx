"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarIcon,
  Plus,
  Edit2,
  Trash2,
  CheckIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface PaymentPeriod {
  id: number;
  year: number;
  month: number;
  name: string;
  dueDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface NewPeriod {
  year: number;
  month: number;
  name: string;
  dueDate: string;
}

export default function PaymentPeriodsManager() {
  const [periods, setPeriods] = useState<PaymentPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newPeriod, setNewPeriod] = useState<NewPeriod>({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    name: "",
    dueDate: "",
  });

  useEffect(() => {
    fetchPeriods();
  }, []);

  const fetchPeriods = async () => {
    try {
      const response = await fetch("/api/admin/payment-periods");
      if (response.ok) {
        const data = await response.json();
        setPeriods(data);
      } else {
        toast.error("Error al cargar períodos de pago");
      }
    } catch (error) {
      console.error("Error fetching periods:", error);
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  const createPeriod = async () => {
    if (!newPeriod.name || !newPeriod.dueDate) {
      toast.error("Todos los campos son obligatorios");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/admin/payment-periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPeriod),
      });

      if (response.ok) {
        const created = await response.json();
        setPeriods((prev) => [created, ...prev]);
        setNewPeriod({
          year: new Date().getFullYear(),
          month: new Date().getMonth() + 1,
          name: "",
          dueDate: "",
        });
        toast.success("Período creado exitosamente");
      } else {
        const error = await response.json();
        toast.error(error.message || "Error al crear período");
      }
    } catch (error) {
      console.error("Error creating period:", error);
      toast.error("Error de conexión");
    } finally {
      setIsCreating(false);
    }
  };

  const togglePeriodStatus = async (id: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/payment-periods`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          isActive: !currentStatus,
        }),
      });

      if (response.ok) {
        setPeriods((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, isActive: !currentStatus } : p
          )
        );
        toast.success(`Período ${!currentStatus ? "activado" : "desactivado"}`);
      } else {
        toast.error("Error al actualizar período");
      }
    } catch (error) {
      console.error("Error updating period:", error);
      toast.error("Error de conexión");
    }
  };

  const generatePeriodName = (year: number, month: number) => {
    const monthNames = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];
    return `${monthNames[month - 1]} ${year}`;
  };

  const handleMonthYearChange = (field: "year" | "month", value: number) => {
    const updated = { ...newPeriod, [field]: value };
    updated.name = generatePeriodName(updated.year, updated.month);
    setNewPeriod(updated);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Gestión de Períodos de Pago</h2>
      </div>

      <Tabs defaultValue="create" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">Crear Período</TabsTrigger>
          <TabsTrigger value="manage">Gestionar Períodos</TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Crear Nuevo Período
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="year">Año</Label>
                  <Input
                    id="year"
                    type="number"
                    value={newPeriod.year}
                    onChange={(e) =>
                      handleMonthYearChange("year", parseInt(e.target.value))
                    }
                    min={2020}
                    max={2030}
                  />
                </div>
                <div>
                  <Label htmlFor="month">Mes</Label>
                  <Input
                    id="month"
                    type="number"
                    value={newPeriod.month}
                    onChange={(e) =>
                      handleMonthYearChange("month", parseInt(e.target.value))
                    }
                    min={1}
                    max={12}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="name">Nombre del Período</Label>
                <Input
                  id="name"
                  value={newPeriod.name}
                  onChange={(e) =>
                    setNewPeriod((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Ej: Enero 2024"
                />
              </div>

              <div>
                <Label htmlFor="dueDate">Fecha de Vencimiento</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={newPeriod.dueDate}
                  onChange={(e) =>
                    setNewPeriod((prev) => ({
                      ...prev,
                      dueDate: e.target.value,
                    }))
                  }
                />
              </div>

              <Button
                onClick={createPeriod}
                disabled={isCreating}
                className="w-full"
              >
                {isCreating ? "Creando..." : "Crear Período"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage">
          <Card>
            <CardHeader>
              <CardTitle>Períodos de Pago Existentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {periods.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No hay períodos creados
                  </p>
                ) : (
                  periods.map((period) => (
                    <div
                      key={period.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{period.name}</h3>
                          <Badge
                            variant={period.isActive ? "default" : "secondary"}
                          >
                            {period.isActive ? "Activo" : "Inactivo"}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          Vence:{" "}
                          {format(new Date(period.dueDate), "PPP", {
                            locale: es,
                          })}
                        </p>
                        <p className="text-xs text-gray-500">
                          {period.year}/
                          {period.month.toString().padStart(2, "0")}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            togglePeriodStatus(period.id, period.isActive)
                          }
                        >
                          {period.isActive ? (
                            <XIcon className="h-4 w-4" />
                          ) : (
                            <CheckIcon className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
