"use client"

import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  ChevronLeft,
  ChevronRight,
  Search,
  CalendarDays,
  List,
  LayoutGrid,
  User,
  Phone,
  Mail,
  IdCard,
  Cake,
  X,
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface BirthdayPerson {
  id: string
  name: string
  phone: string
  email: string | null
  birthDate: string | null
  type: "student" | "teacher"
  avatar: string | null
}

type ViewMode = "month" | "week" | "day"

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

const MONTH_SHORT = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
]

function parseBirthDay(birthDate: string): number | null {
  if (!birthDate) return null
  const parts = birthDate.split("-")
  if (parts.length < 3) return null
  const d = parseInt(parts[2])
  return Number.isNaN(d) ? null : d
}

function parseBirthMonth(birthDate: string): number | null {
  if (!birthDate) return null
  const parts = birthDate.split("-")
  if (parts.length < 3) return null
  const m = parseInt(parts[1])
  return Number.isNaN(m) ? null : m
}

function formatBirthDate(birthDate: string): string {
  if (!birthDate) return ""
  const parts = birthDate.split("-")
  if (parts.length < 3) return birthDate
  const d = parseInt(parts[2])
  const m = parseInt(parts[1])
  const y = parseInt(parts[0])
  if ([d, m, y].some((n) => Number.isNaN(n))) return birthDate
  return `${d} de ${MONTH_NAMES[m - 1]} de ${y}`
}

