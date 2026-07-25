document.addEventListener('DOMContentLoaded', () => {

  // --- Mobile 60fps Scroll Smoothness Patch ---
  let passiveSupported = false;
  try {
    const options = Object.defineProperty({}, 'passive', {
      get: function() { passiveSupported = true; }
    });
    window.addEventListener('test', null, options);
  } catch (err) {}

  window.addEventListener('touchmove', function() {}, passiveSupported ? { passive: true } : false);

  // --- Cart State ---
  let cart = [];
  const taxRate = 0.08;

  // --- DOM Elements ---
  const openCartBtn = document.getElementById('openCartBtn');
  const closeCartBtn = document.getElementById('closeCartBtn');
  const cartDrawer = document.getElementById('cartDrawer');
  const cartOverlay = document.getElementById('cartOverlay');
  const cartItemsContainer = document.getElementById('cartItemsContainer');
  const emptyCartState = document.getElementById('emptyCartState');
  const cartCount = document.getElementById('cartCount');
  const cartSubtotal = document.getElementById('cartSubtotal');
  const cartTax = document.getElementById('cartTax');
  const cartTotal = document.getElementById('cartTotal');
  const placeOrderBtn = document.getElementById('placeOrderBtn');

  // Payment Modal Elements
  const paymentModalOverlay = document.getElementById('paymentModalOverlay');
  const closePaymentBtn = document.getElementById('closePaymentBtn');
  const payModalAmount = document.getElementById('payModalAmount');
  const confirmPayBtn = document.getElementById('confirmPayBtn');
  const payOptions = document.querySelectorAll('.pay-option');

  // Order Progress Modal Elements
  const orderModalOverlay = document.getElementById('orderModalOverlay');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const progressFill = document.getElementById('progressFill');
  const statusTitle = document.getElementById('statusTitle');
  const statusDesc = document.getElementById('statusDesc');
  const orderTicketNum = document.getElementById('orderTicketNum');
  const receiptItemsList = document.getElementById('receiptItemsList');
  const receiptTotalVal = document.getElementById('receiptTotalVal');

  // Hero Quick Order Button
  const quickOrderHeroBtn = document.getElementById('quickOrderHeroBtn');

  // --- 1. Drawer Toggling ---
  function openCart() {
    cartDrawer.classList.add('active');
    cartOverlay.classList.add('active');
  }

  function closeCart() {
    cartDrawer.classList.remove('active');
    cartOverlay.classList.remove('active');
  }

  if (openCartBtn) openCartBtn.addEventListener('click', openCart);
  if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

  // --- 2. Add to Cart Logic ---
  const addBtns = document.querySelectorAll('.card-add-btn');
  addBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const button = e.currentTarget;
      const id = button.getAttribute('data-id');
      const name = button.getAttribute('data-name');
      const price = parseFloat(button.getAttribute('data-price'));
      const img = button.getAttribute('data-img');

      addToCart(id, name, price, img);
      showToast(`${name} added to tray!`);
    });
  });

  function addToCart(id, name, price, img) {
    const existingItem = cart.find(item => item.id === id);
    if (existingItem) {
      existingItem.qty += 1;
    } else {
      cart.push({ id, name, price, img, qty: 1 });
    }
    updateCartUI();
  }

  function updateCartUI() {
    // Calculate total count
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    if (cartCount) cartCount.textContent = totalQty;

    // Render items
    if (cart.length === 0) {
      if (emptyCartState) emptyCartState.style.display = 'block';
      if (cartItemsContainer) {
        cartItemsContainer.innerHTML = '';
        cartItemsContainer.appendChild(emptyCartState);
      }
      if (placeOrderBtn) placeOrderBtn.disabled = true;
    } else {
      if (emptyCartState) emptyCartState.style.display = 'none';
      if (cartItemsContainer) {
        cartItemsContainer.innerHTML = '';
        cart.forEach(item => {
          const itemRow = document.createElement('div');
          itemRow.className = 'cart-item-row';
          itemRow.innerHTML = `
            <img src="${item.img}" class="cart-item-thumb" alt="${item.name}" onerror="this.src='https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=200'"/>
            <div class="cart-item-info">
              <div class="cart-item-title">${item.name}</div>
              <div class="cart-item-price">₹${(item.price * item.qty).toFixed(2)}</div>
            </div>
            <div class="cart-qty-controls">
              <button class="qty-btn dec-btn" data-id="${item.id}">-</button>
              <span>${item.qty}</span>
              <button class="qty-btn inc-btn" data-id="${item.id}">+</button>
            </div>
          `;
          cartItemsContainer.appendChild(itemRow);
        });

        // Add quantity listeners
        document.querySelectorAll('.dec-btn').forEach(b => {
          b.addEventListener('click', (e) => updateQty(e.target.getAttribute('data-id'), -1));
        });
        document.querySelectorAll('.inc-btn').forEach(b => {
          b.addEventListener('click', (e) => updateQty(e.target.getAttribute('data-id'), 1));
        });
      }
      if (placeOrderBtn) placeOrderBtn.disabled = false;
    }

    // Calculations
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    if (cartSubtotal) cartSubtotal.textContent = `₹${subtotal.toFixed(2)}`;
    if (cartTax) cartTax.textContent = `₹${tax.toFixed(2)}`;
    if (cartTotal) cartTotal.textContent = `₹${total.toFixed(2)}`;
  }

  function updateQty(id, change) {
    const item = cart.find(i => i.id === id);
    if (!item) return;

    item.qty += change;
    if (item.qty <= 0) {
      cart = cart.filter(i => i.id !== id);
    }
    updateCartUI();
  }

  // --- 3. Payment Section Workflow ---
  if (placeOrderBtn) {
    placeOrderBtn.addEventListener('click', () => {
      closeCart();
      const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
      const total = subtotal + (subtotal * taxRate);
      
      if (payModalAmount) payModalAmount.textContent = `₹${total.toFixed(2)}`;
      if (paymentModalOverlay) paymentModalOverlay.classList.add('active');
    });
  }

  if (closePaymentBtn) {
    closePaymentBtn.addEventListener('click', () => {
      if (paymentModalOverlay) paymentModalOverlay.classList.remove('active');
    });
  }

  // Handle Radio Selection Active Styles
  payOptions.forEach(option => {
    option.addEventListener('click', () => {
      payOptions.forEach(o => o.classList.remove('active'));
      option.classList.add('active');
      const radio = option.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
    });
  });

  // --- 4. Confirm Payment & Trigger Live Progress ---
  if (confirmPayBtn) {
    confirmPayBtn.addEventListener('click', () => {
      if (paymentModalOverlay) paymentModalOverlay.classList.remove('active');
      
      // Open Order Modal
      if (orderModalOverlay) orderModalOverlay.classList.add('active');

      // Reset Modal Visuals
      const ring = document.querySelector('.glowing-ring');
      const iconWrap = document.getElementById('statusIconWrap');
      if (ring) ring.style.display = 'block';
      if (iconWrap) {
        iconWrap.innerHTML = '<i class="fa-solid fa-fire"></i>';
      }

      // Set Ticket Number
      const randomTicket = '#' + Math.floor(1000 + Math.random() * 9000);
      if (orderTicketNum) orderTicketNum.textContent = randomTicket;

      // Populate Receipt Items
      if (receiptItemsList) {
        receiptItemsList.innerHTML = '';
        cart.forEach(item => {
          const row = document.createElement('div');
          row.className = 'receipt-line';
          row.style.color = '#94a3b8';
          row.innerHTML = `<span>${item.qty}x ${item.name}</span> <span>₹${(item.price * item.qty).toFixed(2)}</span>`;
          receiptItemsList.appendChild(row);
        });
      }

      // Calculate Total Amount
      const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
      const total = subtotal + (subtotal * taxRate);
      if (receiptTotalVal) receiptTotalVal.textContent = `₹${total.toFixed(2)}`;

      // Run Simulated Progress Bar Workflow
      runOrderAnimation();
    });
  }

  function runOrderAnimation() {
    let progress = 0;
    if (progressFill) progressFill.style.width = '0%';
    
    if (statusTitle) statusTitle.textContent = "Payment Verified!";
    if (statusDesc) statusDesc.textContent = "Transmitting recipe to Barista Station...";

    const interval = setInterval(() => {
      progress += 25;
      if (progressFill) progressFill.style.width = `${progress}%`;

      if (progress === 50) {
        if (statusTitle) statusTitle.textContent = "Brewing Coffee...";
        if (statusDesc) statusDesc.textContent = "Extracting espresso at 93.5°C thermal precision...";
      } else if (progress === 75) {
        if (statusTitle) statusTitle.textContent = "Final Touches...";
        if (statusDesc) statusDesc.textContent = "Pouring micro-foam and sealing order cup...";
      } else if (progress >= 100) {
        clearInterval(interval);
        if (statusTitle) statusTitle.textContent = "Order Ready!";
        if (statusDesc) statusDesc.textContent = "Your coffee is prepared. Please collect at counter.";
        
        // 🟢 GREEN TICK CODE
        const ring = document.querySelector('.glowing-ring');
        const iconWrap = document.getElementById('statusIconWrap');

        if (ring) ring.style.display = 'none';
        if (iconWrap) {
          iconWrap.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #00ff88; font-size: 3rem; transition: transform 0.3s ease;"></i>';
        }

        // Clear Cart after success
        cart = [];
        updateCartUI();
      }
    }, 1200);
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      if (orderModalOverlay) orderModalOverlay.classList.remove('active');
    });
  }

  // --- 5. Quick Order Hero Button ---
  if (quickOrderHeroBtn) {
    quickOrderHeroBtn.addEventListener('click', () => {
      addToCart("1", "Caramel Latte", 240, "Caramel Latte.jpg");
      openCart();
      showToast("Added Signature Caramel Latte!");
    });
  }

  // --- 6. Tab Filtering Logic ---
  const tabs = document.querySelectorAll('.cyber-tab');
  const menuCards = document.querySelectorAll('.menu-compact-card');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const category = tab.getAttribute('data-category');
      menuCards.forEach(card => {
        const cardCat = card.getAttribute('data-category');
        if (category === 'all' || cardCat === category) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // --- 7. Toast Notification Helper ---
  function showToast(message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color:var(--neon-cyan)"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  // --- 8. 3D Card Hover & Glow Effect ---
  const glassCards = document.querySelectorAll('.glass-card-3d');

  glassCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -8;
      const rotateY = ((x - centerX) / centerX) * 8;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
    });
  });

  // --- 9. Hero Stats Counter Animation ---
  function animateCounter(elementId, target, suffix, speed) {
    const el = document.getElementById(elementId);
    if (!el) return;
    let current = 0;
    const increment = Math.ceil(target / (speed / 16));
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      el.innerHTML = `${current}<span>${suffix}</span>`;
    }, 16);
  }

  animateCounter('statScore', 98, '%', 1200);
  animateCounter('statSteep', 24, 'h', 1000);
  animateCounter('statTime', 3, 'min', 800);
});