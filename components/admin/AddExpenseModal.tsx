"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
// Ya no necesitamos funciones de zona horaria

interface AddExpenseModalProps {
  readonly onExpenseAdded: () => void;
}

export function AddExpenseModal({ onExpenseAdded }: AddExpenseModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    category: "",
    paymentMethod: "",
    paymentDate: new Date().toISOString().split('T')[0], // Fecha actual
    notes: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description || !formData.amount || !formData.category || !formData.paymentMethod || !formData.paymentDate) {
      toast.error("Por favor completa todos los campos obligatorios");
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("El monto debe ser un número válido mayor a 0");
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch("/api/admin/financial-transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "EXPENSE",
          category: formData.category || "OTHER_EXPENSE",
          amount: amount,
          description: formData.description,
          paymentMethod: formData.paymentMethod,
          paymentDate: formData.paymentDate,
          notes: formData.notes
        }),
      });

      if (response.ok) {
        toast.success("Egreso agregado exitosamente");
        setOpen(false);
        resetForm();
        onExpenseAdded();
      } else {
        const error = await response.json();
        toast.error(error.message || "Error al agregar el egreso");
      }
    } catch (error) {
      console.error("Error adding expense:", error);
      toast.error("Error al agregar el egreso");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      description: "",
      amount: "",
      category: "",
      paymentMethod: "",
      paymentDate: new Date().toISOString().split('T')[0],
      notes: ""
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !loading) {
      resetForm();
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-red-600 hover:bg-red-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Agregar Egreso
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-gray-800 border-gray-600">
        <DialogHeader>
          <DialogTitle className="text-white">Agregar Egreso</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description" className="text-white">
              Descripción *
            </Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ej: Pago de internet, Compra de equipos, etc."
              className="bg-gray-700 border-gray-600 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="text-white">
              Monto *
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
              className="bg-gray-700 border-gray-600 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category" className="text-white">
              Categoría *
            </Label>
            <Select 
              value={formData.category} 
              onValueChange={(value) => setFormData({ ...formData, category: value })}
              required
            >
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SERVICE_PAYMENT">Servicios</SelectItem>
                <SelectItem value="EQUIPMENT">Equipos</SelectItem>
                <SelectItem value="MARKETING">Marketing</SelectItem>
                <SelectItem value="RENT">Alquiler</SelectItem>
                <SelectItem value="UTILITIES">Servicios Públicos</SelectItem>
                <SelectItem value="SALARIES">Salarios</SelectItem>
                <SelectItem value="PURCHASES">Compras</SelectItem>
                <SelectItem value="OTHER_EXPENSE">Otros Gastos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod" className="text-white">
              Método de Pago *
            </Label>
            <Select 
              value={formData.paymentMethod} 
              onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
              required
            >
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Seleccionar método de pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Efectivo</SelectItem>
                <SelectItem value="TRANSFER">Transferencia</SelectItem>
                <SelectItem value="CARD">Tarjeta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentDate" className="text-white">
              Fecha de Pago *
            </Label>
            <Input
              id="paymentDate"
              type="date"
              value={formData.paymentDate}
              onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
              className="bg-gray-700 border-gray-600 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-white">
              Notas Adicionales
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Información adicional sobre el pago..."
              className="bg-gray-700 border-gray-600 text-white"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Agregando...
                </>
              ) : (
                "Agregar Egreso"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 