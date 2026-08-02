CREATE TABLE IF NOT EXISTS "encrypted_workspaces" (
  "id" varchar(40) PRIMARY KEY NOT NULL,
  "ciphertext" text NOT NULL,
  "iv" varchar(128) NOT NULL,
  "salt" varchar(128) NOT NULL,
  "write_token_hash" varchar(64) NOT NULL,
  "delete_token_hash" varchar(64) NOT NULL,
  "schema_version" integer DEFAULT 2 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone NOT NULL
);

CREATE INDEX IF NOT EXISTS "encrypted_workspaces_expires_at_idx"
  ON "encrypted_workspaces" ("expires_at");
