-- GO MATA ORIGINAL GHEE - Supabase SQL Database Schema
-- Paste this script directly into the SQL Editor in your Supabase Dashboard.

-- 1. CLEANUP (Optional: Remove existing tables if recreating)
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;

-- 2. CREATE PRODUCTS TABLE
CREATE TABLE products (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    price INTEGER NOT NULL,
    original_price INTEGER,
    image TEXT NOT NULL,
    rating NUMERIC(3,2) DEFAULT 5.0,
    reviews INTEGER DEFAULT 0,
    description TEXT,
    details JSONB NOT NULL,
    nutrition JSONB,
    sizes JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. CREATE ORDERS TABLE
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    shipping_address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip TEXT NOT NULL,
    shipping_method TEXT NOT NULL,
    shipping_cost INTEGER NOT NULL,
    payment_method TEXT NOT NULL,
    payment_status TEXT NOT NULL,
    subtotal INTEGER NOT NULL,
    discount INTEGER NOT NULL,
    grand_total INTEGER NOT NULL,
    items JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. INSERT SEED DATA FOR PRODUCTS
INSERT INTO products (id, title, price, original_price, image, rating, reviews, description, details, nutrition, sizes)
VALUES 
(
    'desi-cow-ghee-jar',
    'Go Mata Original Ghee (Desi Cow Ghee)',
    1350,
    1500,
    'assets/product_jar.jpg',
    4.9,
    142,
    'Go Mata Original Ghee is made with the milk of Desi Cows who have year round access to natural green grass & leaves. Our Ghee is of the highest quality and brings purity, tradition and goodness to your home.',
    '{
        "Ingredients": "Milk Fat (From Cow Milk)",
        "Allergen Info": "Contains Milk",
        "FSSAI Lic. No.": "22823039000092",
        "Manufactured By": "Maa Tara Ghee, Nadia, West Bengal",
        "Marketed By": "Go Mata Original Ghee",
        "Storage": "Store in a cool, dry & hygienic place. Keep away from direct sunlight. Do not refrigerate."
    }'::jsonb,
    '{
        "Energy": "897.48 kcal",
        "Protein": "<0.1 g",
        "Carbohydrate": "<0.1 g",
        "Total Fat": "99.7 g",
        "Saturated Fat": "62.80 g",
        "Monounsaturated Fat": "19.68 g",
        "Polyunsaturated Fat": "2.78 g",
        "Trans Fat": "5.10 g",
        "Cholesterol": "250 mg"
    }'::jsonb,
    '[
        {"label": "500 ML", "price": 1350},
        {"label": "1 Ltr", "price": 2550}
    ]'::jsonb
),
(
    'desi-ghee-pack-2',
    'Sustainable Duo (Pack of 2 Jars)',
    2380,
    2700,
    'assets/product_jar.jpg',
    5.0,
    88,
    'A value pack containing two 500 ML jars of Go Mata Original Ghee, made with the milk of Desi Cows who graze freely on green pastures year-round. Brings purity, tradition and goodness to your family table.',
    '{
        "Ingredients": "Milk Fat (From Cow Milk)",
        "Allergen Info": "Contains Milk",
        "FSSAI Lic. No.": "22823039000092",
        "Manufactured By": "Maa Tara Ghee, Nadia, West Bengal",
        "Storage": "Store in a cool, dry & hygienic place. Do not refrigerate."
    }'::jsonb,
    '{
        "Energy": "897.48 kcal",
        "Protein": "<0.1 g",
        "Carbohydrate": "<0.1 g",
        "Total Fat": "99.7 g",
        "Saturated Fat": "62.80 g",
        "Monounsaturated Fat": "19.68 g",
        "Polyunsaturated Fat": "2.78 g",
        "Trans Fat": "5.10 g",
        "Cholesterol": "250 mg"
    }'::jsonb,
    '[
        {"label": "500 ML x 2", "price": 2380}
    ]'::jsonb
),
(
    'heritage-steel-dolchi',
    'Heritage Steel Dolchi Edition',
    4800,
    5200,
    'assets/product_jar.jpg',
    4.9,
    65,
    'Our premium Go Mata Original Ghee hand-ladled into a traditional stainless steel Dolchi container with handle. Filled with 2 litres of pure, granular Desi Cow Ghee. An eco-friendly keepsake designed to last for generations.',
    '{
        "Quantity": "2 Litres (2000 ML)",
        "Container": "Stainless Steel Dolchi",
        "Ingredients": "Milk Fat (From Cow Milk)",
        "FSSAI Lic. No.": "22823039000092",
        "Manufactured By": "Maa Tara Ghee, Nadia, West Bengal",
        "Storage": "Store in a cool, dry & hygienic place. Keep away from direct sunlight."
    }'::jsonb,
    '{
        "Energy": "897.48 kcal",
        "Protein": "<0.1 g",
        "Carbohydrate": "<0.1 g",
        "Total Fat": "99.7 g",
        "Saturated Fat": "62.80 g",
        "Monounsaturated Fat": "19.68 g",
        "Polyunsaturated Fat": "2.78 g",
        "Trans Fat": "5.10 g",
        "Cholesterol": "250 mg"
    }'::jsonb,
    '[
        {"label": "2 Ltr Dolchi", "price": 4800}
    ]'::jsonb
);

-- 5. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 6. PRODUCTS POLICIES
-- Policy 6.1: Allow public read-only access (anyone can view products)
CREATE POLICY "Allow public read-only access on products" 
ON products FOR SELECT 
TO public 
USING (true);

-- Policy 6.2: Allow authenticated write access (only logged-in admin can manage products)
CREATE POLICY "Allow admin write access on products" 
ON products FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 7. ORDERS POLICIES
-- Policy 7.1: Allow public insert access (customers can place orders at checkout)
CREATE POLICY "Allow public insert access on orders" 
ON orders FOR INSERT 
TO public 
WITH CHECK (true);

-- Policy 7.2: Allow admin read/write access (only logged-in admin can read or modify orders)
CREATE POLICY "Allow admin read/write access on orders" 
ON orders FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
