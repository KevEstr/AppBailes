"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  User,
  Calendar,
  DollarSign,
  Phone,
  Mail,
  RefreshCw,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface PaymentProof {
  id: number;
  payerName: string;
  payerPhone?: string;
  payerEmail?: string;
  amount: number;
  paymentMethod: string;
  proofImageUrl: string;
  uploadedAt: Date;
  status: string;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewNotes?: string;
  paymentType?: string;
  concept?: string;
  
  // Para mensualidades
  paymentForm?: {
    studentName: string;
    amount: number;
    period: {
      name: string;
      dueDate: Date;
    };
    monthlyPayment: {
      id: number;
      expectedAmount: number;
      status: string;
    };
  };
  
  // Para inscripciones
  enrollmentPaymentForm?: {
    studentName: string;
    amount: number;
    sport: string;
    enrollmentPayment: {
      id: number;
      expectedAmount: number;
      status: string;
    };
  };
}

export function PaymentProofReview() {
  const [proofs, setProofs] = useState<PaymentProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProof, setSelectedProof] = useState<PaymentProof | null>(null);
  const [reviewAction, setReviewAction] = useState<
    "APPROVED" | "REJECTED" | "NEEDS_REVIEW"
  >("APPROVED");
  const [reviewNotes, setReviewNotes] = useState("");
  const [approvedAmount, setApprovedAmount] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadPendingProofs();
  }, []);

  const loadPendingProofs = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/payment-proofs/pending");

      if (!response.ok) {
        throw new Error("Error al cargar comprobantes");
      }

      const data = await response.json();
      setProofs(data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Función para formatear fechas de manera consistente
  const formatDate = (date: Date | string) => {
    if (!mounted) return "Cargando...";

    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (date: Date | string) => {
    if (!mounted) return "Cargando...";

    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Calcular información de pago parcial
  const calculatePaymentInfo = (
    proof: PaymentProof,
    approvedAmountInput: string
  ) => {
    // Determinar el monto esperado según el tipo de pago
    let expectedAmount = 0;
    if (proof.paymentForm) {
      expectedAmount = proof.paymentForm.monthlyPayment.expectedAmount;
    } else if (proof.enrollmentPaymentForm) {
      expectedAmount = proof.enrollmentPaymentForm.enrollmentPayment.expectedAmount;
    }
    
    const submittedAmount = proof.amount;
    const approvedAmountValue = approvedAmountInput
      ? parseFloat(approvedAmountInput)
      : submittedAmount;

    const isPartialPayment = approvedAmountValue < expectedAmount;
    const remainingAmount = expectedAmount - approvedAmountValue;
    const paymentPercentage = (approvedAmountValue / expectedAmount) * 100;

    return {
      expectedAmount,
      submittedAmount,
      approvedAmountValue,
      isPartialPayment,
      remainingAmount: Math.max(0, remainingAmount),
      paymentPercentage: Math.min(100, paymentPercentage),
      isValidAmount:
        approvedAmountValue > 0 && approvedAmountValue <= expectedAmount,
    };
  };

  const handleReview = async () => {
    if (!selectedProof) return;

    const paymentInfo = calculatePaymentInfo(selectedProof, approvedAmount);

    // Validaciones
    if (reviewAction === "APPROVED" && !paymentInfo.isValidAmount) {
      alert(
        "El monto aprobado debe ser mayor a 0 y no puede exceder el monto esperado"
      );
      return;
    }

    if (reviewAction === "REJECTED" && !reviewNotes.trim()) {
      alert("Debes proporcionar una razón para rechazar el comprobante");
      return;
    }

    try {
      setReviewing(true);

      const reviewData = {
        status: reviewAction,
        reviewedBy: "admin@academia.com", // En producción, obtener del usuario logueado
        reviewNotes: reviewNotes.trim() || undefined,
        approvedAmount:
          reviewAction === "APPROVED" && approvedAmount
            ? parseFloat(approvedAmount)
            : undefined,
      };

      const response = await fetch(
        `/api/admin/payment-proofs/${selectedProof.id}/review`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(reviewData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al revisar comprobante");
      }

      // Recargar lista
      await loadPendingProofs();

      // Limpiar formulario
      setSelectedProof(null);
      setReviewNotes("");
      setApprovedAmount("");
      setReviewAction("APPROVED");
    } catch (error) {
      console.error("Error:", error);
      alert(
        error instanceof Error ? error.message : "Error al revisar comprobante"
      );
    } finally {
      setReviewing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      PENDING: {
        label: "Pendiente",
        icon: Clock,
        className: "bg-yellow-900/50 text-yellow-300 border-yellow-600",
      },
      APPROVED: {
        label: "Aprobado",
        icon: CheckCircle,
        className: "bg-green-900/50 text-green-300 border-green-600",
      },
      REJECTED: {
        label: "Rechazado",
        icon: XCircle,
        className: "bg-red-900/50 text-red-300 border-red-600",
      },
      NEEDS_REVIEW: {
        label: "Revisar",
        icon: Eye,
        className: "bg-blue-900/50 text-blue-300 border-blue-600",
      },
    };

    const {
      label,
      icon: Icon,
      className,
    } = config[status as keyof typeof config] || config.PENDING;

    return (
      <Badge className={className}>
        <Icon className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    );
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods = {
      TRANSFER: "Transferencia",
      CASH: "Efectivo",
      CARD: "Tarjeta",
    };
    return methods[method as keyof typeof methods] || method;
  };

  const getStudentInfo = (proof: PaymentProof) => {
    if (proof.paymentForm) {
      return {
        name: proof.paymentForm.studentName,
        type: 'MONTHLY',
        period: proof.paymentForm.period.name,
        expectedAmount: proof.paymentForm.monthlyPayment.expectedAmount
      };
    } else if (proof.enrollmentPaymentForm) {
      return {
        name: proof.enrollmentPaymentForm.studentName,
        type: 'ENROLLMENT',
        period: `Inscripción ${proof.enrollmentPaymentForm.sport === 'DANCE' ? 'Baile' : 'Voleibol'}`,
        expectedAmount: proof.enrollmentPaymentForm.enrollmentPayment.expectedAmount
      };
    }
    return null;
  };

  const getAmountStatusInfo = (proof: PaymentProof) => {
    const studentInfo = getStudentInfo(proof);
    if (!studentInfo) return { status: "unknown", message: "Información no disponible", className: "text-gray-400 bg-gray-900/20 border-gray-600" };
    
    const expected = studentInfo.expectedAmount;
    const submitted = proof.amount;
    const difference = submitted - expected;

    if (Math.abs(difference) < 0.01) {
      return {
        status: "exact",
        message: "Monto exacto",
        className: "text-green-400 bg-green-900/20 border-green-600",
      };
    } else if (difference > 0) {
      return {
        status: "over",
        message: `Excede por ${formatCurrency(difference)}`,
        className: "text-orange-400 bg-orange-900/20 border-orange-600",
      };
    } else {
      return {
        status: "under",
        message: `Falta ${formatCurrency(Math.abs(difference))}`,
        className: "text-red-400 bg-red-900/20 border-red-600",
      };
    }
  };

  // No renderizar hasta que esté montado en el cliente
  if (!mounted) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Header mejorado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Comprobantes Pendientes
          </h1>
          <p className="text-gray-300 mt-1">
            {proofs.length} comprobantes esperando revisión
          </p>
        </div>
        <Button
          onClick={loadPendingProofs}
          variant="outline"
          className="bg-gray-800/90 border-gray-600 text-white hover:bg-gray-700 hover:border-gray-500 flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {proofs.length === 0 ? (
        <Card className="bg-gray-800/90 border-gray-600 max-w-md mx-auto">
          <CardContent className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2 text-white">
              ¡Todo al día!
            </h3>
            <p className="text-gray-400">
              No hay comprobantes pendientes de revisión.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {proofs.map((proof) => {
            const amountStatus = getAmountStatusInfo(proof);

            return (
              <Card
                key={proof.id}
                className="bg-gray-800/90 border-gray-600 hover:bg-gray-800/95 transition-colors"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg text-white mb-1">
                        {proof.paymentForm.studentName}
                      </CardTitle>
                      <p className="text-sm text-gray-400 mb-2">
                        {proof.paymentForm.period.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        {formatDate(proof.uploadedAt)}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {getStatusBadge(proof.status)}
                      <Badge className={amountStatus.className}>
                        {amountStatus.message}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Información del pagador */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-300">
                        {proof.payerName}
                      </span>
                    </div>
                    {proof.payerPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-300">
                          {proof.payerPhone}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Información de montos */}
                  <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-600">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-400 block mb-1">
                          Monto esperado:
                        </span>
                        <span className="text-white font-medium">
                          {formatCurrency(
                            proof.paymentForm.monthlyPayment.expectedAmount
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block mb-1">
                          Método:
                        </span>
                        <span className="text-gray-300">
                          {getPaymentMethodLabel(proof.paymentMethod)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Comprobante preview */}
                  <div className="space-y-3">
                    <div className="h-32 bg-gray-700/50 rounded-lg overflow-hidden border border-gray-600">
                      <img
                        src={proof.proofImageUrl}
                        alt="Comprobante de pago"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  {/* Botón de ver comprobante */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-600"
                        variant="outline"
                        onClick={() => {
                          setSelectedProof(proof);
                          setApprovedAmount(proof.amount.toString());
                          setReviewAction("APPROVED");
                          setReviewNotes("");
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver comprobante
                      </Button>
                    </DialogTrigger>

                    <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] overflow-y-auto bg-gray-800 border-gray-600">
                      <DialogHeader className="pb-4 border-b border-gray-600">
                        <DialogTitle className="text-xl font-bold text-white">
                          Revisar Comprobante -{" "}
                          {selectedProof?.paymentForm.studentName}
                        </DialogTitle>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300 mt-2">
                          <span>{selectedProof?.paymentForm.period.name}</span>
                          <span>•</span>
                          <span>
                            {selectedProof &&
                              formatDateTime(selectedProof.uploadedAt)}
                          </span>
                          {selectedProof &&
                            (() => {
                              const amountStatus =
                                getAmountStatusInfo(selectedProof);
                              return (
                                <Badge
                                  className={`${amountStatus.className} ml-auto`}
                                >
                                  {amountStatus.message}
                                </Badge>
                              );
                            })()}
                        </div>
                      </DialogHeader>

                      {selectedProof && (
                        <div className="space-y-6 py-6">
                          {/* Información del comprobante y pagador */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Comprobante */}
                            <div className="space-y-4">
                              <h4 className="font-medium text-white">
                                Comprobante
                              </h4>
                              <button
                                onClick={() =>
                                  window.open(
                                    selectedProof.proofImageUrl,
                                    "_blank"
                                  )
                                }
                                className="border border-gray-600 rounded-lg overflow-hidden p-0 m-0 bg-transparent hover:opacity-80 transition-opacity cursor-pointer"
                                style={{ all: "unset", display: "block" }}
                              >
                                <img
                                  src={selectedProof.proofImageUrl}
                                  alt="Comprobante de pago"
                                  className="w-full h-48 sm:h-64 object-cover"
                                />
                              </button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full bg-gray-600 border-gray-500 text-white hover:bg-gray-500"
                                onClick={() =>
                                  window.open(
                                    selectedProof.proofImageUrl,
                                    "_blank"
                                  )
                                }
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Ver comprobante completo
                              </Button>
                            </div>

                            {/* Información del pagador y montos */}
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-medium text-white mb-3">
                                  Información del pago
                                </h4>
                                <div className="space-y-3 text-sm">
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-300">
                                      {selectedProof.payerName}
                                    </span>
                                  </div>

                                  {selectedProof.payerPhone && (
                                    <div className="flex items-center gap-2">
                                      <Phone className="h-4 w-4 text-gray-400" />
                                      <span className="text-gray-300">
                                        {selectedProof.payerPhone}
                                      </span>
                                    </div>
                                  )}

                                  {selectedProof.payerEmail && (
                                    <div className="flex items-center gap-2">
                                      <Mail className="h-4 w-4 text-gray-400" />
                                      <span className="text-gray-300">
                                        {selectedProof.payerEmail}
                                      </span>
                                    </div>
                                  )}

                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-300">
                                      {getPaymentMethodLabel(
                                        selectedProof.paymentMethod
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Resumen de montos */}
                              <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-600">
                                <h5 className="font-medium text-white mb-3">
                                  Resumen de montos
                                </h5>
                                <div className="space-y-2">
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">
                                      Monto esperado:
                                    </span>
                                    <span className="text-white font-medium">
                                      {formatCurrency(
                                        selectedProof.paymentForm.monthlyPayment
                                          .expectedAmount
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">
                                      Monto enviado:
                                    </span>
                                    <span
                                      className={`font-medium ${(() => {
                                        const status =
                                          getAmountStatusInfo(selectedProof);
                                        return status.status === "exact"
                                          ? "text-green-400"
                                          : status.status === "over"
                                          ? "text-orange-400"
                                          : "text-red-400";
                                      })()}`}
                                    >
                                      {formatCurrency(selectedProof.amount)}
                                    </span>
                                  </div>
                                  {(() => {
                                    const difference =
                                      selectedProof.amount -
                                      selectedProof.paymentForm.monthlyPayment
                                        .expectedAmount;
                                    if (Math.abs(difference) >= 0.01) {
                                      return (
                                        <div className="flex justify-between text-sm pt-2 border-t border-gray-600">
                                          <span className="text-gray-500">
                                            Diferencia:
                                          </span>
                                          <span
                                            className={
                                              difference > 0
                                                ? "text-orange-400"
                                                : "text-red-400"
                                            }
                                          >
                                            {difference > 0 ? "+" : ""}
                                            {formatCurrency(difference)}
                                          </span>
                                        </div>
                                      );
                                    }
                                  })()}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Acciones de revisión */}
                          <div className="space-y-4 border-t border-gray-600 pt-6">
                            <h4 className="font-medium text-white">
                              Revisión del comprobante
                            </h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Decisión y monto */}
                              <div className="space-y-4">
                                <Label className="text-gray-300">
                                  Decisión
                                </Label>
                                <Select
                                  value={reviewAction}
                                  onValueChange={(value: any) =>
                                    setReviewAction(value)
                                  }
                                >
                                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-2">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-gray-700 border-gray-600">
                                    <SelectItem
                                      value="APPROVED"
                                      className="text-white hover:bg-gray-600"
                                    >
                                      ✅ Aprobar pago
                                    </SelectItem>
                                    <SelectItem
                                      value="REJECTED"
                                      className="text-white hover:bg-gray-600"
                                    >
                                      ❌ Rechazar
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Panel dinámico basado en la acción */}
                              <div className="space-y-4">
                                {reviewAction === "APPROVED" ? (
                                  <>
                                    <Label className="text-gray-300">
                                      Monto a aprobar
                                    </Label>
                                    <Input
                                      type="number"
                                      value={approvedAmount}
                                      onChange={(e) =>
                                        setApprovedAmount(e.target.value)
                                      }
                                      placeholder="Monto a aprobar"
                                      className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                                      min="0"
                                      max={
                                        selectedProof.paymentForm.monthlyPayment
                                          .expectedAmount
                                      }
                                      step="0.01"
                                    />
                                  </>
                                ) : (
                                  <>
                                    <Label className="text-gray-300">
                                      Razón del rechazo (requerido)
                                    </Label>
                                    <Textarea
                                      value={reviewNotes}
                                      onChange={(e) =>
                                        setReviewNotes(e.target.value)
                                      }
                                      placeholder="Explica el motivo del rechazo..."
                                      rows={6}
                                      className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                                    />
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Calculadora de pagos - Solo en modo aprobación */}
                            {reviewAction === "APPROVED" &&
                              approvedAmount &&
                              (() => {
                                const paymentInfo = calculatePaymentInfo(
                                  selectedProof,
                                  approvedAmount
                                );
                                return (
                                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-600">
                                      <h5 className="font-medium text-white mb-3">
                                        Resumen del pago
                                      </h5>
                                      <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                          <span className="text-gray-400">
                                            Monto esperado:
                                          </span>
                                          <span className="text-white font-medium">
                                            {formatCurrency(
                                              selectedProof.paymentForm
                                                .monthlyPayment.expectedAmount
                                            )}
                                          </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                          <span className="text-gray-400">
                                            Monto a aprobar:
                                          </span>
                                          <span className="text-white font-medium">
                                            {formatCurrency(
                                              paymentInfo.approvedAmountValue
                                            )}
                                          </span>
                                        </div>
                                        {paymentInfo.isPartialPayment && (
                                          <>
                                            <div className="flex justify-between items-center">
                                              <span className="text-orange-400">
                                                Saldo restante:
                                              </span>
                                              <span className="text-orange-400 font-medium">
                                                {formatCurrency(
                                                  paymentInfo.remainingAmount
                                                )}
                                              </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                              <span className="text-gray-400">
                                                Porcentaje del pago:
                                              </span>
                                              <span className="text-white">
                                                {paymentInfo.paymentPercentage.toFixed(
                                                  1
                                                )}
                                                %
                                              </span>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    </div>

                                    <div
                                      className={`p-4 rounded-lg border ${
                                        paymentInfo.isPartialPayment
                                          ? "bg-orange-900/20 border-orange-600"
                                          : "bg-green-900/20 border-green-600"
                                      }`}
                                    >
                                      <h5 className="font-medium text-white mb-3">
                                        Estado del pago
                                      </h5>
                                      {paymentInfo.isPartialPayment ? (
                                        <div className="space-y-3">
                                          <p className="text-orange-300">
                                            <span className="block font-medium mb-1">
                                              ⚠️ Pago parcial
                                            </span>{" "}
                                            Este es un pago parcial. Se creará
                                            automáticamente una deuda por el
                                            saldo restante.
                                          </p>
                                          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                              className="h-full bg-orange-500"
                                              style={{
                                                width: `${paymentInfo.paymentPercentage}%`,
                                              }}
                                            />
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="space-y-2">
                                          <p className="text-green-300">
                                            <span className="block font-medium mb-1">
                                              ✅ Pago completo
                                            </span>{" "}
                                            El pago cubre el monto total
                                            esperado. No quedará ninguna deuda
                                            pendiente.
                                          </p>
                                          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                            <div className="h-full bg-green-500 w-full" />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}

                            {/* Botón principal */}
                            <div className="flex gap-2 pt-6">
                              <Button
                                onClick={handleReview}
                                disabled={
                                  reviewing ||
                                  (reviewAction === "REJECTED" &&
                                    !reviewNotes.trim())
                                }
                                className={`flex-1 ${
                                  reviewAction === "APPROVED"
                                    ? "bg-green-600 hover:bg-green-700"
                                    : "bg-red-600 hover:bg-red-700"
                                } disabled:opacity-50`}
                              >
                                {reviewing ? (
                                  <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Procesando...
                                  </>
                                ) : (
                                  <>
                                    {reviewAction === "APPROVED" ? (
                                      <>
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Aprobar pago
                                      </>
                                    ) : (
                                      <>
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Rechazar pago
                                      </>
                                    )}
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
