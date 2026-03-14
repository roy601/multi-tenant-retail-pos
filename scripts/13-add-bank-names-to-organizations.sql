-- Migration: Add bank_names JSONB column to organizations table
-- Run this once in Supabase SQL Editor
--
-- This allows each shop owner to configure bank names per payment method
-- (bKash, Nagad, Rocket, Upay, Card, Bank Transfer) shown in Bank Info page.

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS bank_names JSONB DEFAULT '{}'::jsonb;

-- Example of what the stored value looks like:
-- {
--   "bkash": "BRAC Bank Limited",
--   "nagad": "Dutch-Bangla Bank",
--   "rocket": "Dutch-Bangla Bank Limited",
--   "upay": "UCB Bank",
--   "card": "City Bank",
--   "bank_transfer": "Southeast Bank"
-- }
