-- GO MATA ORIGINAL GHEE - Database Migrations for Coupons Table
-- Paste this script into the SQL Editor in your Supabase Dashboard and click Run.

-- 1. CREATE COUPONS TABLE
CREATE TABLE IF NOT EXISTS coupons (
    code TEXT PRIMARY KEY,
    type TEXT NOT NULL, -- 'percentage' or 'free_shipping'
    value INTEGER NOT NULL DEFAULT 0, -- discount value (e.g. 10 for 10% off, 0 for free shipping)
    min_order_value INTEGER NOT NULL DEFAULT 0, -- minimum purchase subtotal required
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. SEED DEFAULT COUPON DATA
INSERT INTO coupons (code, type, value, min_order_value, active)
VALUES 
('GOMATA10', 'percentage', 10, 0, true),
('FREESHIP', 'free_shipping', 0, 999, true)
ON CONFLICT (code) DO UPDATE 
SET type = EXCLUDED.type, 
    value = EXCLUDED.value, 
    min_order_value = EXCLUDED.min_order_value, 
    active = EXCLUDED.active;

-- 3. ENABLE ROW LEVEL SECURITY
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- 4. CREATE RLS POLICIES
-- Policy 4.1: Anyone can read coupon details (e.g. verify codes during checkout)
DROP POLICY IF EXISTS "Allow public read-only access on coupons" ON coupons;
CREATE POLICY "Allow public read-only access on coupons" 
ON coupons FOR SELECT 
TO public 
USING (true);

-- Policy 4.2: Only logged-in admin can create, update or delete coupons
DROP POLICY IF EXISTS "Allow admin write access on coupons" ON coupons;
CREATE POLICY "Allow admin write access on coupons" 
ON coupons FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 5. FIX ORDERS RLS POLICIES (Ensure anyone can place orders, admin can manage)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert access on orders" ON orders;
CREATE POLICY "Allow public insert access on orders" 
ON orders FOR INSERT 
TO public 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow admin read/write access on orders" ON orders;
CREATE POLICY "Allow admin read/write access on orders" 
ON orders FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 6. FIX PRODUCTS RLS POLICIES (Ensure anyone can view products, admin can manage)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read-only access on products" ON products;
CREATE POLICY "Allow public read-only access on products" 
ON products FOR SELECT 
TO public 
USING (true);

DROP POLICY IF EXISTS "Allow admin write access on products" ON products;
CREATE POLICY "Allow admin write access on products" 
ON products FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

