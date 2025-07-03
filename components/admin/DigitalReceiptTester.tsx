'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DigitalReceipt } from '@/components/digital-receipt';
import { Receipt, Eye, Send } from 'lucide-react';
import { toast } from 'sonner';

export function DigitalReceiptTester() {
  const [formData, setFormData] = useState({
    studentName: 'María González López',
    amount: '150000',
    concept: 'Mensualidad Enero 2025',
    paymentDate: new Date().toLocaleDateString('es-ES'),
    nextPaymentDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleDateString('es-ES'),
    paymentMethod: 'Transferencia',
    receivedBy: 'Sebastian Vasquez Correa'
  });

  const [showPreview, setShowPreview] = useState(false);
  const [generatingReceipt, setGeneratingReceipt] = useState(false);

  const receiptData = {
    id: 9999,
    receiptNumber: '9999',
    studentName: formData.studentName,
    amount: parseFloat(formData.amount) || 0,
    concept: formData.concept,
    paymentDate: formData.paymentDate,
    nextPaymentDate: formData.nextPaymentDate,
    paymentMethod: formData.paymentMethod,
    receivedBy: formData.receivedBy
  };

  const generateTestReceipt = async () => {
    try {
      setGeneratingReceipt(true);
      
      // Simular la creación de un recibo real
      const response = await fetch('/api/admin/test-digital-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount)
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Recibo de prueba generado: ${result.receiptUrl}`);
        
        // Abrir en nueva pestaña
        window.open(result.receiptUrl, '_blank');
      } else {
        toast.error(result.error || 'Error generando recibo de prueba');
      }

    } catch (error) {
      console.error('Error:', error);
      toast.error('Error generando recibo de prueba');
    } finally {
      setGeneratingReceipt(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-900/90 via-blue-900/90 to-purple-900/90 border-purple-600">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Receipt className="w-6 h-6 mr-3 text-purple-400" />
            Probador de Recibos Digitales
          </CardTitle>
          <p className="text-purple-200">
            Prueba la generación de recibos digitales con datos personalizados
          </p>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario */}
        <Card className="bg-gray-800/90 border-gray-600">
          <CardHeader>
            <CardTitle className="text-white">Datos del Recibo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-gray-300">Nombre del Estudiante</Label>
              <Input
                value={formData.studentName}
                onChange={(e) => updateFormData('studentName', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Ej: María González López"
              />
            </div>

            <div>
              <Label className="text-gray-300">Monto</Label>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => updateFormData('amount', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="150000"
              />
            </div>

            <div>
              <Label className="text-gray-300">Concepto</Label>
              <Select 
                value={formData.concept} 
                onValueChange={(value) => updateFormData('concept', value)}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="Mensualidad Enero 2025" className="text-white">Mensualidad Enero 2025</SelectItem>
                  <SelectItem value="Mensualidad Febrero 2025" className="text-white">Mensualidad Febrero 2025</SelectItem>
                  <SelectItem value="Inscripción" className="text-white">Inscripción</SelectItem>
                  <SelectItem value="Clase Particular" className="text-white">Clase Particular</SelectItem>
                  <SelectItem value="Evento Especial" className="text-white">Evento Especial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-300">Fecha de Pago</Label>
              <Input
                value={formData.paymentDate}
                onChange={(e) => updateFormData('paymentDate', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="DD/MM/AAAA"
              />
            </div>

            <div>
              <Label className="text-gray-300">Próximo Pago</Label>
              <Input
                value={formData.nextPaymentDate}
                onChange={(e) => updateFormData('nextPaymentDate', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="DD/MM/AAAA"
              />
            </div>

            <div>
              <Label className="text-gray-300">Método de Pago</Label>
              <Select 
                value={formData.paymentMethod} 
                onValueChange={(value) => updateFormData('paymentMethod', value)}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="Transferencia" className="text-white">Transferencia</SelectItem>
                  <SelectItem value="Efectivo" className="text-white">Efectivo</SelectItem>
                  <SelectItem value="Nequi" className="text-white">Nequi</SelectItem>
                  <SelectItem value="Daviplata" className="text-white">Daviplata</SelectItem>
                  <SelectItem value="Tarjeta" className="text-white">Tarjeta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-300">Recibido Por</Label>
              <Input
                value={formData.receivedBy}
                onChange={(e) => updateFormData('receivedBy', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Sebastian Vasquez Correa"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => setShowPreview(!showPreview)}
                variant="outline"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
              >
                <Eye className="w-4 h-4 mr-2" />
                {showPreview ? 'Ocultar' : 'Vista Previa'}
              </Button>
              
              <Button
                onClick={generateTestReceipt}
                disabled={generatingReceipt}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Send className="w-4 h-4 mr-2" />
                {generatingReceipt ? 'Generando...' : 'Generar Recibo'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Vista Previa */}
        {showPreview && (
          <Card className="bg-gray-800/90 border-gray-600">
            <CardHeader>
              <CardTitle className="text-white">Vista Previa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="transform scale-50 origin-top-left">
                <DigitalReceipt data={receiptData} isPreview={true} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Información */}
      <Card className="bg-gray-800/90 border-gray-600">
        <CardContent className="p-4">
          <div className="text-gray-300 text-sm space-y-2">
            <p><strong className="text-white">💡 Instrucciones:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Ajusta los datos del recibo en el formulario</li>
              <li>Usa "Vista Previa" para ver cómo se verá el recibo</li>
              <li>Usa "Generar Recibo" para crear un recibo real y obtener la URL</li>
              <li>El recibo generado se puede descargar como imagen PNG</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 