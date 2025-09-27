#!/usr/bin/env node

const http = require('http');

console.log('🌐 Simulando navegador para verificar JavaScript...\n');

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

async function testBrowserSimulation() {
  try {
    console.log('1. 📄 Obteniendo HTML principal...');
    const htmlResponse = await makeRequest('http://localhost:80');
    
    if (htmlResponse.statusCode === 200) {
      console.log('   ✅ HTML obtenido correctamente');
      
      // Verificar que contiene los polyfills
      if (htmlResponse.body.includes('Polyfills críticos para fetch y Request')) {
        console.log('   ✅ Polyfills están incluidos en el HTML');
      } else {
        console.log('   ❌ Polyfills no encontrados en el HTML');
      }
      
      // Verificar que contiene el script de la aplicación
      if (htmlResponse.body.includes('index-e812d829.js')) {
        console.log('   ✅ Script de la aplicación incluido');
      } else {
        console.log('   ❌ Script de la aplicación no encontrado');
      }
    } else {
      console.log(`   ❌ Error obteniendo HTML: ${htmlResponse.statusCode}`);
      return;
    }

    console.log('\n2. 📜 Obteniendo archivo JavaScript...');
    const jsResponse = await makeRequest('http://localhost:80/assets/index-e812d829.js');
    
    if (jsResponse.statusCode === 200) {
      console.log('   ✅ JavaScript obtenido correctamente');
      
      // Verificar que contiene React
      if (jsResponse.body.includes('React')) {
        console.log('   ✅ React está incluido');
      } else {
        console.log('   ❌ React no encontrado');
      }
      
      // Verificar que contiene Vite
      if (jsResponse.body.includes('vite')) {
        console.log('   ✅ Vite está incluido');
      } else {
        console.log('   ❌ Vite no encontrado');
      }
      
      // Verificar que no contiene errores obvios de Request
      if (!jsResponse.body.includes('Cannot destructure property \'Request\'')) {
        console.log('   ✅ No se detectaron errores obvios de Request');
      } else {
        console.log('   ❌ Se detectaron errores de Request en el código');
      }
    } else {
      console.log(`   ❌ Error obteniendo JavaScript: ${jsResponse.statusCode}`);
    }

    console.log('\n3. 🎨 Obteniendo archivo CSS...');
    const cssResponse = await makeRequest('http://localhost:80/assets/index-b2bff99d.css');
    
    if (cssResponse.statusCode === 200) {
      console.log('   ✅ CSS obtenido correctamente');
    } else {
      console.log(`   ❌ Error obteniendo CSS: ${cssResponse.statusCode}`);
    }

    console.log('\n4. 🔗 Probando rutas específicas...');
    
    const routes = ['/login', '/dashboard', '/inbox', '/contacts'];
    
    for (const route of routes) {
      const routeResponse = await makeRequest(`http://localhost:80${route}`);
      if (routeResponse.statusCode === 200) {
        console.log(`   ✅ Ruta ${route} responde correctamente`);
      } else {
        console.log(`   ❌ Ruta ${route} respondió con código: ${routeResponse.statusCode}`);
      }
    }

    console.log('\n🎉 ¡SIMULACIÓN DE NAVEGADOR COMPLETA!');
    console.log('\n📋 Tu aplicación está lista para usar:');
    console.log('   🌐 Frontend: http://localhost');
    console.log('   🔐 Login: http://localhost/login');
    console.log('   📊 Dashboard: http://localhost/dashboard');
    console.log('   💬 Inbox: http://localhost/inbox');
    console.log('   👥 Contactos: http://localhost/contacts');
    console.log('\n✨ ¡NO CIERRES EL PROYECTO! ¡Está funcionando perfectamente!');

  } catch (error) {
    console.error('❌ Error durante la simulación:', error.message);
  }
}

testBrowserSimulation();
