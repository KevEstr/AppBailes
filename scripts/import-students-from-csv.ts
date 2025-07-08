import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

// Mapeo de instructores del CSV a IDs de la base de datos
const INSTRUCTOR_MAPPING = {
  'Karen Ospina (Baile Urbano)': 'Karen Ospina',
  'Luisa Machado Duque (Baile Urbano)': 'Luisa Machado Duque'
}

// Mapeo de horarios del CSV a nombres de clases
const CLASS_SCHEDULE_MAPPING = {
  'Miércoles y viernes 5:00 Pm a 6:30 Pm - Karen (Baile Urbano)': {
    instructor: 'Karen Ospina',
    name: 'Miércoles y viernes 5:00 PM a 6:30 PM',
    days: [3, 5], // Miércoles y viernes
    startTime: '17:00',
    endTime: '18:30'
  },
  'Miércoles y viernes 6:30 Pm a 8:00 Pm - Karen (Baile Urbano)': {
    instructor: 'Karen Ospina',
    name: 'Miércoles y viernes 6:30 PM a 8:00 PM',
    days: [3, 5],
    startTime: '18:30',
    endTime: '20:00'
  },
  'Martes y jueves 6:30 Pm a 8:00 Pm - Karen (Baile Urbano)': {
    instructor: 'Karen Ospina',
    name: 'Martes y jueves 6:30 PM a 8:00 PM',
    days: [2, 4],
    startTime: '18:30',
    endTime: '20:00'
  },
  'Martes y jueves 5:00 Pm a 6:30 Pm - Karen (Baile Urbano)': {
    instructor: 'Karen Ospina',
    name: 'Martes y jueves 5:00 PM a 6:30 PM',
    days: [2, 4],
    startTime: '17:00',
    endTime: '18:30'
  },
  'Sábados y domingos 10:00 Am a 11:30 Am - Karen (Baile Urbano)': {
    instructor: 'Karen Ospina',
    name: 'Sábados y domingos 10:00 AM a 11:30 AM',
    days: [6, 0], // Sábado y domingo
    startTime: '10:00',
    endTime: '11:30'
  },
  'Miércoles y viernes 6:30 Pm a 8:00 Pm - Luisa (Baile Urbano)': {
    instructor: 'Luisa Machado Duque',
    name: 'Miércoles y viernes 6:30 PM a 8:00 PM',
    days: [3, 5],
    startTime: '18:30',
    endTime: '20:00'
  },
  'Miércoles y viernes 5:00 Pm a 6:30 Pm - Luisa (Baile Urbano)': {
    instructor: 'Luisa Machado Duque',
    name: 'Miércoles y viernes 5:00 PM a 6:30 PM',
    days: [3, 5],
    startTime: '17:00',
    endTime: '18:30'
  },
  'Miércoles y viernes 3:30 Pm a 5:00 Pm - Luisa (Baile Urbano)': {
    instructor: 'Luisa Machado Duque',
    name: 'Miércoles y viernes 3:30 PM a 5:00 PM',
    days: [3, 5],
    startTime: '15:30',
    endTime: '17:00'
  }
}

interface StudentData {
  instructor: string
  classSchedule: string
  name: string
  documentType: string
  documentNumber: string
  birthDate: string
  phone: string
  address: string
  neighborhood: string
  hasSisben: boolean
  eps: string
  bloodType: string
  hasRestrictions: boolean
  restrictionsDescription: string
  medicalConditions: string
  isAdult: boolean
  guardianName: string
  guardianRelation: string
  guardianPhone: string
  acceptsRisks: boolean
}

