-- ============================================================================
-- ADD INSTALLMENTS FEATURE
-- ============================================================================
-- Created: December 6, 2025
-- Description: Add support for installment transactions

-- Add installment columns to transactions table
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS installment_group_id UUID,
ADD COLUMN IF NOT EXISTS installment_number INT,
ADD COLUMN IF NOT EXISTS installment_total INT;

-- Create index for installment queries
CREATE INDEX IF NOT EXISTS idx_transactions_installment_group 
  ON transactions(installment_group_id) 
  WHERE installment_group_id IS NOT NULL;

-- Add check constraint to ensure installment data is consistent
ALTER TABLE transactions
ADD CONSTRAINT check_installment_consistency 
  CHECK (
    (installment_group_id IS NULL AND installment_number IS NULL AND installment_total IS NULL)
    OR
    (installment_group_id IS NOT NULL AND installment_number IS NOT NULL AND installment_total IS NOT NULL)
  );

-- Add comment explaining the installment fields
COMMENT ON COLUMN transactions.installment_group_id IS 'UUID linking all transactions in an installment series';
COMMENT ON COLUMN transactions.installment_number IS 'Current installment number (1-based index)';
COMMENT ON COLUMN transactions.installment_total IS 'Total number of installments in the series';
