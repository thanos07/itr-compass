-- Upgrade an existing v0.2 database. Existing rows cannot be safely updated
-- because they have no owner authorization tokens, so they are removed.
ALTER TABLE "encrypted_workspaces"
  ADD COLUMN IF NOT EXISTS "write_token_hash" varchar(64),
  ADD COLUMN IF NOT EXISTS "delete_token_hash" varchar(64);

DELETE FROM "encrypted_workspaces"
WHERE "write_token_hash" IS NULL OR "delete_token_hash" IS NULL;

ALTER TABLE "encrypted_workspaces"
  ALTER COLUMN "write_token_hash" SET NOT NULL,
  ALTER COLUMN "delete_token_hash" SET NOT NULL,
  ALTER COLUMN "schema_version" SET DEFAULT 2;
