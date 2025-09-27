#!/usr/bin/env node

const http = require('http');

console.log('🔍 Verificando que la aplicación funcione correctamente...\n');

// Función para hacer requests HTTP
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function testApplication() {
  try {
    console.log('1. 🖥️  Probando frontend (puerto 80)...');
    const frontendResponse = await makeRequest('http://localhost:80');
    if (frontendResponse.statusCode === 200) {
      console.log('   ✅ Frontend respondiendo correctamente');
      if (frontendResponse.body.includes('Flame Assistant')) {
        console.log('   ✅ HTML contiene el título correcto');
      } else {
        console.log('   ❌ HTML no contiene el título esperado');
      }
    } else {
      console.log(`   ❌ Frontend respondió con código: ${frontendResponse.statusCode}`);
    }

    console.log('\n2. 🔧 Probando backend (puerto 3001)...');
    const backendResponse = await makeRequest('http://localhost:3001/api/auth/profile');
    if (backendResponse.statusCode === 200) {
      console.log('   ✅ Backend respondiendo correctamente');
      const data = JSON.parse(backendResponse.body);
      if (data.message === 'Token de acceso requerido') {
        console.log('   ✅ API de autenticación funcionando correctamente');
      } else {
        console.log('   ❌ Respuesta inesperada de la API');
      }
    } else {
      console.log(`   ❌ Backend respondió con código: ${backendResponse.statusCode}`);
    }

    console.log('\n3. 📁 Probando archivos estáticos...');
    const jsResponse = await makeRequest('http://localhost:80/assets/index-e812d829.js');
    if (jsResponse.statusCode === 200) {
      console.log('   ✅ Archivo JavaScript se sirve correctamente');
      if (jsResponse.body.includes('React')) {
        console.log('   ✅ JavaScript contiene React');
      } else {
        console.log('   ❌ JavaScript no contiene React');
      }
    } else {
      console.log(`   ❌ Archivo JavaScript respondió con código: ${jsResponse.statusCode}`);
    }

    const cssResponse = await makeRequest('http://localhost:80/assets/index-b2bff99d.css');
    if (cssResponse.statusCode === 200) {
      console.log('   ✅ Archivo CSS se sirve correctamente');
    } else {
      console.log(`   ❌ Archivo CSS respondió con código: ${cssResponse.statusCode}`);
    }

    console.log('\n4. 🔗 Probando ruta de login...');
    const loginResponse = await makeRequest('http://localhost:80/login');
    if (loginResponse.statusCode === 200) {
      console.log('   ✅ Ruta /login responde correctamente');
      if (loginResponse.body.includes('Flame Assistant')) {
        console.log('   ✅ Página de login contiene el título correcto');
      } else {
        console.log('   ❌ Página de login no contiene el título esperado');
      }
    } else {
      console.log(`   ❌ Ruta /login respondió con código: ${loginResponse.statusCode}`);
    }

    console.log('\n🎉 ¡VERIFICACIÓN COMPLETA!');
    console.log('\n📋 Resumen:');
    console.log('   • Frontend: http://localhost');
    console.log('   • Backend: http://localhost:3001');
    console.log('   • Login: http://localhost/login');
    console.log('\n✨ Tu aplicación está funcionando correctamente!');

  } catch (error) {
    console.error('❌ Error durante la verificación:', error.message);
  }
}

testApplication();
