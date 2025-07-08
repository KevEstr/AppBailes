import { PrismaClient, UserRole } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import * as csv from 'csv-parse/sync'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ===== MAPEO DE INSTRUCTORES =====
const INSTRUCTOR_MAPPING: Record<string, string> = {
  'Angelica': 'Angelica',
  'Antonia': 'Antonia', 
  'Andres Vera': 'Andres Vera',
  'Andres Arroyave': 'Andres Arroyave',
  'Andres': 'Andres',
  'David': 'David',
  'Camila': 'Camila',
  'Yennifer': 'Yennifer',
  'Santiago': 'Santiago',
  'Jose': 'Jose'
}

// ===== MAPEO DE UBICACIONES/CANCHAS =====
const LOCATION_MAPPING: Record<string, string> = {
  'Placa Cubierta de Puerto Bello': 'Placa Cubierta de Puerto Bello',
  'Placa Polideportiva del Carmen': 'Placa Polideportiva del Carmen', 
  'Placa Deportiva del Mesa': 'Placa Deportiva del Mesa',
  'Placa Cubierta de Villas de Comfenalco': 'Placa Cubierta de Villas de Comfenalco'
}

// ===== MAPEO DE TIPOS DE DOCUMENTO =====
const DOCUMENT_TYPE_MAPPING: Record<string, string> = {
  'Tarjeta de identidad': 'TI',
  'Tarjeta de Identidad': 'TI',
  'Cédula de ciudadanía': 'CC',
  'Cédula de Ciudadanía': 'CC',
  'Registro civil': 'RC',
  'Registro Civil': 'RC',
  'Permiso especial de permanencia': 'PEP',
  'Cédula de extranjería': 'CE',
  'Cédula de Extranjería': 'CE'
}

// ===== MAPEO DE PARENTESCOS =====
const RELATIONSHIP_MAPPING: Record<string, string> = {
  'Padre': 'padre',
  'Madre': 'madre',
  'Abuelo(a)': 'abuelo',
  'Tío(a)': 'tio',
  'Hermano(a)': 'hermano',
  'Prima': 'otro',
  'Ambos': 'padre', // Para casos donde dice "Ambos", usaremos padre por defecto
  'Otro': 'otro'
}

// ===== MAPEO DE CLASES/HORARIOS =====
const CLASS_SCHEDULE_MAPPING: Record<string, { location: string; instructor: string; schedule: string }> = {
  // Placa Cubierta de Puerto Bello
  'Lunes, martes, jueves 3:30 Pm a 5:00 Pm (Camila)': {
    location: 'Placa Cubierta de Puerto Bello',
    instructor: 'Camila',
    schedule: 'Lunes, martes, jueves 3:30 PM a 5:00 PM'
  },
  'Lunes 3:30 Pm a 5:00 Pm, martes, jueves 5:00 Pm a 6:30 Pm (Camila)': {
    location: 'Placa Cubierta de Puerto Bello', 
    instructor: 'Camila',
    schedule: 'Lunes 3:30 PM a 5:00 PM, martes, jueves 5:00 PM a 6:30 PM'
  },
  'Lunes 3:30 Pm a 5:00 Pm, martes, jueves 5:00 Pm a 6:30 Pm (Yennifer)': {
    location: 'Placa Cubierta de Puerto Bello',
    instructor: 'Yennifer', 
    schedule: 'Lunes 3:30 PM a 5:00 PM, martes, jueves 5:00 PM a 6:30 PM'
  },

  // Placa Polideportiva del Carmen  
  'Martes, jueves 2:30 Pm a 4:00 Pm y sábado 8:00 Am a 9:30 Am (David)': {
    location: 'Placa Polideportiva del Carmen',
    instructor: 'David',
    schedule: 'Martes, jueves 2:30 PM a 4:00 PM y sábado 8:00 AM a 9:30 AM'
  },
  'Martes, jueves 2:30 Pm a 4:00 Pm y sábado 8:00 Am a 9:30 Am (Andres Vera)': {
    location: 'Placa Polideportiva del Carmen',
    instructor: 'Andres Vera',
    schedule: 'Martes, jueves 2:30 PM a 4:00 PM y sábado 8:00 AM a 9:30 AM'
  },
  'Martes, jueves 4:00 Pm a 5:30 Pm y sábado 9:30 Am a 11:00 Am (David)': {
    location: 'Placa Polideportiva del Carmen',
    instructor: 'David', 
    schedule: 'Martes, jueves 4:00 PM a 5:30 PM y sábado 9:30 AM a 11:00 AM'
  },
  'Lunes, miércoles y viernes 2:30 Pm a 4:00 Pm (Angelica)': {
    location: 'Placa Polideportiva del Carmen',
    instructor: 'Angelica',
    schedule: 'Lunes, miércoles y viernes 2:30 PM a 4:00 PM'
  },
  'Lunes, miércoles y viernes 2:30 Pm a 4:00 Pm (Jose)': {
    location: 'Placa Polideportiva del Carmen', 
    instructor: 'Jose',
    schedule: 'Lunes, miércoles y viernes 2:30 PM a 4:00 PM'
  },
  'Lunes, miércoles y viernes 3:00 Pm a 4:30 Pm (Andres Vera)': {
    location: 'Placa Polideportiva del Carmen',
    instructor: 'Andres Vera',
    schedule: 'Lunes, miércoles y viernes 3:00 PM a 4:30 PM'
  },
  'Lunes, miércoles y viernes 3:00 Pm a 4:30 Pm (Andres Arroyave)': {
    location: 'Placa Polideportiva del Carmen',
    instructor: 'Andres Arroyave', 
    schedule: 'Lunes, miércoles y viernes 3:00 PM a 4:30 PM'
  },
  'Lunes, miércoles y viernes 4:00 Pm a 5:30 Pm (Angelica)': {
    location: 'Placa Polideportiva del Carmen',
    instructor: 'Angelica',
    schedule: 'Lunes, miércoles y viernes 4:00 PM a 5:30 PM'
  },
  'Lunes, miércoles y viernes 4:00 Pm a 5:30 Pm (Jose)': {
    location: 'Placa Polideportiva del Carmen',
    instructor: 'Jose',
    schedule: 'Lunes, miércoles y viernes 4:00 PM a 5:30 PM'
  },
  'Lunes, miércoles y viernes 4:00 Pm a 5:30 Pm (Antonia)': {
    location: 'Placa Polideportiva del Carmen',
    instructor: 'Antonia',
    schedule: 'Lunes, miércoles y viernes 4:00 PM a 5:30 PM'
  },
  'Lunes, martes y jueves 7:00 Pm a 8:30 Pm (Camila)': {
    location: 'Placa Polideportiva del Carmen',
    instructor: 'Camila',
    schedule: 'Lunes, martes y jueves 7:00 PM a 8:30 PM'
  },
  'MASCULINO - Lunes, martes y jueves 8:30 Pm a 10:00 Pm (Santiago)': {
    location: 'Placa Polideportiva del Carmen',
    instructor: 'Santiago',
    schedule: 'MASCULINO - Lunes, martes y jueves 8:30 PM a 10:00 PM'
  },

  // Placa Deportiva del Mesa
  'Lunes, martes y jueves 7:00 Pm a 8:30 Pm (Santiago)': {
    location: 'Placa Deportiva del Mesa', 
    instructor: 'Santiago',
    schedule: 'Lunes, martes y jueves 7:00 PM a 8:30 PM'
  },
  'Lunes, martes y jueves 7:00 Pm a 8:30 Pm (David)': {
    location: 'Placa Deportiva del Mesa',
    instructor: 'David',
    schedule: 'Lunes, martes y jueves 7:00 PM a 8:30 PM'
  },
  'Lunes, martes y jueves 7:00 Pm a 8:30 Pm (Andres Vera)': {
    location: 'Placa Deportiva del Mesa',
    instructor: 'Andres Vera',
    schedule: 'Lunes, martes y jueves 7:00 PM a 8:30 PM'
  },

  // Placa Cubierta de Villas de Comfenalco
  'Martes, jueves 4:00 Pm a 5:30 Pm y sábado 8:00 Am a 9:30 Am (Andres)': {
    location: 'Placa Cubierta de Villas de Comfenalco',
    instructor: 'Andres',
    schedule: 'Martes, jueves 4:00 PM a 5:30 PM y sábado 8:00 AM a 9:30 AM'
  },
  'Martes, jueves 4:00 Pm a 5:30 Pm y sábado 8:00 Am a 9:30 Am (Angelica)': {
    location: 'Placa Cubierta de Villas de Comfenalco',
    instructor: 'Angelica',
    schedule: 'Martes, jueves 4:00 PM a 5:30 PM y sábado 8:00 AM a 9:30 AM'
  },
  'Martes, jueves 5:30 Pm a 7:00 Pm y sábado 9:30 Am a 11:00 Am (Andres)': {
    location: 'Placa Cubierta de Villas de Comfenalco',
    instructor: 'Andres',
    schedule: 'Martes, jueves 5:30 PM a 7:00 PM y sábado 9:30 AM a 11:00 AM'
  },
  'Martes, jueves 5:30 Pm a 7:00 Pm y sábado 9:30 Am a 11:00 Am (Angelica)': {
    location: 'Placa Cubierta de Villas de Comfenalco',
    instructor: 'Angelica',
    schedule: 'Martes, jueves 5:30 PM a 7:00 PM y sábado 9:30 AM a 11:00 AM'
  }
}

