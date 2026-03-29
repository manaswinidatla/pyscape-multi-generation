// levelAgents.js - Specialized AI agents for multi-level content generation
// Each agent focuses on a specific level type with distinct pedagogical approach
// Uses the 3-step prompt system from contentGenerationAgent.js

import { callOpenAI } from './contentGenerationAgent.js';

// Level type definitions
export const LEVEL_TYPES = {
  1: { name: 'intro', title: 'Introduction', description: 'Foundational concepts and overview' },
  2: { name: 'practical', title: 'Practical Examples', description: 'Real code examples and hands-on practice' },
  3: { name: 'advanced', title: 'Advanced Practice', description: 'More complex scenarios and edge cases' },
  4: { name: 'projects', title: 'Real-World Projects', description: 'Mini-projects and real-world applications' },
  5: { name: 'challenges', title: 'Challenges', description: 'Advanced problem-solving and optimization' }
};

/**
 * IntroAgent (Level 1): Generates foundational, beginner-friendly introductory content
 */
export const IntroAgent = {
  name: 'IntroAgent',
  
  async generateLevel(skillId, skillName, description, prerequisites = [], levelNumber = 1, generationContext = {}) {
    console.log(`🎓 IntroAgent: Generating introduction for "${skillName}"...`);
    
    try {
      const content = await callOpenAI(
        skillName,
        description,
        prerequisites,
        levelNumber, // levelNumber
        'intro', // levelType
        'beginner', // difficulty
        generationContext
      );
      
      console.log(`✅ IntroAgent: Successfully generated intro level`);
      return {
        level: 1,
        type: 'intro',
        ...content
      };
    } catch (error) {
      console.error(`❌ IntroAgent Error:`, error.message);
      throw new Error(`IntroAgent failed for ${skillName}: ${error.message}`);
    }
  }
};

/**
 * PracticalAgent (Levels 2 & 3): Generates hands-on practical examples and exercises
 */
export const PracticalAgent = {
  name: 'PracticalAgent',
  
  async generateLevel(skillId, skillName, description, prerequisites = [], levelNumber = 2, generationContext = {}) {
    const isAdvanced = levelNumber === 3;
    const levelType = isAdvanced ? 'advanced' : 'practical';
    const difficulty = isAdvanced ? 'intermediate-advanced' : 'intermediate';
    
    console.log(`💻 PracticalAgent: Generating ${isAdvanced ? 'advanced' : 'practical'} level for "${skillName}"...`);
    
    try {
      const content = await callOpenAI(
        skillName,
        description,
        prerequisites,
        levelNumber,
        levelType,
        difficulty,
        generationContext
      );
      
      console.log(`✅ PracticalAgent: Successfully generated level ${levelNumber}`);
      return {
        level: levelNumber,
        type: levelType,
        ...content
      };
    } catch (error) {
      console.error(`❌ PracticalAgent Error:`, error.message);
      throw new Error(`PracticalAgent failed for ${skillName}: ${error.message}`);
    }
  }
};

/**
 * ProjectsAgent (Level 4): Generates real-world mini-projects
 */
export const ProjectsAgent = {
  name: 'ProjectsAgent',
  
  async generateLevel(skillId, skillName, description, prerequisites = [], levelNumber = 4, generationContext = {}) {
    console.log(`🏗️  ProjectsAgent: Generating project for "${skillName}"...`);
    
    try {
      const content = await callOpenAI(
        skillName,
        description,
        prerequisites,
        levelNumber, // levelNumber
        'projects', // levelType
        'intermediate', // difficulty
        generationContext
      );
      
      console.log(`✅ ProjectsAgent: Successfully generated projects level`);
      return {
        level: 4,
        type: 'projects',
        ...content
      };
    } catch (error) {
      console.error(`❌ ProjectsAgent Error:`, error.message);
      throw new Error(`ProjectsAgent failed for ${skillName}: ${error.message}`);
    }
  }
};

/**
 * ChallengesAgent (Level 5): Generates advanced challenges and optimization problems
 */
export const ChallengesAgent = {
  name: 'ChallengesAgent',
  
  async generateLevel(skillId, skillName, description, prerequisites = [], levelNumber = 5, generationContext = {}) {
    console.log(`🎯 ChallengesAgent: Generating challenges for "${skillName}"...`);
    
    try {
      const content = await callOpenAI(
        skillName,
        description,
        prerequisites,
        levelNumber, // levelNumber
        'challenges', // levelType
        'advanced', // difficulty
        generationContext
      );
      
      console.log(`✅ ChallengesAgent: Successfully generated challenges level`);
      return {
        level: 5,
        type: 'challenges',
        ...content
      };
    } catch (error) {
      console.error(`❌ ChallengesAgent Error:`, error.message);
      throw new Error(`ChallengesAgent failed for ${skillName}: ${error.message}`);
    }
  }
};

/**
 * Route agent selection by level number
 */
export function getAgentForLevel(levelNumber) {
  const agents = {
    1: IntroAgent,
    2: PracticalAgent,
    3: PracticalAgent,
    4: ProjectsAgent,
    5: ChallengesAgent
  };
  
  return agents[levelNumber] || IntroAgent;
}

/**
 * Get all agents
 */
export function getAllAgents() {
  return [IntroAgent, PracticalAgent, ProjectsAgent, ChallengesAgent];
}
