// Gomata Original Ghee - E-commerce Logic (app.js)

// Supabase Client Initialization
let supabaseClient = null;
const isSupabaseConfigured = () => {
  return typeof SUPABASE_CONFIG !== 'undefined' && 
         SUPABASE_CONFIG.url && 
         !SUPABASE_CONFIG.url.includes('your-project-id') &&
         SUPABASE_CONFIG.anonKey &&
         !SUPABASE_CONFIG.anonKey.includes('your-anon-public-key');
};

if (isSupabaseConfigured()) {
  supabaseClient = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
}

// Local Product Database Fallback
const LOCAL_PRODUCTS_FALLBACK = {
  'desi-cow-ghee-jar': {
    id: 'desi-cow-ghee-jar',
    title: 'Go Mata Original Ghee (Desi Cow Ghee)',
    price: 1350,
    originalPrice: 1500,
    image: 'assets/product_jar.jpg',
    rating: 4.9,
    reviews: 142,
    description: 'Go Mata Original Ghee is made with the milk of Desi Cows who have year round access to natural green grass & leaves. Our Ghee is of the highest quality and brings purity, tradition and goodness to your home.',
    details: {
      'Ingredients': 'Milk Fat (From Cow Milk)',
      'Allergen Info': 'Contains Milk',
      'FSSAI Lic. No.': '22823039000092',
      'Manufactured By': 'Maa Tara Ghee, Nadia, West Bengal',
      'Marketed By': 'Go Mata Original Ghee',
      'Storage': 'Store in a cool, dry & hygienic place. Keep away from direct sunlight. Do not refrigerate.'
    },
    nutrition: {
      'Energy': '897.48 kcal',
      'Protein': '<0.1 g',
      'Carbohydrate': '<0.1 g',
      'Total Fat': '99.7 g',
      'Saturated Fat': '62.80 g',
      'Monounsaturated Fat': '19.68 g',
      'Polyunsaturated Fat': '2.78 g',
      'Trans Fat': '5.10 g',
      'Cholesterol': '250 mg'
    },
    sizes: [
      { label: '500 ML', price: 1350 },
      { label: '1 Ltr', price: 2550 }
    ]
  },
  'desi-ghee-pack-2': {
    id: 'desi-ghee-pack-2',
    title: 'Sustainable Duo (Pack of 2 Jars)',
    price: 2380,
    originalPrice: 2700,
    image: 'assets/product_jar.jpg',
    rating: 5.0,
    reviews: 88,
    description: 'A value pack containing two 500 ML jars of Go Mata Original Ghee, made with the milk of Desi Cows who graze freely on green pastures year-round. Brings purity, tradition and goodness to your family table.',
    details: {
      'Ingredients': 'Milk Fat (From Cow Milk)',
      'Allergen Info': 'Contains Milk',
      'FSSAI Lic. No.': '22823039000092',
      'Manufactured By': 'Maa Tara Ghee, Nadia, West Bengal',
      'Storage': 'Store in a cool, dry & hygienic place. Do not refrigerate.'
    },
    nutrition: {
      'Energy': '897.48 kcal',
      'Protein': '<0.1 g',
      'Carbohydrate': '<0.1 g',
      'Total Fat': '99.7 g',
      'Saturated Fat': '62.80 g',
      'Monounsaturated Fat': '19.68 g',
      'Polyunsaturated Fat': '2.78 g',
      'Trans Fat': '5.10 g',
      'Cholesterol': '250 mg'
    },
    sizes: [
      { label: '500 ML x 2', price: 2380 }
    ]
  },
  'heritage-steel-dolchi': {
    id: 'heritage-steel-dolchi',
    title: 'Heritage Steel Dolchi Edition',
    price: 4800,
    originalPrice: 5200,
    image: 'assets/product_jar.jpg',
    rating: 4.9,
    reviews: 65,
    description: 'Our premium Go Mata Original Ghee hand-ladled into a traditional stainless steel Dolchi container with handle. Filled with 2 litres of pure, granular Desi Cow Ghee. An eco-friendly keepsake designed to last for generations.',
    details: {
      'Quantity': '2 Litres (2000 ML)',
      'Container': 'Stainless Steel Dolchi',
      'Ingredients': 'Milk Fat (From Cow Milk)',
      'FSSAI Lic. No.': '22823039000092',
      'Manufactured By': 'Maa Tara Ghee, Nadia, West Bengal',
      'Storage': 'Store in a cool, dry & hygienic place. Keep away from direct sunlight.'
    },
    nutrition: {
      'Energy': '897.48 kcal',
      'Protein': '<0.1 g',
      'Carbohydrate': '<0.1 g',
      'Total Fat': '99.7 g',
      'Saturated Fat': '62.80 g',
      'Monounsaturated Fat': '19.68 g',
      'Polyunsaturated Fat': '2.78 g',
      'Trans Fat': '5.10 g',
      'Cholesterol': '250 mg'
    },
    sizes: [
      { label: '2 Ltr Dolchi', price: 4800 }
    ]
  }
};

