const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

const SECRET_KEY = 'mi_clave_secreta_super_segura'; // En producción usar variable de entorno

// -------------------- REGISTER --------------------
app.post('/api/register', (req, res) => {
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

    // Encriptar contraseña
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Insertar en DB
    db.run(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        [name, email, hashedPassword, role],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'El email ya está registrado' });
                }
                return res.status(500).json({ error: 'Error en el servidor' });
            }
            res.status(201).json({ message: 'Registro exitoso' });
        }
    );
});

// -------------------- LOGIN --------------------
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) return res.status(500).json({ error: 'Error en el servidor' });

        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const passwordMatch = bcrypt.compareSync(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Generar token simple (JWT)
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
    });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));

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
        req.user = decoded; // guardamos datos del usuario
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
};

// ------------------------------------------------------------
// PRODUCTOS (solo admin)
// ------------------------------------------------------------

// Crear producto
app.post('/api/products', verifyAdmin, (req, res) => {
    const { code, name, price, description } = req.body;

    // Validaciones
    if (!code || !name || !price) {
        return res.status(400).json({ error: 'Código, nombre y precio son obligatorios' });
    }

    if (isNaN(price) || Number(price) <= 0) {
        return res.status(400).json({ error: 'El precio debe ser un número positivo' });
    }

    // Insertar producto
    db.run(
        `INSERT INTO products (code, name, price, description, created_by) VALUES (?, ?, ?, ?, ?)`,
        [code, name, Number(price), description || null, req.user.id],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Ya existe un producto con ese código' });
                }
                console.error(err);
                return res.status(500).json({ error: 'Error al guardar el producto' });
            }
            res.status(201).json({ 
                message: 'Producto creado exitosamente',
                product: { id: this.lastID, code, name, price, description }
            });
        }
    );
});

// Listar todos los productos
app.get('/api/products', verifyAdmin, (req, res) => {
    db.all(`SELECT * FROM products ORDER BY id DESC`, [], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al obtener productos' });
        }
        res.json(rows);
    });
});

// Buscar producto por código (búsqueda exacta o parcial)
app.get('/api/products/search', verifyAdmin, (req, res) => {
    const { code } = req.query;
    if (!code) {
        return res.status(400).json({ error: 'Debe proporcionar un código para buscar' });
    }

    db.get(`SELECT * FROM products WHERE code LIKE ?`, [`%${code}%`], (err, product) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error en la búsqueda' });
        }
        if (!product) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.json(product);
    });
});