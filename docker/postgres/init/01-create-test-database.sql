-- Create the dedicated API test database used by Vitest.
-- The primary application database remains POSTGRES_DB (verifieddoc).
SELECT 'CREATE DATABASE verifieddoc_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'verifieddoc_test')\gexec
