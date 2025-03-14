// Wait for DOM to be loaded
document.addEventListener('DOMContentLoaded', () => {
    // Carrito de compras
    let cart = [];
    let cartTotal = 0;

    // Elementos del DOM
    const cartDOM = document.getElementById('cart');
    const cartItemsDOM = document.getElementById('cart-items');
    const cartTotalDOM = document.getElementById('cart-total');
    const cartButton = document.getElementById('cart-button');
    const checkoutButton = document.getElementById('checkout-button');
    const cartItemCount = document.getElementById('cart-item-count');

    // Funciones para actualizar el carrito
    function updateCartTotal() {
        cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
        cartTotalDOM.innerText = `$${cartTotal.toFixed(2)}`;
    }

    function updateCartItemCount() {
        let count = cart.reduce((total, item) => total + item.quantity, 0);
        cartItemCount.innerText = count;
    }

    function renderCart() {
        cartItemsDOM.innerHTML = '';
        cart.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `
                ${item.name} x ${item.quantity} - $${(item.price * item.quantity).toFixed(2)}
                <button class="remove-item" data-id="${item.id}">Eliminar</button>
            `;
            cartItemsDOM.appendChild(li);
        });
        updateCartTotal();
        updateCartItemCount();
    }

    function addToCart(event, name, price) {
        const existingItem = cart.find(item => item.name === name);
        const id = name.replace(/\s+/g, '') + price;
        
        // Get selected side option and condiments for burgers
        let sideOption = '';
        let condiments = [];
        if (name.toLowerCase().includes('hamburguesa')) {
            const menuItem = event.target.closest('.menu-item');
            const sideSelect = menuItem.querySelector('.side-select');
            if (sideSelect) {
                sideOption = sideSelect.value === 'francesa' ? ' con Papas Francesas' : ' con Papas Gajo';
            }
            
            // Get selected condiments
            const condimentChecks = menuItem.querySelectorAll('.condiments input[type="checkbox"]:checked');
            condiments = Array.from(condimentChecks).map(check => check.value);
            
            // Add condiments to name if any selected
            if (condiments.length > 0) {
                name = name + sideOption + ' con ' + condiments.join(', ');
            } else {
                name = name + sideOption;
            }
        }

        if (existingItem) {
            existingItem.quantity++;
        } else {
            cart.push({
                id: id,
                name: name,
                price: price,
                quantity: 1
            });
        }
        renderCart();
        cartDOM.classList.add('open');
    }

    // Event listeners
    document.querySelectorAll('.order-button').forEach(button => {
        button.addEventListener('click', (event) => {
            const product = event.target.getAttribute('data-product');
            const price = parseFloat(event.target.getAttribute('data-price'));
            addToCart(event, product, price);
        });
    });

    cartItemsDOM.addEventListener('click', (event) => {
        if (event.target.classList.contains('remove-item')) {
            const id = event.target.dataset.id;
            cart = cart.filter(item => item.id !== id);
            renderCart();
        }
    });

    cartButton.addEventListener('click', () => {
        cartDOM.classList.toggle('open');
    });

    checkoutButton.addEventListener('click', () => {
        if (cart.length === 0) {
            alert('El carrito está vacío');
            return;
        }

        // Create order summary
        let orderSummary = "🍔 *NUEVO PEDIDO* 🍔\n\n";
        cart.forEach(item => {
            orderSummary += `*${item.name}* x${item.quantity}\n$${(item.price * item.quantity).toFixed(2)}\n\n`;
        });
        orderSummary += `\n*Total: $${cartTotal.toFixed(2)}*`;

        // Show checkout form
        const customerName = prompt('Por favor, ingresa tu nombre:');
        if (!customerName) return;
        
        const customerAddress = prompt('Por favor, ingresa tu dirección de entrega:');
        if (!customerAddress) return;

        // Add customer info to order
        orderSummary = `*Cliente:* ${customerName}\n*Dirección:* ${customerAddress}\n\n${orderSummary}`;

        // Get notes for the order
        const notes = prompt('¿Alguna nota para su pedido?');
        if (notes) {
            orderSummary += `\n*Notas:* ${notes}`;
        }
        
        // Encode the message for WhatsApp URL
        const encodedMessage = encodeURIComponent(orderSummary);
        const whatsappUrl = `https://wa.me/529221593688?text=${encodedMessage}`;

        // Open WhatsApp in a new window
        window.open(whatsappUrl, '_blank');

        // Clear cart
        cart = [];
        renderCart();
        cartDOM.classList.remove('open');
    });

    // Hero Image Gallery
    const heroGallery = document.querySelector('.hero-gallery');
    if (heroGallery) {
        const images = heroGallery.querySelectorAll('img');
        let currentImage = 0;

        function rotateImages() {
            images.forEach(img => img.classList.remove('active'));
            images[currentImage].classList.add('active');
            currentImage = (currentImage + 1) % images.length;
        }

        // Initial state
        rotateImages();
        // Rotate images every 5 seconds
        setInterval(rotateImages, 5000);
    }

    // Check for missing images and replace with placeholders
    document.querySelectorAll('.menu-item img').forEach(img => {
        img.addEventListener('error', function() {
            this.src = `https://placehold.co/600x400/fdbd10/fff?text=${encodeURIComponent(this.alt)}`;
        });
    });
    
    // Inicialización
    renderCart();

    // Animaciones simples sin GSAP
    const header = document.querySelector('header');
    const hero = document.querySelector('#hero');
    
    header.style.opacity = 0;
    hero.style.opacity = 0;
    
    setTimeout(() => {
        header.style.transition = 'opacity 1s';
        header.style.opacity = 1;
        
        setTimeout(() => {
            hero.style.transition = 'opacity 1s';
            hero.style.opacity = 1;
        }, 500);
    }, 100);
});