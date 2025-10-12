#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuración de la base de datos
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'whatsapp_manager',
    user: process.env.DB_USER || 'whatsapp_user',
    password: process.env.DB_PASSWORD || 'whatsapp_password',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

const pool = new Pool(dbConfig);

async function executeMigration() {
    let client;
    
    try {
        console.log('🔄 Conectando a la base de datos...');
        client = await pool.connect();
        console.log('✅ Conexión establecida');

        // Verificar si las tablas ya existen
        console.log('🔍 Verificando estado de la base de datos...');
        const tableCheck = await client.query(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'users'
        `);
        
        const hasUsersTable = parseInt(tableCheck.rows[0].count) > 0;
        
        if (hasUsersTable) {
            console.log('✅ Las tablas ya existen, verificando datos...');
            
            // Verificar si hay usuarios
            const userCount = await client.query('SELECT COUNT(*) as count FROM users');
            const userCountNum = parseInt(userCount.rows[0].count);
            
            if (userCountNum > 0) {
                console.log(`✅ Base de datos ya inicializada con ${userCountNum} usuarios`);
                return;
            } else {
                console.log('⚠️  Tablas existen pero sin datos, creando usuario por defecto...');
            }
        } else {
            console.log('📝 Ejecutando migración completa...');
            
            // Leer y ejecutar el script de inicialización
            const initScript = fs.readFileSync(
                path.join(__dirname, 'init-db.sql'), 
                'utf8'
            );
            
            await client.query(initScript);
            console.log('✅ Migración completa ejecutada');
        }

        // Verificar que el usuario por defecto existe
        const defaultUserCheck = await client.query(`
            SELECT COUNT(*) as count 
            FROM users 
            WHERE email = 'admin@flame.com'
        `);
        
        const hasDefaultUser = parseInt(defaultUserCheck.rows[0].count) > 0;
        
        if (!hasDefaultUser) {
            console.log('👤 Creando usuario por defecto...');
                        
            await client.query(`
                INSERT INTO users (email, password, name, created_at, updated_at)
                VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT (email) DO NOTHING
            `, ['admin@flame.com', '$2b$10$d1eWDei/fDwpp', 'Administrador']);
            
            console.log('✅ Usuario por defecto creado');
        } else {
            console.log('✅ Usuario por defecto ya existe');
        }

        // Verificar estructura final
        console.log('🔍 Verificando estructura final...');
        const finalCheck = await client.query(`
            SELECT 
                COUNT(*) as table_count,
                (SELECT COUNT(*) FROM users) as user_count,
                (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as total_tables
        `);
        
        const result = finalCheck.rows[0];
        console.log(`📊 Estado final: ${result.total_tables} tablas, ${result.user_count} usuarios`);
        
        if (parseInt(result.table_count) > 0 && parseInt(result.user_count) > 0) {
            console.log('✅ Migración completada exitosamente');
        } else {
            throw new Error('La migración no se completó correctamente');
        }

    } catch (error) {
        console.error('❌ Error durante la migración:', error.message);
        console.error('Detalles:', error);
        process.exit(1);
    } finally {
        if (client) {
            client.release();
        }
        await pool.end();
    }
}

// Ejecutar migración si se llama directamente
if (require.main === module) {
    executeMigration()
        .then(() => {
            console.log('🎉 Migración completada');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Error fatal:', error);
            process.exit(1);
        });
}

module.exports = { executeMigration };
