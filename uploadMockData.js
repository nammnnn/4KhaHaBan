import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { mockAnimals } from './src/mockData.js';

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

async function uploadData() {
  console.log(`Uploading ${mockAnimals.length} real animals from Saved Souls Foundation to Supabase...`);
  
  // Format items for insert (omit temporary or client-side only fields)
  const formatted = mockAnimals.map(a => ({
    name: a.name,
    age: a.age,
    gender: a.gender,
    size: a.size,
    type: a.type,
    shelter: a.shelter,
    distance: a.distance,
    latitude: a.latitude,
    longitude: a.longitude,
    images: a.images,
    tags: a.tags,
    story: a.story,
    status: a.status || 'available',
    foundation_id: a.foundation_id
  }));

  // Batch insert 20 at a time
  const batchSize = 20;
  let totalUploaded = 0;
  for (let i = 0; i < formatted.length; i += batchSize) {
    const chunk = formatted.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from('animals')
      .insert(chunk)
      .select('id, name');

    if (error) {
      console.error(`Error uploading batch ${i / batchSize + 1}:`, error.message);
    } else {
      totalUploaded += (data || []).length;
      console.log(`Uploaded batch ${i / batchSize + 1} (${data.length} animals)`);
    }
  }

  console.log(`Finished! Total uploaded: ${totalUploaded} / ${formatted.length}`);
}

uploadData();
