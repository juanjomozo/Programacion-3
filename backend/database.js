const { Pool } = require('pg');
require('dotenv').config();

// Configuración de PostgreSQL
// En producción (Render), usa DATABASE_URL
// En desarrollo local, usa las variables individuales
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : false
});

// Función para inicializar la base de datos
const initDB = async () => {
    try {
        // Crear tabla users
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Crear tabla products
        await pool.query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                price DECIMAL(10, 2) NOT NULL CHECK(price > 0),
                description TEXT,
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('✅ Tablas de PostgreSQL creadas/verificadas correctamente');
    } catch (err) {
        console.error('❌ Error al inicializar la base de datos:', err.message);
        throw err;
    }
};

// Exportar pool y función de inicialización
module.exports = {
    pool,
    initDB
};
