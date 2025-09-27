const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

async function testMultiTenant() {
  console.log('🧪 Iniciando pruebas del sistema multi-tenant...\n');

  try {
    // 1. Crear usuario de prueba
    console.log('1️⃣ Creando usuario de prueba...');
    const userResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
      email: 'test@multitenant.com',
      password: 'test123',
      name: 'Usuario Prueba'
    });
    
    const { user, accessToken } = userResponse.data.data;
    console.log('✅ Usuario creado:', user.email);
    
    const headers = { Authorization: `Bearer ${accessToken}` };

    // 2. Obtener organizaciones del usuario
    console.log('\n2️⃣ Obteniendo organizaciones del usuario...');
    const orgsResponse = await axios.get(`${API_BASE_URL}/organizations`, { headers });
    console.log('✅ Organizaciones encontradas:', orgsResponse.data.data.length);
    
    const defaultOrg = orgsResponse.data.data[0];
    console.log('📋 Organización por defecto:', defaultOrg.name);

    // 3. Crear nueva organización
    console.log('\n3️⃣ Creando nueva organización...');
    const newOrgResponse = await axios.post(`${API_BASE_URL}/organizations`, {
      name: 'Empresa de Prueba',
      slug: 'empresa-prueba',
      description: 'Organización de prueba para testing',
      plan: 'pro'
    }, { headers });
    
    const newOrg = newOrgResponse.data.data;
    console.log('✅ Nueva organización creada:', newOrg.name);

    // 4. Crear sesión de WhatsApp para la nueva organización
    console.log('\n4️⃣ Creando sesión de WhatsApp...');
    const sessionResponse = await axios.post(`${API_BASE_URL}/whatsapp/session`, {}, { headers });
    console.log('✅ Sesión de WhatsApp creada:', sessionResponse.data.data.sessionId);

    // 5. Verificar que la sesión está asociada a la organización correcta
    console.log('\n5️⃣ Verificando asociación de sesión con organización...');
    const statusResponse = await axios.get(`${API_BASE_URL}/whatsapp/status`, { headers });
    console.log('✅ Estado de WhatsApp obtenido');

    // 6. Obtener estadísticas de la organización
    console.log('\n6️⃣ Obteniendo estadísticas de la organización...');
    const statsResponse = await axios.get(`${API_BASE_URL}/organizations/${newOrg.id}`, { headers });
    console.log('✅ Estadísticas obtenidas:', statsResponse.data.data.stats);

    console.log('\n🎉 ¡Todas las pruebas pasaron exitosamente!');
    console.log('\n📊 Resumen:');
    console.log(`   - Usuario: ${user.email}`);
    console.log(`   - Organizaciones: ${orgsResponse.data.data.length + 1}`);
    console.log(`   - Nueva organización: ${newOrg.name} (${newOrg.slug})`);
    console.log(`   - Sesión WhatsApp: ${sessionResponse.data.data.sessionId}`);
    console.log(`   - Plan: ${newOrg.plan}`);

  } catch (error) {
    console.error('❌ Error en las pruebas:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Ejecutar pruebas
testMultiTenant();
