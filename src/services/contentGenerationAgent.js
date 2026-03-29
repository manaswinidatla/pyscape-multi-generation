import supabase from '../utils/supabaseClient';

// ============================================================
// STEP 1: SYSTEM PROMPT (STRICT BEHAVIOR)
// ============================================================
const SYSTEM_PROMPT = `You are an AI curriculum generator for PyScape.

You create JSON lesson parts for a learning UI with three tabs:
1) Learn tab: reads markdown from content
2) Examples tab: runs examples[i].code and validates examples[i].testCases
3) Practice tab: runs exercise.starterCode in a code playground

Non-negotiable rules:
1. Return ONLY valid JSON
2. Do not include markdown fences, prose, or explanations outside JSON
3. Follow the exact schema and field names
4. Keep level progression logical (1 to 5)
5. Use deterministic runnable Python code only
6. No random/time/input/network/files/env dependencies
7. Every test check must be a concrete output substring
8. Exercise must be solvable with concepts taught in this level
9. If your draft violates rules, silently fix it before responding`;

// ============================================================
// STEP 2: DEVELOPER PROMPT (SCHEMA + UX CONTRACT)
// ============================================================
const DEVELOPER_PROMPT = `Generate PyScape lesson content with a strict UI contract.

System context:
- Learning hierarchy: Module -> Lesson -> Level-part
- Stored in lessons.parts as JSONB
- This payload becomes one part in the level experience

Return ONLY this JSON object:
{
  "level": number,
  "type": "intro|practical|advanced|projects|challenges",
  "title": "string",
  "description": "string",
  "content": "markdown string",
  "examples": [
    {
      "title": "string",
      "description": "string",
      "code": "python code",
      "testCases": [
        {
          "description": "string",
          "check": "substring expected in stdout"
        }
      ]
    }
  ],
  "keyPoints": ["string", "string", "string", "string"],
  "exercise": {
    "title": "string",
    "instructions": "string",
    "starterCode": "python starter code with TODO",
    "solution": "python solution"
  },
  "testCases": [
    {
      "description": "string",
      "check": "substring expected in stdout"
    }
  ]
}

UI mapping contract:
1) Learn tab consumes content
- Use these markdown headings in order:
  ### What You Will Build
  ### Core Idea in 60 Seconds
  ### Step-by-Step Walkthrough
  ### Common Mistakes
  ### Quick Recap

2) Examples tab consumes examples[]
- Provide exactly 3 examples
- Example 1: minimal happy path
- Example 2: practical variation
- Example 3: edge case or robust handling
- Each example must include exactly 2 testCases
- Every example must print deterministic outputs

3) Practice tab consumes exercise + top-level testCases
- exercise.instructions must define input rules and expected output format
- exercise.starterCode must include TODO markers and function skeleton
- Provide exactly 3 top-level testCases for the exercise

Quality constraints:
- Keep this level focused on one core concept
- Ensure examples and exercise only use concepts taught here
- description MUST BE 120-180 WORDS with this structure:
  [Opening sentence explaining what topic is introduced]
  [2-3 sentences explaining why this matters and how it fits into broader context]
  [2-3 sentences explaining the practical application with real-world examples]
  [1-2 sentences emphasizing key takeaway or workflow benefit]
  Example: "In this level, you'll master list comprehensions—a Pythonic way to create, filter, and transform lists in a single line. List comprehensions are faster and more readable than traditional loops, making them essential for writing professional Python code. You'll learn to write [x*2 for x in range(10)] instead of verbose loops. Real-world use: filtering data in pandas DataFrames, transforming API responses, and building efficient data pipelines. By the end, you'll recognize when to use comprehensions and write them confidently in production code."
- keyPoints must be exactly 4 concise outcomes (one per sentence if possible)
- No missing fields, no extra fields, valid JSON only`;

