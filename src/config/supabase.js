/**
 * Supabase Konfiguration für Session-Sync
 *
 * Um den Session-Sync zu nutzen, benötigst du einen kostenlosen Supabase Account:
 * 1. Gehe zu https://supabase.com und erstelle ein Projekt
 * 2. Kopiere die URL und den anon key aus den Projekteinstellungen
 * 3. Trage die Werte in der .env Datei ein:
 *    VITE_SUPABASE_URL=https://dein-projekt.supabase.co
 *    VITE_SUPABASE_ANON_KEY=dein-anon-key
 */

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
};
