#!/usr/bin/env node

/**
 * Script para probar el endpoint de GitHub Actions localmente
 * Ejecutar con: node scripts/test-github-actions.js
 */

const https = require('https');
const http = require('http');

// Configuración
const API_URL = process.env.API_URL || 'http://localhost:3000';
const ENDPOINT = '/api/cron/sessions';

console.log('🧪 PROBANDO GITHUB ACTIONS - GENERACIÓN DE SESIONES');
console.log(`📡 URL: ${API_URL}${ENDPOINT}`);

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
    
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Timeout después de 30 segundos'));
    });
    
    req.end();
  });
}

// Función principal
async function testGitHubActions() {
  const startTime = new Date();
  console.log(`⏰ Iniciado: ${startTime.toISOString()}`);
  
  try {
    const url = `${API_URL}${ENDPOINT}`;
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Test-GitHub-Actions/1.0'
      }
    };
    
    console.log('📡 Enviando petición...');
    console.log(`🔗 URL completa: ${url}`);
    
    const response = await makeRequest(url, options);
    
    console.log(`📊 Status: ${response.status}`);
    
    if (response.status === 200) {
      console.log('✅ Prueba exitosa - GitHub Actions funcionará correctamente');
      console.log('📄 Respuesta:', JSON.stringify(response.data, null, 2));
      
      if (response.data.totalSessionsGenerated) {
        console.log(`🎉 Se generaron ${response.data.totalSessionsGenerated} sesiones`);
      }
    } else {
      console.error(`❌ Error en la respuesta: ${response.status}`);
      console.error(`📄 Respuesta:`, JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.error('💥 Error en la prueba:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('❌ No se puede conectar al servidor');
      console.error('💡 Asegúrate de que tu aplicación esté ejecutándose:');
      console.error('   npm run dev');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('❌ No se puede resolver el dominio');
      console.error('💡 Verifica que la URL sea correcta');
    } else {
      console.error('💡 Error desconocido:', error.message);
    }
  } finally {
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    console.log(`⏱️ Duración: ${duration}ms`);
    console.log(`🏁 Finalizado: ${endTime.toISOString()}`);
  }
}

// Ejecutar la prueba
testGitHubActions()
  .then(() => {
    console.log('🎉 Prueba completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