// ===== FUNCIONES DE UTILIDAD =====

function parseCSV(filePath: string) {
  const fileContent = fs.readFileSync(filePath, 'utf-8')
  const records = csv.parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    delimiter: ',',
    quote: '"'
  })
  return records
}

function cleanPhone(phone: string): string {
  if (!phone) return ''
  // Remover espacios, guiones, paréntesis y caracteres especiales
  let cleaned = phone.replace(/[\s\-\(\)\+]/g, '')
  // Remover prefijos comunes
  cleaned = cleaned.replace(/^57/, '').replace(/^3/, '3')
  return cleaned
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    // Intentar diferentes formatos de fecha
    const formats = ['dd/mm/yyyy', 'dd/m/yyyy', 'd/mm/yyyy', 'd/m/yyyy']
    const parts = dateStr.split('/')
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0')
      const month = parts[1].padStart(2, '0') 
      const year = parts[2]
      return `${year}-${month}-${day}`
    }
    return dateStr
  } catch (error) {
    console.warn(`Error parsing date: ${dateStr}`)
    return dateStr
  }
}

function mapDocumentType(docType: string): string {
  return DOCUMENT_TYPE_MAPPING[docType] || 'TI'
}

function mapRelationship(relation: string): string {
  return RELATIONSHIP_MAPPING[relation] || 'otro'
}

async function getOrCreateTrainer(instructorName: string) {
  const mappedName = INSTRUCTOR_MAPPING[instructorName]
  if (!mappedName) {
    throw new Error(`Instructor no encontrado en mapeo: ${instructorName}`)
  }

  let trainer = await prisma.trainer.findFirst({
    where: { name: mappedName }
  })

  if (!trainer) {
    console.log(`📝 Creando instructor: ${mappedName}`)
    trainer = await prisma.trainer.create({
      data: {
        name: mappedName,
        email: `${mappedName.toLowerCase().replace(/\s+/g, '.')}@paradisevolleyball.com`,
        phone: '3001234569', // Teléfono genérico
        isActive: true
      }
    })
  }

  return trainer
}

async function getOrCreateLocation(locationName: string) {
  const mappedName = LOCATION_MAPPING[locationName]
  if (!mappedName) {
    throw new Error(`Ubicación no encontrada en mapeo: ${locationName}`)
  }

  let location = await prisma.sportLocation.findFirst({
    where: { name: mappedName }
  })

  if (!location) {
    console.log(`🏟️ Creando ubicación: ${mappedName}`)
    location = await prisma.sportLocation.create({
      data: {
        name: mappedName,
        address: mappedName, // Usar el nombre como dirección por defecto
        isActive: true
      }
    })
  }

  return location
}