// Global Catalog object
let PRODUCTS_DB = {};

// Load products from Supabase or fallback
async function loadProductsCatalog() {
  if (isSupabaseConfigured() && supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('products').select('*');
      if (error) throw error;
      
      if (data && data.length > 0) {
        PRODUCTS_DB = {};
        data.forEach(p => {
          PRODUCTS_DB[p.id] = {
            id: p.id,
            title: p.title,
            price: p.price,
            originalPrice: p.original_price,
            image: p.image,
            rating: parseFloat(p.rating || 5),
            reviews: parseInt(p.reviews || 0),
            description: p.description,
            details: p.details,
            nutrition: p.nutrition,
            sizes: p.sizes
          };
        });
        console.log('Successfully loaded products from Supabase');
        renderHomepageProducts();
        return;
      }
    } catch (e) {
      console.error('Supabase fetch failed, falling back to local dataset:', e);
    }
  }

  // Fallback
  PRODUCTS_DB = LOCAL_PRODUCTS_FALLBACK;
  renderHomepageProducts();
}

// Render dynamic storefront cards
function renderHomepageProducts() {
  const grid = document.querySelector('.product-grid');
  if (!grid) return;

  const products = Object.values(PRODUCTS_DB);
  grid.innerHTML = products.map(product => {
    // Calculate initial discount
    const initialPrice = product.sizes[0].price;
    const discountPct = product.originalPrice ? (product.originalPrice - initialPrice) / product.originalPrice : 0;
    
    return `
      <article class="product-card" data-product-id="${product.id}" data-discount-pct="${discountPct}" id="card-${product.id}">
        ${discountPct > 0 ? `<span class="product-badge-tag sale-badge">${Math.round(discountPct * 100)}% OFF</span>` : ''}
        <div class="product-image-container">
          <img src="${product.image}" alt="${product.title}">
          <button class="product-quick-view-btn" aria-label="Quick View ${product.title}" id="qv-${product.id}">Quick Shop</button>
        </div>
        <div class="product-info">
          <div class="product-rating">
            <div class="stars">
              ${'<i class="fas fa-star"></i>'.repeat(Math.floor(product.rating))}
              ${product.rating % 1 !== 0 ? '<i class="fas fa-star-half-alt"></i>' : ''}
            </div>
            <span class="rating-count">(${product.reviews} reviews)</span>
          </div>
          <h3 class="product-card-title">
            <a href="#" id="title-${product.id}">${product.title}</a>
          </h3>
          <p class="product-desc-excerpt">
            ${product.description.substring(0, 120)}...
          </p>
          
          <div class="product-selector">
            <span style="font-size: 0.7rem; font-weight: 600; color: var(--clr-primary); display: block; margin-bottom: 6px;">SELECT SIZE:</span>
            <div class="size-select-wrap">
              ${product.sizes.map((sz, idx) => `
                <button class="size-pill ${idx === 0 ? 'active' : ''}" data-price="${sz.price}">${sz.label}</button>
              `).join('')}
            </div>
          </div>

          <div class="product-price-row">
            <span class="price-current">₹${initialPrice.toLocaleString('en-IN')}</span>
            ${product.originalPrice ? `<span class="price-original">₹${product.originalPrice.toLocaleString('en-IN')}</span>` : ''}
          </div>
          
          <button class="add-to-cart-btn" id="atc-${product.id}">
            <i class="fas fa-shopping-basket"></i> Add to Cart
          </button>
        </div>
      </article>
    `;
  }).join('');
  
  // Re-bind listeners for the newly injected dynamic elements
  document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', handleAddToCartFromCard);
  });
  
  document.querySelectorAll('.product-quick-view-btn').forEach(btn => {
    btn.addEventListener('click', handleQuickView);
  });

  setupSizeSelectors();
}

// Application State
let cart = [];
let currentTestimonialIndex = 0;

