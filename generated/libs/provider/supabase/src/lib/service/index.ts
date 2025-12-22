/**
 * Supabase Services Barrel Export
 *
 * Re-exports all Supabase service implementations.

This module provides:
- SupabaseClient: Core SDK client management
- SupabaseAuth: Authentication operations
- SupabaseStorage: File storage operations

For granular imports, import directly from service modules.
 *
 * @module @myorg/provider-supabase/service
 */

// Authentication
export { SupabaseAuth, type SupabaseAuthServiceInterface } from "./auth";
// Core client
export { SupabaseClient, type SupabaseClientServiceInterface } from "./client";

// Storage
export { SupabaseStorage, type SupabaseStorageServiceInterface } from "./storage";
