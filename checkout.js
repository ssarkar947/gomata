// GO MATA ORIGINAL GHEE - Checkout Page JS

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

// Application State
let cart = [];
let appliedCoupon = null;
let currentPaymentMethod = 'online'; // 'online', 'cod'

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
      if (targetId === 'payment-razorpay') currentPaymentMethod = 'online';
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
  if (appliedCoupon && appliedCoupon.type === 'percentage') {
    discountAmount = Math.round(subtotal * (appliedCoupon.value / 100));
    elements.discountPercent.textContent = `${appliedCoupon.value}%`;
    elements.discountDisplay.textContent = `-₹${discountAmount.toLocaleString('en-IN')}`;
    elements.discountRow.style.display = 'flex';
  } else {
    elements.discountRow.style.display = 'none';
  }

  // 2. Calculate Shipping Cost
  const activeShipping = document.querySelector('input[name="shipping_method"]:checked').value;
  
  // Standard Delivery pricing logic
  if (activeShipping === 'standard') {
    // If free_shipping coupon is applied, shipping is free regardless of subtotal
    if ((appliedCoupon && appliedCoupon.type === 'free_shipping') || subtotal >= 999) {
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
  if (subtotal >= 999 || (appliedCoupon && appliedCoupon.type === 'free_shipping')) {
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
async function applyCoupon() {
  const code = elements.couponInput.value.trim().toUpperCase();
  elements.couponFeedback.className = 'coupon-feedback'; // reset
  
  if (!code) {
    elements.couponFeedback.textContent = 'Please enter a code.';
    elements.couponFeedback.classList.add('error');
    return;
  }

  elements.applyCouponBtn.disabled = true;
  elements.couponFeedback.textContent = 'Checking...';
  elements.couponFeedback.className = 'coupon-feedback info';

  try {
    let coupon = null;

    if (isSupabaseConfigured() && supabaseClient) {
      const { data, error } = await supabaseClient
        .from('coupons')
        .select('*')
        .eq('code', code)
        .eq('active', true)
        .maybeSingle();

      if (error) {
        console.error('Supabase coupon check failed:', error);
      } else {
        coupon = data;
      }
    }

    // Offline fallback for demo/test purposes if Supabase fails or isn't configured
    if (!coupon) {
      const offlineCoupons = {
        'GOMATA10': { code: 'GOMATA10', type: 'percentage', value: 10, min_order_value: 0, active: true },
        'FREESHIP': { code: 'FREESHIP', type: 'free_shipping', value: 0, min_order_value: 999, active: true }
      };
      if (offlineCoupons[code]) {
        coupon = offlineCoupons[code];
      }
    }

    if (!coupon) {
      elements.couponFeedback.textContent = 'Invalid or expired promo code.';
      elements.couponFeedback.className = 'coupon-feedback error';
      appliedCoupon = null;
    } else if (subtotal < coupon.min_order_value) {
      elements.couponFeedback.textContent = `This coupon requires a minimum subtotal of ₹${coupon.min_order_value}.`;
      elements.couponFeedback.className = 'coupon-feedback error';
      appliedCoupon = null;
    } else {
      appliedCoupon = coupon;
      const benefitText = coupon.type === 'percentage' ? `${coupon.value}% OFF` : 'Free Standard Shipping';
      elements.couponFeedback.textContent = `Promo code ${coupon.code} (${benefitText}) applied successfully!`;
      elements.couponFeedback.className = 'coupon-feedback success';
    }
  } catch (err) {
    console.error('Coupon error:', err);
    elements.couponFeedback.textContent = 'Error verifying code. Try again.';
    elements.couponFeedback.className = 'coupon-feedback error';
    appliedCoupon = null;
  } finally {
    elements.applyCouponBtn.disabled = false;
    calculateTotals();
  }
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

  return isValid;
}

const isRazorpayConfigured = () => {
  return typeof RAZORPAY_CONFIG !== 'undefined' && 
         RAZORPAY_CONFIG.keyId && 
         !RAZORPAY_CONFIG.keyId.includes('YOUR_RAZORPAY_KEY_ID');
};

async function saveOrderAndFinish(orderNumber, orderData) {
  let dbSavePromise = Promise.resolve();
  if (isSupabaseConfigured() && supabaseClient) {
    dbSavePromise = supabaseClient.from('orders')
      .insert([orderData], { count: null, returning: 'minimal' })
      .then(({ data, error }) => {
        if (error) throw error;
        console.log('Order successfully written to Supabase:', orderNumber);
      })
      .catch(err => {
        console.error('Supabase write failure. Order processed locally:', err);
      });
  }
  
  await dbSavePromise;
  triggerSuccessReceipt(orderNumber);
}

async function executeOnlinePayment(orderNumber, orderData) {
  if (isRazorpayConfigured() && typeof Razorpay !== 'undefined') {
    const options = {
      key: RAZORPAY_CONFIG.keyId,
      amount: grandTotal * 100,
      currency: "INR",
      name: "GO MATA ORIGINAL GHEE",
      description: `Payment for Order ${orderNumber}`,
      image: "assets/brand_logo_text.png",
      handler: function (response) {
        orderData.payment_status = `Paid (Razorpay ID: ${response.razorpay_payment_id})`;
        saveOrderAndFinish(orderNumber, orderData);
      },
      prefill: {
        name: orderData.customer_name,
        email: orderData.customer_email,
        contact: orderData.customer_phone
      },
      theme: {
        color: "#65371B"
      },
      modal: {
        ondismiss: function() {
          alert("Payment was cancelled. You can try again to place your order.");
        }
      }
    };
    
    const rzp = new Razorpay(options);
    rzp.open();
  } else {
    // Razorpay fallback simulation
    elements.loadingOverlay.classList.add('active');
    
    const statuses = [
      { time: 0, text: 'Opening Razorpay secure payment interface...' },
      { time: 800, text: 'Awaiting client authorization response...' },
      { time: 1600, text: 'Transaction authorized (Demo Mode)...' },
      { time: 2400, text: 'Finalizing database records...' }
    ];

    statuses.forEach(stage => {
      setTimeout(() => {
        elements.loadingStatus.textContent = stage.text;
      }, stage.time);
    });

    orderData.payment_status = `Paid (Simulated - No Credentials)`;

    setTimeout(async () => {
      await saveOrderAndFinish(orderNumber, orderData);
      elements.loadingOverlay.classList.remove('active');
    }, 3000);
  }
}

async function executeCODPayment(orderNumber, orderData) {
  elements.loadingOverlay.classList.add('active');
  elements.loadingStatus.textContent = 'Processing Cash on Delivery registration...';
  
  orderData.payment_status = "Pending COD";
  
  setTimeout(async () => {
    await saveOrderAndFinish(orderNumber, orderData);
    elements.loadingOverlay.classList.remove('active');
  }, 1000);
}

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

  if (currentPaymentMethod === 'cod') {
    await executeCODPayment(orderNumber, orderData);
  } else {
    await executeOnlinePayment(orderNumber, orderData);
  }
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
