import { index, integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const encryptedWorkspaces = pgTable("encrypted_workspaces", {
  id: varchar("id", { length: 40 }).primaryKey(),
  ciphertext: text("ciphertext").notNull(),
  iv: varchar("iv", { length: 128 }).notNull(),
  salt: varchar("salt", { length: 128 }).notNull(),
  writeTokenHash: varchar("write_token_hash", { length: 64 }).notNull(),
  deleteTokenHash: varchar("delete_token_hash", { length: 64 }).notNull(),
  schemaVersion: integer("schema_version").notNull().default(2),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (table) => [index("encrypted_workspaces_expires_at_idx").on(table.expiresAt)]);
