// GO MATA ORIGINAL GHEE - Checkout Page JS

// Supabase Client Initialization
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
}

// Application State
let cart = [];
let appliedCoupon = null;
let currentPaymentMethod = 'upi'; // 'upi', 'card', 'cod'

// Price Calculation State
let subtotal = 0;
let shippingCost = 0;
let discountAmount = 0;
let codFee = 0;
let grandTotal = 0;

// DOM Elements Cache
const elements = {
  summaryItemsList: document.getElementById('checkout-summary-items'),
  subtotalDisplay: document.getElementById('summary-subtotal'),
  discountRow: document.getElementById('discount-row'),
  discountPercent: document.getElementById('discount-percent'),
  discountDisplay: document.getElementById('summary-discount'),
  shippingDisplay: document.getElementById('summary-shipping'),
  codFeeRow: document.getElementById('cod-fee-row'),
  grandTotalDisplay: document.getElementById('summary-grand-total'),
  
  // Coupon elements
  couponInput: document.getElementById('coupon-input'),
  applyCouponBtn: document.getElementById('apply-coupon-btn'),
  couponFeedback: document.getElementById('coupon-feedback'),
  
  // Form fields
  form: document.getElementById('checkout-main-form'),
  emailInput: document.getElementById('contact-email'),
  phoneInput: document.getElementById('contact-phone'),
  nameInput: document.getElementById('shipping-name'),
  address1Input: document.getElementById('shipping-address-1'),
  address2Input: document.getElementById('shipping-address-2'),
  cityInput: document.getElementById('shipping-city'),
  stateInput: document.getElementById('shipping-state'),
  zipInput: document.getElementById('shipping-zip'),
  
  // Radios and tabs
  shippingRadios: document.getElementsByName('shipping_method'),
  paymentTabs: document.querySelectorAll('.payment-tab-btn'),
  paymentContents: document.querySelectorAll('.payment-tab-content'),
  
  // UPI fields
  upiInput: document.getElementById('upi-id-input'),
  upiSuccess: document.getElementById('upi-success'),
  upiError: document.getElementById('upi-error'),
  
  // Card fields
  cardNumber: document.getElementById('card-number'),
  cardExpiry: document.getElementById('card-expiry'),
  cardCvv: document.getElementById('card-cvv'),
  
  // Submit & Loading
  submitCta: document.getElementById('place-order-cta'),
  loadingOverlay: document.getElementById('loading-overlay'),
  loadingStatus: document.getElementById('loading-status-text'),
  
  // Success Modal
  successOverlay: document.getElementById('success-modal-overlay'),
  receiptOrderId: document.getElementById('receipt-order-id'),
  receiptDate: document.getElementById('receipt-date'),
  receiptItems: document.getElementById('receipt-items-list'),
  receiptSubtotal: document.getElementById('receipt-subtotal'),
  receiptDiscountRow: document.getElementById('receipt-discount-row'),
  receiptDiscount: document.getElementById('receipt-discount'),
  receiptShipping: document.getElementById('receipt-shipping'),
  receiptGrandTotal: document.getElementById('receipt-grand-total'),
  receiptName: document.getElementById('receipt-customer-name'),
  receiptAddress: document.getElementById('receipt-address-details'),
  receiptPhone: document.getElementById('receipt-phone'),
  receiptShippingMode: document.getElementById('receipt-shipping-mode'),
  receiptHomeBtn: document.getElementById('receipt-home-btn')
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  loadCart();
  if (cart.length === 0) {
    alert('Your basket is empty. Redirecting to home page.');
    window.location.href = 'index.html';
    return;
  }
  
  setupListeners();
  calculateTotals();
});

// --- LOAD CART ---
function loadCart() {
  try {
    const savedCart = localStorage.getItem('gomata_ghee_cart');
    if (savedCart) {
      cart = JSON.parse(savedCart);
    }
  } catch (e) {
    console.error('Failed to load cart:', e);
  }
}

function saveCart() {
  try {
    localStorage.setItem('gomata_ghee_cart', JSON.stringify(cart));
  } catch (e) {
    console.error('Failed to save cart:', e);
  }
}