// ============================================================
// STEP 3: DYNAMIC USER PROMPT
// ============================================================
function buildUserPrompt(skillName, description, prerequisites, levelNumber, levelType, difficulty, generationContext = {}) {
  const prereqContext = prerequisites && prerequisites.length > 0
    ? `Prerequisites (student already knows): ${prerequisites.join(', ')}`
    : 'No prerequisites - this is foundational.';

  const moduleContextBlock = generationContext?.moduleTitle
    ? `\n\nMODULE CONTEXT (PRIMARY):
Module: "${generationContext.moduleTitle}"
Module Description: ${generationContext.moduleDescription || 'N/A'}
Module Tags: ${(generationContext.moduleTags || []).join(', ') || 'N/A'}
Lesson Focus: "${generationContext.lessonTitle || skillName}"
Generation Source: ${generationContext.source || 'skill-first'}`
    : '';

  const difficultyContext = {
    1: 'intro/foundational',
    2: 'practical/intermediate with code examples',
    3: 'advanced/edge cases and patterns',
    4: 'real-world projects combining concepts',
    5: 'challenging optimization and complex scenarios'
  };

  return `Generate one PyScape level part for:

Skill: "${skillName}"
Description: ${description}
${prereqContext}
${moduleContextBlock}

Level: ${levelNumber}/5 - ${difficultyContext[levelNumber] || 'practical progression'}
Type: ${levelType}
Target Difficulty: ${difficulty}

CRITICAL DESCRIPTION REQUIREMENT:
Your description field MUST be 120-180 words with this exact structure:
1. ONE sentence: Introduce what learners will master at this level
2. TWO-THREE sentences: Explain why this matters in real-world Python development
3. TWO-THREE sentences: Give concrete examples of practical applications (mention specific libraries, use cases, or scenarios)
4. ONE-TWO sentences: Emphasize key takeaway or professional benefit

Example high-quality description:
"In this level, you'll master list comprehensions—a Pythonic way to create, filter, and transform lists in a single line. List comprehensions are faster and more readable than traditional loops, making them essential for writing professional Python code. Real-world example: pandas DataFrames use comprehensions for data extraction, and Flask web developers use them for filtering API responses. By the end, you'll recognize when to use comprehensions and write them confidently in production code without hesitation."

Level intent requirements:
1. Assume student already completed levels 1-${Math.max(levelNumber - 1, 0)}
2. Introduce one new concept or one deeper application
3. Keep practical and coding-first explanations
4. Make outputs deterministic so substring tests are reliable
5. Include exactly 3 examples, exactly 2 tests per example
6. Include exactly 3 exercise tests
7. Return only the JSON object with description field meeting 120-180 word requirement`;
}

function extractJsonPayload(rawContent) {
  try {
    return JSON.parse(rawContent);
  } catch {
    const jsonMatch = rawContent.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    throw new Error('Failed to parse OpenRouter response as JSON');
  }
}

/**
 * Count words in a string (simple whitespace split)
 */
function countWords(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).length;
}

/**
 * Validate description length and quality
 * Returns: { isValid: boolean, wordCount: number, feedback: string }
 */
function validateDescription(description) {
  const wordCount = countWords(description);
  const MIN_WORDS = 120;
  const MAX_WORDS = 180;

  if (wordCount < MIN_WORDS) {
    return {
      isValid: false,
      wordCount,
      feedback: `Description too short (${wordCount} words, min ${MIN_WORDS}). Expand to include: 1) Topic intro, 2) Why it matters, 3) Practical use cases, 4) Key takeaway`
    };
  }

  if (wordCount > MAX_WORDS) {
    return {
      isValid: false,
      wordCount,
      feedback: `Description too long (${wordCount} words, max ${MAX_WORDS}). Condense while keeping: context, real-world application, and key benefit`
    };
  }

  // Check for minimum quality: should have multiple sentences and specific details
  const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length < 3) {
    return {
      isValid: false,
      wordCount,
      feedback: `Description too sparse (${sentences.length} sentences, min 3). Add more context and practical examples`
    };
  }

  return {
    isValid: true,
    wordCount,
    feedback: 'Description meets quality standards'
  };
}

/**
 * Build fallback description with proper structure
 * Used when AI generation fails or description is too short
 */
