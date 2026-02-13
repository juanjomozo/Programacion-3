document.addEventListener('DOMContentLoaded', () =>  {
    const addToCartButtons = document.querySelectorAll('.add-to-cart');
    const cartItemsCount = document.querySelector('.cart--icon span');
    const CartItemsList = document.querySelector('.cart--terms');
    const CartTotal = document.querySelector('.cart--total');
    const cartIcon = document.querySelector('.cart--icon');
    const sidebar = document.getElementById('sidebar');
    let cartItems = [];
    let totalAmount = 0;
    function updateCartUI() {
        updateCartItemCount();
        updateCartItemList();
        updateCartTotal();
    }

    function updateCartItemCount() {
        // show total quantity of items in cart
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

    // add listeners to add-to-cart buttons (use card-scoped selectors so indices don't get mismatched)
    addToCartButtons.forEach((button) => {
        button.addEventListener('click', (event) => {
            const btn = event.currentTarget;
            const card = btn.closest('.card');
            if (!card) return;
            const nameEl = card.querySelector('.card--title');
            const priceEl = card.querySelector('.price');
            const itemName = nameEl ? nameEl.textContent.trim() : 'Item';
            const itemPrice = priceEl ? parseFloat(priceEl.textContent.replace(/[^0-9.]/g, '')) || 0 : 0;
            const item = { name: itemName, price: itemPrice, quantity: 1 };
            const existingItem = cartItems.find((ci) => ci.name === item.name);
            if (existingItem) {
                existingItem.quantity++;
            } else {
                cartItems.push(item);
            }
            totalAmount += item.price;
            updateCartUI();
        });
    });

    cartIcon.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });
    const closeButton = document.querySelector('.sidebar-close');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            sidebar.classList.remove('open');
        });
    }
    const checkoutBtn = document.querySelector('.checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            alert('thank you for your purchase');
            // clear cart state
            cartItems = [];
            totalAmount = 0;
            updateCartUI();
            sidebar.classList.remove('open');
        });
    }
});