// --- SETUP EVENT LISTENERS ---
function setupListeners() {
  // Update totals when shipping method changes
  elements.shippingRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      // Add visual active class to the selected custom radio card
      document.querySelectorAll('.custom-radio-card').forEach(card => card.classList.remove('active'));
      radio.closest('.custom-radio-card').classList.add('active');
      calculateTotals();
    });
  });

  // Payment method tab switching
  elements.paymentTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      elements.paymentTabs.forEach(btn => btn.classList.remove('active'));
      elements.paymentContents.forEach(content => content.classList.remove('active'));
      
      tab.classList.add('active');
      const targetId = tab.getAttribute('data-target');
      document.getElementById(targetId).classList.add('active');
      
      // Update payment state
      if (targetId === 'payment-upi') currentPaymentMethod = 'upi';
      else if (targetId === 'payment-card') currentPaymentMethod = 'card';
      else if (targetId === 'payment-cod') currentPaymentMethod = 'cod';
      
      calculateTotals();
    });
  });

  // Coupon code application
  elements.applyCouponBtn.addEventListener('click', applyCoupon);
  elements.couponInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyCoupon();
    }
  });

  // Card formatting helpers
  if (elements.cardNumber) {
    elements.cardNumber.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '');
      let formatted = value.match(/.{1,4}/g);
      e.target.value = formatted ? formatted.join(' ') : '';
    });
  }

  if (elements.cardExpiry) {
    elements.cardExpiry.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length > 2) {
        e.target.value = value.substring(0, 2) + '/' + value.substring(2, 4);
      } else {
        e.target.value = value;
      }
    });
  }

  // Live input validations to clear errors
  setupLiveValidation();

  // Submit Order button
  elements.submitCta.addEventListener('click', handleOrderSubmission);

  // Success home redirect
  elements.receiptHomeBtn.addEventListener('click', () => {
    // Clear cart completely
    cart = [];
    saveCart();
  });
}

// --- RENDER SUMMARY ITEMS ---
function renderSummary() {
  if (cart.length === 0) {
    elements.summaryItemsList.innerHTML = `<p class="text-center">Your basket is empty.</p>`;
    return;
  }

  elements.summaryItemsList.innerHTML = cart.map(item => `
    <div class="summary-item" data-id="${item.cartItemId}">
      <div class="summary-item-img">
        <img src="${item.image}" alt="${item.title}">
      </div>
      <div class="summary-item-info">
        <h4>${item.title}</h4>
        <div class="summary-item-meta">Size: ${item.size}</div>
        <div class="summary-item-qty-row">
          <div class="qty-control mini">
            <button class="qty-btn" type="button" onclick="adjustCheckoutQty('${item.cartItemId}', -1)">-</button>
            <div class="qty-val">${item.qty}</div>
            <button class="qty-btn" type="button" onclick="adjustCheckoutQty('${item.cartItemId}', 1)">+</button>
          </div>
          <button type="button" class="remove-link-btn" onclick="removeCheckoutItem('${item.cartItemId}')">Remove</button>
        </div>
      </div>
      <div class="summary-item-price-col">
        <span>₹${(item.price * item.qty).toLocaleString('en-IN')}</span>
      </div>
    </div>
  `).join('');
}

// Global hooks for quantity adjustment on checkout page
window.adjustCheckoutQty = function(cartItemId, amount) {
  const item = cart.find(i => i.cartItemId === cartItemId);
  if (!item) return;

  item.qty += amount;
  if (item.qty <= 0) {
    cart = cart.filter(i => i.cartItemId !== cartItemId);
  }

  saveCart();
  if (cart.length === 0) {
    window.location.href = 'index.html';
  } else {
    renderSummary();
    calculateTotals();
  }
};

window.removeCheckoutItem = function(cartItemId) {
  cart = cart.filter(i => i.cartItemId !== cartItemId);
  saveCart();
  if (cart.length === 0) {
    window.location.href = 'index.html';
  } else {
    renderSummary();
    calculateTotals();
  }
};

// --- CALCULATE TOTALS ---
function calculateTotals() {
  renderSummary();
  
  // Calculate Subtotal
  subtotal = cart.reduce((total, item) => total + (item.price * item.qty), 0);
  elements.subtotalDisplay.textContent = `₹${subtotal.toLocaleString('en-IN')}`;

  // 1. Calculate Coupon Discount
  discountAmount = 0;
  if (appliedCoupon === 'GOMATA10') {
    discountAmount = Math.round(subtotal * 0.10);
    elements.discountPercent.textContent = '10%';
    elements.discountDisplay.textContent = `-₹${discountAmount.toLocaleString('en-IN')}`;
    elements.discountRow.style.display = 'flex';
  } else {
    elements.discountRow.style.display = 'none';
  }

  // 2. Calculate Shipping Cost
  const activeShipping = document.querySelector('input[name="shipping_method"]:checked').value;
  
  // Standard Delivery pricing logic
  if (activeShipping === 'standard') {
    // If FREESHIP coupon is applied, shipping is free regardless of subtotal
    if (appliedCoupon === 'FREESHIP' || subtotal >= 999) {
      shippingCost = 0;
      elements.shippingDisplay.textContent = 'FREE';
      elements.shippingDisplay.style.color = 'var(--clr-green)';
    } else {
      shippingCost = 80;
      elements.shippingDisplay.textContent = '₹80';
      elements.shippingDisplay.style.color = 'inherit';
    }
  } else if (activeShipping === 'express') {
    shippingCost = 150;
    elements.shippingDisplay.textContent = '₹150';
    elements.shippingDisplay.style.color = 'inherit';
  }

  // Show standard courier label based on eligibility
  const stdLabel = document.getElementById('standard-shipping-cost');
  if (subtotal >= 999 || appliedCoupon === 'FREESHIP') {
    stdLabel.textContent = 'FREE';
    stdLabel.style.color = 'var(--clr-green)';
  } else {
    stdLabel.textContent = '₹80';
    stdLabel.style.color = 'inherit';
  }

  // 3. COD Handling Charge
  if (currentPaymentMethod === 'cod') {
    codFee = 30;
    elements.codFeeRow.style.display = 'flex';
  } else {
    codFee = 0;
    elements.codFeeRow.style.display = 'none';
  }

  // 4. Grand Total
  grandTotal = Math.max(0, subtotal - discountAmount + shippingCost + codFee);
  elements.grandTotalDisplay.textContent = `₹${grandTotal.toLocaleString('en-IN')}`;
}

// --- APPLY PROMO CODE ---
function applyCoupon() {
  const code = elements.couponInput.value.trim().toUpperCase();
  elements.couponFeedback.className = 'coupon-feedback'; // reset
  
  if (!code) {
    elements.couponFeedback.textContent = 'Please enter a code.';
    elements.couponFeedback.classList.add('error');
    return;
  }

  if (code === 'GOMATA10') {
    appliedCoupon = 'GOMATA10';
    elements.couponFeedback.textContent = 'Promo code GOMATA10 (10% OFF) applied successfully!';
    elements.couponFeedback.classList.add('success');
  } else if (code === 'FREESHIP') {
    appliedCoupon = 'FREESHIP';
    elements.couponFeedback.textContent = 'Promo code FREESHIP (Free Standard Shipping) applied!';
    elements.couponFeedback.classList.add('success');
  } else {
    elements.couponFeedback.textContent = 'Invalid promo code. Try GOMATA10 or FREESHIP.';
    elements.couponFeedback.classList.add('error');
    appliedCoupon = null;
  }

  calculateTotals();
}

// Interactive helper to click tag suggestion
window.suggestPromo = function(code) {
  elements.couponInput.value = code;
  applyCoupon();
};

// --- VALIDATION AND ERRONEOUS SUBMISSION ---
function setupLiveValidation() {
  const inputs = [
    { field: elements.emailInput, errorId: 'email-error', validator: validateEmail },
    { field: elements.phoneInput, errorId: 'phone-error', validator: validatePhone },
    { field: elements.nameInput, errorId: 'name-error', validator: (v) => v.trim().length >= 3 },
    { field: elements.address1Input, errorId: 'address-error', validator: (v) => v.trim().length >= 8 },
    { field: elements.cityInput, errorId: 'city-error', validator: (v) => v.trim().length >= 3 },
    { field: elements.stateInput, errorId: 'state-error', validator: (v) => v !== '' },
    { field: elements.zipInput, errorId: 'zip-error', validator: validateZip }
  ];

  inputs.forEach(item => {
    if (!item.field) return;
    const triggerEvent = item.field.tagName === 'SELECT' ? 'change' : 'input';
    
    item.field.addEventListener(triggerEvent, () => {
      const errSpan = document.getElementById(item.errorId);
      if (item.validator(item.field.value)) {
        item.field.classList.remove('is-invalid');
        if (errSpan) errSpan.textContent = '';
      }
    });
  });

  // Card specific validations live clear
  if (elements.cardNumber) {
    elements.cardNumber.addEventListener('input', () => {
      const num = elements.cardNumber.value.replace(/\D/g, '');
      if (num.length === 16) {
        elements.cardNumber.classList.remove('is-invalid');
        document.getElementById('card-num-error').textContent = '';
      }
    });
  }
  if (elements.cardExpiry) {
    elements.cardExpiry.addEventListener('input', () => {
      const exp = elements.cardExpiry.value;
      if (validateExpiry(exp)) {
        elements.cardExpiry.classList.remove('is-invalid');
        document.getElementById('card-expiry-error').textContent = '';
      }
    });
  }
  if (elements.cardCvv) {
    elements.cardCvv.addEventListener('input', () => {
      const cvv = elements.cardCvv.value.replace(/\D/g, '');
      if (cvv.length === 3) {
        elements.cardCvv.classList.remove('is-invalid');
        document.getElementById('card-cvv-error').textContent = '';
      }
    });
  }
  if (elements.upiInput) {
    elements.upiInput.addEventListener('input', () => {
      elements.upiInput.classList.remove('is-invalid');
      elements.upiError.textContent = '';
      elements.upiSuccess.textContent = '';
    });
  }
}

