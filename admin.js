// GO MATA Admin Panel Logic (admin.js)

// Initialize Supabase Client
let supabase = null;
const isSupabaseConfigured = () => {
  return typeof SUPABASE_CONFIG !== 'undefined' && 
         SUPABASE_CONFIG.url && 
         !SUPABASE_CONFIG.url.includes('your-project-id') &&
         SUPABASE_CONFIG.anonKey &&
         !SUPABASE_CONFIG.anonKey.includes('your-anon-public-key');
};

if (isSupabaseConfigured()) {
  supabase = supabaseJs.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
} else {
  alert('Warning: Supabase keys are not configured in config.js. Admin login will be disabled until valid keys are supplied.');
}

// Global Application Data Cache
let ordersCache = [];
let productsCache = [];
let editingProductId = null;

// DOM Elements
const views = {
  loginGate: document.getElementById('login-gate'),
  adminApp: document.getElementById('admin-app'),
  loginForm: document.getElementById('login-form'),
  loginEmail: document.getElementById('login-email'),
  loginPassword: document.getElementById('login-password'),
  loginError: document.getElementById('login-error'),
  adminEmailDisplay: document.getElementById('admin-user-email'),
  logoutBtn: document.getElementById('logout-btn'),
  
  // Dashboard Tabs
  tabButtons: document.querySelectorAll('.nav-tab-link'),
  tabPanels: document.querySelectorAll('.tab-panel'),
  pendingBadge: document.getElementById('pending-orders-badge'),
  
  // Overview Widgets
  revenueValue: document.getElementById('stat-revenue'),
  ordersValue: document.getElementById('stat-orders-count'),
  aovValue: document.getElementById('stat-aov'),
  pendingValue: document.getElementById('stat-pending-count'),
  popularProducts: document.getElementById('popular-products-distribution'),
  
  // Tables
  ordersTableBody: document.getElementById('orders-table-body'),
  productsTableBody: document.getElementById('products-table-body'),
  
  // Product Modal
  productModal: document.getElementById('product-modal'),
  productForm: document.getElementById('product-catalog-form'),
  modalTitle: document.getElementById('modal-form-title'),
  closeFormBtn: document.getElementById('close-form-btn'),
  cancelFormBtn: document.getElementById('btn-cancel-form'),
  formError: document.getElementById('form-error'),
  addProductBtn: document.getElementById('add-product-btn'),
  
  // Modal Fields
  prodId: document.getElementById('prod-id'),
  prodTitle: document.getElementById('prod-title'),
  prodPrice: document.getElementById('prod-price'),
  prodOrigPrice: document.getElementById('prod-orig-price'),
  prodImage: document.getElementById('prod-image'),
  prodDesc: document.getElementById('prod-desc'),
  sizeRowsContainer: document.getElementById('form-size-rows'),
  specIngredients: document.getElementById('spec-ingredients'),
  specAllergen: document.getElementById('spec-allergen'),
  specFssai: document.getElementById('spec-fssai'),
  specMfg: document.getElementById('spec-mfg'),
  nutrEnergy: document.getElementById('nutr-energy'),
  nutrFat: document.getElementById('nutr-fat'),
  nutrSatFat: document.getElementById('nutr-sat-fat'),
  nutrChol: document.getElementById('nutr-chol'),
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  setupAuthListener();
  setupTabListener();
  setupFormListeners();
});

// --- AUTHENTICATION FLOW ---
function setupAuthListener() {
  if (!supabase) return;

  // Listen to auth changes
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event);
    if (session) {
      views.loginGate.style.display = 'none';
      views.adminApp.style.display = 'flex';
      views.adminEmailDisplay.textContent = session.user.email;
      loadStoreData();
    } else {
      views.loginGate.style.display = 'flex';
      views.adminApp.style.display = 'none';
    }
  });

  // Login form submission
  views.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    views.loginError.textContent = '';
    
    const email = views.loginEmail.value.trim();
    const password = views.loginPassword.value;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      showToast('Signed in successfully!', 'success');
    } catch (err) {
      views.loginError.textContent = err.message || 'Incorrect email or password.';
    }
  });

  // Logout button trigger
  views.logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    showToast('Logged out successfully.', 'success');
  });
}

// --- DATA ACCESS & CORRELATION ---
async function loadStoreData() {
  if (!supabase) return;

  try {
    await Promise.all([
      loadOrders(),
      loadProducts()
    ]);
    renderMetrics();
  } catch (err) {
    console.error('Failed to load store dataset:', err);
    showToast('Failed to load data from database.', 'error');
  }
}

async function loadOrders() {
  const { data, error } = await supabase.from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  
  ordersCache = data || [];
  renderOrdersTable();
  updateBadgeCounts();
}

async function loadProducts() {
  const { data, error } = await supabase.from('products')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  
  productsCache = data || [];
  renderProductsTable();
}

function updateBadgeCounts() {
  const pendingCount = ordersCache.filter(o => o.status === 'Pending').length;
  if (pendingCount > 0) {
    views.pendingBadge.textContent = pendingCount;
    views.pendingBadge.style.display = 'flex';
  } else {
    views.pendingBadge.style.display = 'none';
  }
}

// --- TAB SWITCHER LOGIC ---
function setupTabListener() {
  views.tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Toggle nav button classes
      views.tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Toggle tab panel classes
      const targetTab = btn.getAttribute('data-tab');
      views.tabPanels.forEach(panel => {
        if (panel.id === targetTab) {
          panel.classList.add('active');
        } else {
          panel.classList.remove('active');
        }
      });
    });
  });
}

// --- METRICS RENDERING (TAB A) ---
function renderMetrics() {
  const activeOrders = ordersCache.filter(o => o.status !== 'Cancelled');
  
  // 1. Gross Revenue
  const revenue = activeOrders.reduce((sum, o) => sum + o.grand_total, 0);
  views.revenueValue.textContent = `₹${revenue.toLocaleString('en-IN')}`;

  // 2. Orders Count
  views.ordersValue.textContent = ordersCache.length;

  // 3. Average Order Value
  const aov = activeOrders.length > 0 ? Math.round(revenue / activeOrders.length) : 0;
  views.aovValue.textContent = `₹${aov.toLocaleString('en-IN')}`;

  // 4. Pending Shipments
  const pendingShipments = ordersCache.filter(o => o.status === 'Pending' || o.status === 'In Progress').length;
  views.pendingValue.textContent = pendingShipments;

  // 5. Popular Products Chart
  renderPopularProductsChart();
}

function renderPopularProductsChart() {
  // Aggregate sales volume per product
  const productVolume = {};
  ordersCache.filter(o => o.status !== 'Cancelled').forEach(order => {
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach(item => {
        productVolume[item.title] = (productVolume[item.title] || 0) + item.qty;
      });
    }
  });

  const productData = Object.entries(productVolume).map(([name, qty]) => ({ name, qty }));
  
  // Sort by volume descending
  productData.sort((a, b) => b.qty - a.qty);
  
  const maxQty = productData.length > 0 ? productData[0].qty : 1;

  if (productData.length === 0) {
    views.popularProducts.innerHTML = `<p style="font-size: 0.85rem; color: var(--clr-gray-text); text-align: center; padding: 20px;">No sales data available yet.</p>`;
    return;
  }

  views.popularProducts.innerHTML = productData.map(item => {
    const percentage = Math.round((item.qty / maxQty) * 100);
    return `
      <div class="popular-item">
        <div class="popular-item-info">
          <span class="popular-item-name">${item.name}</span>
          <span class="popular-item-qty">${item.qty} units sold</span>
        </div>
        <div class="popular-item-bar-bg">
          <div class="popular-item-bar-fill" style="width: ${percentage}%;"></div>
        </div>
      </div>
    `;
  }).join('');
}

// --- CUSTOMER ORDERS TABLE RENDERING (TAB B) ---
function renderOrdersTable() {
  if (ordersCache.length === 0) {
    views.ordersTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-md">No customer orders placed yet.</td>
      </tr>
    `;
    return;
  }

  views.ordersTableBody.innerHTML = ordersCache.map((order, idx) => {
    const orderDate = new Date(order.created_at).toLocaleString('en-IN', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const statusClass = order.status.toLowerCase().replace(/\s+/g, '-');
    const itemsCount = order.items.reduce((sum, item) => sum + item.qty, 0);

    return `
      <tr class="order-row" onclick="toggleOrderDetails('${order.id}')" style="cursor: pointer;">
        <td class="font-mono font-bold">${order.order_number}</td>
        <td>
          <div style="font-weight: 500;">${order.customer_name}</div>
          <div style="font-size: 0.72rem; color: var(--clr-gray-text);">${order.customer_email}</div>
        </td>
        <td>${orderDate}</td>
        <td>${itemsCount} Items</td>
        <td class="font-mono">₹${order.grand_total.toLocaleString('en-IN')}</td>
        <td style="text-transform: uppercase;">${order.payment_method}</td>
        <td>
          <span class="status-badge ${statusClass}">${order.status}</span>
        </td>
        <td onclick="event.stopPropagation();">
          <select class="status-select" onchange="updateOrderStatus('${order.id}', this.value)">
            <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="In Progress" ${order.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option value="Shipped" ${order.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
            <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
            <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </td>
      </tr>
      <tr class="order-detail-row" id="detail-row-${order.id}" style="display: none;">
        <td colspan="8">
          <div class="order-detail-wrap">
            <div class="order-detail-grid">
              
              <!-- Left side: Items breakdown -->
              <div class="detail-block">
                <h4>Invoice Details</h4>
                <div class="detail-items-list">
                  ${order.items.map(item => `
                    <div class="detail-item-sub">
                      <span><strong>${item.title}</strong> (${item.size}) × ${item.qty}</span>
                      <span>₹${(item.price * item.qty).toLocaleString('en-IN')}</span>
                    </div>
                  `).join('')}
                  <div class="detail-item-sub" style="border-top: 1px solid var(--clr-border-light); font-weight: 500;">
                    <span>Subtotal:</span>
                    <span>₹${order.subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  ${order.discount > 0 ? `
                    <div class="detail-item-sub text-green">
                      <span>Discount Applied:</span>
                      <span>-₹${order.discount.toLocaleString('en-IN')}</span>
                    </div>
                  ` : ''}
                  <div class="detail-item-sub">
                    <span>Shipping Charges:</span>
                    <span>${order.shipping_cost > 0 ? `₹${order.shipping_cost}` : 'FREE'}</span>
                  </div>
                  <div class="detail-item-sub" style="border-top: 1px dashed var(--clr-border); font-size: 0.95rem; font-weight: 700; color: var(--clr-primary);">
                    <span>Grand Total:</span>
                    <span>₹${order.grand_total.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <!-- Right side: Shipping Info -->
              <div class="detail-block">
                <h4>Shipping &amp; Delivery Parameters</h4>
                <div class="detail-address-p" style="display: flex; flex-direction: column; gap: 6px;">
                  <p><strong>Recipient:</strong> ${order.customer_name}</p>
                  <p><strong>Full Address:</strong> ${order.shipping_address}, ${order.city}, ${order.state} - ${order.zip}</p>
                  <p><strong>Mobile Contact:</strong> +91 ${order.customer_phone}</p>
                  <p style="margin-top: 8px;"><strong>Delivery Speed:</strong> <span style="text-transform: capitalize; font-weight: 600; color: var(--clr-primary);">${order.shipping_method} Shipping</span></p>
                  <p><strong>Payment Status:</strong> <span style="font-weight: 600; color: var(--clr-accent-gold);">${order.payment_status}</span></p>
                </div>
              </div>

            </div>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.toggleOrderDetails = function(orderId) {
  const row = document.getElementById(`detail-row-${orderId}`);
  if (row.style.display === 'none') {
    row.style.display = 'table-row';
  } else {
    row.style.display = 'none';
  }
};

window.updateOrderStatus = async function(orderId, newStatus) {
  if (!supabase) return;

  try {
    const { error } = await supabase.from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);
      
    if (error) throw error;
    showToast(`Order status updated to "${newStatus}"`, 'success');
    
    // Refresh Cache locally
    const order = ordersCache.find(o => o.id === orderId);
    if (order) order.status = newStatus;
    
    renderOrdersTable();
    updateBadgeCounts();
    renderMetrics();
  } catch (err) {
    console.error('Failed to update status:', err);
    showToast('Failed to update order status.', 'error');
  }
};

// --- PRODUCTS CATALOG RENDERING (TAB C) ---
function renderProductsTable() {
  if (productsCache.length === 0) {
    views.productsTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-md">No products found in database catalog.</td>
      </tr>
    `;
    return;
  }

  views.productsTableBody.innerHTML = productsCache.map(product => {
    const sizeLabels = product.sizes.map(sz => `${sz.label} (₹${sz.price})`).join(', ');

    return `
      <tr>
        <td>
          <img src="${product.image}" alt="${product.title}" class="prod-table-img">
        </td>
        <td class="font-bold">${product.id}</td>
        <td style="font-weight: 500;">${product.title}</td>
        <td class="font-mono">₹${product.price.toLocaleString('en-IN')}</td>
        <td style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${sizeLabels}">${sizeLabels}</td>
        <td>
          <div class="action-btn-group">
            <button class="btn-icon edit-btn" onclick="openEditProductModal('${product.id}')" title="Edit Catalog Entry">
              <i class="far fa-edit"></i>
            </button>
            <button class="btn-icon delete-btn" onclick="deleteProduct('${product.id}')" title="Delete Catalog Entry">
              <i class="far fa-trash-alt"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// --- MODAL FORM ACTIONS ---
function setupFormListeners() {
  // Modal toggles
  views.addProductBtn.addEventListener('click', openAddProductModal);
  views.closeFormBtn.addEventListener('click', closeProductModal);
  views.cancelFormBtn.addEventListener('click', closeProductModal);

  // Form submission
  views.productForm.addEventListener('submit', handleFormSubmit);
}

function openProductModal() {
  views.productModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeProductModal() {
  views.productModal.classList.remove('active');
  document.body.style.overflow = '';
  views.productForm.reset();
  views.formError.textContent = '';
  editingProductId = null;
}

function openAddProductModal() {
  views.modalTitle.textContent = 'Add New Product';
  views.prodId.disabled = false;
  editingProductId = null;
  views.sizeRowsContainer.innerHTML = '';
  // Start with one size row
  addFormSizeRow();
  openProductModal();
}

window.openEditProductModal = function(productId) {
  const p = productsCache.find(prod => prod.id === productId);
  if (!p) return;

  editingProductId = productId;
  views.modalTitle.textContent = 'Edit Product Catalog Entry';
  
  // Fill inputs
  views.prodId.value = p.id;
  views.prodId.disabled = true; // Block editing primary key
  views.prodTitle.value = p.title;
  views.prodPrice.value = p.price;
  views.prodOrigPrice.value = p.original_price || '';
  views.prodImage.value = p.image;
  views.prodDesc.value = p.description;

  // Details specifications
  views.specIngredients.value = p.details.Ingredients || '';
  views.specAllergen.value = p.details['Allergen Info'] || '';
  views.specFssai.value = p.details['FSSAI Lic. No.'] || '22823039000092';
  views.specMfg.value = p.details['Manufactured By'] || '';

  // Nutrition
  views.nutrEnergy.value = p.nutrition?.Energy || '';
  views.nutrFat.value = p.nutrition?.['Total Fat'] || '';
  views.nutrSatFat.value = p.nutrition?.['Saturated Fat'] || '';
  views.nutrChol.value = p.nutrition?.Cholesterol || '';

  // Size Rows
  views.sizeRowsContainer.innerHTML = '';
  p.sizes.forEach(sz => {
    addFormSizeRow(sz.label, sz.price);
  });

  openProductModal();
};

window.addFormSizeRow = function(label = '', price = '') {
  const row = document.createElement('div');
  row.className = 'size-input-row';
  row.innerHTML = `
    <input type="text" placeholder="e.g. 500 ML" value="${label}" required style="flex: 2;">
    <input type="number" placeholder="Price (INR)" value="${price}" required style="flex: 2;">
    <button type="button" class="btn-mini-remove" onclick="removeFormSizeRow(this)"><i class="far fa-trash-alt"></i></button>
  `;
  views.sizeRowsContainer.appendChild(row);
};

window.removeFormSizeRow = function(button) {
  const container = views.sizeRowsContainer;
  if (container.children.length > 1) {
    button.closest('.size-input-row').remove();
  } else {
    showToast('At least one size option is required.', 'error');
  }
};

async function handleFormSubmit(e) {
  e.preventDefault();
  views.formError.textContent = '';
  
  if (!supabase) return;

  // Compile size rows
  const sizes = [];
  const rows = views.sizeRowsContainer.querySelectorAll('.size-input-row');
  rows.forEach(row => {
    const inputs = row.querySelectorAll('input');
    sizes.push({
      label: inputs[0].value.trim(),
      price: parseInt(inputs[1].value)
    });
  });

  if (sizes.length === 0) {
    views.formError.textContent = 'Please configure at least one size variant.';
    return;
  }

  // Compile product JSON
  const productData = {
    id: views.prodId.value.trim().toLowerCase().replace(/\s+/g, '-'),
    title: views.prodTitle.value.trim(),
    price: parseInt(views.prodPrice.value),
    original_price: views.prodOrigPrice.value ? parseInt(views.prodOrigPrice.value) : null,
    image: views.prodImage.value.trim() || 'assets/product_jar.jpg',
    description: views.prodDesc.value.trim(),
    details: {
      "Ingredients": views.specIngredients.value.trim(),
      "Allergen Info": views.specAllergen.value.trim(),
      "FSSAI Lic. No.": views.specFssai.value.trim() || '22823039000092',
      "Manufactured By": views.specMfg.value.trim(),
      "Marketed By": "Go Mata Original Ghee"
    },
    nutrition: {
      "Energy": views.nutrEnergy.value.trim(),
      "Total Fat": views.nutrFat.value.trim(),
      "Saturated Fat": views.nutrSatFat.value.trim(),
      "Cholesterol": views.nutrChol.value.trim()
    },
    sizes: sizes
  };

  const saveBtn = document.getElementById('btn-save-form');
  const origText = saveBtn.textContent;
  saveBtn.textContent = 'Saving...';
  saveBtn.disabled = true;

  try {
    const { data, error } = await supabase.from('products')
      .upsert([productData]);
      
    if (error) throw error;
    
    showToast(editingProductId ? 'Product updated successfully!' : 'New product created!', 'success');
    closeProductModal();
    loadStoreData();
  } catch (err) {
    console.error('Failed to save product details:', err);
    views.formError.textContent = err.message || 'Database transaction error.';
  } finally {
    saveBtn.textContent = origText;
    saveBtn.disabled = false;
  }
}

window.deleteProduct = async function(productId) {
  if (!supabase) return;
  if (!confirm(`Are you absolutely sure you want to delete the product ID "${productId}"? This action is permanent.`)) return;

  try {
    const { error } = await supabase.from('products')
      .delete()
      .eq('id', productId);
      
    if (error) throw error;
    showToast('Product removed from store catalog successfully.', 'success');
    loadStoreData();
  } catch (err) {
    console.error('Delete request failed:', err);
    showToast('Failed to delete product entry.', 'error');
  }
};

// --- DYNAMIC TOAST UTILITY ---
function showToast(message, type = 'success') {
  const container = document.getElementById('admin-toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `admin-toast ${type}`;
  toast.innerHTML = `
    <i class="${type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle'}"></i>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  
  // Transition in
  setTimeout(() => {
    toast.classList.add('active');
  }, 50);

  // Transition out and destroy
  setTimeout(() => {
    toast.classList.remove('active');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3500);
}
