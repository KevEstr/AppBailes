"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface PaymentDashboardProps {
  periodId: number;
}

interface PaymentDashboardData {
  period: {
    id: number;
    name: string;
    dueDate: Date;
  };
  totalStudents: number;
  totalExpected: number;
  totalCollected: number;
  pendingReview: number;
  overdue: number;
  collectionRate: number;
  payments: Array<{
    id: number;
    student: {
      id: string;
      name: string;
      phone: string;
    };
    expectedAmount: number;
    paidAmount: number | null;
    status: string;
    paymentDate: Date | null;
    hasProofs: boolean;
    paymentFormId?: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function PaymentDashboard({ periodId }: PaymentDashboardProps) {
  const [data, setData] = useState<PaymentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  
  // Estados para formularios de pago
  const [paymentFormsPage, setPaymentFormsPage] = useState(1);
  const [paymentFormsLimit, setPaymentFormsLimit] = useState(10);
  const [paymentFormsSearchTerm, setPaymentFormsSearchTerm] = useState('');
  const [paymentFormsSearchDebounced, setPaymentFormsSearchDebounced] = useState('');
  const [paymentFormsData, setPaymentFormsData] = useState<{
    paymentForms: Array<{
      id: number;
      student: {
        id: string;
        name: string;
        phone: string;
      };
      expectedAmount: number;
      paymentFormId: string | null;
    }>;
    pagination: {
      page: number;
      limit: number;
      totalCount: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  } | null>(null);
  const [paymentFormsLoading, setPaymentFormsLoading] = useState(false);

  // Estados para pagos
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsLimit, setPaymentsLimit] = useState(10);
  const [paymentsSearchTerm, setPaymentsSearchTerm] = useState('');
  const [paymentsSearchDebounced, setPaymentsSearchDebounced] = useState('');
  const [paymentsData, setPaymentsData] = useState<{
    payments: Array<{
      id: number;
      student: {
        id: string;
        name: string;
        phone: string;
      };
      expectedAmount: number;
      paidAmount: number | null;
      status: string;
      paymentDate: Date | null;
      hasProofs: boolean;
      paymentFormId?: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      totalCount: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  } | null>(null);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    loadDashboardData();
  }, [periodId, currentPage, searchDebounced]);

  // Cargar formularios de pago
  useEffect(() => {
    loadPaymentForms();
  }, [periodId, paymentFormsPage, paymentFormsLimit, paymentFormsSearchDebounced]);

  // Cargar pagos
  useEffect(() => {
    loadPayments();
  }, [periodId, paymentsPage, paymentsLimit, paymentsSearchDebounced]);

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(searchTerm);
      setCurrentPage(1); // Resetear página al buscar
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Debounce para búsqueda de formularios de pago
  useEffect(() => {
    const timer = setTimeout(() => {
      setPaymentFormsSearchDebounced(paymentFormsSearchTerm);
      setPaymentFormsPage(1); // Resetear página al buscar
    }, 300);

    return () => clearTimeout(timer);
  }, [paymentFormsSearchTerm]);

  // Debounce para búsqueda de pagos
  useEffect(() => {
    const timer = setTimeout(() => {
      setPaymentsSearchDebounced(paymentsSearchTerm);
      setPaymentsPage(1); // Resetear página al buscar
    }, 300);

    return () => clearTimeout(timer);
  }, [paymentsSearchTerm]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Construir parámetros de query
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      });
      
      // Agregar búsqueda si existe
      if (searchDebounced.trim()) {
        params.append('search', searchDebounced.trim());
      }
      
      const response = await fetch(`/api/admin/payment-dashboard/${periodId}?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Error al cargar datos del dashboard");
      }

      const dashboardData = await response.json();
      setData(dashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentForms = async () => {
    try {
      setPaymentFormsLoading(true);
      
      // Construir parámetros de query
      const params = new URLSearchParams({
        page: paymentFormsPage.toString(),
        limit: paymentFormsLimit.toString(),
      });
      
      // Agregar búsqueda si existe
      if (paymentFormsSearchDebounced.trim()) {
        params.append('search', paymentFormsSearchDebounced.trim());
      }
      
      const response = await fetch(`/api/admin/payment-dashboard/${periodId}/payment-forms?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Error al cargar formularios de pago");
      }

      const paymentFormsData = await response.json();
      setPaymentFormsData(paymentFormsData);
    } catch (err) {
      console.error('Error loading payment forms:', err);
    } finally {
      setPaymentFormsLoading(false);
    }
  };

  const loadPayments = async () => {
    try {
      setPaymentsLoading(true);
      
      // Construir parámetros de query
      const params = new URLSearchParams({
        page: paymentsPage.toString(),
        limit: paymentsLimit.toString(),
      });
      
      // Agregar búsqueda si existe
      if (paymentsSearchDebounced.trim()) {
        params.append('search', paymentsSearchDebounced.trim());
      }
      
      const response = await fetch(`/api/admin/payment-dashboard/${periodId}/payments?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Error al cargar pagos");
      }

      const paymentsData = await response.json();
      setPaymentsData(paymentsData);
    } catch (err) {
      console.error('Error loading payments:', err);
    } finally {
      setPaymentsLoading(false);
    }
  };

  const copyPaymentLink = async (formId: string, studentName: string) => {
    const link = `${window.location.origin}/payment/${formId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(formId);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (err) {
      // Fallback para navegadores que no soportan clipboard
      console.error("Error al copiar enlace:", err);
    }
  };

  const handlePaymentFormsPageChange = (page: number) => {
    setPaymentFormsPage(page);
  };

  const handlePaymentFormsLimitChange = (newLimit: number) => {
    setPaymentFormsLimit(newLimit);
    setPaymentFormsPage(1);
  };

  const handlePaymentFormsSearchClear = () => {
    setPaymentFormsSearchTerm('');
    setPaymentFormsSearchDebounced('');
    setPaymentFormsPage(1);
  };

  const handlePaymentsPageChange = (page: number) => {
    setPaymentsPage(page);
  };

  const handlePaymentsLimitChange = (newLimit: number) => {
    setPaymentsLimit(newLimit);
    setPaymentsPage(1);
  };

  const handlePaymentsSearchClear = () => {
    setPaymentsSearchTerm('');
    setPaymentsSearchDebounced('');
    setPaymentsPage(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-500 mb-4">⚠️ {error}</div>
        <Button onClick={loadDashboardData} variant="outline">
          Reintentar
        </Button>
      </div>
    );
  }

  if (!data) {
    return <div>No hay datos disponibles</div>;
  }

  return (
    <div className="space-y-6">

     </div>
   );
 }
