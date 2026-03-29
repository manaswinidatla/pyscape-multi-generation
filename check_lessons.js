// Quick script to inspect lessons in module 1
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for full access
);

async function checkLessons() {
  try {
    // Get first 5 lessons for module 1
    const { data: lessons, error } = await supabase
      .from('lessons')
      .select('id, skill_id, title, parts')
      .eq('module_id', 1)
      .limit(5);

    if (error) throw error;

    console.log('\n📚 Lesson Data Analysis:');
    console.log('='.repeat(80));

    lessons.forEach((lesson, idx) => {
      console.log(`\n[${idx + 1}] Lesson ID: ${lesson.id}`);
      console.log(`    Skill ID: ${lesson.skill_id}`);
      console.log(`    Title: ${lesson.title}`);
      
      let parts = lesson.parts;
      if (typeof parts === 'string') {
        try {
          parts = JSON.parse(parts);
        } catch (e) {
          console.log(`    ⚠️ Could not parse parts as JSON`);
        }
      }

      if (Array.isArray(parts)) {
        console.log(`    Levels in parts array: ${parts.length}`);
        parts.forEach(p => {
          console.log(`      - Level ${p.level}: "${p.title}" (${p.type})`);
        });
      } else {
        console.log(`    Parts type: ${typeof parts} (not an array)`);
      }
    });

    // Check total lessons count
    const { count, error: countError } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true })
      .eq('module_id', 1);

    if (!countError) {
      console.log(`\n\n Total lessons in Module 1: ${count}`);
    }

    // Check generation_queue stats
    const { data: queueStats, error: queueError } = await supabase
      .from('generation_queue')
      .select('level, status')
      .eq('module_id', 1);

    if (!queueError) {
      const levelCounts = {};
      queueStats.forEach(q => {
        levelCounts[q.level] = (levelCounts[q.level] || 0) + 1;
      });
      console.log(`\n Generation Queue Stats (Module 1):`);
      Object.entries(levelCounts).forEach(([level, count]) => {
        console.log(`    Level ${level}: ${count} entries`);
      });
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkLessons();
