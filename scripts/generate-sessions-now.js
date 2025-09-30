#!/usr/bin/env node

/**
 * Script para generar sesiones INMEDIATAMENTE
 * Ejecutar con: node scripts/generate-sessions-now.js
 */

const https = require('https');
const http = require('http');

// Configuración
const API_URL = process.env.API_URL || 'http://localhost:3000';
const ENDPOINT = '/api/admin/generate-sessions-bulk';
const WEEKS_TO_GENERATE = 8; // 8 semanas = 2 meses

console.log('🚀 GENERACIÓN INMEDIATA DE SESIONES - 2 MESES');
console.log(`📡 URL: ${API_URL}${ENDPOINT}`);
console.log(`📅 Semanas a generar: ${WEEKS_TO_GENERATE}`);

// Función para hacer la petición HTTP/HTTPS
function makeRequest(url, options, data = null) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const req = client.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: response });
        } catch (error) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(120000, () => {
      req.destroy();
      reject(new Error('Timeout después de 120 segundos'));
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Función principal
async function generateSessionsNow() {
  const startTime = new Date();
  console.log(`⏰ Iniciado: ${startTime.toISOString()}`);
  
  try {
    const url = `${API_URL}${ENDPOINT}`;
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Generate-Sessions-Now/1.0'
      }
    };
    
    const requestData = {
      weeksToGenerate: WEEKS_TO_GENERATE
    };
    
    console.log('📡 Enviando petición de generación masiva...');
    console.log(`📊 Datos:`, JSON.stringify(requestData, null, 2));
    
    const response = await makeRequest(url, options, requestData);
    
    console.log(`📊 Status: ${response.status}`);
    
    if (response.status === 200) {
      console.log('✅ Generación masiva completada exitosamente');
      console.log('📄 Resumen:', JSON.stringify(response.data.summary, null, 2));
      
      if (response.data.results) {
        console.log('\n📋 Detalles por clase:');
        response.data.results.forEach((result, index) => {
          if (result.success) {
            console.log(`✅ ${index + 1}. ${result.className}: ${result.sessionsGenerated} sesiones`);
          } else {
            console.log(`❌ ${index + 1}. ${result.className}: ${result.error}`);
          }
        });
      }
    } else {
      console.error(`❌ Error en la respuesta: ${response.status}`);
      console.error(`📄 Respuesta:`, JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.error('💥 Error en la generación:', error.message);
  } finally {
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    console.log(`⏱️ Duración: ${duration}ms`);
    console.log(`🏁 Finalizado: ${endTime.toISOString()}`);
  }
}

// Ejecutar la generación
generateSessionsNow()
  .then(() => {
    console.log('🎉 Generación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
