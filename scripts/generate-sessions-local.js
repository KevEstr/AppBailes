#!/usr/bin/env node

/**
 * Script para generar sesiones localmente
 * Ejecuta la misma lógica que el endpoint /api/cron/sessions
 * 
 * Uso: npm run generate:sessions
 * o: node scripts/generate-sessions-local.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
async function generateSessionsForClass(danceClass, weeksToGenerate) {
  let totalSessions = 0;
  
  for (const schedule of danceClass.schedules) {
    if (!schedule.isActive) {
      continue;
    }
    
    // Obtener fechas de sesiones
    const sessionDates = getSessionDates(schedule.dayOfWeek, new Date(), weeksToGenerate);
    
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
          continue;
        }
        
        // Crear la sesión
        await prisma.classSession.create({
          data: {
            classId: danceClass.id,
            date: sessionDate,
            startTime: startDateTime,
            endTime: endDateTime,
            status: initialStatus
          }
        });
        
        totalSessions++;
      } catch (error) {
        console.error(`❌ Error creando sesión:`, error.message);
      }
    }
  }
  
  return totalSessions;
}

// Función principal
async function generateSessions() {
  try {
    console.log('🚀 Iniciando generación automática de sesiones...');
    const startTime = new Date();

    // Obtener todas las clases activas con sus horarios
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

    let totalSessionsGenerated = 0;
    const results = [];

    for (const danceClass of activeClasses) {
      if (danceClass.schedules.length === 0) {
        console.log(`⚠️ Clase ${danceClass.name} no tiene horarios activos, saltando...`);
        continue;
      }

      try {
        // Verificar cuántas sesiones futuras tiene esta clase
        const futureSessions = await prisma.classSession.count({
          where: {
            classId: danceClass.id,
            date: {
              gte: new Date()
            }
          }
        });

        // Si tiene menos de 4 semanas de sesiones, generar más
        const weeksNeeded = Math.max(0, 4 - Math.ceil(futureSessions / danceClass.schedules.length));
        
        if (weeksNeeded > 0) {
          console.log(`🔄 Generando ${weeksNeeded} semanas adicionales para clase: ${danceClass.name}`);
          
          const sessionsGenerated = await generateSessionsForClass(danceClass, weeksNeeded);

          totalSessionsGenerated += sessionsGenerated;
          results.push({
            classId: danceClass.id,
            className: danceClass.name,
            sessionsGenerated: sessionsGenerated,
            weeksGenerated: weeksNeeded
          });

          console.log(`✅ Clase ${danceClass.name}: ${sessionsGenerated} sesiones generadas`);
        } else {
          console.log(`✅ Clase ${danceClass.name}: ya tiene suficientes sesiones futuras`);
        }
      } catch (error) {
        console.error(`❌ Error generando sesiones para clase ${danceClass.name}:`, error);
        results.push({
          classId: danceClass.id,
          className: danceClass.name,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    console.log(`\n✅ Generación completada: ${totalSessionsGenerated} sesiones generadas en ${duration}ms`);
    console.log(`📊 Clases procesadas: ${activeClasses.length}`);
    console.log('\n📋 Resumen por clase:');
    results.forEach(result => {
      if ('sessionsGenerated' in result) {
        console.log(`  - ${result.className}: ${result.sessionsGenerated} sesiones (${result.weeksGenerated} semanas)`);
      } else {
        console.log(`  - ${result.className}: ❌ Error - ${result.error}`);
      }
    });

  } catch (error) {
    console.error('💥 Error en generación de sesiones:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
generateSessions()
  .then(() => {
    console.log('\n✨ Proceso finalizado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });



