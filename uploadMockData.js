import fs from 'fs';
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
const supabaseKey = envVars['VITE_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const mockAnimals = [
  {
    name: 'น้องทองแดง',
    age: '2 ปี',
    gender: 'female',
    size: 'กลาง',
    type: 'dog',
    shelter: 'มูลนิธิเพื่อสุนัขในซอย (Soi Dog)',
    distance: '3.2 กม.',
    latitude: 13.7382,
    longitude: 100.5701,
    images: ['https://images.unsplash.com/photo-1543466835-00a7907e9de1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
    tags: ['ทำวัคซีนแล้ว', 'ขี้อ้อน', 'เข้ากับคนง่าย', 'ทำหมันแล้ว'],
    story: 'น้องทองแดงถูกพบเดินหลงทางอยู่แถวตลาด น้องเป็นสุนัขที่ร่าเริงและเป็นมิตรมาก ชอบเล่นลูกบอลและชอบให้คนลูบหัว น้องพร้อมที่จะมีครอบครัวที่อบอุ่นแล้วค่ะ'
  },
  {
    name: 'ส้มจี๊ด',
    age: '6 เดือน',
    gender: 'male',
    size: 'เล็ก',
    type: 'cat',
    shelter: 'บ้านแมวจรจัดเชียงใหม่',
    distance: '5.5 กม.',
    latitude: 13.7845,
    longitude: 100.5478,
    images: ['https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
    tags: ['ทำวัคซีนแล้ว', 'ใช้กระบะทรายเป็น', 'ขี้เล่น'],
    story: 'ส้มจี๊ดเป็นลูกแมวที่ซุกซนและมีพลังงานล้นเหลือ ชอบวิ่งไล่จับของเล่นและชอบปีนป่าย น้องกำลังมองหาทาสแมวที่จะมาคอยดูแลและเล่นด้วยทุกวัน'
  },
  {
    name: 'พี่เบิ้ม',
    age: '4 ปี',
    gender: 'male',
    size: 'ใหญ่',
    type: 'dog',
    shelter: 'ศูนย์พักพิงสัตว์ปทุมธานี',
    distance: '12 กม.',
    latitude: 13.9870,
    longitude: 100.6150,
    images: ['https://images.unsplash.com/photo-1583337130417-3346a1be7dee?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
    tags: ['เฝ้าบ้านเก่ง', 'ทำวัคซีนแล้ว', 'ใจดี', 'สุขภาพแข็งแรง'],
    story: 'พี่เบิ้มเป็นสุนัขพันธุ์ผสมตัวใหญ่ใจดี ถึงหน้าตาจะดูดุแต่น้องเป็นมิตรมาก น้องเคยมีเจ้าของแต่เจ้าของย้ายบ้านและไม่สามารถพาน้องไปด้วยได้ ตอนนี้น้องรอคนใจดีมารับไปอยู่ด้วยครับ'
  }
];

async function uploadData() {
  console.log('Uploading mock data to Supabase...');
  
  const { data, error } = await supabase
    .from('animals')
    .insert(mockAnimals)
    .select();

  if (error) {
    console.error('Error uploading data:', error.message);
  } else {
    console.log('Successfully uploaded mock data!');
    console.log(data);
  }
}

uploadData();
