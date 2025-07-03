const http = require('http');

async function testAPIResponse() {
  try {
    const formId = 'cmcmftlm90005v9hgenvowcar';
    const url = `http://localhost:3000/api/payment-form/${formId}`;
    
    console.log('🔍 Probando API:', url);
    console.log('⚠️  NOTA: Asegúrate de que el servidor esté corriendo en localhost:3000');
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/payment-form/${formId}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      console.log('📨 Status:', res.statusCode);
      console.log('📨 Headers:', res.headers);
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const jsonData = JSON.parse(data);
            console.log('\n📋 DATOS DE LA API:');
            console.log('- Student Name:', jsonData.student?.name || jsonData.studentName || 'NO ENCONTRADO');
            console.log('- Student ID:', jsonData.student?.id || jsonData.studentId || 'NO ENCONTRADO');
            console.log('- Amount:', jsonData.amount);
            console.log('- Period:', jsonData.period?.name);
            console.log('\n📄 RESPUESTA COMPLETA:');
            console.log(JSON.stringify(jsonData, null, 2));
          } else {
            console.log('❌ Error Response:', data);
          }
        } catch (parseError) {
          console.log('❌ Error parsing JSON:', parseError);
          console.log('Raw response:', data);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request Error:', error.message);
      if (error.code === 'ECONNREFUSED') {
        console.log('💡 Solución: Ejecuta "npm run dev" en otra terminal para iniciar el servidor');
      }
    });

    req.end();
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

testAPIResponse(); 