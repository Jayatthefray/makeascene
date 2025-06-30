import OpenAI from 'openai';

// Initialize OpenAI client with 2025 configuration
const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // For React Native
});

// 2025 Pricing from PRD
const PRICING = {
  'gpt-4o': {
    input: 0.005, // $5.00 per 1M tokens
    output: 0.015, // $15.00 per 1M tokens
  },
  'gpt-4o-mini': {
    input: 0.00015, // $0.15 per 1M tokens
    output: 0.0006, // $0.60 per 1M tokens
  },
  'dall-e-3': {
    standard_1024: 0.04, // $0.04 per image
    hd_1024: 0.08, // $0.08 per image
  }
};

// Auto-Generated Story Prompts (Week 1-2 Feature)
export const generateStoryPrompt = async (constraints) => {
  const { genre, actorCount, location, timeOfDay, experienceLevel } = constraints;
  
  const systemPrompt = `You are a professional film director creating short scene prompts for amateur filmmakers. 
  Generate a compelling, filmable scene that:
  - Can be completed in 60 seconds or less
  - Requires exactly ${actorCount} actor(s)
  - Is appropriate for ${location} filming
  - Suits ${timeOfDay} lighting conditions
  - Matches ${experienceLevel} skill level
  - Follows ${genre} genre conventions
  
  The scene must be guaranteed filmable with smartphone cameras and minimal equipment.
  Return ONLY a JSON object with: title, description, estimatedDuration, dialogue, blockingInstructions, requiredProps.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Cost-effective for prompts
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `Generate a ${genre} scene for ${actorCount} actors in ${location} during ${timeOfDay}.` 
        }
      ],
      temperature: 0.8,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    });

    const generatedPrompt = JSON.parse(response.choices[0].message.content);
    
    // Calculate cost
    const cost = calculateTokenCost(response.usage, 'gpt-4o-mini');
    
    return {
      success: true,
      data: {
        ...generatedPrompt,
        constraints,
        aiModel: 'gpt-4o-mini',
        tokensUsed: response.usage.total_tokens,
        cost
      }
    };
  } catch (error) {
    console.error('Story prompt generation failed:', error);
    return { success: false, error: error.message };
  }
};

// Smart Storyboarding with Constraint Engine (Week 3-4 Feature)
export const generateStoryboard = async (storyPrompt, constraints) => {
  const { actorCount, equipment, location } = constraints;
  
  const systemPrompt = `You are a professional cinematographer creating detailed shot lists for smartphone filmmaking.
  
  Generate 3-7 specific shots that:
  - Are guaranteed filmable with ${equipment.join(', ')} equipment
  - Work with ${actorCount} actor(s) in ${location}
  - Create a complete narrative arc
  - Include professional filming terminology
  - Specify exact camera positions and movements
  
  Each shot must include: shotNumber, shotType, description, cameraPosition, actorPositions, duration, difficulty (1-5).
  Shot types: selfie, single_handheld, two_shot_handheld, group_static, moving_tracking, cinematic_sequence.
  
  Return ONLY a JSON object with shots array.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Higher quality for storyboarding
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `Create shots for: ${storyPrompt.title}\n${storyPrompt.description}` 
        }
      ],
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    });

    const storyboard = JSON.parse(response.choices[0].message.content);
    const cost = calculateTokenCost(response.usage, 'gpt-4o');
    
    return {
      success: true,
      data: {
        ...storyboard,
        aiModel: 'gpt-4o',
        tokensUsed: response.usage.total_tokens,
        cost
      }
    };
  } catch (error) {
    console.error('Storyboard generation failed:', error);
    return { success: false, error: error.message };
  }
};

