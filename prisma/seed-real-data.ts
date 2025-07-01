import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed con datos reales...')

  // ===== CREAR UBICACIONES PARA DEPORTES =====
  console.log('📍 Creando ubicaciones deportivas...')
  
  const placaCarmen = await prisma.sportLocation.create({
    data: {
      name: 'Placa Polideportiva del Carmen',
      address: 'Carmen de Viboral, Antioquia'
    }
  })

  const placaComfenalco = await prisma.sportLocation.create({
    data: {
      name: 'Placa Cubierta de Villas de Comfenalco',
      address: 'Villas de Comfenalco, Itagüí'
    }
  })

  const placaPuertoBello = await prisma.sportLocation.create({
    data: {
      name: 'Placa Cubierta de Puerto Bello',
      address: 'Puerto Bello, Itagüí'
    }
  })

  const placaMesa = await prisma.sportLocation.create({
    data: {
      name: 'Placa Deportiva del Mesa',
      address: 'Mesa, Antioquia'
    }
  })

  // ===== CREAR ENTRENADORES =====
  console.log('👨‍🏫 Creando entrenadores...')

  // Entrenadores de Baile
  const karenOspina = await prisma.trainer.create({
    data: {
      name: 'Karen Ospina',
      email: 'karen.ospina@paradisedance.com',
      phone: '3001234567'
    }
  })

  const luisaMachado = await prisma.trainer.create({
    data: {
      name: 'Luisa Machado Duque',
      email: 'luisa.machado@paradisedance.com',
      phone: '3007654321'
    }
  })

  // Entrenadores de Deportes
  const angelica = await prisma.trainer.create({
    data: {
      name: 'Angelica',
      email: 'angelica@paradisedance.com',
      phone: '3009876543'
    }
  })

  const antonia = await prisma.trainer.create({
    data: {
      name: 'Antonia',
      email: 'antonia@paradisedance.com',
      phone: '3005432109'
    }
  })

  const andresVera = await prisma.trainer.create({
    data: {
      name: 'Andres Vera',
      email: 'andres.vera@paradisedance.com',
      phone: '3008765432'
    }
  })

  const andresArroyave = await prisma.trainer.create({
    data: {
      name: 'Andres Arroyave',
      email: 'andres.arroyave@paradisedance.com',
      phone: '3006543210'
    }
  })

  const david = await prisma.trainer.create({
    data: {
      name: 'David',
      email: 'david@paradisedance.com',
      phone: '3004321098'
    }
  })

  const camila = await prisma.trainer.create({
    data: {
      name: 'Camila',
      email: 'camila@paradisedance.com',
      phone: '3002109876'
    }
  })

  const santiago = await prisma.trainer.create({
    data: {
      name: 'Santiago',
      email: 'santiago@paradisedance.com',
      phone: '3001098765'
    }
  })

  const andres = await prisma.trainer.create({
    data: {
      name: 'Andres',
      email: 'andres@paradisedance.com',
      phone: '3009876510'
    }
  })

  const yennifer = await prisma.trainer.create({
    data: {
      name: 'Yennifer',
      email: 'yennifer@paradisedance.com',
      phone: '3008765109'
    }
  })

  // ===== CREAR CLASES DE BAILE =====
  console.log('💃 Creando clases de baile...')

  // Clases de Karen Ospina
  const karenMarJue330 = await prisma.danceClass.create({
    data: {
      name: 'Martes y jueves 3:30 PM a 5:00 PM',
      description: 'Clase de baile urbano con Karen Ospina',
      trainerId: karenOspina.id,
      sport: 'DANCE',
      level: 'BEGINNER',
      capacity: 20,
      price: 50.00,
      schedules: {
        create: [
          { dayOfWeek: 2, startTime: '15:30', endTime: '17:00' }, // Martes
          { dayOfWeek: 4, startTime: '15:30', endTime: '17:00' }  // Jueves
        ]
      }
    }
  })

  const karenMarJue500 = await prisma.danceClass.create({
    data: {
      name: 'Martes y jueves 5:00 PM a 6:30 PM',
      description: 'Clase de baile urbano con Karen Ospina',
      trainerId: karenOspina.id,
      sport: 'DANCE',
      level: 'INTERMEDIATE',
      capacity: 20,
      price: 50.00,
      schedules: {
        create: [
          { dayOfWeek: 2, startTime: '17:00', endTime: '18:30' }, // Martes
          { dayOfWeek: 4, startTime: '17:00', endTime: '18:30' }  // Jueves
        ]
      }
    }
  })

  const karenMarJue630 = await prisma.danceClass.create({
    data: {
      name: 'Martes y jueves 6:30 PM a 8:00 PM',
      description: 'Clase de baile urbano con Karen Ospina',
      trainerId: karenOspina.id,
      sport: 'DANCE',
      level: 'ADVANCED',
      capacity: 20,
      price: 50.00,
      schedules: {
        create: [
          { dayOfWeek: 2, startTime: '18:30', endTime: '20:00' }, // Martes
          { dayOfWeek: 4, startTime: '18:30', endTime: '20:00' }  // Jueves
        ]
      }
    }
  })

  const karenSabDom = await prisma.danceClass.create({
    data: {
      name: 'Sábados y domingos 10:00 AM a 11:30 AM',
      description: 'Clase de baile urbano con Karen Ospina',
      trainerId: karenOspina.id,
      sport: 'DANCE',
      level: 'BEGINNER',
      capacity: 25,
      price: 50.00,
      schedules: {
        create: [
          { dayOfWeek: 6, startTime: '10:00', endTime: '11:30' }, // Sábado
          { dayOfWeek: 0, startTime: '10:00', endTime: '11:30' }  // Domingo
        ]
      }
    }
  })

  // Clases de Luisa Machado
  const luisaMieVie330 = await prisma.danceClass.create({
    data: {
      name: 'Miércoles y viernes 3:30 PM a 5:00 PM',
      description: 'Clase de baile urbano con Luisa Machado Duque',
      trainerId: luisaMachado.id,
      sport: 'DANCE',
      level: 'BEGINNER',
      capacity: 20,
      price: 50.00,
      schedules: {
        create: [
          { dayOfWeek: 3, startTime: '15:30', endTime: '17:00' }, // Miércoles
          { dayOfWeek: 5, startTime: '15:30', endTime: '17:00' }  // Viernes
        ]
      }
    }
  })

  const luisaMieVie500 = await prisma.danceClass.create({
    data: {
      name: 'Miércoles y viernes 5:00 PM a 6:30 PM',
      description: 'Clase de baile urbano con Luisa Machado Duque',
      trainerId: luisaMachado.id,
      sport: 'DANCE',
      level: 'INTERMEDIATE',
      capacity: 20,
      price: 50.00,
      schedules: {
        create: [
          { dayOfWeek: 3, startTime: '17:00', endTime: '18:30' }, // Miércoles
          { dayOfWeek: 5, startTime: '17:00', endTime: '18:30' }  // Viernes
        ]
      }
    }
  })

  const luisaMieVie630 = await prisma.danceClass.create({
    data: {
      name: 'Miércoles y viernes 6:30 PM a 8:00 PM',
      description: 'Clase de baile urbano con Luisa Machado Duque',
      trainerId: luisaMachado.id,
      sport: 'DANCE',
      level: 'ADVANCED',
      capacity: 20,
      price: 50.00,
      schedules: {
        create: [
          { dayOfWeek: 3, startTime: '18:30', endTime: '20:00' }, // Miércoles
          { dayOfWeek: 5, startTime: '18:30', endTime: '20:00' }  // Viernes
        ]
      }
    }
  })

  // ===== CREAR CLASES DE VOLEIBOL EN PLACA POLIDEPORTIVA DEL CARMEN =====
  console.log('🏐 Creando clases de voleibol en Placa Polideportiva del Carmen...')

  // Angelica
  await prisma.danceClass.create({
    data: {
      name: 'Lunes, miércoles y viernes 2:30 PM a 4:00 PM',
      description: 'Entrenamiento de voleibol con Angelica',
      trainerId: angelica.id,
      locationId: placaCarmen.id,
      sport: 'VOLLEYBALL',
      level: 'BEGINNER',
      capacity: 15,
      price: 45.00,
      schedules: {
        create: [
          { dayOfWeek: 1, startTime: '14:30', endTime: '16:00' }, // Lunes
          { dayOfWeek: 3, startTime: '14:30', endTime: '16:00' }, // Miércoles
          { dayOfWeek: 5, startTime: '14:30', endTime: '16:00' }  // Viernes
        ]
      }
    }
  })

  await prisma.danceClass.create({
    data: {
      name: 'Lunes, miércoles y viernes 4:00 PM a 5:30 PM',
      description: 'Entrenamiento de voleibol con Angelica',
      trainerId: angelica.id,
      locationId: placaCarmen.id,
      sport: 'VOLLEYBALL',
      level: 'INTERMEDIATE',
      capacity: 15,
      price: 45.00,
      schedules: {
        create: [
          { dayOfWeek: 1, startTime: '16:00', endTime: '17:30' }, // Lunes
          { dayOfWeek: 3, startTime: '16:00', endTime: '17:30' }, // Miércoles
          { dayOfWeek: 5, startTime: '16:00', endTime: '17:30' }  // Viernes
        ]
      }
    }
  })

  // Antonia
  await prisma.danceClass.create({
    data: {
      name: 'Lunes, miércoles y viernes 2:30 PM a 4:00 PM',
      description: 'Entrenamiento de voleibol con Antonia',
      trainerId: antonia.id,
      locationId: placaCarmen.id,
      sport: 'VOLLEYBALL',
      level: 'BEGINNER',
      capacity: 15,
      price: 45.00,
      schedules: {
        create: [
          { dayOfWeek: 1, startTime: '14:30', endTime: '16:00' }, // Lunes
          { dayOfWeek: 3, startTime: '14:30', endTime: '16:00' }, // Miércoles
          { dayOfWeek: 5, startTime: '14:30', endTime: '16:00' }  // Viernes
        ]
      }
    }
  })

  await prisma.danceClass.create({
    data: {
      name: 'Lunes, miércoles y viernes 4:00 PM a 5:30 PM',
      description: 'Entrenamiento de voleibol con Antonia',
      trainerId: antonia.id,
      locationId: placaCarmen.id,
      sport: 'VOLLEYBALL',
      level: 'INTERMEDIATE',
      capacity: 15,
      price: 45.00,
      schedules: {
        create: [
          { dayOfWeek: 1, startTime: '16:00', endTime: '17:30' }, // Lunes
          { dayOfWeek: 3, startTime: '16:00', endTime: '17:30' }, // Miércoles
          { dayOfWeek: 5, startTime: '16:00', endTime: '17:30' }  // Viernes
        ]
      }
    }
  })

  // Andres Vera
  await prisma.danceClass.create({
    data: {
      name: 'Lunes, miércoles y viernes 3:00 PM a 4:30 PM',
      description: 'Entrenamiento de voleibol con Andres Vera',
      trainerId: andresVera.id,
      locationId: placaCarmen.id,
      sport: 'VOLLEYBALL',
      level: 'INTERMEDIATE',
      capacity: 15,
      price: 45.00,
      schedules: {
        create: [
          { dayOfWeek: 1, startTime: '15:00', endTime: '16:30' }, // Lunes
          { dayOfWeek: 3, startTime: '15:00', endTime: '16:30' }, // Miércoles
          { dayOfWeek: 5, startTime: '15:00', endTime: '16:30' }  // Viernes
        ]
      }
    }
  })

  await prisma.danceClass.create({
    data: {
      name: 'Martes, jueves 2:30 PM a 4:00 PM y sábado 8:00 AM a 9:30 AM',
      description: 'Entrenamiento de voleibol con Andres Vera',
      trainerId: andresVera.id,
      locationId: placaCarmen.id,
      sport: 'VOLLEYBALL',
      level: 'INTERMEDIATE',
      capacity: 15,
      price: 45.00,
      schedules: {
        create: [
          { dayOfWeek: 2, startTime: '14:30', endTime: '16:00' }, // Martes
          { dayOfWeek: 4, startTime: '14:30', endTime: '16:00' }, // Jueves
          { dayOfWeek: 6, startTime: '08:00', endTime: '09:30' }  // Sábado
        ]
      }
    }
  })

  // Andres Arroyave
  await prisma.danceClass.create({
    data: {
      name: 'Lunes, miércoles y viernes 4:30 PM a 6:00 PM',
      description: 'Entrenamiento de voleibol con Andres Arroyave',
      trainerId: andresArroyave.id,
      locationId: placaCarmen.id,
      sport: 'VOLLEYBALL',
      level: 'ADVANCED',
      capacity: 15,
      price: 45.00,
      schedules: {
        create: [
          { dayOfWeek: 1, startTime: '16:30', endTime: '18:00' }, // Lunes
          { dayOfWeek: 3, startTime: '16:30', endTime: '18:00' }, // Miércoles
          { dayOfWeek: 5, startTime: '16:30', endTime: '18:00' }  // Viernes
        ]
      }
    }
  })

  await prisma.danceClass.create({
    data: {
      name: 'Lunes, miércoles y viernes 3:00 PM a 4:30 PM',
      description: 'Entrenamiento de voleibol con Andres Arroyave',
      trainerId: andresArroyave.id,
      locationId: placaCarmen.id,
      sport: 'VOLLEYBALL',
      level: 'INTERMEDIATE',
      capacity: 15,
      price: 45.00,
      schedules: {
        create: [
          { dayOfWeek: 1, startTime: '15:00', endTime: '16:30' }, // Lunes
          { dayOfWeek: 3, startTime: '15:00', endTime: '16:30' }, // Miércoles
          { dayOfWeek: 5, startTime: '15:00', endTime: '16:30' }  // Viernes
        ]
      }
    }
  })

  // David
  await prisma.danceClass.create({
    data: {
      name: 'Lunes, martes y jueves 7:00 PM a 8:30 PM',
      description: 'Entrenamiento de voleibol con David',
      trainerId: david.id,
      locationId: placaCarmen.id,
      sport: 'VOLLEYBALL',
      level: 'ADVANCED',
      capacity: 15,
      price: 45.00,
      schedules: {
        create: [
          { dayOfWeek: 1, startTime: '19:00', endTime: '20:30' }, // Lunes
          { dayOfWeek: 2, startTime: '19:00', endTime: '20:30' }, // Martes
          { dayOfWeek: 4, startTime: '19:00', endTime: '20:30' }  // Jueves
        ]
      }
    }
  })

  await prisma.danceClass.create({
    data: {
      name: 'Martes, jueves 2:30 PM a 4:00 PM y sábado 8:00 AM a 9:30 AM',
      description: 'Entrenamiento de voleibol con David',
      trainerId: david.id,
      locationId: placaCarmen.id,
      sport: 'VOLLEYBALL',
      level: 'INTERMEDIATE',
      capacity: 15,
      price: 45.00,
      schedules: {
        create: [
          { dayOfWeek: 2, startTime: '14:30', endTime: '16:00' }, // Martes
          { dayOfWeek: 4, startTime: '14:30', endTime: '16:00' }, // Jueves
          { dayOfWeek: 6, startTime: '08:00', endTime: '09:30' }  // Sábado
        ]
      }
    }
  })

  await prisma.danceClass.create({
    data: {
      name: 'Martes, jueves 4:00 PM a 5:30 PM y sábado 9:30 AM a 11:00 AM',
      description: 'Entrenamiento de voleibol con David',
      trainerId: david.id,
      locationId: placaCarmen.id,
      sport: 'VOLLEYBALL',
      level: 'ADVANCED',
      capacity: 15,
      price: 45.00,
      schedules: {
        create: [
          { dayOfWeek: 2, startTime: '16:00', endTime: '17:30' }, // Martes
          { dayOfWeek: 4, startTime: '16:00', endTime: '17:30' }, // Jueves
          { dayOfWeek: 6, startTime: '09:30', endTime: '11:00' }  // Sábado
        ]
      }
    }
  })

  // Camila
  await prisma.danceClass.create({
    data: {
      name: 'Lunes, martes y jueves 7:00 PM a 8:30 PM',
      description: 'Entrenamiento de voleibol con Camila',
      trainerId: camila.id,
      locationId: placaCarmen.id,
      sport: 'VOLLEYBALL',
      level: 'INTERMEDIATE',
      capacity: 15,
      price: 45.00,
      schedules: {
        create: [
          { dayOfWeek: 1, startTime: '19:00', endTime: '20:30' }, // Lunes
          { dayOfWeek: 2, startTime: '19:00', endTime: '20:30' }, // Martes
          { dayOfWeek: 4, startTime: '19:00', endTime: '20:30' }  // Jueves
        ]
      }
    }
  })

  // Santiago - MASCULINO
  await prisma.danceClass.create({
    data: {
      name: 'MASCULINO - Lunes, martes y jueves 8:30 PM a 10:00 PM',
      description: 'Entrenamiento de voleibol masculino con Santiago',
      trainerId: santiago.id,
      locationId: placaCarmen.id,
      sport: 'VOLLEYBALL',
      level: 'ADVANCED',
      capacity: 15,
      price: 45.00,
      schedules: {
        create: [
          { dayOfWeek: 1, startTime: '20:30', endTime: '22:00' }, // Lunes
          { dayOfWeek: 2, startTime: '20:30', endTime: '22:00' }, // Martes
          { dayOfWeek: 4, startTime: '20:30', endTime: '22:00' }  // Jueves
        ]
      }
    }
  })

  // ===== CREAR CLASES EN PLACA CUBIERTA DE VILLAS DE COMFENALCO =====
  console.log('🏐 Creando clases de voleibol en Placa Cubierta de Villas de Comfenalco...')

  await prisma.danceClass.create({
    data: {
      name: 'Martes, jueves 4:00 PM a 5:30 PM y sábado 8:00 AM a 9:30 AM',
      description: 'Entrenamiento de voleibol con Andres',
      trainerId: andres.id,
      locationId: placaComfenalco.id,
      sport: 'VOLLEYBALL',
      level: 'INTERMEDIATE',
      capacity: 15,
      price: 45.00,
      schedules: {
        create: [
          { dayOfWeek: 2, startTime: '16:00', endTime: '17:30' }, // Martes
          { dayOfWeek: 4, startTime: '16:00', endTime: '17:30' }, // Jueves
          { dayOfWeek: 6, startTime: '08:00', endTime: '09:30' }  // Sábado
        ]
      }
    }
  })

  await prisma.danceClass.create({
    data: {
      name: 'Martes, jueves 5:30 PM a 7:00 PM y sábado 9:30 AM a 11:00 AM',
      description: 'Entrenamiento de voleibol con Andres',
      trainerId: andres.id,
      locationId: placaComfenalco.id,
      sport: 'VOLLEYBALL',
      level: 'ADVANCED',
      capacity: 15,
      price: 45.00,
      schedules: {
        create: [
          { dayOfWeek: 2, startTime: '17:30', endTime: '19:00' }, // Martes
          { dayOfWeek: 4, startTime: '17:30', endTime: '19:00' }, // Jueves
          { dayOfWeek: 6, startTime: '09:30', endTime: '11:00' }  // Sábado
        ]
      }
    }
  })

  await prisma.danceClass.create({
    data: {
      name: 'Martes, jueves 4:00 PM a 5:30 PM y sábado 8:00 AM a 9:30 AM',
      description: 'Entrenamiento de voleibol con Angelica',
      trainerId: angelica.id,
      locationId: placaComfenalco.id,
      sport: 'VOLLEYBALL',
      level: 'INTERMEDIATE',
      capacity: 15,
      price: 45.00,
      schedules: {
        create: [
          { dayOfWeek: 2, startTime: '16:00', endTime: '17:30' }, // Martes
          { dayOfWeek: 4, startTime: '16:00', endTime: '17:30' }, // Jueves
          { dayOfWeek: 6, startTime: '08:00', endTime: '09:30' }  // Sábado
        ]
      }
    }
  })

  await prisma.danceClass.create({
    data: {
      name: 'Martes, jueves 5:30 PM a 7:00 PM y sábado 9:30 AM a 11:00 AM',
      description: 'Entrenamiento de voleibol con Angelica',
      trainerId: angelica.id,
      locationId: placaComfenalco.id,
      sport: 'VOLLEYBALL',
      level: 'ADVANCED',
      capacity: 15,
      price: 45.00,
      schedules: {
        create: [
          { dayOfWeek: 2, startTime: '17:30', endTime: '19:00' }, // Martes
          { dayOfWeek: 4, startTime: '17:30', endTime: '19:00' }, // Jueves
          { dayOfWeek: 6, startTime: '09:30', endTime: '11:00' }  // Sábado
        ]
      }
    }
  })

  // ===== CREAR CLASES EN PLACA CUBIERTA DE PUERTO BELLO =====
  console.log('🏐 Creando clases de voleibol en Placa Cubierta de Puerto Bello...')

  await prisma.danceClass.create({
    data: {
      name: 'Lunes, martes, jueves 3:30 PM a 5:00 PM',
      description: 'Entrenamiento de voleibol con Camila',
      trainerId: camila.id,
      locationId: placaPuertoBello.id,
      sport: 'VOLLEYBALL',
      level: 'INTERMEDIATE',
      capacity: 15,
      price: 45.00,
      schedules: {
        create: [
          { dayOfWeek: 1, startTime: '15:30', endTime: '17:00' }, // Lunes
          { dayOfWeek: 2, startTime: '15:30', endTime: '17:00' }, // Martes
          { dayOfWeek: 4, startTime: '15:30', endTime: '17:00' }  // Jueves
        ]
      }
    }
  })

  await prisma.danceClass.create({
    data: {
      name: 'Lunes, martes, jueves 3:30 PM a 5:00 PM',
      description: 'Entrenamiento de voleibol con Yennifer',
      trainerId: yennifer.id,
      locationId: placaPuertoBello.id,
      sport: 'VOLLEYBALL',
      level: 'BEGINNER',
      capacity: 15,
      price: 45.00,
      schedules: {
        create: [
          { dayOfWeek: 1, startTime: '15:30', endTime: '17:00' }, // Lunes
          { dayOfWeek: 2, startTime: '15:30', endTime: '17:00' }, // Martes
          { dayOfWeek: 4, startTime: '15:30', endTime: '17:00' }  // Jueves
        ]
      }
    }
  })

  await prisma.danceClass.create({
    data: {
      name: 'Lunes 3:30 PM a 5:00 PM, martes, jueves 5:00 PM a 6:30 PM',
      description: 'Entrenamiento de voleibol con Yennifer',
      trainerId: yennifer.id,
      locationId: placaPuertoBello.id,
      sport: 'VOLLEYBALL',
      level: 'INTERMEDIATE',
      capacity: 15,
      price: 45.00,
      schedules: {
        create: [
          { dayOfWeek: 1, startTime: '15:30', endTime: '17:00' }, // Lunes
          { dayOfWeek: 2, startTime: '17:00', endTime: '18:30' }, // Martes
          { dayOfWeek: 4, startTime: '17:00', endTime: '18:30' }  // Jueves
        ]
      }
    }
  })

  // ===== CREAR CLASES EN PLACA DEPORTIVA DEL MESA =====
  console.log('🏐 Creando clases de voleibol en Placa Deportiva del Mesa...')

  await prisma.danceClass.create({
    data: {
      name: 'Lunes, martes y jueves 7:00 PM a 8:30 PM',
      description: 'Entrenamiento de voleibol con David',
      trainerId: david.id,
      locationId: placaMesa.id,
      sport: 'VOLLEYBALL',
      level: 'ADVANCED',
      capacity: 15,
      price: 45.00,
      schedules: {
        create: [
          { dayOfWeek: 1, startTime: '19:00', endTime: '20:30' }, // Lunes
          { dayOfWeek: 2, startTime: '19:00', endTime: '20:30' }, // Martes
          { dayOfWeek: 4, startTime: '19:00', endTime: '20:30' }  // Jueves
        ]
      }
    }
  })

  await prisma.danceClass.create({
    data: {
      name: 'Lunes, martes y jueves 7:00 PM a 8:30 PM',
      description: 'Entrenamiento de voleibol con Andres Vera',
      trainerId: andresVera.id,
      locationId: placaMesa.id,
      sport: 'VOLLEYBALL',
      level: 'ADVANCED',
      capacity: 15,
      price: 45.00,
      schedules: {
        create: [
          { dayOfWeek: 1, startTime: '19:00', endTime: '20:30' }, // Lunes
          { dayOfWeek: 2, startTime: '19:00', endTime: '20:30' }, // Martes
          { dayOfWeek: 4, startTime: '19:00', endTime: '20:30' }  // Jueves
        ]
      }
    }
  })

  console.log('🎉 ¡Seed con datos reales completado exitosamente!')
  console.log('📊 Resumen:')
  console.log(`   👨‍🏫 ${await prisma.trainer.count()} entrenadores`)
  console.log(`   📍 ${await prisma.sportLocation.count()} ubicaciones`)
  console.log(`   💃 ${await prisma.danceClass.count()} clases totales`)
  console.log(`   🏐 ${await prisma.danceClass.count({ where: { sport: 'VOLLEYBALL' } })} clases de voleibol`)
  console.log(`   💃 ${await prisma.danceClass.count({ where: { sport: 'DANCE' } })} clases de baile`)
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed de datos reales:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 