function buildFallbackDescription(title, levelNumber, levelType) {
  const descriptions = {
    1: `In this foundational level, you will learn ${title.toLowerCase()} and understand how it fits into everyday Python work. This concept is important because it appears in scripts, automation tasks, and backend services where clean logic and predictable output matter. You will see how small design choices improve readability, reduce bugs, and make your code easier to test. Through guided examples, you will connect syntax with purpose instead of memorizing isolated rules. You will also practice identifying common beginner mistakes and correcting them with simple patterns that scale well. By the end of this lesson, you should be able to explain the concept clearly, apply it in short programs, and use it as a reliable building block for more advanced topics in the course.`,

    2: `In this intermediate level, you will deepen your understanding of ${title.toLowerCase()} by applying it to practical coding scenarios. The goal is to move beyond basic correctness and focus on writing solutions that are maintainable, expressive, and easier for teammates to review. You will compare multiple approaches, evaluate trade-offs, and learn when one pattern is better than another in production-style code. Realistic examples will show how this skill appears in data processing, API handling, and utility functions used across projects. You will also practice refactoring verbose logic into clearer steps without losing correctness. By finishing this level, you should be able to choose a solid implementation strategy, justify your decisions, and confidently use this technique in day-to-day Python development.`,

    3: `In this advanced level, you will explore ${title.toLowerCase()} with a focus on edge cases, reliability, and performance-aware design. At this stage, the objective is not only to make code work, but to make it robust when inputs are messy, constraints change, or systems grow in complexity. You will study patterns used in mature codebases, including defensive checks, clear failure handling, and structures that remain readable under pressure. Practical examples will connect these ideas to larger workflows such as ETL pipelines, service orchestration, and reusable internal tooling. You will also examine common anti-patterns that cause maintenance problems and learn how to avoid them. By the end, you should be able to implement this concept with professional discipline and reason about correctness and scalability together.`,

    4: `In this project-focused level, you will apply ${title.toLowerCase()} as part of a larger, end-to-end solution that reflects real engineering work. Instead of isolated snippets, you will integrate multiple concepts, make architectural choices, and validate behavior across connected components. This mirrors how teams build features where clarity, reliability, and iteration speed all matter at once. You will practice breaking requirements into implementable steps, defining useful test signals, and improving code after initial success. The examples emphasize practical contexts such as data workflows, API transformations, and feature modules that evolve over time. You will also learn how to communicate trade-offs so collaborators can understand why a design was chosen. By completing this level, you should be ready to deliver structured project code with stronger confidence and consistency.`,

    5: `In this challenge level, you will push ${title.toLowerCase()} toward expert usage by optimizing design, handling complexity, and defending implementation choices. The focus is on reasoning under constraints, where performance, correctness, and maintainability must be balanced rather than treated separately. You will analyze nuanced scenarios, compare advanced alternatives, and identify the hidden costs of shortcuts that look efficient at first. Real-world style exercises will reflect high-impact tasks such as scaling data logic, improving latency-sensitive paths, and stabilizing behavior under unusual inputs. You will also practice documenting intent so advanced code remains understandable for future contributors. By the end of this level, you should be able to design resilient solutions, explain your technical decisions clearly, and apply this concept with senior-level judgment in production environments.`
  };

  const desc = descriptions[levelNumber] || descriptions[1];
  const wordCount = countWords(desc);
  
  if (wordCount < 120) {
    console.warn(`⚠️ Fallback description too short (${wordCount} words). Consider expanding context.`);
  }
  
  return desc;
}