async function getOrCreateClass(scheduleText: string) {
  const classInfo = CLASS_SCHEDULE_MAPPING[scheduleText]
  if (!classInfo) {
    throw new Error(`Horario no encontrado en mapeo: ${scheduleText}`)
  }

  // Obtener instructor y ubicación
  const trainer = await getOrCreateTrainer(classInfo.instructor)
  const location = await getOrCreateLocation(classInfo.location)

  // Buscar clase existente
  let danceClass = await prisma.danceClass.findFirst({
    where: {
      name: classInfo.schedule,
      trainerId: trainer.id,
      locationId: location.id,
      sport: 'VOLLEYBALL'
    }
  })

  if (!danceClass) {
    console.log(`🏐 Creando clase: ${classInfo.schedule} - ${classInfo.instructor}`)
    danceClass = await prisma.danceClass.create({
      data: {
        name: classInfo.schedule,
        description: `Entrenamiento de voleibol con ${classInfo.instructor}`,
        trainerId: trainer.id,
        locationId: location.id,
        sport: 'VOLLEYBALL',
        level: 'BEGINNER', // Nivel por defecto
        capacity: 20,
        price: 45.00,
        isActive: true
      }
    })
  }

  return danceClass
}

async function createUser(studentData: any) {
  const email = `${studentData.document}@paradise.com`
  const hashedPassword = await bcrypt.hash(studentData.document.toString(), 12)

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: studentData.name,
      role: 'STUDENT' as UserRole,
      isActive: true
    }
  })

  return user
}

async function createStudent(studentData: any) {
  const student = await prisma.student.create({
    data: {
      id: Number(studentData.document),
      name: studentData.name,
      email: `${studentData.document}@paradise.com`,
      phone: studentData.phone,
      isActive: true
    }
  })

  return student
}

async function createEnrollmentData(student: any, csvRow: any) {
  const enrollmentData = await prisma.studentEnrollmentData.create({
    data: {
      studentId: student.id,
      documentType: csvRow.documentType,
      birthDate: csvRow.birthDate,
      address: csvRow.address,
      neighborhood: csvRow.neighborhood,
      city: 'Bello', // Ciudad por defecto para voleibol
      hasSisben: csvRow.hasSisben === 'Si',
      eps: csvRow.eps,
      bloodType: csvRow.bloodType,
      hasRestrictions: csvRow.hasRestrictions === 'Sí' || csvRow.hasRestrictions === 'Si',
      restrictionsDescription: csvRow.restrictionsDescription,
      medicalConditions: csvRow.medicalConditions,
      isAdult: csvRow.isAdult,
      emergencyContactName: csvRow.guardianName,
      emergencyContactRelation: csvRow.guardianRelation,
      emergencyContactPhone: csvRow.guardianPhone,
      guardianName: csvRow.guardianName,
      guardianRelation: csvRow.guardianRelation,
      guardianPhone: csvRow.guardianPhone,
      monthlyFee: 45.00 // Tarifa mensual para voleibol
    }
  })

  return enrollmentData
}

async function enrollStudentInClass(student: any, danceClass: any) {
  const enrollment = await prisma.classEnrollment.create({
    data: {
      studentId: student.id,
      classId: danceClass.id,
      isActive: true
    }
  })

  return enrollment
}

// ===== FUNCIÓN PRINCIPAL =====

