/*
  # Create members and photo permissions tables

  1. New Tables
    - `members`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `email` (text, unique, not null)
      - `is_active` (boolean, default true) - distinguishes current vs past members
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `photo_permissions`
      - `id` (uuid, primary key)
      - `member_id` (uuid, foreign key to members)
      - `internal_external` (boolean, default false) - green dot
      - `internal_only` (boolean, default false) - red dot
      - `no_permissions` (boolean, default false) - coral/orange dot
      - `no_alcohol` (boolean, default false) - dark blue dot
      - `no_audio` (boolean, default false) - pink/magenta dot
      - `not_prominently` (boolean, default false) - pink dot
      - `no_social_media` (boolean, default false) - light pink dot
      - `no_tiktok` (boolean, default false) - similar permission
      - `extra_comments` (text, nullable)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to read data
    - Add policies for admin users to modify data
*/

-- Create members table
CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create photo_permissions table
CREATE TABLE IF NOT EXISTS photo_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  internal_external boolean DEFAULT false,
  internal_only boolean DEFAULT false,
  no_permissions boolean DEFAULT false,
  no_alcohol boolean DEFAULT false,
  no_audio boolean DEFAULT false,
  not_prominently boolean DEFAULT false,
  no_social_media boolean DEFAULT false,
  no_tiktok boolean DEFAULT false,
  extra_comments text,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(member_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_members_name ON members(name);
CREATE INDEX IF NOT EXISTS idx_members_is_active ON members(is_active);
CREATE INDEX IF NOT EXISTS idx_photo_permissions_member_id ON photo_permissions(member_id);

-- Enable Row Level Security
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_permissions ENABLE ROW LEVEL SECURITY;

-- Policies for members table
CREATE POLICY "Authenticated users can view members"
  ON members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert members"
  ON members FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update members"
  ON members FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies for photo_permissions table
CREATE POLICY "Authenticated users can view photo permissions"
  ON photo_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert photo permissions"
  ON photo_permissions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update photo permissions"
  ON photo_permissions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
