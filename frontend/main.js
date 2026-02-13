document.addEventListener('DOMContentLoaded', () => {
    const addToCartButtons = document.querySelectorAll('.add-to-cart');
    const cartItemsCount = document.querySelector('.cart--icon span');
    const CartItemsList = document.querySelector('.cart--terms');
    const CartTotal = document.querySelector('.cart--total');
    const cartIcon = document.querySelector('.cart--icon');
    const sidebar = document.getElementById('sidebar');
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    
    let cartItems = [];
    let totalAmount = 0;

    // Función para actualizar la UI del carrito
    function updateCartUI() {
        updateCartItemCount();
        updateCartItemList();
        updateCartTotal();
    }

    function updateCartItemCount() {
        const count = cartItems.reduce((sum, it) => sum + it.quantity, 0);
        cartItemsCount.textContent = count;
    }

    function updateCartItemList() {
        CartItemsList.innerHTML = '';
        cartItems.forEach((item, index) => {
            const cartItem = document.createElement('div');
            cartItem.classList.add('cart--item', 'individual-cart--item');
            cartItem.innerHTML = `
                <span>${item.name} x ${item.quantity}</span>
                <span class="cart--item-price">${(item.price * item.quantity).toFixed(2)}</span>
                <button class="remove-btn" data-index="${index}"><i class="fa-solid fa-times"></i></button>
            `;
            CartItemsList.append(cartItem);
        });
        
        const removeButtons = CartItemsList.querySelectorAll('.remove-btn');
        removeButtons.forEach((button) => {
            button.addEventListener('click', (event) => {
                const index = event.currentTarget.dataset.index;
                removeItemFromCart(index);
            });
        });
    }

    function removeItemFromCart(index) {
        const removedItem = cartItems.splice(index, 1)[0];
        totalAmount -= removedItem.price * removedItem.quantity;
        updateCartUI();
    }

    function updateCartTotal() {
        CartTotal.textContent = `$${totalAmount.toFixed(2)}`;
    }

    // Función para agregar producto al carrito
    function addProductToCart(itemName, itemPrice) {
        const item = { name: itemName, price: itemPrice, quantity: 1 };
        const existingItem = cartItems.find((ci) => ci.name === item.name);
        
        if (existingItem) {
            existingItem.quantity++;
        } else {
            cartItems.push(item);
        }
        
        totalAmount += item.price;
        updateCartUI();
        
        // Abrir el sidebar automáticamente
        sidebar.classList.add('open');
        
        // Mensaje de confirmación
        showNotification(`${itemName} agregado al carrito`);
    }

    // Función para mostrar notificaciones
    function showNotification(message) {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 15px 25px;
            border-radius: 5px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Remover después de 3 segundos
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Event listeners para botones de agregar al carrito
    addToCartButtons.forEach((button) => {
        button.addEventListener('click', (event) => {
            const btn = event.currentTarget;
            const card = btn.closest('.card');
            if (!card) return;
            
            const nameEl = card.querySelector('.card--title');
            const priceEl = card.querySelector('.price');
            const itemName = nameEl ? nameEl.textContent.trim() : 'Item';
            const itemPrice = priceEl ? parseFloat(priceEl.textContent.replace(/[^0-9.]/g, '')) || 0 : 0;
            
            addProductToCart(itemName, itemPrice);
        });
    });

    // ========== FUNCIONALIDAD DE BÚSQUEDA ==========
    
    // Obtener todos los productos disponibles
    function getAllProducts() {
        const products = [];
        const cards = document.querySelectorAll('.card');
        
        cards.forEach(card => {
            const name = card.getAttribute('data-product-name') || 
                         card.querySelector('.card--title')?.textContent.trim();
            const priceText = card.getAttribute('data-product-price') || 
                             card.querySelector('.price')?.textContent;
            const price = parseFloat(priceText?.replace(/[^0-9.]/g, '')) || 0;
            const img = card.querySelector('img')?.src || '';
            
            if (name) {
                products.push({ name, price, img, element: card });
            }
        });
        
        return products;
    }

    // Función de búsqueda
    function searchProducts(query) {
        if (!query || query.trim() === '') {
            searchResults.style.display = 'none';
            return;
        }
        
        const allProducts = getAllProducts();
        const queryLower = query.toLowerCase().trim();
        
        // Buscar coincidencias
        const matches = allProducts.filter(product => 
            product.name.toLowerCase().includes(queryLower)
        );
        
        if (matches.length === 0) {
            searchResults.innerHTML = `
                <div class="search-no-results">
                    <i class="fa-solid fa-search"></i>
                    <p>No se encontraron productos que coincidan con "${query}"</p>
                </div>
            `;
            searchResults.style.display = 'block';
            return;
        }
        
        // Mostrar resultados
        let resultsHTML = '<div class="search-results-header">Resultados de búsqueda:</div>';
        resultsHTML += '<div class="search-results-list">';
        
        matches.forEach(product => {
            resultsHTML += `
                <div class="search-result-item" data-product-name="${product.name}" data-product-price="${product.price}">
                    <img src="${product.img}" alt="${product.name}" onerror="this.style.display='none'">
                    <div class="search-result-info">
                        <h5>${product.name}</h5>
                        <p class="search-result-price">$${product.price.toFixed(2)}</p>
                    </div>
                    <button class="search-add-to-cart">
                        <i class="fa-solid fa-plus"></i> Agregar
                    </button>
                </div>
            `;
        });
        
        resultsHTML += '</div>';
        searchResults.innerHTML = resultsHTML;
        searchResults.style.display = 'block';
        
        // Agregar event listeners a los botones de agregar desde búsqueda
        const addButtons = searchResults.querySelectorAll('.search-add-to-cart');
        addButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const resultItem = e.target.closest('.search-result-item');
                const name = resultItem.getAttribute('data-product-name');
                const price = parseFloat(resultItem.getAttribute('data-product-price'));
                
                addProductToCart(name, price);
                
                // Limpiar búsqueda
                searchInput.value = '';
                searchResults.style.display = 'none';
            });
        });
    }

    // Event listener para el input de búsqueda
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchProducts(e.target.value);
        });
        
        // Búsqueda al presionar Enter
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchProducts(e.target.value);
            }
        });
        
        // Limpiar resultados al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.style.display = 'none';
            }
        });
        
        // Prevenir que se cierre al hacer clic dentro
        searchResults.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // ========== FIN FUNCIONALIDAD DE BÚSQUEDA ==========

    // Event listener para abrir/cerrar carrito
    cartIcon.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    const closeButton = document.querySelector('.sidebar-close');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            sidebar.classList.remove('open');
        });
    }

    // Checkout
    const checkoutBtn = document.querySelector('.checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (cartItems.length === 0) {
                showNotification('El carrito está vacío');
                return;
            }
            
            showNotification('¡Gracias por tu compra!');
            
            // Limpiar carrito
            cartItems = [];
            totalAmount = 0;
            updateCartUI();
            sidebar.classList.remove('open');
        });
    }
});

