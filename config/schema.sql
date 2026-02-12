-- ============================================
-- SUPABASE DATABASE SCHEMA
-- Financial Operational System
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- (Note: Supabase manages auth.users separately)
-- ============================================
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================
-- INVOICES TABLE
-- ============================================
CREATE TABLE invoices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    invoice_number TEXT UNIQUE NOT NULL,
    client_name TEXT NOT NULL,
    client_email TEXT,
    client_address TEXT,
    items JSONB NOT NULL DEFAULT '[]',
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0,
    tax NUMERIC(15, 2) DEFAULT 0,
    discount NUMERIC(15, 2) DEFAULT 0,
    total NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'paid')),
    due_date DATE,
    paid_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================
-- TRANSACTIONS TABLE
-- ============================================
CREATE TABLE transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount NUMERIC(15, 2) NOT NULL,
    category TEXT,
    description TEXT,
    reference_type TEXT,
    reference_id UUID,
    transaction_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================
-- RECONCILIATIONS TABLE
-- ============================================
CREATE TABLE reconciliations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    partner_code TEXT NOT NULL,
    recon_date DATE NOT NULL,
    pdam_code TEXT,
    connection_number TEXT,
    customer_name TEXT NOT NULL,
    total_bill NUMERIC(15, 2) NOT NULL DEFAULT 0,
    account_number TEXT,
    payment_date DATE,
    payment_location TEXT,
    notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'unmatched')),
    difference NUMERIC(15, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('recon_mismatch', 'invoice_unpaid', 'invoice_due', 'system')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================
-- LOGS TABLE (Audit Trail)
-- ============================================
CREATE TABLE logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_reconciliations_user_id ON reconciliations(user_id);
CREATE INDEX idx_reconciliations_status ON reconciliations(status);
CREATE INDEX idx_reconciliations_difference ON reconciliations(difference);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_logs_user_id ON logs(user_id);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- Users: Users can only see their own data
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Invoices: Users can CRUD their own invoices
CREATE POLICY "Users can view own invoices" ON invoices
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices" ON invoices
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices" ON invoices
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices" ON invoices
    FOR DELETE USING (auth.uid() = user_id);

-- Transactions: Users can CRUD their own transactions
CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" ON transactions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" ON transactions
    FOR DELETE USING (auth.uid() = user_id);

-- Reconciliations: Users can CRUD their own recon data
CREATE POLICY "Users can view own reconciliations" ON reconciliations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reconciliations" ON reconciliations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reconciliations" ON reconciliations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reconciliations" ON reconciliations
    FOR DELETE USING (auth.uid() = user_id);

-- Notifications: Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Logs: Read-only access to logs
CREATE POLICY "Users can view own logs" ON logs
    FOR SELECT USING (auth.uid() = user_id OR auth.uid()::TEXT IN (SELECT id::TEXT FROM users WHERE role = 'admin'));

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reconciliations_updated_at BEFORE UPDATE ON reconciliations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- Enable realtime for tables
-- Note: Run this separately in Supabase Dashboard > Database > Replication
-- Or use: ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
-- ============================================
-- Uncomment the following lines if you want to enable realtime programmatically:
-- ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
-- ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
-- ALTER PUBLICATION supabase_realtime ADD TABLE reconciliations;

-- ============================================
-- DUMMY DATA (Optional - for testing)
-- Note: Run this AFTER creating a user in auth.users first!
-- ============================================

-- First, insert a test user (replace with actual user ID from auth.users)
-- To get user ID: Select * from auth.users;
-- Example:
-- INSERT INTO users (id, email, full_name, role) 
-- VALUES ('your-actual-uuid-here', 'test@example.com', 'Test User', 'user');

-- Then insert sample data using that user ID:
/*
INSERT INTO invoices (user_id, invoice_number, client_name, client_email, items, subtotal, total, status, due_date) VALUES
('your-uuid-here', 'INV-20240201-0001', 'PT Maju Bersama', 'info@majubersama.com', '[{"description": "Konsultasi Bisnis", "quantity": 10, "unit_price": 150000, "total": 1500000}, {"description": "Implementasi Sistem", "quantity": 1, "unit_price": 5000000, "total": 5000000}]', 6500000, 6500000, 'pending', '2024-03-01'),
('your-uuid-here', 'INV-20240201-0002', 'CV Sejahtera', 'admin@sejahtera.com', '[{"description": "Maintenance Bulanan", "quantity": 1, "unit_price": 2000000, "total": 2000000}]', 2000000, 2000000, 'sent', '2024-02-28'),
('your-uuid-here', 'INV-20240201-0003', 'PT Nusa Raya', 'finance@nusaraya.com', '[{"description": "Pengembangan Software", "quantity": 80, "unit_price": 125000, "total": 10000000}]', 10000000, 10000000, 'paid', '2024-01-15');

INSERT INTO transactions (user_id, type, amount, category, description, transaction_date) VALUES
('your-uuid-here', 'income', 15000000, 'Pendapatan Invoice', 'Pembayaran INV-20240201-0003', '2024-02-01'),
('your-uuid-here', 'expense', 2500000, 'Operasional', 'Sewa kantor Februari', '2024-02-05'),
('your-uuid-here', 'expense', 500000, 'Utilities', 'Listrik dan air', '2024-02-10'),
('your-uuid-here', 'income', 5000000, 'Pendapatan Lain', 'Konsultasi mandiri', '2024-02-15');

INSERT INTO reconciliations (user_id, partner_code, recon_date, pdam_code, connection_number, customer_name, total_bill, account_number, payment_date, payment_location, status, difference) VALUES
('your-uuid-here', 'PDAM-001', '2024-02-01', 'PDAM-KOTA', '1234567890', 'Ahmad Susanto', 150000, 'REK-001', '2024-02-03', 'Kantor Pusat', 'matched', 0),
('your-uuid-here', 'PDAM-002', '2024-02-02', 'PDAM-KAB', '0987654321', 'Siti Rahayu', 250000, 'REK-002', '2024-02-05', 'Bank Transfer', 'unmatched', 50000),
('your-uuid-here', 'PDAM-003', '2024-02-03', 'PDAM-DESA', '1122334455', 'Budi Santoso', 100000, 'REK-003', NULL, NULL, 'pending', 100000);
*/