function parseCSV(csvContent: string): StudentData[] {
  const lines = csvContent.split('\n')
  const students: StudentData[] = []
  
  // Saltamos la primera línea (headers)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    const columns = parseCSVLine(line)
    if (columns.length < 20) continue // Verificar que tenemos suficientes columnas
    
    // Encontrar el instructor y horario
    let instructor = ''
    let classSchedule = ''
    
    // Las primeras 6 columnas contienen información de instructor y horarios
    for (let j = 0; j < 6; j++) {
      const value = columns[j]?.trim()
      if (value && value in INSTRUCTOR_MAPPING) {
        instructor = value
      }
      if (value && value in CLASS_SCHEDULE_MAPPING) {
        classSchedule = value
      }
    }
    
    if (!instructor || !classSchedule) {
      console.warn(`Fila ${i}: No se pudo determinar instructor o horario`)
      continue
    }
    
    const student: StudentData = {
      instructor,
      classSchedule,
      name: cleanString(columns[6]) || '',
      documentType: cleanString(columns[7]) || '',
      documentNumber: cleanString(columns[8]) || '',
      birthDate: cleanString(columns[9]) || '',
      phone: cleanPhoneNumber(columns[10]) || '',
      address: cleanString(columns[11]) || '',
      neighborhood: cleanString(columns[12]) || '',
      hasSisben: parseBoolean(columns[13]),
      eps: cleanString(columns[14]) || '',
      bloodType: cleanString(columns[15]) || '',
      hasRestrictions: parseBoolean(columns[16]),
      restrictionsDescription: cleanString(columns[17]) || '',
      medicalConditions: cleanString(columns[17]) || '',
      isAdult: parseIsAdult(columns[18]),
      guardianName: cleanString(columns[19]) || '',
      guardianRelation: cleanString(columns[20]) || '',
      guardianPhone: cleanPhoneNumber(columns[21]) || '',
      acceptsRisks: parseBoolean(columns[22])
    }
    
    if (student.name && student.documentNumber) {
      students.push(student)
    }
  }
  
  return students
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current)
  return result
}

function cleanString(value: string | undefined): string {
  if (!value) return ''
  return value.trim().replace(/^"|"$/g, '') // Remover comillas al inicio y final
}

function cleanPhoneNumber(phone: string | undefined): string {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '') // Solo números
  return cleaned.length >= 10 ? cleaned : ''
}

function parseBoolean(value: string | undefined): boolean {
  if (!value) return false
  const clean = value.toLowerCase().trim()
  return clean === 'si' || clean === 'sí' || clean === 'yes' || clean === 'true'
}

function parseIsAdult(value: string | undefined): boolean {
  if (!value) return false
  const clean = value.toLowerCase().trim()
  return clean.includes('mayor')
}

function generateEmail(name: string, documentNumber: string): string {
  // Generar email único basado en nombre y documento
  const cleanName = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9.]/g, '')
  
  return `${documentNumber}@paradise.com`
}

async function getOrCreateInstructor(instructorName: string) {
  const mappedName = INSTRUCTOR_MAPPING[instructorName as keyof typeof INSTRUCTOR_MAPPING]
  
  const trainer = await prisma.trainer.findFirst({
    where: {
      name: {
        contains: mappedName,
        mode: 'insensitive'
      }
    }
  })
  
  if (!trainer) {
    throw new Error(`Instructor no encontrado: ${mappedName}`)
  }
  
  return trainer
}

async function getOrCreateClass(classSchedule: string) {
  const scheduleInfo = CLASS_SCHEDULE_MAPPING[classSchedule as keyof typeof CLASS_SCHEDULE_MAPPING]
  
  if (!scheduleInfo) {
    throw new Error(`Horario no encontrado: ${classSchedule}`)
  }
  
  // Buscar clase existente
  const trainer = await getOrCreateInstructor(`${scheduleInfo.instructor} (Baile Urbano)`)
  
  let danceClass = await prisma.danceClass.findFirst({
    where: {
      name: scheduleInfo.name,
      trainerId: trainer.id
    },
    include: {
      schedules: true
    }
  })
  
  // Si no existe, crearla
  if (!danceClass) {
    console.log(`Creando nueva clase: ${scheduleInfo.name}`)
    
    danceClass = await prisma.danceClass.create({
      data: {
        name: scheduleInfo.name,
        description: `Clase de baile urbano con ${scheduleInfo.instructor}`,
        trainerId: trainer.id,
        sport: 'DANCE',
        level: 'BEGINNER',
        capacity: 25,
        price: 50.00,
        schedules: {
          create: scheduleInfo.days.map(day => ({
            dayOfWeek: day,
            startTime: scheduleInfo.startTime,
            endTime: scheduleInfo.endTime
          }))
        }
      },
      include: {
        schedules: true
      }
    })
  }
  
  return danceClass
}

