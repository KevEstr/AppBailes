#!/usr/bin/env node

/**
 * Script de cron job para Railway
 * Este script se ejecuta como servicio dedicado en Railway
 */

const https = require('https');
const http = require('http');

// Configuración
const API_URL = process.env.RAILWAY_PUBLIC_DOMAIN || process.env.RAILWAY_STATIC_URL;
const CRON_SECRET = process.env.CRON_SECRET;
const ENDPOINT = '/api/cron/generate-sessions';

console.log('🚀 Iniciando generación automática de sesiones...');
console.log(`📡 API URL: ${API_URL}`);
console.log(`🔑 CRON_SECRET: ${CRON_SECRET ? 'Configurado' : 'No configurado'}`);

if (!CRON_SECRET) {
  console.error('❌ CRON_SECRET no está configurado');
  process.exit(1);
}

if (!API_URL) {
  console.error('❌ RAILWAY_PUBLIC_DOMAIN no está configurado');
  process.exit(1);
}

// Función para hacer la petición HTTP/HTTPS
function makeRequest(url, options) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const req = client.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ status: res.statusCode, data: response });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(60000, () => {
      req.destroy();
      reject(new Error('Timeout después de 60 segundos'));
    });
    
    req.end();
  });
}

// Función principal
async function generateSessions() {
  const startTime = new Date();
  console.log(`⏰ Iniciado: ${startTime.toISOString()}`);
  
  try {
    const url = `${API_URL}${ENDPOINT}`;
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Railway-Cron-Job/1.0'
      }
    };
    
    console.log(`📡 Enviando petición a: ${url}`);
    const response = await makeRequest(url, options);
    
    if (response.status === 200) {
      console.log('✅ Generación de sesiones completada exitosamente');
      console.log(`📊 Resultado:`, JSON.stringify(response.data, null, 2));
    } else {
      console.error(`❌ Error en la respuesta: ${response.status}`);
      console.error(`📄 Respuesta:`, JSON.stringify(response.data, null, 2));
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Error ejecutando generación de sesiones:', error.message);
    process.exit(1);
  } finally {
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    console.log(`⏱️ Duración total: ${duration}ms`);
    console.log(`🏁 Finalizado: ${endTime.toISOString()}`);
  }
}

// Ejecutar el script
generateSessions()
  .then(() => {
    console.log('🎉 Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