function normalizeLessonPayload(payload, expectedLevel, expectedType) {
  const normalized = {
    level: Number(payload?.level) || expectedLevel,
    type: payload?.type || expectedType,
    title: payload?.title || `Level ${expectedLevel} Lesson`,
    description: payload?.description || 'Practice one focused concept with examples and coding.',
    content: payload?.content || '### What You Will Build\n\nNo content generated.',
    examples: Array.isArray(payload?.examples) ? payload.examples : [],
    keyPoints: Array.isArray(payload?.keyPoints) ? payload.keyPoints : [],
    exercise: payload?.exercise || {},
    testCases: Array.isArray(payload?.testCases) ? payload.testCases : []
  };

  // VALIDATE AND ENHANCE DESCRIPTION (NEW: 120-180 words requirement)
  const descriptionValidation = validateDescription(normalized.description);
  if (!descriptionValidation.isValid) {
    console.warn(`⚠️ Description validation issue: ${descriptionValidation.feedback}`);
    normalized.description = buildFallbackDescription(normalized.title, expectedLevel, expectedType);
    console.log(`✅ Applied fallback description (${countWords(normalized.description)} words)`);
  } else {
    console.log(`✅ Description valid (${descriptionValidation.wordCount} words)`);
  }

  normalized.examples = normalized.examples
    .slice(0, 3)
    .map((ex, idx) => ({
      title: ex?.title || `Example ${idx + 1}`,
      description: ex?.description || 'Run and observe deterministic output.',
      code: ex?.code || 'print("example")',
      testCases: (Array.isArray(ex?.testCases) ? ex.testCases : [])
        .slice(0, 2)
        .map((tc, tcIdx) => ({
          description: tc?.description || `Checks expected output ${tcIdx + 1}`,
          check: String(tc?.check || '').trim()
        }))
    }));

  while (normalized.examples.length < 3) {
    normalized.examples.push({
      title: `Example ${normalized.examples.length + 1}`,
      description: 'Additional deterministic example.',
      code: 'print("placeholder")',
      testCases: [
        { description: 'Checks placeholder output', check: 'placeholder' },
        { description: 'Checks execution succeeded', check: 'placeholder' }
      ]
    });
  }

  normalized.keyPoints = normalized.keyPoints.slice(0, 4);
  while (normalized.keyPoints.length < 4) {
    normalized.keyPoints.push(`Apply level ${expectedLevel} concept in runnable Python code.`);
  }

  normalized.exercise = {
    title: normalized.exercise?.title || `${normalized.title} Practice`,
    instructions: normalized.exercise?.instructions || 'Implement the TODO logic and print expected output.',
    starterCode: normalized.exercise?.starterCode || 'def solve():\n    # TODO: implement\n    pass\n\nsolve()',
    solution: normalized.exercise?.solution || 'def solve():\n    print("solution")\n\nsolve()'
  };

  if (!normalized.exercise.starterCode.includes('TODO')) {
    normalized.exercise.starterCode = `${normalized.exercise.starterCode}\n\n# TODO: add your logic above`;
  }

  normalized.testCases = normalized.testCases
    .slice(0, 3)
    .map((tc, idx) => ({
      description: tc?.description || `Exercise check ${idx + 1}`,
      check: String(tc?.check || '').trim()
    }));

  while (normalized.testCases.length < 3) {
    normalized.testCases.push({
      description: `Exercise check ${normalized.testCases.length + 1}`,
      check: 'solution'
    });
  }

  return normalized;
}

/**
 * Call OpenRouter API with 3-step prompt structure
 * EXPORTED: Used by levelAgents.js for multi-level generation
 */
export async function callOpenAI(skillName, description, prerequisites = [], levelNumber = 1, levelType = 'intro', difficulty = 'beginner', generationContext = {}) {
  const OPENROUTER_API_KEY = process.env.REACT_APP_OPENROUTER_API_KEY;
  
  if (!OPENROUTER_API_KEY) {
    throw new Error(
      '❌ REACT_APP_OPENROUTER_API_KEY not found in .env\n' +
      'Add: REACT_APP_OPENROUTER_API_KEY=your-key to your .env file\n' +
      'Get key from: https://openrouter.ai/keys'
    );
  }

  try {
    const userPrompt = buildUserPrompt(skillName, description, prerequisites, levelNumber, levelType, difficulty, generationContext);
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
        'X-Title': 'PyScape'
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: `${DEVELOPER_PROMPT}\n\n${userPrompt}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenRouter API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const parsed = extractJsonPayload(content);
    const normalized = normalizeLessonPayload(parsed, levelNumber, levelType);

    return normalized;
  } catch (err) {
    console.error('OpenRouter API call failed:', err);
    throw err;
  }
}

/**
 * Generate lesson content via OpenAI with 3-step prompting
 * Now supports level-specific generation
 */
async function generateLessonContent(skillId, skillName, description, prerequisites = [], levelNumber = 1, levelType = 'intro', difficulty = 'beginner') {
  console.log(`🤖 Generating Level ${levelNumber} (${levelType}) for skill: ${skillName}`);
  
  const lessonContent = await callOpenAI(
    skillName,
    description,
    prerequisites,
    levelNumber,
    levelType,
    difficulty
  );
  
  console.log('✅ Generated content:', {
    title: lessonContent.title,
    type: lessonContent.type,
    level: lessonContent.level,
    examples: lessonContent.examples?.length,
    keyPoints: lessonContent.keyPoints?.length
  });

  return lessonContent;
}

/**
 * Save generated lesson to database
 * Supports both single-level (for backward compatibility) and multi-level content
 * EXPORTED: Used by generationOrchestrator.js and original single-level flow
 */
export async function saveLessonToDatabase(skillId, moduleId, skillName, lessonContent) {
  try {
    // Get the max order_index for this module to assign a unique one
    const { data: existingLessons, error: orderError } = await supabase
      .from('lessons')
      .select('order_index')
      .eq('module_id', moduleId)
      .order('order_index', { ascending: false })
      .limit(1);

    if (orderError) throw orderError;

    const maxOrderIndex = existingLessons && existingLessons.length > 0 
      ? existingLessons[0].order_index 
      : 0;
    const nextOrderIndex = maxOrderIndex + 1;

    console.log(`📊 Module ${moduleId} - Max order_index: ${maxOrderIndex}, assigning: ${nextOrderIndex}`);

    // Wrap lesson content in parts array (single level per generated lesson)
    const partsArray = [{
      level: 1,
      title: lessonContent.title,
      description: lessonContent.description || '',
      content: lessonContent.content || '',
      examples: lessonContent.examples || [],
      keyPoints: lessonContent.keyPoints || [],
      exercise: lessonContent.exercise || null,
      testCases: lessonContent.testCases || []
    }];

    console.log(`📦 Saving lesson "${lessonContent.title}" with ${partsArray.length} part(s):`);
    console.log(`   Part 1: "${partsArray[0].title}"`);
    console.log(`   Parts data:`, JSON.stringify(partsArray).substring(0, 200) + '...');

    // Insert lesson
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .insert({
        module_id: moduleId,
        skill_id: skillId,
        title: lessonContent.title,
        type: 'code', // Type of lesson: 'read', 'code', etc.
        content: JSON.stringify(lessonContent), // Store full content in content column
        parts: partsArray, // Supabase will auto-convert to JSONB
        generated_by: 'ai-agent',
        is_published: true,
        order_index: nextOrderIndex
      })
      .select()
      .single();

    if (lessonError) throw lessonError;

    console.log(`✅ Lesson inserted: ID=${lesson.id}, Parts in DB: ${Array.isArray(lesson.parts) ? lesson.parts.length : 'ERROR'}`);

    // Create lesson-skill mapping
    const { error: mappingError } = await supabase
      .from('lesson_skills')
      .insert({
        lesson_id: lesson.id,
        skill_id: skillId,
        contribution: 1.0
      });

    if (mappingError) throw mappingError;

    console.log('💾 Lesson saved:', lesson.id, '- Order Index:', nextOrderIndex);
    return lesson;
  } catch (err) {
    console.error('Database save failed:', err);
    throw err;
  }
}

/**
 * Fetch prerequisites for a skill
 * EXPORTED: Used by levelAgents.js for context-aware generation
 */
export async function getSkillPrerequisites(skillId) {
  try {
    // Get skill dependencies - column is 'depends_on' not 'depends_on_id'
    const { data: deps, error: depsError } = await supabase
      .from('skill_dependencies')
      .select('depends_on')
      .eq('skill_id', skillId);

    if (depsError) throw depsError;

    if (deps.length === 0) return [];

    // Get prerequisite skill names
    const prereqIds = deps.map(d => d.depends_on);
    const { data: prereqSkills, error: skillsError } = await supabase
      .from('skills')
      .select('name')
      .in('id', prereqIds);

    if (skillsError) throw skillsError;

    return prereqSkills.map(s => s.name) || [];
  } catch (err) {
    console.error('Failed to fetch prerequisites:', err);
    return [];
  }
}

/**
 * Check if a lesson already exists for a skill
 */
async function lessonExistsForSkill(skillId) {
  try {
    const { count, error } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true })
      .eq('skill_id', skillId);

    if (error) throw error;
    return count > 0;
  } catch (err) {
    console.error('Failed to check lesson existence:', err);
    return false;
  }
}

/**
 * Main function: Generate and save lesson for a single skill
 */
export async function generateAndSaveLessonForSkill(skillId, moduleId = 1) {
  try {
    console.log('🚀 Content Generation Started for skill:', skillId);

    // Fetch skill details
    const { data: skill, error: skillError } = await supabase
      .from('skills')
      .select('*')
      .eq('id', skillId)
      .single();

    if (skillError) throw new Error(`Skill not found: ${skillId}`);

    console.log('📚 Skill found:', skill.name);

    // Check if lesson already exists
    const alreadyExists = await lessonExistsForSkill(skillId);
    if (alreadyExists) {
      console.log('⚠️ Lesson already exists for this skill');
      return {
        success: false,
        error: `Lesson already exists for ${skill.name}`
      };
    }

    // Get prerequisites
    const prerequisites = await getSkillPrerequisites(skillId);
    console.log('🔗 Prerequisites:', prerequisites.length > 0 ? prerequisites : 'none');

    // Generate content via OpenAI (Level 1 - Intro for backward compatibility)
    const lessonContent = await generateLessonContent(
      skill.id,
      skill.name,
      skill.description,
      prerequisites,
      1, // levelNumber
      'intro', // levelType
      'beginner' // difficulty
    );

    // Save to database
    const savedLesson = await saveLessonToDatabase(
      skill.id,
      moduleId,
      skill.name,
      lessonContent
    );

    console.log('✨ Complete! Lesson saved with ID:', savedLesson.id);

    return {
      success: true,
      skill: skill.name,
      lesson: savedLesson,
      content: lessonContent
    };
  } catch (err) {
    console.error('❌ Generation failed:', err.message);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Batch function: Generate lessons for all skills without lessons
 */
export async function generateAllMissingLessons() {
  try {
    console.log('🔄 Starting batch lesson generation...');

    // Get all skills
    const { data: skills, error: skillsError } = await supabase
      .from('skills')
      .select('id, name')
      .eq('published', true); // Only published skills

    if (skillsError) throw skillsError;

    let generated = 0;
    let skipped = 0;

    for (const skill of skills) {
      const hasLesson = await lessonExistsForSkill(skill.id);
      
      if (hasLesson) {
        console.log(`⏭️  Skipping ${skill.name} (lesson exists)`);
        skipped++;
      } else {
        console.log(`⏳ Generating for ${skill.name}...`);
        const result = await generateAndSaveLessonForSkill(skill.id);
        
        if (result.success) {
          generated++;
          console.log(`✅ Generated lesson for ${skill.name}`);
        } else {
          console.error(`❌ Failed for ${skill.name}: ${result.error}`);
        }

        // Add delay between requests to avoid rate limiting
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    console.log(`✨ Batch complete: ${generated} generated, ${skipped} skipped`);

    return {
      success: true,
      generated,
      skipped,
      total: skills.length
    };
  } catch (err) {
    console.error('❌ Batch generation failed:', err.message);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Regenerate lesson for a skill (overwrite existing)
 */
export async function regenerateLessonForSkill(skillId, moduleId = 1) {
  try {
    console.log('🔄 Regenerating lesson for skill:', skillId);

    // Fetch skill details
    const { data: skill, error: skillError } = await supabase
      .from('skills')
      .select('*')
      .eq('id', skillId)
      .single();

    if (skillError) throw skillError;

    // Get prerequisites
    const prerequisites = await getSkillPrerequisites(skillId);

    // Generate new content (Level 1 - Intro)
    const lessonContent = await generateLessonContent(
      skill.id,
      skill.name,
      skill.description,
      prerequisites,
      1, // levelNumber
      'intro', // levelType
      'beginner' // difficulty
    );

    // Delete old lessons for this skill
    const { error: deleteError } = await supabase
      .from('lessons')
      .delete()
      .eq('skill_id', skillId);

    if (deleteError) throw deleteError;

    // Save new lesson using the corrected function
    const savedLesson = await saveLessonToDatabase(
      skill.id,
      moduleId,
      skill.name,
      lessonContent
    );

    console.log('✨ Lesson regenerated:', savedLesson.id);

    return {
      success: true,
      skill: skill.name,
      lesson: savedLesson,
      content: lessonContent
    };
  } catch (err) {
    console.error('❌ Regeneration failed:', err.message);
    return {
      success: false,
      error: err.message
    };
  }
}
