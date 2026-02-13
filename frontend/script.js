// Configuración de API URL - Detecta automáticamente si estás en local o en producción
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : window.location.origin; // Usa la URL actual en producción

console.log('🌐 API URL:', API_URL); // Para debug

// Alternar formularios
function showForm(formId) {
    document.querySelectorAll('.form-box').forEach(form => form.classList.remove('active'));
    const target = document.getElementById(formId);
    if (target) target.classList.add('active');
}

// Verificar sesión activa al cargar la página
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || 'null');
if (token && user) {
    document.querySelector('.container').style.display = 'none';
    if (user.role === 'admin') {
        document.getElementById('admin-panel').style.display = 'block';
        cargarProductos();
    } else {
        // Para este ejemplo, mostramos login/register igualmente
        document.querySelector('.container').style.display = 'block';
    }
}

// Limpiar mensajes al cambiar de formulario
document.querySelectorAll('.form-box a').forEach(link => {
    link.addEventListener('click', () => {
        document.querySelectorAll('.message').forEach(msg => msg.style.display = 'none');
    });
});

// ---------- LOGIN ----------
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = e.target.email.value;
    const password = e.target.password.value;
    const errorDiv = document.getElementById('loginError');

    errorDiv.style.display = 'none';
    errorDiv.innerText = '';

    try {
        const response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Error en el login');
        }

        // Guardar token y usuario
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        alert(`Bienvenido ${data.user.name}.`);

        // Ocultar formularios de login/registro y mostrar panel según rol
        document.querySelector('.container').style.display = 'none';
        if (data.user.role === 'admin') {
            document.getElementById('admin-panel').style.display = 'block';
            cargarProductos(); // Carga inicial de productos
        } else {
            // Redirigir a cart.html si es usuario normal
            window.location.href = '/cart';
        }

    } catch (error) {
        errorDiv.innerText = error.message;
        errorDiv.style.display = 'block';
    }
});

// ---------- REGISTER ----------
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = e.target.name.value;
    const email = e.target.email.value;
    const password = e.target.password.value;
    const role = e.target.role.value;

    const errorDiv = document.getElementById('registerError');
    const successDiv = document.getElementById('registerSuccess');

    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';
    errorDiv.innerText = '';
    successDiv.innerText = '';

    try {
        const response = await fetch(`${API_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Error en el registro');
        }

        // Mostrar mensaje de éxito
        successDiv.innerText = data.message;
        successDiv.style.display = 'block';
        e.target.reset(); // limpiar formulario

        // Opcional: cambiar al login tras 2 segundos
        setTimeout(() => showForm('login-form'), 2000);

    } catch (error) {
        errorDiv.innerText = error.message;
        errorDiv.style.display = 'block';
    }
});

// --- Funciones para productos (solo admin) ---

// Configuración común para fetch con token
async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No autenticado');

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };

    return fetch(url, { ...options, headers });
}

// Mostrar mensajes en el panel de admin
function mostrarAdminMensaje(texto, esError = true) {
    const msgDiv = document.getElementById('adminMessage');
    msgDiv.innerHTML = texto;
    msgDiv.style.display = 'block';
    msgDiv.style.color = esError ? '#dc3545' : '#28a745';
    setTimeout(() => msgDiv.style.display = 'none', 4000);
}

// Crear producto
document.getElementById('createProductForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const code = form.code.value.trim();
    const name = form.name.value.trim();
    const price = parseFloat(form.price.value);
    const description = form.description.value.trim();

    // Validación extra en frontend
    if (price <= 0) {
        mostrarAdminMensaje('El precio debe ser mayor a cero', true);
        return;
    }

    try {
        const response = await fetchWithAuth(`${API_URL}/api/products`, {
            method: 'POST',
            body: JSON.stringify({ code, name, price, description })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Error al crear producto');

        mostrarAdminMensaje(data.message, false);
        form.reset();
        cargarProductos(); // refresca la lista
    } catch (error) {
        mostrarAdminMensaje(error.message, true);
    }
});

// Cargar y mostrar todos los productos
async function cargarProductos() {
    try {
        const response = await fetchWithAuth(`${API_URL}/api/products`);
        const products = await response.json();
        if (!response.ok) throw new Error(products.error || 'Error al cargar productos');

        const container = document.getElementById('productList');
        if (products.length === 0) {
            container.innerHTML = '<p>No hay productos registrados.</p>';
            return;
        }

        let html = '<table border="1" style="width:100%; border-collapse: collapse;">';
        html += '<tr><th>Código</th><th>Nombre</th><th>Precio</th><th>Descripción</th></tr>';
        products.forEach(p => {
            html += `<tr>
                        <td>${p.code}</td>
                        <td>${p.name}</td>
                        <td>$${Number(p.price).toFixed(2)}</td>
                        <td>${p.description || ''}</td>
                    </tr>`;
        });
        html += '</table>';
        container.innerHTML = html;
    } catch (error) {
        mostrarAdminMensaje(error.message, true);
    }
}

// Buscar producto por código
document.getElementById('searchBtn').addEventListener('click', async () => {
    const code = document.getElementById('searchCode').value.trim();
    if (!code) {
        mostrarAdminMensaje('Ingrese un código para buscar', true);
        return;
    }

    try {
        const response = await fetchWithAuth(`${API_URL}/api/products/search?code=${encodeURIComponent(code)}`);
        const product = await response.json();

        if (!response.ok) throw new Error(product.error || 'Producto no encontrado');

        const resultDiv = document.getElementById('searchResult');
        resultDiv.innerHTML = `
            <div style="border:1px solid #ccc; padding:10px; margin-top:10px;">
                <strong>${product.code}</strong> - ${product.name}<br>
                Precio: $${Number(product.price).toFixed(2)}<br>
                Descripción: ${product.description || 'N/A'}
            </div>
        `;
    } catch (error) {
        document.getElementById('searchResult').innerHTML = `<span style="color:red;">${error.message}</span>`;
    }
});

// Botón para refrescar la lista
document.getElementById('refreshProducts').addEventListener('click', cargarProductos);

// Cerrar sesión
document.getElementById('logoutLink').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    document.getElementById('admin-panel').style.display = 'none';
    document.querySelector('.container').style.display = 'block'; // muestra login/register
    // Limpiar cualquier mensaje
});
