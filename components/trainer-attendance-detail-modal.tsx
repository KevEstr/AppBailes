"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  User,
  Trophy,
} from "lucide-react";
import { formatDateLongWithoutTimezone, formatDateOnlyWithoutTimezone } from "@/lib/date-utils";

interface TrainerAttendanceDetail {
  id: number;
  status: "PRESENT" | "LATE" | "ABSENT" | "CHANGE_REQUEST";
  date: string;
  notes?: string;
  createdAt: string;
  class?: {
    id: number;
    name: string;
    sport: string;
    trainer: {
      id: number;
      name: string;
    };
  };
  match?: {
    id: number;
    matchDate: string;
    notes?: string;
    status: string;
    danceClass: {
      id: number;
      name: string;
      sport: string;
      trainer: {
        id: number;
        name: string;
      };
    };
  };
}

interface TrainerAttendanceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  type: "classes" | "events";
  startDate?: Date;
  endDate?: Date;
  classId?: string;
  matchId?: string;
}

export function TrainerAttendanceDetailModal({
  isOpen,
  onClose,
  userId,
  type,
  startDate,
  endDate,
  classId,
  matchId,
}: TrainerAttendanceDetailModalProps) {
  const [details, setDetails] = useState<TrainerAttendanceDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<{ email: string; name?: string } | null>(null);

  useEffect(() => {
    if (isOpen && userId) {
      loadDetails();
    }
  }, [isOpen, userId, type, startDate, endDate, classId, matchId]);

  const loadDetails = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        userId: userId.toString(),
      });

      if (startDate) {
        const y = startDate.getFullYear();
        const m = (startDate.getMonth() + 1).toString().padStart(2, "0");
        const d = startDate.getDate().toString().padStart(2, "0");
        params.append("startDate", `${y}-${m}-${d}`);
      }
      if (endDate) {
        const y = endDate.getFullYear();
        const m = (endDate.getMonth() + 1).toString().padStart(2, "0");
        const d = endDate.getDate().toString().padStart(2, "0");
        params.append("endDate", `${y}-${m}-${d}`);
      }
      if (classId && classId !== "all") {
        params.append("classId", classId);
      }
      if (matchId && matchId !== "all") {
        params.append("matchId", matchId);
      }

      const endpoint =
        type === "classes"
          ? `/api/trainer-attendance/details`
          : `/api/trainer-attendance/matches/details`;
      const response = await fetch(`${endpoint}?${params}`);
      
      if (!response.ok) {
        throw new Error("Error al cargar detalles");
      }
      
      const data = await response.json();
      setDetails(data.attendances || []);
      
      if (data.user) {
        setUserInfo(data.user);
      }
    } catch (error) {
      console.error("Error loading trainer attendance details:", error);
      setDetails([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PRESENT":
        return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case "LATE":
        return <Clock className="w-5 h-5 text-amber-400" />;
      case "ABSENT":
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Calendar className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PRESENT":
        return (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            Presente
          </Badge>
        );
      case "LATE":
        return (
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
            Tarde
          </Badge>
        );
      case "ABSENT":
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            Ausente
          </Badge>
        );
      default:
        return <Badge variant="secondary">Desconocido</Badge>;
    }
  };

  const presentCount = details.filter((d) => d.status === "PRESENT").length;
  const lateCount = details.filter((d) => d.status === "LATE").length;
  const absentCount = details.filter((d) => d.status === "ABSENT").length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-800 border-gray-600">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
            <Avatar className="w-10 h-10 ring-2 ring-blue-500">
              <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold">
                {userInfo?.email
                  ? userInfo.email
                      .split("@")[0]
                      .slice(0, 2)
                      .toUpperCase()
                  : "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <div>{userInfo?.email || "Profesor"}</div>
              <div className="text-sm font-normal text-gray-400">
                {type === "classes" ? "Clases Normales" : "Eventos"} • {details.length} registros
              </div>
            </div>
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Detalle de asistencia {type === "classes" ? "por clase" : "por evento"} con fecha
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-300">Cargando detalles...</span>
          </div>
        ) : details.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-700/50 rounded-full flex items-center justify-center">
              <Calendar className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-300 mb-2">Sin registros de asistencia</h3>
            <p className="text-sm text-gray-400">
              No hay registros de asistencia para este profesor en el período seleccionado
            </p>
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            {/* Estadísticas */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-emerald-900/20 border-emerald-600/40">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-emerald-300" />
                    <span className="text-sm font-medium text-emerald-200">Presentes</span>
                  </div>
                  <div className="text-2xl font-bold text-emerald-300">{presentCount}</div>
                </CardContent>
              </Card>
              <Card className="bg-amber-900/20 border-amber-600/40">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-amber-300" />
                    <span className="text-sm font-medium text-amber-200">Tarde</span>
                  </div>
                  <div className="text-2xl font-bold text-amber-300">{lateCount}</div>
                </CardContent>
              </Card>
              <Card className="bg-red-900/20 border-red-600/40">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <XCircle className="w-5 h-5 text-red-300" />
                    <span className="text-sm font-medium text-red-200">Ausentes</span>
                  </div>
                  <div className="text-2xl font-bold text-red-300">{absentCount}</div>
                </CardContent>
              </Card>
            </div>

            {/* Presentes */}
            {details.some((d) => d.status === "PRESENT") && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-emerald-400">
                    Presentes ({presentCount})
                  </h3>
                </div>
                <div className="space-y-2">
                  {details
                    .filter((d) => d.status === "PRESENT")
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((attendance) => (
                      <Card
                        key={attendance.id}
                        className="bg-emerald-900/20 border-emerald-600/40"
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-emerald-300">
                                  {type === "classes"
                                    ? attendance.class?.name
                                    : attendance.match?.danceClass.name}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-xs border-emerald-500 text-emerald-300"
                                >
                                  {type === "classes"
                                    ? attendance.class?.sport === "DANCE"
                                      ? "Baile"
                                      : "Voleibol"
                                    : attendance.match?.danceClass.sport === "DANCE"
                                    ? "Baile"
                                    : "Voleibol"}
                                </Badge>
                                {type === "events" && (
                                  <Trophy className="w-4 h-4 text-yellow-400" />
                                )}
                              </div>
                              <div className="text-xs text-gray-400">
                                {type === "classes"
                                  ? `👨‍🏫 ${attendance.class?.trainer.name}`
                                  : `👨‍🏫 ${attendance.match?.danceClass.trainer.name}`}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold text-emerald-300">
                                {formatDateLongWithoutTimezone(attendance.date)}
                              </div>
                              <div className="text-xs text-gray-400">
                                {formatDateOnlyWithoutTimezone(attendance.date)}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            )}

            {/* Tarde */}
            {details.some((d) => d.status === "LATE") && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <h3 className="text-lg font-semibold text-amber-400">
                    Llegó Tarde ({lateCount})
                  </h3>
                </div>
                <div className="space-y-2">
                  {details
                    .filter((d) => d.status === "LATE")
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((attendance) => (
                      <Card
                        key={attendance.id}
                        className="bg-amber-900/20 border-amber-600/40"
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-amber-300">
                                  {type === "classes"
                                    ? attendance.class?.name
                                    : attendance.match?.danceClass.name}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-xs border-amber-500 text-amber-300"
                                >
                                  {type === "classes"
                                    ? attendance.class?.sport === "DANCE"
                                      ? "Baile"
                                      : "Voleibol"
                                    : attendance.match?.danceClass.sport === "DANCE"
                                    ? "Baile"
                                    : "Voleibol"}
                                </Badge>
                                {type === "events" && (
                                  <Trophy className="w-4 h-4 text-yellow-400" />
                                )}
                              </div>
                              <div className="text-xs text-gray-400">
                                {type === "classes"
                                  ? `👨‍🏫 ${attendance.class?.trainer.name}`
                                  : `👨‍🏫 ${attendance.match?.danceClass.trainer.name}`}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold text-amber-300">
                                {formatDateLongWithoutTimezone(attendance.date)}
                              </div>
                              <div className="text-xs text-gray-400">
                                {formatDateOnlyWithoutTimezone(attendance.date)}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            )}

            {/* Ausentes */}
            {details.some((d) => d.status === "ABSENT") && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <XCircle className="w-5 h-5 text-red-400" />
                  <h3 className="text-lg font-semibold text-red-400">
                    Ausentes ({absentCount})
                  </h3>
                </div>
                <div className="space-y-2">
                  {details
                    .filter((d) => d.status === "ABSENT")
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((attendance) => (
                      <Card
                        key={attendance.id}
                        className="bg-red-900/20 border-red-600/40"
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-red-300">
                                  {type === "classes"
                                    ? attendance.class?.name
                                    : attendance.match?.danceClass.name}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-xs border-red-500 text-red-300"
                                >
                                  {type === "classes"
                                    ? attendance.class?.sport === "DANCE"
                                      ? "Baile"
                                      : "Voleibol"
                                    : attendance.match?.danceClass.sport === "DANCE"
                                    ? "Baile"
                                    : "Voleibol"}
                                </Badge>
                                {type === "events" && (
                                  <Trophy className="w-4 h-4 text-yellow-400" />
                                )}
                              </div>
                              <div className="text-xs text-gray-400">
                                {type === "classes"
                                  ? `👨‍🏫 ${attendance.class?.trainer.name}`
                                  : `👨‍🏫 ${attendance.match?.danceClass.trainer.name}`}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold text-red-300">
                                {formatDateLongWithoutTimezone(attendance.date)}
                              </div>
                              <div className="text-xs text-gray-400">
                                {formatDateOnlyWithoutTimezone(attendance.date)}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