// AI-Generated Sketch Storyboards (Week 3-5 Feature)
export const generateSketchStoryboard = async (shotDescription, shotType) => {
  const prompt = `Professional film storyboard sketch in black and white ink style:
  ${shotDescription}
  
  Shot type: ${shotType}
  Style: Clean line art, professional storyboard aesthetic, clear composition, film industry standard.
  Show camera angle, actor positions, and basic environment.
  No text or dialogue bubbles.`;

  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      size: '1024x1024',
      quality: 'standard',
      n: 1,
    });

    const imageUrl = response.data[0].url;
    const cost = PRICING['dall-e-3'].standard_1024;

    return {
      success: true,
      data: {
        imageUrl,
        prompt,
        model: 'dall-e-3',
        cost
      }
    };
  } catch (error) {
    console.error('Sketch generation failed:', error);
    return { success: false, error: error.message };
  }
};

// Constraint Validation Engine
export const validateConstraints = (constraints) => {
  const { actorCount, equipment, location, experienceLevel } = constraints;
  
  const validationRules = {
    actorCount: actorCount >= 1 && actorCount <= 8,
    equipment: Array.isArray(equipment) && equipment.length > 0,
    location: ['indoor', 'outdoor', 'mixed'].includes(location),
    experienceLevel: ['beginner', 'intermediate', 'advanced'].includes(experienceLevel)
  };

  const violations = Object.entries(validationRules)
    .filter(([key, isValid]) => !isValid)
    .map(([key]) => key);

  return {
    isValid: violations.length === 0,
    violations
  };
};

// Auto-Generated Prompt Templates (50+ per genre)
export const getPromptTemplate = (genre, actorCount) => {
  const templates = {
    horror: [
      'A mysterious package arrives at the door',
      'Strange sounds from the basement',
      'The lights keep flickering ominously',
      'Something is watching from the shadows',
      'An old photograph reveals a dark secret'
    ],
    comedy: [
      'A case of mistaken identity',
      'Everything that can go wrong, does',
      'A misunderstanding leads to chaos',
      'Trying to keep a secret goes hilariously wrong',
      'A simple task becomes absurdly complicated'
    ],
    romance: [
      'A chance encounter in an unexpected place',
      'Competing for the same thing brings them together',
      'A misunderstanding threatens their relationship',
      'They must work together to solve a problem',
      'A gesture speaks louder than words'
    ],
    drama: [
      'A difficult conversation that changes everything',
      'Standing up for what\'s right has consequences',
      'A moment of truth reveals hidden feelings',
      'Past mistakes catch up with the present',
      'A decision must be made that affects everyone'
    ],
    action: [
      'Racing against time to prevent disaster',
      'A chase through familiar territory',
      'Protecting someone from an unseen threat',
      'Escaping from a dangerous situation',
      'A confrontation that has been building'
    ]
  };

  const genreTemplates = templates[genre] || templates.drama;
  return genreTemplates[Math.floor(Math.random() * genreTemplates.length)];
};

// Cost calculation helper
const calculateTokenCost = (usage, model) => {
  const pricing = PRICING[model];
  const inputCost = (usage.prompt_tokens / 1000000) * pricing.input;
  const outputCost = (usage.completion_tokens / 1000000) * pricing.output;
  return parseFloat((inputCost + outputCost).toFixed(4));
};

// Enhanced prompt with user learning
export const generateAdaptivePrompt = async (constraints, userHistory) => {
  // Analyze user preferences from history
  const preferredGenres = userHistory.favoriteGenres || [constraints.genre];
  const averageActorCount = userHistory.averageActorCount || constraints.actorCount;
  const successfulShotTypes = userHistory.preferredShotTypes || ['single_handheld'];

  // Enhance constraints with user preferences
  const enhancedConstraints = {
    ...constraints,
    userPreferences: {
      preferredGenres,
      averageActorCount,
      successfulShotTypes
    }
  };

  return generateStoryPrompt(enhancedConstraints);
};

export default {
  generateStoryPrompt,
  generateStoryboard,
  generateSketchStoryboard,
  validateConstraints,
  getPromptTemplate,
  generateAdaptivePrompt
};