// DOM Elements Cache
const elements = {
  header: document.querySelector('.main-header'),
  cartBtn: document.getElementById('cart-btn'),
  cartDrawer: document.getElementById('cart-drawer'),
  cartOverlay: document.getElementById('cart-drawer-overlay'),
  closeCartBtn: document.getElementById('close-cart-btn'),
  cartItemsList: document.getElementById('cart-items-list'),
  cartSubtotal: document.getElementById('cart-subtotal'),
  cartCount: document.getElementById('cart-count'),
  checkoutBtn: document.getElementById('checkout-btn'),
  
  // Quick View Modal
  modal: document.getElementById('product-modal'),
  modalOverlay: document.getElementById('modal-overlay'),
  closeModalBtn: document.getElementById('close-modal-btn'),
  modalGrid: document.querySelector('.modal-grid'),
  
  // Testimonial Slider
  testimonialSlides: document.querySelectorAll('.testimonial-slide'),
  testimonialDots: document.querySelectorAll('.slider-dot'),
  prevSlideBtn: document.getElementById('prev-slide'),
  nextSlideBtn: document.getElementById('next-slide'),
  
  // Mobile Nav Menu
  menuToggleBtn: document.getElementById('menu-toggle-btn'),
  mobileNavOverlay: document.getElementById('mobile-nav-overlay'),
  mobileNavDrawer: document.getElementById('mobile-nav-drawer'),
  closeMobileNavBtn: document.getElementById('close-mobile-nav'),
  
  // Toast container
  toastContainer: document.getElementById('toast-container')
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
  loadCartFromLocalStorage();
  await loadProductsCatalog();
  setupEventListeners();
  initTestimonialSlider();
});

// --- EVENT LISTENERS ---
function setupEventListeners() {
  // Sticky header scroll behavior
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      elements.header.classList.add('scroll-shadow');
    } else {
      elements.header.classList.remove('scroll-shadow');
    }
  });

  // Cart Drawer open/close
  if (elements.cartBtn) elements.cartBtn.addEventListener('click', openCart);
  if (elements.closeCartBtn) elements.closeCartBtn.addEventListener('click', closeCart);
  if (elements.cartOverlay) elements.cartOverlay.addEventListener('click', closeCart);

  // Mobile Nav Drawer open/close
  if (elements.menuToggleBtn) elements.menuToggleBtn.addEventListener('click', openMobileNav);
  if (elements.closeMobileNavBtn) elements.closeMobileNavBtn.addEventListener('click', closeMobileNav);
  if (elements.mobileNavOverlay) elements.mobileNavOverlay.addEventListener('click', closeMobileNav);

  // Close mobile nav when clicking a link
  document.querySelectorAll('.mobile-nav-links a').forEach(link => {
    link.addEventListener('click', closeMobileNav);
  });

  // Add to Cart from product cards
  document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', handleAddToCartFromCard);
  });

  // Quick View click handlers
  document.querySelectorAll('.product-quick-view-btn').forEach(btn => {
    btn.addEventListener('click', handleQuickView);
  });

  // Close Modal
  if (elements.closeModalBtn) elements.closeModalBtn.addEventListener('click', closeModal);
  if (elements.modalOverlay) elements.modalOverlay.addEventListener('click', (e) => {
    if (e.target === elements.modalOverlay) closeModal();
  });

  // Size selectors logic (changing size updates card price display)
  setupSizeSelectors();

  // Testimonials Navigation
  if (elements.prevSlideBtn) elements.prevSlideBtn.addEventListener('click', prevTestimonial);
  if (elements.nextSlideBtn) elements.nextSlideBtn.addEventListener('click', nextTestimonial);
  
  elements.testimonialDots.forEach(dot => {
    dot.addEventListener('click', () => {
      const index = parseInt(dot.getAttribute('data-index'));
      showTestimonial(index);
    });
  });

  // Newsletter form submission
  const newsletterForm = document.querySelector('.newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', handleNewsletterSubmit);
  }

  // Checkout trigger
  if (elements.checkoutBtn) {
    elements.checkoutBtn.addEventListener('click', handleCheckout);
  }
}

// --- CART STATE ACTIONS ---

function loadCartFromLocalStorage() {
  try {
    const savedCart = localStorage.getItem('gomata_ghee_cart');
    if (savedCart) {
      cart = JSON.parse(savedCart);
      updateCartUI();
    }
  } catch (e) {
    console.error('Failed to load cart from localStorage:', e);
  }
}

function saveCartToLocalStorage() {
  try {
    localStorage.setItem('gomata_ghee_cart', JSON.stringify(cart));
  } catch (e) {
    console.error('Failed to save cart to localStorage:', e);
  }
}

function addToCart(productId, sizeLabel, price, qty = 1) {
  const productInfo = PRODUCTS_DB[productId];
  if (!productInfo) return;

  const cartItemId = `${productId}-${sizeLabel.replace(/\s+/g, '-').toLowerCase()}`;
  const existingItem = cart.find(item => item.cartItemId === cartItemId);

  if (existingItem) {
    existingItem.qty += qty;
  } else {
    cart.push({
      cartItemId: cartItemId,
      productId: productId,
      title: productInfo.title,
      image: productInfo.image,
      size: sizeLabel,
      price: price,
      qty: qty
    });
  }

  saveCartToLocalStorage();
  updateCartUI();
  showToast(`Added ${productInfo.title} (${sizeLabel}) to cart!`);
}

function updateCartItemQty(cartItemId, newQty) {
  const item = cart.find(i => i.cartItemId === cartItemId);
  if (!item) return;

  item.qty = parseInt(newQty);
  if (item.qty <= 0) {
    cart = cart.filter(i => i.cartItemId !== cartItemId);
  }

  saveCartToLocalStorage();
  updateCartUI();
}

function removeCartItem(cartItemId) {
  cart = cart.filter(i => i.cartItemId !== cartItemId);
  saveCartToLocalStorage();
  updateCartUI();
}

function updateCartUI() {
  // Update counts
  const totalItemsCount = cart.reduce((total, item) => total + item.qty, 0);
  elements.cartCount.textContent = totalItemsCount;
  
  if (totalItemsCount > 0) {
    elements.cartCount.style.display = 'flex';
  } else {
    elements.cartCount.style.display = 'none';
  }

  // Calculate Subtotal
  const subtotal = cart.reduce((total, item) => total + (item.price * item.qty), 0);
  elements.cartSubtotal.textContent = `₹${subtotal.toLocaleString('en-IN')}`;

  // Populate Items list
  if (cart.length === 0) {
    elements.cartItemsList.innerHTML = `
      <div class="cart-empty-message">
        <i class="fas fa-shopping-basket"></i>
        <p>Your basket is currently empty.</p>
        <p style="font-size: 0.8rem; color: var(--clr-gray-text);">Add our nutritious Desi Cow Ghee to start caring for your wellness and local communities.</p>
      </div>
    `;
    elements.checkoutBtn.style.pointerEvents = 'none';
    elements.checkoutBtn.style.opacity = '0.5';
    elements.checkoutBtn.disabled = true;
  } else {
    elements.checkoutBtn.style.pointerEvents = 'auto';
    elements.checkoutBtn.style.opacity = '1';
    elements.checkoutBtn.disabled = false;
    
    elements.cartItemsList.innerHTML = cart.map(item => `
      <div class="cart-item">
        <div class="cart-item-img">
          <img src="${item.image}" alt="${item.title}">
        </div>
        <div class="cart-item-details">
          <div>
            <h4 class="cart-item-title">${item.title}</h4>
            <div class="cart-item-meta">Size: ${item.size}</div>
          </div>
          <div class="cart-item-bottom">
            <div class="qty-control">
              <button class="qty-btn" onclick="adjustItemQty('${item.cartItemId}', -1)">-</button>
              <div class="qty-val">${item.qty}</div>
              <button class="qty-btn" onclick="adjustItemQty('${item.cartItemId}', 1)">+</button>
            </div>
            <div class="cart-item-price">₹${(item.price * item.qty).toLocaleString('en-IN')}</div>
          </div>
        </div>
        <button class="remove-cart-item-btn" onclick="removeItem('${item.cartItemId}')">
          <i class="far fa-trash-alt"></i>
        </button>
      </div>
    `).join('');
  }
}

// Helper functions declared globally to allow onclick handlers
window.adjustItemQty = function(cartItemId, amount) {
  const item = cart.find(i => i.cartItemId === cartItemId);
  if (!item) return;
  updateCartItemQty(cartItemId, item.qty + amount);
};

window.removeItem = function(cartItemId) {
  removeCartItem(cartItemId);
};

// --- HANDLERS ---

function handleAddToCartFromCard(e) {
  e.preventDefault();
  const card = e.target.closest('.product-card');
  const productId = card.getAttribute('data-product-id');
  
  // Find active size option
  const activeSizePill = card.querySelector('.size-pill.active');
  const sizeLabel = activeSizePill ? activeSizePill.textContent.trim() : 'Standard';
  const price = parseInt(activeSizePill ? activeSizePill.getAttribute('data-price') : card.querySelector('.price-current').textContent.replace(/[^\d]/g, ''));

  addToCart(productId, sizeLabel, price, 1);
  openCart();
}

function handleQuickView(e) {
  e.preventDefault();
  const card = e.target.closest('.product-card');
  const productId = card.getAttribute('data-product-id');
  const productInfo = PRODUCTS_DB[productId];
  
  if (!productInfo) return;

  // Build modal contents dynamically
  let sizesHTML = productInfo.sizes.map((sz, idx) => `
    <button class="size-pill ${idx === 0 ? 'active' : ''}" data-price="${sz.price}" onclick="selectModalSize(this)">
      ${sz.label}
    </button>
  `).join('');

  let detailsHTML = Object.entries(productInfo.details).map(([key, val]) => `
    <li><strong>${key}:</strong> <span>${val}</span></li>
  `).join('');

  let nutritionHTML = '';
  if (productInfo.nutrition) {
    const rows = Object.entries(productInfo.nutrition).map(([key, val]) => `
      <tr style="border-bottom: 1px solid var(--clr-border-light);">
        <td style="padding: 4px 0; font-size: 0.75rem; font-weight: 500; color: var(--clr-primary);">${key}</td>
        <td style="padding: 4px 0; font-size: 0.75rem; text-align: right; color: var(--clr-gray-text);">${val}</td>
      </tr>
    `).join('');
    
    nutritionHTML = `
      <div class="nutrition-table-wrap" style="margin-top: 15px; border-top: 1px dashed var(--clr-border); padding-top: 15px; margin-bottom: 15px;">
        <span style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: var(--clr-primary); display: block; margin-bottom: 6px;">Nutritional Info (per 100g):</span>
        <table style="width: 100%; border-collapse: collapse;">
          ${rows}
        </table>
      </div>
    `;
  }

  elements.modalGrid.innerHTML = `
    <div class="modal-media">
      <img src="${productInfo.image}" alt="${productInfo.title}">
    </div>
    <div class="modal-content" style="max-height: 85vh; overflow-y: auto;">
      <h3 class="modal-title">${productInfo.title}</h3>
      <div class="product-rating">
        <div class="stars">
          ${'<i class="fas fa-star"></i>'.repeat(Math.floor(productInfo.rating))}
          ${productInfo.rating % 1 !== 0 ? '<i class="fas fa-star-half-alt"></i>' : ''}
        </div>
        <span class="rating-count">(${productInfo.reviews} Customer reviews)</span>
      </div>
      <div class="modal-price-row">
        <span class="price-current" id="modal-price-display">₹${productInfo.price.toLocaleString('en-IN')}</span>
        ${productInfo.originalPrice ? `<span class="price-original">₹${productInfo.originalPrice.toLocaleString('en-IN')}</span>` : ''}
      </div>
      <p class="modal-desc">${productInfo.description}</p>
      
      <div class="product-selector">
        <span style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: var(--clr-primary); display: block; margin-bottom: 8px;">Select Size:</span>
        <div class="size-select-wrap">
          ${sizesHTML}
        </div>
      </div>

      <ul class="modal-meta-list" style="margin-bottom: 15px;">
        ${detailsHTML}
      </ul>

      ${nutritionHTML}

      <div class="modal-qty-btn-row">
        <div class="qty-control" style="height: 48px;">
          <button class="qty-btn" style="width: 36px; height: 46px;" id="modal-qty-dec">-</button>
          <div class="qty-val" style="width: 44px; font-size: 1rem;" id="modal-qty-val">1</div>
          <button class="qty-btn" style="width: 36px; height: 46px;" id="modal-qty-inc">+</button>
        </div>
        <button class="btn btn-primary" id="modal-add-to-cart-btn" style="flex-grow: 1; padding: 0;" onclick="handleModalAddToCart('${productInfo.id}')">
          Add To Cart
        </button>
      </div>
    </div>
  `;

  // Setup quantity listener inside modal
  const qtyVal = document.getElementById('modal-qty-val');
  document.getElementById('modal-qty-inc').addEventListener('click', () => {
    qtyVal.textContent = parseInt(qtyVal.textContent) + 1;
  });
  document.getElementById('modal-qty-dec').addEventListener('click', () => {
    const val = parseInt(qtyVal.textContent);
    if (val > 1) qtyVal.textContent = val - 1;
  });

  openModal();
}