function validateEmail(email) {
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase().trim());
}

function validatePhone(phone) {
  const re = /^[6789][0-9]{9}$/;
  return re.test(phone.trim());
}

function validateZip(zip) {
  const re = /^[0-9]{6}$/;
  return re.test(zip.trim());
}

function validateExpiry(exp) {
  const re = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
  if (!re.test(exp)) return false;
  
  // Make sure it is not in the past
  const parts = exp.split('/');
  const expMonth = parseInt(parts[0], 10);
  const expYear = parseInt('20' + parts[1], 10);
  
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  
  if (expYear < currentYear) return false;
  if (expYear === currentYear && expMonth < currentMonth) return false;
  
  return true;
}

// UPI Simulators
let isUPIVerified = false;

window.verifyUPI = function() {
  const upiId = elements.upiInput.value.trim();
  elements.upiError.textContent = '';
  elements.upiSuccess.textContent = '';
  elements.upiInput.classList.remove('is-invalid');

  if (!upiId || !upiId.includes('@')) {
    elements.upiInput.classList.add('is-invalid');
    elements.upiError.textContent = 'Please enter a valid UPI ID (e.g. mobile@upi)';
    isUPIVerified = false;
    return;
  }

  // Simulate contact verification loading
  const verifyBtn = document.getElementById('verify-upi-btn');
  const originalText = verifyBtn.textContent;
  verifyBtn.textContent = 'Verifying...';
  verifyBtn.disabled = true;

  setTimeout(() => {
    verifyBtn.textContent = originalText;
    verifyBtn.disabled = false;
    
    // Hardcoded demo check for standard handles
    const validHandles = ['okaxis', 'okhdfcbank', 'okicici', 'ybl', 'upi', 'paytm', 'sbi'];
    const suffix = upiId.split('@')[1];
    
    if (validHandles.includes(suffix.toLowerCase()) || suffix.length >= 3) {
      elements.upiSuccess.textContent = 'UPI ID Verified (Name: GOMATA GUEST CUSTOMER)';
      isUPIVerified = true;
    } else {
      elements.upiInput.classList.add('is-invalid');
      elements.upiError.textContent = 'UPI Handle verification failed. Please check and try again.';
      isUPIVerified = false;
    }
  }, 1000);
};

window.copyUPI = function() {
  navigator.clipboard.writeText('gomataoriginal@okaxis').then(() => {
    const copyBtn = document.getElementById('copy-upi-btn');
    copyBtn.innerHTML = '<i class="fas fa-check" style="color: var(--clr-green);"></i>';
    setTimeout(() => {
      copyBtn.innerHTML = '<i class="far fa-copy"></i>';
    }, 2000);
  });
};

// --- FORM GENERAL VALIDATOR ---
function validateForm() {
  let isValid = true;

  // Step 1: Customer Contact
  if (!validateEmail(elements.emailInput.value)) {
    elements.emailInput.classList.add('is-invalid');
    document.getElementById('email-error').textContent = 'Please enter a valid email address.';
    isValid = false;
  }
  
  if (!validatePhone(elements.phoneInput.value)) {
    elements.phoneInput.classList.add('is-invalid');
    document.getElementById('phone-error').textContent = 'Enter a valid 10-digit mobile number.';
    isValid = false;
  }

  // Step 2: Shipping
  if (elements.nameInput.value.trim().length < 3) {
    elements.nameInput.classList.add('is-invalid');
    document.getElementById('name-error').textContent = 'Name must be at least 3 characters.';
    isValid = false;
  }

  if (elements.address1Input.value.trim().length < 8) {
    elements.address1Input.classList.add('is-invalid');
    document.getElementById('address-error').textContent = 'Address must contain street & building details.';
    isValid = false;
  }

  if (elements.cityInput.value.trim().length < 3) {
    elements.cityInput.classList.add('is-invalid');
    document.getElementById('city-error').textContent = 'Please enter a valid city name.';
    isValid = false;
  }

  if (elements.stateInput.value === '') {
    elements.stateInput.classList.add('is-invalid');
    document.getElementById('state-error').textContent = 'Please select a state.';
    isValid = false;
  }

  if (!validateZip(elements.zipInput.value)) {
    elements.zipInput.classList.add('is-invalid');
    document.getElementById('zip-error').textContent = 'Enter a valid 6-digit Pincode.';
    isValid = false;
  }

  // Step 4: Payment Validation based on Tab
  if (currentPaymentMethod === 'upi') {
    const upiVal = elements.upiInput.value.trim();
    // If they scanned the QR code, we accept it without forcing manual ID verification
    if (!upiVal && !document.getElementById('simulated-qr').classList.contains('scanned-sim')) {
      elements.upiInput.classList.add('is-invalid');
      elements.upiError.textContent = 'Please verify your UPI ID or scan the QR Code above to proceed.';
      isValid = false;
    } else if (upiVal && !isUPIVerified) {
      elements.upiInput.classList.add('is-invalid');
      elements.upiError.textContent = 'Please click "Verify" to validate your UPI ID before ordering.';
      isValid = false;
    }
  } else if (currentPaymentMethod === 'card') {
    const cardNum = elements.cardNumber.value.replace(/\D/g, '');
    if (cardNum.length < 16) {
      elements.cardNumber.classList.add('is-invalid');
      document.getElementById('card-num-error').textContent = 'Enter a valid 16-digit card number.';
      isValid = false;
    }

    if (!validateExpiry(elements.cardExpiry.value)) {
      elements.cardExpiry.classList.add('is-invalid');
      document.getElementById('card-expiry-error').textContent = 'Enter valid expiry MM/YY.';
      isValid = false;
    }

    const cvv = elements.cardCvv.value.replace(/\D/g, '');
    if (cvv.length !== 3) {
      elements.cardCvv.classList.add('is-invalid');
      document.getElementById('card-cvv-error').textContent = 'Enter 3-digit CVV.';
      isValid = false;
    }
  }

  return isValid;
}

// Simulate QR scanning interaction when clicking the simulated QR code box
document.getElementById('simulated-qr').addEventListener('click', () => {
  const qrBox = document.getElementById('simulated-qr');
  qrBox.classList.add('scanned-sim');
  qrBox.style.borderColor = 'var(--clr-green)';
  qrBox.style.background = 'rgba(46, 62, 39, 0.05)';
  
  const qrIcon = qrBox.querySelector('.fa-qrcode');
  if (qrIcon) {
    qrIcon.className = 'fas fa-check-circle';
    qrIcon.style.color = 'var(--clr-green)';
    qrIcon.style.opacity = '0.9';
    qrIcon.style.fontSize = '4rem';
  }
  
  const hint = document.querySelector('.qr-hint');
  if (hint) {
    hint.innerHTML = '<span style="color: var(--clr-green); font-weight: 600;"><i class="fas fa-check"></i> QR Code Scanned & Approved</span>';
  }
});

