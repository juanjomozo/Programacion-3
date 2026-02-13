const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { pool, initDB } = require('./database');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Usar variable de entorno para SECRET_KEY
const SECRET_KEY = process.env.SECRET_KEY || 'mi_clave_secreta_super_segura';

// Inicializar base de datos al arrancar
initDB().catch(err => {
    console.error('No se pudo inicializar la base de datos:', err);
    process.exit(1);
});

// -------------------- REGISTER --------------------
app.post('/api/register', async (req, res) => {
    const { name, email, password, role } = req.body;

    // Validaciones básicas
    if (!name || !email || !password || !role) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Email no válido' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    if (role !== 'admin' && role !== 'user') {
        return res.status(400).json({ error: 'Rol no válido' });
    }

    try {
        // Encriptar contraseña
        const hashedPassword = bcrypt.hashSync(password, 10);

        // Insertar en DB
        await pool.query(
            'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)',
            [name, email, hashedPassword, role]
        );

        res.status(201).json({ message: 'Registro exitoso' });
    } catch (err) {
        if (err.code === '23505') { // Código de error de PostgreSQL para UNIQUE constraint
            return res.status(400).json({ error: 'El email ya está registrado' });
        }
        console.error('Error en registro:', err);
        return res.status(500).json({ error: 'Error en el servidor' });
    }
});

// -------------------- LOGIN --------------------
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const passwordMatch = bcrypt.compareSync(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Generar token JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            SECRET_KEY,
            { expiresIn: '2h' }
        );

        res.json({
            message: 'Login exitoso',
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });
    } catch (err) {
        console.error('Error en login:', err);
        return res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Middleware: verificar token y rol admin
const verifyAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1]; // Bearer <token>
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado: se requiere rol admin' });
        }
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
};

// ------------------------------------------------------------
// PRODUCTOS (solo admin)
// ------------------------------------------------------------

// Crear producto
app.post('/api/products', verifyAdmin, async (req, res) => {
    const { code, name, price, description } = req.body;

    // Validaciones
    if (!code || !name || !price) {
        return res.status(400).json({ error: 'Código, nombre y precio son obligatorios' });
    }

    if (isNaN(price) || Number(price) <= 0) {
        return res.status(400).json({ error: 'El precio debe ser un número positivo' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO products (code, name, price, description, created_by) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING *`,
            [code, name, Number(price), description || null, req.user.id]
        );

        res.status(201).json({ 
            message: 'Producto creado exitosamente',
            product: result.rows[0]
        });
    } catch (err) {
        if (err.code === '23505') { // UNIQUE constraint
            return res.status(400).json({ error: 'Ya existe un producto con ese código' });
        }
        console.error('Error al crear producto:', err);
        return res.status(500).json({ error: 'Error al guardar el producto' });
    }
});

// Listar todos los productos
app.get('/api/products', verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error al obtener productos:', err);
        return res.status(500).json({ error: 'Error al obtener productos' });
    }
});

// Buscar producto por código
app.get('/api/products/search', verifyAdmin, async (req, res) => {
    const { code } = req.query;
    if (!code) {
        return res.status(400).json({ error: 'Debe proporcionar un código para buscar' });
    }

    try {
        const result = await pool.query(
            'SELECT * FROM products WHERE code ILIKE $1',
            [`%${code}%`]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error en la búsqueda:', err);
        return res.status(500).json({ error: 'Error en la búsqueda' });
    }
});

// Puerto desde variable de entorno o 3000 por defecto
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`📊 Base de datos: PostgreSQL`);
});

// Manejo de errores de pool
pool.on('error', (err) => {
    console.error('Error inesperado en el pool de PostgreSQL:', err);
});
