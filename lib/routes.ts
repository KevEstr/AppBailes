import { 
  GraduationCap, 
  Clock, 
  Receipt, 
  MessageSquare, 
  BarChart3, 
  AlertTriangle 
} from "lucide-react"

export interface RouteConfig {
  id: string
  href: string
  label: string
  icon: any
  description: string
  color: string
  keywords: string[]
}

export const routes: RouteConfig[] = [
  {
    id: "classes",
    href: "/classes",
    label: "Gestión de Clases",
    icon: GraduationCap,
    description: "Organiza horarios y grupos de baile",
    color: "from-violet-500 to-purple-600",
    keywords: ["clases", "horarios", "grupos", "gestión"]
  },
  {
    id: "attendance",
    href: "/attendance",
    label: "Asistencia de Estudiantes",
    icon: Clock,
    description: "Control visual de asistencias",
    color: "from-purple-500 to-pink-600",
    keywords: ["asistencia", "estudiantes", "control", "registro"]
  },
  {
    id: "receipts",
    href: "/receipts",
    label: "Recibos",
    icon: Receipt,
    description: "Recibos digitales automáticos",
    color: "from-emerald-500 to-teal-600",
    keywords: ["recibos", "pagos", "facturación", "digital"]
  },
  {
    id: "messages",
    href: "/messages",
    label: "Notificaciones",
    icon: MessageSquare,
    description: "Comunicación con estudiantes",
    color: "from-blue-500 to-indigo-600",
    keywords: ["mensajes", "notificaciones", "comunicación", "estudiantes"]
  },
  {
    id: "history",
    href: "/history",
    label: "Análisis",
    icon: BarChart3,
    description: "Reportes de asistencia",
    color: "from-orange-500 to-red-600",
    keywords: ["análisis", "reportes", "estadísticas", "historial"]
  },
  {
    id: "debts",
    href: "/debts",
    label: "Control Pagos",
    icon: AlertTriangle,
    description: "Seguimiento de mensualidades",
    color: "from-red-500 to-pink-600",
    keywords: ["deudas", "pagos", "mensualidades", "seguimiento"]
  },
]

export const getRouteByPath = (path: string): RouteConfig | undefined => {
  return routes.find(route => route.href === path)
}

export const getRouteById = (id: string): RouteConfig | undefined => {
  return routes.find(route => route.id === id)
}

export const segmentNames: Record<string, string> = {
  'classes': 'Gestión de Clases',
  'attendance': 'Asistencia',
  'receipts': 'Recibos', 
  'messages': 'Notificaciones',
  'history': 'Análisis',
  'debts': 'Control Pagos'
} 