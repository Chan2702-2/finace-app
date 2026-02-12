-- ============================================
-- CLIENTS TABLE SCHEMA
-- Add this to your Supabase schema
-- ============================================

-- ============================================
-- CLIENTS TABLE
-- ============================================
CREATE TABLE clients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    npwp TEXT,
    pks_number TEXT,
    pks_duration INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_clients_user_id ON clients(user_id);
CREATE INDEX idx_clients_name ON clients(name);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Clients: Users can CRUD their own clients
CREATE POLICY "Users can view own clients" ON clients
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clients" ON clients
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients" ON clients
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients" ON clients
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTION TO GET PKS DURATION
-- ============================================
CREATE OR REPLACE FUNCTION get_pks_duration_months(start_date DATE, end_date DATE)
RETURNS INTEGER AS $$
BEGIN
    IF start_date IS NULL OR end_date IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN EXTRACT(YEAR FROM end_date) * 12 + EXTRACT(MONTH FROM end_date) 
           - EXTRACT(YEAR FROM start_date) * 12 - EXTRACT(MONTH FROM start_date)
           + 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- UPDATE INVOICES TABLE TO REFERENCE CLIENTS
-- Add client_id foreign key to invoices
-- ============================================
-- First, add the column (if not exists)
-- ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- ============================================
-- VERIFICATION
-- Run this to check if table was created:
-- SELECT * FROM information_schema.tables WHERE table_name = 'clients';
-- ============================================
