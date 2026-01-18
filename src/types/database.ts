export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface TimingSettings {
  longWordThreshold: number    // chars before extra time (default: 6)
  msPerExtraChar: number       // ms per extra character (default: 20)
  sentencePauseMs: number      // pause after . ! ? (default: 150)
  clausePauseMs: number        // pause after , ; : (default: 75)
}

export interface UserPreferences {
  anchor_position: number
  screen_position: number
  default_speed: number
  theme: 'dark' | 'light'
  font_size: number
  anchor_color: string
  timing: TimingSettings
  free_summary_credits: number
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          preferences: UserPreferences
        }
        Insert: {
          id: string
          email: string
          created_at?: string
          preferences?: UserPreferences
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          preferences?: UserPreferences
        }
      }
      documents: {
        Row: {
          id: string
          user_id: string
          title: string
          file_path: string | null
          word_count: number
          words: string[]
          created_at: string
          last_read_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          file_path?: string | null
          word_count?: number
          words?: string[]
          created_at?: string
          last_read_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          file_path?: string | null
          word_count?: number
          words?: string[]
          created_at?: string
          last_read_at?: string | null
        }
      }
      reading_progress: {
        Row: {
          id: string
          user_id: string
          document_id: string
          word_index: number
          speed: number
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          document_id: string
          word_index?: number
          speed?: number
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          document_id?: string
          word_index?: number
          speed?: number
          updated_at?: string
        }
      }
      reading_sessions: {
        Row: {
          id: string
          user_id: string
          document_id: string
          start_index: number
          end_index: number
          speed: number
          duration_seconds: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          document_id: string
          start_index: number
          end_index: number
          speed: number
          duration_seconds: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          document_id?: string
          start_index?: number
          end_index?: number
          speed?: number
          duration_seconds?: number
          created_at?: string
        }
      }
      api_keys: {
        Row: {
          id: string
          user_id: string
          provider: 'anthropic' | 'mistral'
          encrypted_key: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider: 'anthropic' | 'mistral'
          encrypted_key: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider?: 'anthropic' | 'openai'
          encrypted_key?: string
          created_at?: string
        }
      }
      summaries: {
        Row: {
          id: string
          document_id: string
          user_id: string
          word_index: number
          summary_text: string
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          user_id: string
          word_index: number
          summary_text: string
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          user_id?: string
          word_index?: number
          summary_text?: string
          created_at?: string
        }
      }
      spotify_connections: {
        Row: {
          id: string
          user_id: string
          access_token: string
          refresh_token: string
          expires_at: string
          spotify_user_id: string | null
          spotify_display_name: string | null
          spotify_product: 'premium' | 'free' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          access_token: string
          refresh_token: string
          expires_at: string
          spotify_user_id?: string | null
          spotify_display_name?: string | null
          spotify_product?: 'premium' | 'free' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          access_token?: string
          refresh_token?: string
          expires_at?: string
          spotify_user_id?: string | null
          spotify_display_name?: string | null
          spotify_product?: 'premium' | 'free' | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

export type User = Database['public']['Tables']['users']['Row']
export type Document = Database['public']['Tables']['documents']['Row']
export type ReadingProgress = Database['public']['Tables']['reading_progress']['Row']
export type ReadingSession = Database['public']['Tables']['reading_sessions']['Row']
export type ApiKey = Database['public']['Tables']['api_keys']['Row']
export type Summary = Database['public']['Tables']['summaries']['Row']

// Spotify Connection type (stored in spotify_connections table)
export interface SpotifyConnection {
  id: string
  user_id: string
  access_token: string
  refresh_token: string
  expires_at: string
  spotify_user_id: string | null
  spotify_display_name: string | null
  spotify_product: 'premium' | 'free' | null
  created_at: string
  updated_at: string
}
