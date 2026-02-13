-- ============================================
-- MIGRATION: Add missing invoice columns
-- Run this in Supabase SQL Editor
-- ====================================

-- Add missing columns to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS account_holder TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS bg_image TEXT;

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'invoices' 
AND column_name IN ('bank_name', 'account_number', 'account_holder', 'bg_image');