export function CalendarView() {
  const [viewMode, setViewMode] = useState<ViewMode>("month")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [people, setPeople] = useState<BirthdayPerson[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [searchResults, setSearchResults] = useState<BirthdayPerson[]>([])
  const [searching, setSearching] = useState(false)
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [searchRect, setSearchRect] = useState({ top: 0, left: 0, width: 0 })
  const [profileFilter, setProfileFilter] = useState("all")

  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [dayModalOpen, setDayModalOpen] = useState(false)
  const [detailPerson, setDetailPerson] = useState<BirthdayPerson | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  function getMonthParam() {
    return `${year}-${String(month + 1).padStart(2, "0")}`
  }

  function getWeekDays() {
    const start = new Date(currentDate)
    const dayOfWeek = start.getDay()
    const monOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    start.setDate(start.getDate() + monOffset)
    const days = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      days.push(d)
    }
    return days
  }

  function getMonthGrid() {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const dow = firstDay.getDay()
    const startPad = dow === 0 ? 6 : dow - 1
    const totalDays = lastDay.getDate()
    const grid: (number | null)[] = []
    for (let i = 0; i < startPad; i++) grid.push(null)
    for (let d = 1; d <= totalDays; d++) grid.push(d)
    return grid
  }

  function getBirthdayForDay(day: number): BirthdayPerson[] {
    return people.filter((p) => {
      const bd = parseBirthDay(p.birthDate ?? "")
      return bd !== null && bd === day
    })
  }

  const fetchBirthdays = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ month: getMonthParam() })
      if (profileFilter !== "all") params.set("profileType", profileFilter)

      const res = await fetch(`/api/calendar?${params}`)
      const data = await res.json()

      if (data.success) {
        setPeople(data.people)
      }
    } catch (e) {
      console.error("Error fetching birthdays:", e)
    } finally {
      setLoading(false)
    }
  }, [profileFilter, currentDate])

  useEffect(() => {
    fetchBirthdays()
  }, [fetchBirthdays])

  const changeMonth = useCallback((dir: number) => {
    const d = new Date(currentDate)
    d.setMonth(d.getMonth() + dir)
    setCurrentDate(d)
  }, [currentDate])

  const changeWeek = useCallback((dir: number) => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + dir * 7)
    setCurrentDate(d)
  }, [currentDate])

  const changeDay = useCallback((dir: number) => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + dir)
    setCurrentDate(d)
  }, [currentDate])

  const goToday = useCallback(() => {
    setCurrentDate(new Date())
  }, [])

  let searchTimer: ReturnType<typeof setTimeout> | null = null

  const doSearch = useCallback(async (term: string) => {
    if (term.trim().length < 2) {
      setSearchResults([])
      setShowSearchDropdown(false)
      return
    }
    setSearching(true)
    try {
      const el = document.getElementById("search-input")
      if (el) {
        const r = el.getBoundingClientRect()
        setSearchRect({ top: r.bottom + 4, left: r.left, width: r.width })
      }
      const params = new URLSearchParams({ search: term, profileType: "all" })
      const res = await fetch(`/api/calendar?${params}`)
      const data = await res.json()
      if (data.success) {
        setSearchResults(data.people)
        setShowSearchDropdown(true)
      } else {
        setSearchResults([])
        setShowSearchDropdown(true)
      }
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  function onSearchInput(value: string) {
    setSearch(value)
    if (searchTimer) clearTimeout(searchTimer)
    if (value.trim().length < 2) {
      setSearchResults([])
      setShowSearchDropdown(false)
      return
    }
    searchTimer = setTimeout(() => doSearch(value), 300)
  }

  function selectSearchResult(person: BirthdayPerson) {
    setShowSearchDropdown(false)
    openDetailModal(person)
  }

  function openDayModal(day: number) {
    setSelectedDay(day)
    setDayModalOpen(true)
  }

  function openDetailModal(person: BirthdayPerson) {
    setDetailPerson(person)
    setDetailModalOpen(true)
  }

  const studentCount = people.filter((p) => p.type === "student").length
  const teacherCount = people.filter((p) => p.type === "teacher").length

  const typeBadge = (type: "student" | "teacher") => {
    if (type === "student")
      return <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px]">Deportista</Badge>
    return <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px]">Profesor</Badge>
  }

  const typeDot = (type: "student" | "teacher") => {
    if (type === "student")
      return <span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-1" />
    return <span className="inline-block w-2 h-2 rounded-full bg-purple-400 mr-1" />
  }

  const typeBg = (type: "student" | "teacher") => {
    if (type === "student")
      return "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20"
    return "bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20"
  }

  const typeText = (type: "student" | "teacher") => {
    if (type === "student") return "text-blue-300"
    return "text-purple-300"
  }

  const typeHover = (type: "student" | "teacher") => {
    if (type === "student") return "hover:text-blue-200"
    return "hover:text-purple-200"
  }

  return (
    <div className="w-full relative">
      {/* Toolbar */}
      <Card className="rounded-2xl bg-gray-800/90 p-4 sm:p-6 shadow-xl border border-gray-600 backdrop-blur-sm mb-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          {/* Navigation */}
          <div className="flex items-center justify-between lg:justify-start gap-2 flex-shrink-0 w-full lg:w-auto">
            <Button
              size="sm"
              variant="ghost"
              className="rounded-xl bg-gray-700 text-gray-200 hover:bg-gray-600 px-2 py-1"
              onClick={() => {
                if (viewMode === "month") changeMonth(-1)
                else if (viewMode === "week") changeWeek(-1)
                else changeDay(-1)
              }}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <div className="text-white font-semibold text-sm flex-1 lg:flex-none text-center">
              {viewMode === "day"
                ? format(currentDate, "d 'de' MMMM 'de' yyyy", { locale: es })
                : `${MONTH_NAMES[month]} ${year}`}
            </div>

            <Button
              size="sm"
              variant="ghost"
              className="rounded-xl bg-gray-700 text-gray-200 hover:bg-gray-600 px-2 py-1"
              onClick={() => {
                if (viewMode === "month") changeMonth(1)
                else if (viewMode === "week") changeWeek(1)
                else changeDay(1)
              }}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* View toggles */}
          <div className="flex items-stretch lg:items-center gap-1 w-full lg:w-auto">
            <Button
              size="sm"
              variant="ghost"
              onClick={goToday}
              className={`flex-1 lg:flex-none rounded-xl bg-blue-600/20 text-blue-300 hover:bg-blue-600/40 px-2 py-1`}
            >
              <CalendarDays className="w-4 h-4" />
              <span className="ml-1 text-[11px]">Hoy</span>
            </Button>
            <Button
              size="sm"
              variant={viewMode === "month" ? "default" : "ghost"}
              className={`flex-1 lg:flex-none rounded-xl ${viewMode === "month" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"} px-2 py-1`}
              onClick={() => setViewMode("month")}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="ml-1 text-[11px]">Mes</span>
            </Button>
            <Button
              size="sm"
              variant={viewMode === "week" ? "default" : "ghost"}
              className={`flex-1 lg:flex-none rounded-xl ${viewMode === "week" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"} px-2 py-1`}
              onClick={() => setViewMode("week")}
            >
              <List className="w-4 h-4" />
              <span className="ml-1 text-[11px]">Semana</span>
            </Button>
            <Button
              size="sm"
              variant={viewMode === "day" ? "default" : "ghost"}
              className={`flex-1 lg:flex-none rounded-xl ${viewMode === "day" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"} px-2 py-1`}
              onClick={() => setViewMode("day")}
            >
              <CalendarDays className="w-4 h-4" />
              <span className="ml-1 text-[11px]">Día</span>
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
            <div className="relative w-full sm:flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="search-input"
                placeholder="Buscar nombre, teléfono, ID..."
                value={search}
                onChange={(e) => onSearchInput(e.target.value)}
                className="w-full bg-gray-700 border-gray-600 text-white placeholder-gray-400 rounded-xl pl-9 text-xs sm:text-sm"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin w-3 h-3 border border-blue-500 border-t-transparent rounded-full" />
                </div>
              )}
            </div>
            <Select value={profileFilter} onValueChange={setProfileFilter}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-gray-200 rounded-xl text-xs sm:w-auto">
                <SelectValue placeholder="Perfiles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los perfiles</SelectItem>
                <SelectItem value="student">Deportistas</SelectItem>
                <SelectItem value="teacher">Profesores</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="flex items-center gap-3 mb-4 text-xs">
        <div className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
          <span className="text-gray-400">Deportistas: <span className="text-blue-300 font-medium">{studentCount}</span></span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-purple-400" />
          <span className="text-gray-400">Profesores: <span className="text-purple-300 font-medium">{teacherCount}</span></span>
        </div>
        <div className="text-gray-500">| Total: <span className="text-white font-medium">{people.length}</span> cumpleaños</div>
      </div>

      {/* Calendar content */}
      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Cargando cumpleaños...</p>
        </div>
      ) : people.length === 0 ? (
        <div className="text-center py-20">
          <Cake className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-base">No hay cumpleaños registrados este mes</p>
          <p className="text-gray-500 text-xs mt-1">Asegúrate de que los perfiles tengan fecha de nacimiento registrada</p>
        </div>
      ) : viewMode === "month" ? (
        <MonthView
          year={year}
          month={month}
          grid={getMonthGrid()}
          getBirthdays={getBirthdayForDay}
          typeDot={typeDot}
          typeText={typeText}
          typeBg={typeBg}
          typeHover={typeHover}
          today={new Date()}
          onDayClick={openDayModal}
          onPersonClick={openDetailModal}
        />
      ) : viewMode === "week" ? (
        <WeekView
          weekDays={getWeekDays()}
          people={people}
          getBirthdays={getBirthdayForDay}
          typeDot={typeDot}
          typeText={typeText}
          typeBg={typeBg}
          typeBadge={typeBadge}
          onPersonClick={openDetailModal}
        />
      ) : (
        <DayView
          date={currentDate}
          people={people}
          getBirthdays={getBirthdayForDay}
          typeDot={typeDot}
          typeText={typeText}
          typeBg={typeBg}
          typeBadge={typeBadge}
          onPersonClick={openDetailModal}
        />
      )}

      {/* ─── Day detail modal ─── */}
      {dayModalOpen && selectedDay !== null && (
        <Dialog open={dayModalOpen} onOpenChange={setDayModalOpen}>
          <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-white">
                Cumpleaños del {selectedDay} de {MONTH_NAMES[month]}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {getBirthdayForDay(selectedDay).length === 0 ? (
                <p className="text-gray-400 text-sm">No hay cumpleaños registrados en esta fecha</p>
              ) : (
                getBirthdayForDay(selectedDay).map((p) => (
                  <button
                    key={`${p.type}-${p.id}`}
                    onClick={() => openDetailModal(p)}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg ${typeBg(p.type)} transition-colors cursor-pointer`}
                  >
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center border border-gray-600">
                      <span className={`text-sm font-bold ${typeText(p.type)}`}>
                        {p.name.charAt(0)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${typeText(p.type)}`}>{p.name}</span>
                        {typeBadge(p.type)}
                      </div>
                      <span className="text-gray-500 text-[11px]">
                        {formatBirthDate(p.birthDate ?? "")}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </button>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── Person detail modal ─── */}
      {detailModalOpen && detailPerson && (
        <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-white">
                Detalles del {detailPerson.type === "student" ? "Deportista" : "Profesor"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Avatar / Name */}
              <div className="flex items-center gap-4 pb-3 border-b border-gray-700">
                <div className="flex-shrink-0 w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center border-2 border-gray-600">
                  <span className={`text-lg font-bold ${typeText(detailPerson.type)}`}>
                    {detailPerson.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className={`text-base font-semibold ${typeText(detailPerson.type)}`}>
                    {detailPerson.name}
                  </h3>
                  {typeBadge(detailPerson.type)}
                </div>
              </div>

              {/* Fields */}
              <div className="space-y-2">
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-700/50">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300 text-[11px]">Tipo:</span>
                  <span className={typeText(detailPerson.type)}>
                    {detailPerson.type === "student" ? "Deportista" : "Profesor"}
                  </span>
                </div>

                <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-700/50">
                  <IdCard className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300 text-[11px]">Identificación:</span>
                  <span className="text-gray-200 text-xs font-medium">
                    {detailPerson.id || "—"}
                  </span>
                </div>

                <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-700/50">
                  <Cake className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300 text-[11px]">Fecha de nacimiento:</span>
                  <span className="text-gray-200 text-xs font-medium">
                    {detailPerson.birthDate ? formatBirthDate(detailPerson.birthDate) : "—"}
                  </span>
                </div>

                <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-700/50">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300 text-[11px]">Teléfono:</span>
                  <span className="text-gray-200 text-xs font-medium">
                    {detailPerson.phone || "—"}
                  </span>
                </div>

                <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-700/50">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300 text-[11px]">Correo:</span>
                  <span className="text-gray-200 text-xs font-medium">
                    {detailPerson.email || "—"}
                  </span>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Search dropdown */}
      {showSearchDropdown && searchResults.length > 0 && (
        <div className="fixed z-[9999] bg-gray-800 border border-gray-600 rounded-xl shadow-2xl max-h-72 overflow-y-auto" style={{ top: `${searchRect.top}px`, left: `${searchRect.left}px`, width: `${searchRect.width}px` }}>
          {searchResults.map((p) => (
            <button
              key={`sr-${p.type}-${p.id}`}
              onClick={() => selectSearchResult(p)}
              className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-none hover:bg-gray-700/80 transition-colors cursor-pointer border-b border-gray-700/50 ${typeBg(p.type)}`}
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                <span className={`text-xs font-bold ${typeText(p.type)}`}>{p.name.charAt(0)}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${typeText(p.type)}`}>{p.name}</span>
                  {typeBadge(p.type)}
                </div>
                <span className="text-gray-500 text-[10px]">
                  {p.birthDate ? formatBirthDate(p.birthDate) : ""}
                  {p.birthDate && p.phone ? " \u00B7 " : ""}
                  {p.phone ? p.phone : ""}
                </span>
              </div>
              <ChevronRight className="w-3 h-3 text-gray-500" />
            </button>
          ))}
        </div>
      )}
      {showSearchDropdown && searchResults.length === 0 && search.trim().length >= 2 && (
        <div className="fixed z-[9999] bg-gray-800 border border-gray-600 rounded-xl shadow-2xl" style={{ top: `${searchRect.top}px`, left: `${searchRect.left}px`, width: `${searchRect.width}px` }}>
          <div className="px-3 py-3 text-gray-500 text-xs text-center">
            Sin resultados para &quot;{search}&quot;
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Month View ─── */
function MonthView({
  year,
  month,
  grid,
  getBirthdays,
  typeDot,
  typeText,
  typeBg,
  typeHover,
  today,
  onDayClick,
  onPersonClick,
}: {
  year: number
  month: number
  grid: (number | null)[]
  getBirthdays: (day: number) => BirthdayPerson[]
  typeDot: (t: "student" | "teacher") => React.ReactNode
  typeText: (t: "student" | "teacher") => string
  typeBg: (t: "student" | "teacher") => string
  typeHover: (t: "student" | "teacher") => string
  today: Date
  onDayClick: (day: number) => void
  onPersonClick: (person: BirthdayPerson) => void
}) {
  const todayDate = today.getDate()
  const todayMonth = today.getMonth()
  const todayYear = today.getFullYear()
  const isCurrentMonth = month === todayMonth && year === todayYear

  return (
    <Card className="rounded-2xl bg-gray-800/90 shadow-xl border border-gray-600 backdrop-blur-sm overflow-hidden">
      <div className="p-0">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-700">
          {DAY_NAMES.map((d, i) => (
            <div key={i} className="text-center py-2 text-[11px] text-gray-500 font-medium">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 w-full">
          {grid.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="min-h-[90px] bg-gray-900/30" />
            }

            const birthdays = getBirthdays(day)
            const isToday = isCurrentMonth && day === todayDate
            const isWeekend = idx % 7 === 5 || idx % 7 === 6

            return (
              <div
                key={day}
                className={`min-h-[90px] p-1 border border-gray-700/30 ${isWeekend ? "bg-gray-900/20" : "bg-gray-900/10"} ${isToday ? "ring-2 ring-blue-500/50" : ""}`}
              >
                <button
                  onClick={() => onDayClick(day)}
                  className={`w-full text-left font-medium text-[11px] ${isToday ? "text-blue-300" : "text-gray-400"} ${birthdays.length > 0 ? "underline decoration-dotted underline-offset-2" : ""} cursor-pointer hover:text-white transition-colors`}
                >
                  {day}
                </button>
                <div className="space-y-[1px] mt-[1px]">
                  {birthdays.length > 0 && (
                    <>
                      {birthdays.slice(0, 2).map((p) => (
                        <button
                          key={`${p.type}-${p.id}`}
                          onClick={(e) => { e.stopPropagation(); onPersonClick(p) }}
                          className={`w-full text-left flex items-center gap-[2px] px-[2px] rounded ${typeBg(p.type)} ${typeHover(p.type)} transition-colors cursor-pointer`}
                        >
                          {typeDot(p.type)}
                          <span className={`text-[10px] leading-tight ${typeText(p.type)}`}>{p.name}</span>
                        </button>
                      ))}
                      {birthdays.length > 2 && (
                        <button
                          onClick={() => onDayClick(day)}
                          className="w-full text-left text-[9px] text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
                        >
                          +{birthdays.length - 2} m&aacute;s
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

/* ─── Week View ─── */
function WeekView({
  weekDays,
  people,
  getBirthdays,
  typeDot,
  typeText,
  typeBg,
  typeBadge,
  onPersonClick,
}: {
  weekDays: Date[]
  people: BirthdayPerson[]
  getBirthdays: (day: number) => BirthdayPerson[]
  typeDot: (t: "student" | "teacher") => React.ReactNode
  typeText: (t: "student" | "teacher") => string
  typeBg: (t: "student" | "teacher") => string
  typeBadge: (t: "student" | "teacher") => React.ReactNode
  onPersonClick: (person: BirthdayPerson) => void
}) {
  const today = new Date()
  const todayDate = today.getDate()
  const todayMonth = today.getMonth()
  const todayYear = today.getFullYear()

  return (
    <div className="space-y-3">
      {weekDays.map((d) => {
        const dayNum = d.getDate()
        const bdays = getBirthdays(dayNum)
        const isToday =
          dayNum === todayDate && d.getMonth() === todayMonth && d.getFullYear() === todayYear

        return (
          <Card
            key={d.toISOString()}
            className={`rounded-xl bg-gray-800/80 shadow-lg border ${isToday ? "border-blue-500/40" : "border-gray-600"} backdrop-blur-sm`}
          >
            <div className="p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-semibold ${isToday ? "text-blue-300" : "text-gray-200"}`}
                  >
                    {format(d, "EEEE d", { locale: es })}
                  </span>
                  {isToday && (
                    <Badge className="bg-blue-500/30 text-blue-300 border-blue-500 text-[10px]">Hoy</Badge>
                  )}
                </div>
                <span className="text-gray-500 text-xs">
                  {bdays.length} cumpleaños
                </span>
              </div>
              {bdays.length === 0 ? (
                <p className="text-gray-500 text-xs">Sin cumpleaños</p>
              ) : (
                <div className="space-y-1">
                  {bdays.map((p) => (
                    <button
                      key={`${p.type}-${p.id}`}
                      onClick={() => onPersonClick(p)}
                      className={`w-full text-left flex items-center justify-between gap-2 px-2 py-1 rounded ${typeBg(p.type)} transition-colors cursor-pointer`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {typeDot(p.type)}
                        <span className={`text-xs font-medium ${typeText(p.type)}`}>
                          {p.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {typeBadge(p.type)}
                        {p.phone && (
                          <span className="text-gray-500 text-[10px]">{p.phone}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

/* ─── Day View ─── */
function DayView({
  date,
  people,
  getBirthdays,
  typeDot,
  typeText,
  typeBg,
  typeBadge,
  onPersonClick,
}: {
  date: Date
  people: BirthdayPerson[]
  getBirthdays: (day: number) => BirthdayPerson[]
  typeDot: (t: "student" | "teacher") => React.ReactNode
  typeText: (t: "student" | "teacher") => string
  typeBg: (t: "student" | "teacher") => string
  typeBadge: (t: "student" | "teacher") => React.ReactNode
  onPersonClick: (person: BirthdayPerson) => void
}) {
  const dayNum = date.getDate()
  const bdays = getBirthdays(dayNum)
  const today = new Date()
  const isToday =
    dayNum === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()

  return (
    <Card className="rounded-2xl bg-gray-800/90 shadow-xl border border-gray-600 backdrop-blur-sm">
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-lg font-bold ${isToday ? "text-blue-300" : "text-white"}`}>
            {format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          </h2>
          {isToday && (
            <Badge className="bg-blue-500/30 text-blue-300 border-blue-500">Hoy</Badge>
          )}
        </div>

        <div className="text-gray-400 text-sm mb-4">
          {bdays.length === 0
            ? "No hay cumpleaños registrados en esta fecha"
            : bdays.length === 1
              ? "1 persona cumple años"
              : `${bdays.length} personas cumplen años`}
        </div>

        {bdays.length > 0 && (
          <div className="space-y-2">
            {[...bdays].sort((a, b) => a.type.localeCompare(b.type)).map((p) => (
              <button
                key={`${p.type}-${p.id}`}
                onClick={() => onPersonClick(p)}
                className={`w-full text-left flex items-center justify-between gap-3 px-3 py-2 rounded-lg ${typeBg(p.type)} transition-colors cursor-pointer`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center border border-gray-600">
                    <span className={`text-sm font-bold ${typeText(p.type)}`}>
                      {p.name.charAt(0)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${typeText(p.type)}`}>
                        {p.name}
                      </span>
                      {typeBadge(p.type)}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-[2px]">
                      {p.phone && (
                        <span>{p.phone}</span>
                      )}
                      {p.phone && p.email && (
                        <span className="text-gray-500">|</span>
                      )}
                      {p.email && (
                        <span>{p.email}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-gray-300 text-xs font-medium">
                    {(() => {
                      const bd = parseBirthDay(p.birthDate ?? "")
                      if (bd === null) return ""
                      return `${bd} de ${MONTH_NAMES[date.getMonth()]}`
                    })()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}