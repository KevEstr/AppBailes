#!/usr/bin/env node

/**
 * Script para probar el cron job localmente
 * Ejecutar con: node scripts/test-cron.js
 */

const https = require('https');
const http = require('http');

// Configuración
const API_URL = process.env.API_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET || 'test-secret';
const ENDPOINT = '/api/cron/generate-sessions';

console.log('🧪 Probando cron job de generación de sesiones...');
console.log(`📡 URL: ${API_URL}${ENDPOINT}`);
console.log(`🔑 Secret: ${CRON_SECRET ? 'Configurado' : 'No configurado'}`);

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
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout después de 10 segundos'));
    });
    
    req.end();
  });
}

// Función principal
async function testCronJob() {
  const startTime = new Date();
  console.log(`⏰ Iniciado: ${startTime.toISOString()}`);
  
  try {
    const url = `${API_URL}${ENDPOINT}`;
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Test-Cron-Job/1.0'
      }
    };
    
    console.log('📡 Enviando petición...');
    const response = await makeRequest(url, options);
    
    console.log(`📊 Status: ${response.status}`);
    
    if (response.status === 200) {
      console.log('✅ Prueba exitosa');
      console.log('📄 Respuesta:', JSON.stringify(response.data, null, 2));
    } else {
      console.error(`❌ Error en la respuesta: ${response.status}`);
      console.error(`📄 Respuesta:`, JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.error('💥 Error en la prueba:', error.message);
  } finally {
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    console.log(`⏱️ Duración: ${duration}ms`);
    console.log(`🏁 Finalizado: ${endTime.toISOString()}`);
  }
}

// Ejecutar la prueba
testCronJob()
  .then(() => {
    console.log('🎉 Prueba completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