// --- SUBMIT ORDER & GATEWAY SIMULATION ---
async function handleOrderSubmission() {
  if (!validateForm()) {
    // Scroll to the first error
    const firstError = document.querySelector('.is-invalid, .error-message:not(:empty)');
    if (firstError) {
      firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  // Generate order number
  const orderNumber = 'GM-' + new Date().getFullYear() + '-' + Math.floor(100000 + Math.random() * 900000);

  // Compile order details
  const orderData = {
    order_number: orderNumber,
    customer_email: elements.emailInput.value.trim(),
    customer_phone: elements.phoneInput.value.trim(),
    customer_name: elements.nameInput.value.trim(),
    shipping_address: elements.address1Input.value.trim() + (elements.address2Input.value.trim() ? ', ' + elements.address2Input.value.trim() : ''),
    city: elements.cityInput.value.trim(),
    state: elements.stateInput.value,
    zip: elements.zipInput.value.trim(),
    shipping_method: document.querySelector('input[name="shipping_method"]:checked').value,
    shipping_cost: shippingCost,
    payment_method: currentPaymentMethod,
    payment_status: currentPaymentMethod === 'cod' ? 'Pending COD' : 'Paid',
    subtotal: subtotal,
    discount: discountAmount,
    grand_total: grandTotal,
    items: cart.map(item => ({
      productId: item.productId,
      title: item.title,
      size: item.size,
      price: item.price,
      qty: item.qty
    })),
    status: 'Pending'
  };

  // Launch simulated secure payment screen overlay
  elements.loadingOverlay.classList.add('active');
  
  // Set stage statuses sequentially to feel like a real banking routing
  const statuses = [
    { time: 0, text: 'Establishing secure handshake with banking routing nodes...' },
    { time: 800, text: 'Securing credentials and verifying anti-fraud handshakes...' },
    { time: 1600, text: 'Transaction authorized! Generating official invoices...' },
    { time: 2400, text: 'Finalizing order records...' }
  ];

  statuses.forEach(stage => {
    setTimeout(() => {
      elements.loadingStatus.textContent = stage.text;
    }, stage.time);
  });

  // Save to Supabase (non-blocking for UI simulation timing)
  let dbSavePromise = Promise.resolve();
  if (isSupabaseConfigured() && supabase) {
    dbSavePromise = supabase.from('orders').insert([orderData])
      .then(({ data, error }) => {
        if (error) throw error;
        console.log('Order successfully written to Supabase:', orderNumber);
      })
      .catch(err => {
        console.error('Supabase write failure. Order processed locally:', err);
      });
  }

  // Open Receipt Modal after simulation completes
  setTimeout(async () => {
    await dbSavePromise; // Ensure DB try finished before resolving UI
    elements.loadingOverlay.classList.remove('active');
    triggerSuccessReceipt(orderNumber);
  }, 3000);
}

// --- TRIGGER SUCCESS RECEIPT ---
function triggerSuccessReceipt(orderNumber) {
  elements.receiptOrderId.textContent = orderNumber;

  // Format today's date
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  elements.receiptDate.textContent = new Date().toLocaleDateString('en-IN', options);

  // Render receipt items
  elements.receiptItems.innerHTML = cart.map(item => `
    <div class="receipt-item">
      <div class="receipt-item-name">
        <strong>${item.title}</strong>
        <span>Size: ${item.size} × ${item.qty}</span>
      </div>
      <div class="receipt-item-price">
        ₹${(item.price * item.qty).toLocaleString('en-IN')}
      </div>
    </div>
  `).join('');

  // Update receipt calculations
  elements.receiptSubtotal.textContent = `₹${subtotal.toLocaleString('en-IN')}`;
  
  if (discountAmount > 0) {
    elements.receiptDiscount.textContent = `-₹${discountAmount.toLocaleString('en-IN')}`;
    elements.receiptDiscountRow.style.display = 'flex';
  } else {
    elements.receiptDiscountRow.style.display = 'none';
  }

  // Shipping
  const shippingLabel = elements.shippingDisplay.textContent;
  elements.receiptShipping.textContent = currentPaymentMethod === 'cod' 
    ? `${shippingLabel} (+ ₹30 COD Handling)`
    : shippingLabel;

  // Grand Total
  elements.receiptGrandTotal.textContent = `₹${grandTotal.toLocaleString('en-IN')}`;

  // Customer Details
  elements.receiptName.innerHTML = `<strong>${elements.nameInput.value.trim()}</strong>`;
  
  const apt = elements.address2Input.value.trim();
  const addressString = `${elements.address1Input.value.trim()}${apt ? ', ' + apt : ''}, ${elements.cityInput.value.trim()}, ${elements.stateInput.value} - ${elements.zipInput.value.trim()}`;
  elements.receiptAddress.textContent = addressString;
  elements.receiptPhone.textContent = `Phone: +91 ${elements.phoneInput.value.trim()}`;

  // Shipping Mode Label
  const selectedMode = document.querySelector('input[name="shipping_method"]:checked').value;
  if (selectedMode === 'express') {
    elements.receiptShippingMode.innerHTML = '<i class="fas fa-bolt" style="color: var(--clr-accent-gold);"></i> Express Courier Delivery (1-2 Days)';
  } else {
    elements.receiptShippingMode.innerHTML = '<i class="fas fa-truck"></i> Standard Courier Delivery (5-7 Days)';
  }

  // Open modal
  elements.successOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}