async function importVolleyballStudents() {
  try {
    console.log('🏐 Iniciando importación de estudiantes de voleibol...')

    const csvFilePath = path.join(process.cwd(), '2024 Formato de afiliación Club Paradise Volleyball (Respuestas) - Hoja 3.csv')
    
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`Archivo CSV no encontrado: ${csvFilePath}`)
    }

    const records = parseCSV(csvFilePath)
    console.log(`📄 Se encontraron ${records.length} registros en el CSV`)

    let processedCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (const [index, row] of records.entries()) {
      try {
        console.log(`\n📝 Procesando registro ${index + 1}/${records.length}`)

        // Extraer datos del CSV (basado en las columnas del voleibol)
        const studentName = row['Nombres y apellidos del deportista ']?.trim()
        const documentType = row['Tipo de documento']?.trim()
        const documentNumber = row['Numero del documento de identidad']?.trim()
        const birthDate = row['Fecha de nacimiento']?.trim()
        const phone = row['📲 Celular del deportista']?.trim()
        const address = row['Dirección de residencia ']?.trim()
        const neighborhood = row['Barrio de residencia ']?.trim()
        const sisben = row['SISBEN']?.trim()
        const eps = row['EPS']?.trim()
        const bloodType = row['Grupo sanguíneo']?.trim()
        const hasRestrictions = row['Presenta alguna restricción para practicar actividad física ']?.trim()
        const medicalConditions = row['Padece enfermedades o lesiones ¿cuáles?']?.trim()
        const guardianName = row['Nombres y apellidos del acudiente ']?.trim()
        const guardianRelation = row['Parentesco']?.trim()
        const guardianPhone = row['📲 Celular del acudiente']?.trim()
        const trainingGroup = row['Grupo de entrenamiento al que perteneces. ']?.trim()
        const trainingLocation = row['Cancha en la que entrenas.']?.trim()

        // Validaciones básicas
        if (!studentName || !documentNumber) {
          console.log(`⚠️ Saltando registro ${index + 1}: Nombre o documento faltante`)
          continue
        }

        if (!trainingGroup) {
          console.log(`⚠️ Saltando registro ${index + 1}: Grupo de entrenamiento faltante`)
          continue
        }

        // Preparar datos del estudiante
        const studentData = {
          name: studentName,
          document: documentNumber,
          phone: cleanPhone(phone) || '3000000000'
        }

        // Calcular si es adulto (más de 18 años)
        const isAdult = calculateAge(formatDate(birthDate)) >= 18

        // Preparar datos de inscripción
        const csvData = {
          documentType: mapDocumentType(documentType),
          birthDate: formatDate(birthDate),
          address: address || '',
          neighborhood: neighborhood || '',
          hasSisben: sisben === 'Si',
          eps: eps || '',
          bloodType: bloodType || '',
          hasRestrictions: hasRestrictions === 'Sí' || hasRestrictions === 'Si',
          restrictionsDescription: hasRestrictions === 'Sí' || hasRestrictions === 'Si' ? medicalConditions : '',
          medicalConditions: medicalConditions || '',
          isAdult,
          guardianName: !isAdult ? guardianName : '',
          guardianRelation: !isAdult ? mapRelationship(guardianRelation) : '',
          guardianPhone: !isAdult ? cleanPhone(guardianPhone) : ''
        }

        console.log(`👤 Procesando: ${studentName} (${documentNumber})`)

        // Verificar si el estudiante ya existe
        const existingStudent = await prisma.student.findUnique({
          where: { id: Number(documentNumber) }
        })

        if (existingStudent) {
          console.log(`✅ Estudiante ya existe: ${studentName}`)
          processedCount++
          continue
        }

        // Crear usuario
        console.log(`📝 Creando usuario...`)
        const user = await createUser(studentData)

        // Crear estudiante
        console.log(`🎓 Creando estudiante...`)
        const student = await createStudent(studentData)

        // Crear datos de inscripción
        console.log(`📋 Creando datos de inscripción...`)
        await createEnrollmentData(student, csvData)

        // Buscar y crear clase
        console.log(`🏐 Buscando clase: ${trainingGroup}`)
        const danceClass = await getOrCreateClass(trainingGroup)

        // Inscribir en la clase
        console.log(`✅ Inscribiendo en clase...`)
        await enrollStudentInClass(student, danceClass)

        console.log(`✅ Estudiante procesado exitosamente: ${studentName}`)
        processedCount++

      } catch (error) {
        errorCount++
        const errorMsg = `Error en registro ${index + 1} (${row['Nombres y apellidos del deportista '] || 'Sin nombre'}): ${error instanceof Error ? error.message : 'Error desconocido'}`
        errors.push(errorMsg)
        console.error(`❌ ${errorMsg}`)
      }
    }

    console.log('\n🎯 RESUMEN DE LA IMPORTACIÓN:')
    console.log(`📊 Total de registros: ${records.length}`)
    console.log(`✅ Procesados exitosamente: ${processedCount}`)
    console.log(`❌ Errores: ${errorCount}`)

    if (errors.length > 0) {
      console.log('\n❌ ERRORES DETALLADOS:')
      errors.forEach(error => console.log(`   - ${error}`))
    }

    console.log('\n🎉 Importación de voleibol completada!')

  } catch (error) {
    console.error('💥 Error fatal durante la importación:', error)
  } finally {
    await prisma.$disconnect()
  }
}

function calculateAge(birthDate: string): number {
  if (!birthDate) return 18 // Asumir adulto si no hay fecha
  
  try {
    const birth = new Date(birthDate)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  } catch {
    return 18 // Asumir adulto en caso de error
  }
}

// Ejecutar la importación
if (require.main === module) {
  importVolleyballStudents()
    .then(() => {
      console.log('🎯 Script completado')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error)
      process.exit(1)
    })
}

export { importVolleyballStudents } 