// Global modal helpers
window.selectModalSize = function(element) {
  // Deactivate siblings
  const parent = element.parentElement;
  parent.querySelectorAll('.size-pill').forEach(btn => btn.classList.remove('active'));
  element.classList.add('active');

  // Update modal price display
  const price = parseInt(element.getAttribute('data-price'));
  document.getElementById('modal-price-display').textContent = `₹${price.toLocaleString('en-IN')}`;
};

window.handleModalAddToCart = function(productId) {
  const activeSizePill = document.querySelector('.modal-content .size-pill.active');
  const sizeLabel = activeSizePill ? activeSizePill.textContent.trim() : 'Standard';
  const price = parseInt(activeSizePill.getAttribute('data-price'));
  const qty = parseInt(document.getElementById('modal-qty-val').textContent);

  addToCart(productId, sizeLabel, price, qty);
  closeModal();
  openCart();
};

// Size selector click on product grid cards
function setupSizeSelectors() {
  document.querySelectorAll('.product-card').forEach(card => {
    card.querySelectorAll('.size-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        // Remove active class from sibling pills
        card.querySelectorAll('.size-pill').forEach(btn => btn.classList.remove('active'));
        pill.classList.add('active');

        // Update card price display
        const targetPrice = parseInt(pill.getAttribute('data-price'));
        const discountPercentage = parseFloat(card.getAttribute('data-discount-pct') || 0);
        
        const priceCurrent = card.querySelector('.price-current');
        priceCurrent.textContent = `₹${targetPrice.toLocaleString('en-IN')}`;

        const priceOriginal = card.querySelector('.price-original');
        if (priceOriginal) {
          const origPrice = Math.round(targetPrice / (1 - discountPercentage));
          priceOriginal.textContent = `₹${origPrice.toLocaleString('en-IN')}`;
        }
      });
    });
  });
}

// Cart Open/Close UI Actions
function openCart() {
  elements.cartDrawer.classList.add('active');
  elements.cartOverlay.classList.add('active');
  document.body.style.overflow = 'hidden'; // prevent background scrolling
}

function closeCart() {
  elements.cartDrawer.classList.remove('active');
  elements.cartOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

// Mobile navigation Open/Close
function openMobileNav() {
  elements.mobileNavDrawer.classList.add('active');
  elements.mobileNavOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeMobileNav() {
  elements.mobileNavDrawer.classList.remove('active');
  elements.mobileNavOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

// Modal open/close
function openModal() {
  elements.modalOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  elements.modalOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

// Toast triggers
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <i class="fas fa-check-circle"></i>
    <span>${message}</span>
  `;
  elements.toastContainer.appendChild(toast);
  
  // Trigger transition
  setTimeout(() => {
    toast.classList.add('active');
  }, 50);

  // Remove toast
  setTimeout(() => {
    toast.classList.remove('active');
    setTimeout(() => {
      toast.remove();
    }, 400);
  }, 3500);
}

// Testimonials Slider Logic
function initTestimonialSlider() {
  if (elements.testimonialSlides.length === 0) return;
  showTestimonial(0);
}

function showTestimonial(index) {
  elements.testimonialSlides.forEach(slide => slide.classList.remove('active'));
  elements.testimonialDots.forEach(dot => dot.classList.remove('active'));
  
  // Wrap index around
  if (index >= elements.testimonialSlides.length) {
    currentTestimonialIndex = 0;
  } else if (index < 0) {
    currentTestimonialIndex = elements.testimonialSlides.length - 1;
  } else {
    currentTestimonialIndex = index;
  }

  elements.testimonialSlides[currentTestimonialIndex].classList.add('active');
  elements.testimonialDots[currentTestimonialIndex].classList.add('active');
}

function nextTestimonial() {
  showTestimonial(currentTestimonialIndex + 1);
}

function prevTestimonial() {
  showTestimonial(currentTestimonialIndex - 1);
}

// Form validation / triggers
function handleNewsletterSubmit(e) {
  e.preventDefault();
  const emailInput = document.querySelector('.newsletter-input');
  const email = emailInput.value.trim();

  if (email && validateEmail(email)) {
    showToast("Thank you for joining our community circles!");
    emailInput.value = '';
  } else {
    showToast("Please enter a valid email address.");
  }
}

function validateEmail(email) {
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

// Redirect to Checkout Page
function handleCheckout() {
  if (cart.length === 0) return;
  window.location.href = 'checkout.html';
}
