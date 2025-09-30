#!/usr/bin/env node

/**
 * Script SIMPLE para generar sesiones directamente con Prisma
 * Sin autenticación, sin APIs, directo a la base de datos
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Configuración
const WEEKS_TO_GENERATE = 8; // 8 semanas = 2 meses
const START_DATE = new Date();

console.log('🚀 GENERACIÓN SIMPLE DE SESIONES - 2 MESES');
console.log(`📅 Semanas a generar: ${WEEKS_TO_GENERATE}`);
console.log(`📅 Fecha de inicio: ${START_DATE.toLocaleDateString()}`);

// Función para generar fechas de sesiones
function getSessionDates(dayOfWeek, startDate, weeksToGenerate) {
  const sessionDates = [];
  let currentDate = new Date(startDate);
  
  // Ajustar al próximo día que coincida con el horario
  while (currentDate.getDay() !== dayOfWeek) {
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Generar fechas para las semanas especificadas
  for (let week = 0; week < weeksToGenerate; week++) {
    sessionDates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 7); // Siguiente semana
  }
  
  return sessionDates;
}

// Función para generar sesiones para una clase
async function generateSessionsForClass(danceClass) {
  console.log(`\n🔄 Procesando clase: ${danceClass.name}`);
  console.log(`📚 Horarios activos: ${danceClass.schedules.length}`);
  
  let totalSessions = 0;
  
  for (const schedule of danceClass.schedules) {
    if (!schedule.isActive) {
      console.log(`⏭️ Saltando horario inactivo: ${schedule.dayOfWeek}`);
      continue;
    }
    
    console.log(`⏰ Procesando horario: Día ${schedule.dayOfWeek} ${schedule.startTime}-${schedule.endTime}`);
    
    // Obtener fechas de sesiones
    const sessionDates = getSessionDates(schedule.dayOfWeek, START_DATE, WEEKS_TO_GENERATE);
    console.log(`📅 Se generarán ${sessionDates.length} sesiones`);
    
    // Crear sesiones
    for (const sessionDate of sessionDates) {
      const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
      const [endHour, endMinute] = schedule.endTime.split(':').map(Number);
      
      const startDateTime = new Date(sessionDate);
      startDateTime.setHours(startHour, startMinute, 0, 0);
      
      const endDateTime = new Date(sessionDate);
      endDateTime.setHours(endHour, endMinute, 0, 0);
      
      // Ajustar la fecha de fin si la clase cruza medianoche
      if (endHour < startHour) {
        endDateTime.setDate(endDateTime.getDate() + 1);
      }
      
      // Determinar el estado inicial de la sesión
      const now = new Date();
      let initialStatus = 'SCHEDULED';
      
      if (startDateTime <= now && now <= endDateTime) {
        initialStatus = 'IN_PROGRESS';
      } else if (now > endDateTime) {
        initialStatus = 'COMPLETED';
      }
      
      try {
        // Verificar si la sesión ya existe
        const existingSession = await prisma.classSession.findFirst({
          where: {
            classId: danceClass.id,
            date: sessionDate,
            startTime: startDateTime
          }
        });
        
        if (existingSession) {
          console.log(`⚠️ Sesión ya existe para ${sessionDate.toDateString()}`);
          continue;
        }
        
        // Crear la sesión
        const newSession = await prisma.classSession.create({
          data: {
            classId: danceClass.id,
            date: sessionDate,
            startTime: startDateTime,
            endTime: endDateTime,
            status: initialStatus
          }
        });
        
        totalSessions++;
        console.log(`✅ Sesión creada: ${sessionDate.toDateString()} (ID: ${newSession.id})`);
        
      } catch (error) {
        console.error(`❌ Error creando sesión para ${sessionDate.toDateString()}:`, error.message);
      }
    }
  }
  
  console.log(`🎉 Clase ${danceClass.name}: ${totalSessions} sesiones generadas`);
  return totalSessions;
}

// Función principal
async function generateAllSessions() {
  const startTime = new Date();
  console.log(`⏰ Iniciado: ${startTime.toISOString()}`);
  
  try {
    // Obtener todas las clases activas
    console.log('\n📚 Obteniendo clases activas...');
    const activeClasses = await prisma.danceClass.findMany({
      where: {
        isActive: true
      },
      include: {
        schedules: {
          where: { isActive: true }
        }
      }
    });
    
    console.log(`📚 Encontradas ${activeClasses.length} clases activas`);
    
    if (activeClasses.length === 0) {
      console.log('❌ No se encontraron clases activas');
      return;
    }
    
    let totalSessionsGenerated = 0;
    const results = [];
    
    // Procesar cada clase
    for (const danceClass of activeClasses) {
      if (danceClass.schedules.length === 0) {
        console.log(`⚠️ Clase ${danceClass.name} no tiene horarios activos, saltando...`);
        results.push({
          className: danceClass.name,
          sessionsGenerated: 0,
          error: 'No tiene horarios activos'
        });
        continue;
      }
      
      try {
        const sessionsGenerated = await generateSessionsForClass(danceClass);
        totalSessionsGenerated += sessionsGenerated;
        results.push({
          className: danceClass.name,
          sessionsGenerated,
          success: true
        });
      } catch (error) {
        console.error(`❌ Error procesando clase ${danceClass.name}:`, error.message);
        results.push({
          className: danceClass.name,
          sessionsGenerated: 0,
          error: error.message,
          success: false
        });
      }
    }
    
    // Mostrar resumen
    console.log('\n🎉 GENERACIÓN COMPLETADA');
    console.log(`📊 Total sesiones generadas: ${totalSessionsGenerated}`);
    console.log(`📚 Clases procesadas: ${activeClasses.length}`);
    
    console.log('\n📋 Resumen por clase:');
    results.forEach((result, index) => {
      if (result.success) {
        console.log(`✅ ${index + 1}. ${result.className}: ${result.sessionsGenerated} sesiones`);
      } else {
        console.log(`❌ ${index + 1}. ${result.className}: ${result.error}`);
      }
    });
    
  } catch (error) {
    console.error('💥 Error fatal:', error);
  } finally {
    await prisma.$disconnect();
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    console.log(`\n⏱️ Duración total: ${duration}ms`);
    console.log(`🏁 Finalizado: ${endTime.toISOString()}`);
  }
}

// Ejecutar la generación
generateAllSessions()
  .then(() => {
    console.log('\n🎉 Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });
