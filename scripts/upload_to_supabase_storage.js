import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Read .env file
const envFile = fs.readFileSync('.env', 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

const supabaseUrl = envVars['VITE_SUPABASE_URL'];
const supabaseKey = envVars['VITE_SUPABASE_SERVICE_ROLE_KEY'] || envVars['VITE_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const BUCKET_NAME = 'animal-images';

async function main() {
  console.log(`Starting upload to Supabase Storage bucket: ${BUCKET_NAME}...`);
  
  const animalsDir = path.join(process.cwd(), 'public', 'animals');
  if (!fs.existsSync(animalsDir)) {
    console.error(`Directory not found: ${animalsDir}`);
    process.exit(1);
  }

  const allFiles = fs.readdirSync(animalsDir).filter(f => f.endsWith('.jpeg') || f.endsWith('.jpg') || f.endsWith('.png'));
  console.log(`Found ${allFiles.length} files in public/animals/`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < allFiles.length; i++) {
    const filename = allFiles[i];
    const filePath = path.join(animalsDir, filename);
    const fileBuffer = fs.readFileSync(filePath);
    const contentType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, fileBuffer, {
        contentType,
        upsert: true
      });

    if (error) {
      console.error(`Failed to upload ${filename}:`, error.message);
      failCount++;
      if (error.message.includes('row-level security')) {
        console.error('\n*** ERROR: Row-Level Security blocked upload! ***');
        console.error('Please run supabase/setup_storage_policy.sql in Supabase SQL Editor first.\n');
        process.exit(1);
      }
    } else {
      successCount++;
      if (successCount % 20 === 0 || i === allFiles.length - 1) {
        console.log(`Uploaded ${successCount}/${allFiles.length} images...`);
      }
    }
  }

  console.log(`\nUpload complete! Successfully uploaded ${successCount} images (${failCount} failed).`);

  // Now update database records to use the public Supabase storage URLs
  console.log('Updating Supabase database animals table with Supabase Storage CDN URLs...');
  const { data: dbAnimals, error: fetchErr } = await supabase.from('animals').select('id, name, images');
  if (fetchErr) {
    console.error('Error fetching animals for URL update:', fetchErr.message);
    return;
  }

  let updatedCount = 0;
  for (const animal of (dbAnimals || [])) {
    if (!animal.images || animal.images.length === 0) continue;
    const newImages = animal.images.map(img => {
      if (img.startsWith('/animals/')) {
        const basename = path.basename(img);
        const { data: pub } = supabase.storage.from(BUCKET_NAME).getPublicUrl(basename);
        return pub.publicUrl;
      }
      return img;
    });

    const { error: updateErr } = await supabase
      .from('animals')
      .update({ images: newImages })
      .eq('id', animal.id);

    if (!updateErr) updatedCount++;
  }

  console.log(`Successfully updated ${updatedCount} animal records in Supabase database!`);
}

main().catch(err => console.error('Fatal error:', err));
