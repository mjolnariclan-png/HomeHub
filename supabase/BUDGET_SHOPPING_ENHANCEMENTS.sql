-- Budget and Shopping List Enhancement Migration Script
-- Run this in Supabase SQL Editor
-- This script is idempotent and can be run multiple times

-- Create budget_accounts table if it doesn't exist
CREATE TABLE IF NOT EXISTS budget_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  account_name VARCHAR(100) NOT NULL,
  account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('bank', 'ebt', 'cash')),
  current_balance DECIMAL(10,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Add account_id to budget_entries if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'budget_entries' AND column_name = 'account_id'
    ) THEN
        ALTER TABLE budget_entries 
        ADD COLUMN account_id UUID REFERENCES budget_accounts(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add columns to shopping_list if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shopping_list' AND column_name = 'store'
    ) THEN
        ALTER TABLE shopping_list ADD COLUMN store VARCHAR(100);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shopping_list' AND column_name = 'item_type'
    ) THEN
        ALTER TABLE shopping_list ADD COLUMN item_type VARCHAR(50) CHECK (item_type IN ('food', 'household', 'pet', 'other'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shopping_list' AND column_name = 'priority'
    ) THEN
        ALTER TABLE shopping_list ADD COLUMN priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shopping_list' AND column_name = 'notes'
    ) THEN
        ALTER TABLE shopping_list ADD COLUMN notes TEXT;
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_budget_accounts_family ON budget_accounts(family_id);
CREATE INDEX IF NOT EXISTS idx_budget_entries_account ON budget_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_store ON shopping_list(store);
CREATE INDEX IF NOT EXISTS idx_shopping_list_type ON shopping_list(item_type);

-- Enable Row Level Security (RLS) for budget_accounts
ALTER TABLE budget_accounts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "budget_accounts_select_family" ON budget_accounts;
DROP POLICY IF EXISTS "budget_accounts_insert_admin" ON budget_accounts;
DROP POLICY IF EXISTS "budget_accounts_update_admin" ON budget_accounts;
DROP POLICY IF EXISTS "budget_accounts_delete_admin" ON budget_accounts;

-- Policy: Family members can view their family's accounts
CREATE POLICY "budget_accounts_select_family"
ON budget_accounts FOR SELECT
TO authenticated
USING (
  family_id IN (
    SELECT family_id FROM profiles WHERE id = auth.uid()
  )
);

-- Policy: Admins can insert accounts
CREATE POLICY "budget_accounts_insert_admin"
ON budget_accounts FOR INSERT
TO authenticated
WITH CHECK (
  family_id IN (
    SELECT family_id FROM profiles WHERE id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy: Admins can update accounts
CREATE POLICY "budget_accounts_update_admin"
ON budget_accounts FOR UPDATE
TO authenticated
USING (
  family_id IN (
    SELECT family_id FROM profiles WHERE id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
)
WITH CHECK (
  family_id IN (
    SELECT family_id FROM profiles WHERE id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy: Admins can delete accounts
CREATE POLICY "budget_accounts_delete_admin"
ON budget_accounts FOR DELETE
TO authenticated
USING (
  family_id IN (
    SELECT family_id FROM profiles WHERE id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Update budget_entries RLS to handle account_id
-- Note: Existing policies should still work, but account_id references are protected by foreign key constraint