// Agregar estilos CSS dinámicamente
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .search-results {
        position: absolute;
        top: 70px;
        left: 50%;
        transform: translateX(-50%);
        width: 90%;
        max-width: 600px;
        background: white;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        z-index: 1000;
        max-height: 500px;
        overflow-y: auto;
        animation: slideIn 0.3s ease;
    }
    
    .search-results-header {
        padding: 15px 20px;
        border-bottom: 2px solid #f0f0f0;
        font-weight: bold;
        color: #333;
        background: #f8f9fa;
        border-radius: 10px 10px 0 0;
    }
    
    .search-results-list {
        padding: 10px;
    }
    
    .search-result-item {
        display: flex;
        align-items: center;
        padding: 15px;
        border-bottom: 1px solid #eee;
        transition: background 0.2s;
        gap: 15px;
    }
    
    .search-result-item:hover {
        background: #f8f9fa;
    }
    
    .search-result-item:last-child {
        border-bottom: none;
    }
    
    .search-result-item img {
        width: 60px;
        height: 60px;
        object-fit: cover;
        border-radius: 8px;
        flex-shrink: 0;
    }
    
    .search-result-info {
        flex: 1;
    }
    
    .search-result-info h5 {
        margin: 0 0 5px 0;
        color: #333;
        font-size: 16px;
    }
    
    .search-result-price {
        margin: 0;
        color: #28a745;
        font-weight: bold;
        font-size: 18px;
    }
    
    .search-add-to-cart {
        background: #28a745;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 25px;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
        transition: all 0.3s;
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
    }
    
    .search-add-to-cart:hover {
        background: #218838;
        transform: scale(1.05);
    }
    
    .search-add-to-cart:active {
        transform: scale(0.95);
    }
    
    .search-no-results {
        padding: 40px 20px;
        text-align: center;
        color: #666;
    }
    
    .search-no-results i {
        font-size: 48px;
        color: #ddd;
        margin-bottom: 15px;
    }
    
    .search-no-results p {
        margin: 0;
        font-size: 16px;
    }
    
    /* Estilos para el input de búsqueda */
    .search--box input {
        transition: all 0.3s;
    }
    
    .search--box input:focus {
        outline: none;
        border-color: #28a745;
    }
    
    /* Responsive */
    @media (max-width: 768px) {
        .search-results {
            width: 95%;
            max-height: 400px;
        }
        
        .search-result-item {
            flex-direction: column;
            text-align: center;
        }
        
        .search-result-item img {
            width: 80px;
            height: 80px;
        }
    }
`;
document.head.appendChild(style);
