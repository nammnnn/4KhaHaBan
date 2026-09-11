import { api } from './src/services/api.js';
import { supabase } from './src/services/supabaseClient.js';

async function test() {
  console.log("1. Testing getAnimals()...");
  const animals = await api.getAnimals();
  console.log(`Got ${animals.length} animals. First animal ID:`, animals[0]?.id);
  
  if (animals.length > 0) {
    const animalId = animals[0].id;
    console.log(`\n2. Testing submitMatchRequest('${animalId}')...`);
    try {
      const match = await api.submitMatchRequest(animalId);
      console.log("Match request result:", match);
    } catch (e) {
      console.error("Match request failed:", e);
    }
    
    console.log(`\n3. Testing getUserMatches()...`);
    const matches = await api.getUserMatches();
    console.log("User matches length:", matches.length);
    console.log("User matches:", matches);
    
    if (matches.length > 0) {
      const m = matches[0];
      console.log(`\n4. Testing getAnimalById('${m.animalId}')...`);
      try {
        const animal = await api.getAnimalById(m.animalId);
        console.log("Got animal:", animal.name);
      } catch (e) {
        console.error("getAnimalById failed:", e);
      }
    }
  }
}

test();