async function createUserAndStudent(studentData: StudentData) {
  const documentId = Number(studentData.documentNumber)
  
  if (!studentData.documentNumber || isNaN(documentId)) {
    throw new Error(`Número de documento inválido: ${studentData.documentNumber}`)
  }
  
  // Verificar si ya existe
  const existingStudent = await prisma.student.findUnique({
    where: { id: documentId }
  })
  
  if (existingStudent) {
    console.log(`Estudiante ya existe: ${studentData.name} (${documentId})`)
    return existingStudent
  }
  
  // Generar email y contraseña
  const email = generateEmail(studentData.name, studentData.documentNumber)
  const password = await bcrypt.hash(studentData.documentNumber, 12)
  
  // Crear usuario
  const user = await prisma.user.create({
    data: {
      email,
      password,
      name: studentData.name,
      role: 'STUDENT' as UserRole,  
      isActive: true
    }   
  })
  
  // Crear estudiante
  const student = await prisma.student.create({
    data: {
      id: documentId,
      name: studentData.name,
      email,
      phone: studentData.phone,
      isActive: true,
      enrollmentData: {
        create: {
          documentType: studentData.documentType,
          birthDate: studentData.birthDate,
          address: studentData.address,
          neighborhood: studentData.neighborhood,
          city: studentData.neighborhood,
          hasSisben: studentData.hasSisben,
          eps: studentData.eps,
          bloodType: studentData.bloodType,
          hasRestrictions: studentData.hasRestrictions,
          restrictionsDescription: studentData.restrictionsDescription,
          medicalConditions: studentData.medicalConditions,
          isAdult: studentData.isAdult,
          guardianName: studentData.guardianName,
          guardianRelation: studentData.guardianRelation,
          guardianPhone: studentData.guardianPhone,
          monthlyFee: 50.00
        }
      }
    }
  })
  
  console.log(`✅ Creado: ${student.name} (${student.id}) - Email: ${email}`)
  return student
}

async function enrollStudentInClass(studentId: number, classId: number) {
  try {
    await prisma.classEnrollment.create({
      data: {
        studentId,
        classId,
        isActive: true
      }
    })
    console.log(`📝 Inscrito estudiante ${studentId} en clase ${classId}`)
  } catch (error: any) {
    if (error.code === 'P2002') {
      console.log(`⚠️ Estudiante ${studentId} ya está inscrito en clase ${classId}`)
    } else {
      throw error
    }
  }
}

async function main() {
  console.log('🌱 Iniciando importación de estudiantes desde CSV...')
  
  // Leer archivo CSV
  const csvPath = path.join(process.cwd(), 'Formato de afiliación Paradise Dance Academy (Respuestas) - Hoja 2.csv')
  
  if (!fs.existsSync(csvPath)) {
    throw new Error(`Archivo CSV no encontrado: ${csvPath}`)
  }
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const students = parseCSV(csvContent)
  
  console.log(`📊 Encontrados ${students.length} estudiantes en el CSV`)
  
  let created = 0
  let enrolled = 0
  let errors = 0
  
  for (const studentData of students) {
    try {
      // Crear usuario y estudiante
      const student = await createUserAndStudent(studentData)
      created++
      
      // Obtener o crear clase
      const danceClass = await getOrCreateClass(studentData.classSchedule)
      
      // Inscribir en la clase
      await enrollStudentInClass(Number(student.id), danceClass.id)
      enrolled++
      
    } catch (error: any) {
      console.error(`❌ Error procesando ${studentData.name}: ${error.message}`)
      errors++
    }
  }
  
  console.log('🎉 ¡Importación completada!')
  console.log(`📊 Resumen:`)
  console.log(`   ✅ Estudiantes creados: ${created}`)
  console.log(`   📝 Inscripciones realizadas: ${enrolled}`)
  console.log(`   ❌ Errores: ${errors}`)
  console.log(`   👤 Total usuarios: ${await prisma.user.count()}`)
  console.log(`   🎓 Total estudiantes: ${await prisma.student.count()}`)
  console.log(`   💃 Total clases: ${await prisma.danceClass.count()}`)
}

main()
  .catch((e) => {
    console.error('❌ Error durante la importación:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 