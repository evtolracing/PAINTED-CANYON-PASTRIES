const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const path = require('path');

const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

let supabase = null;

function getSupabase() {
  if (!supabase && supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

const BUCKET = 'uploads';

/**
 * Upload a file buffer to Supabase Storage.
 * Returns the public URL of the uploaded file.
 */
async function uploadToStorage(file, folder = '') {
  const sb = getSupabase();
  if (!sb) {
    throw new Error('Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  const ext = path.extname(file.originalname);
  const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
  const filePath = folder ? `${folder}/${uniqueName}` : uniqueName;

  const { data, error } = await sb.storage
    .from(BUCKET)
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  // Get the public URL
  const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(data.path);
  return urlData.publicUrl;
}

/**
 * Delete a file from Supabase Storage by its public URL.
 */
async function deleteFromStorage(publicUrl) {
  const sb = getSupabase();
  if (!sb || !publicUrl) return;

  // Extract the file path from the public URL
  // URL format: https://<project>.supabase.co/storage/v1/object/public/uploads/<path>
  try {
    const url = new URL(publicUrl);
    const prefix = `/storage/v1/object/public/${BUCKET}/`;
    const idx = url.pathname.indexOf(prefix);
    if (idx === -1) return;
    const filePath = url.pathname.slice(idx + prefix.length);

    await sb.storage.from(BUCKET).remove([filePath]);
  } catch {
    // Ignore delete errors (file may not exist)
  }
}

/**
 * Ensure the uploads bucket exists (call once during setup).
 */
async function ensureBucket() {
  const sb = getSupabase();
  if (!sb) return;

  const { data: buckets } = await sb.storage.listBuckets();
  const exists = buckets?.some(b => b.name === BUCKET);
  if (!exists) {
    await sb.storage.createBucket(BUCKET, { public: true });
  }
}

module.exports = { uploadToStorage, deleteFromStorage, ensureBucket, BUCKET };
