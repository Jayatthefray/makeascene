import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Make sure to set these in your .env file at the project root
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

console.log('Environment variables check:');
console.log('EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl);
console.log('EXPO_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '[PRESENT]' : '[UNDEFINED]');

// Check if we have real credentials
const hasValidCredentials = 
  supabaseUrl !== 'https://placeholder.supabase.co' && 
  supabaseAnonKey !== 'placeholder-key';

if (!hasValidCredentials) {
  console.warn('⚠️ Using placeholder Supabase credentials. Please update your .env file with real values.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export { hasValidCredentials };

// ===== User Authentication =====
export const signUp = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { data, error };
};
export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
};
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return { user };
};

// ===== Projects =====
export const getProjects = async () => {
  const { data, error } = await supabase.from('projects').select('*');
  return { data, error };
};
export const getProject = async (projectId) => {
  const { data, error } = await supabase.from('projects').select('*').eq('id', projectId).single();
  return { data, error };
};
export const createProject = async (projectData) => {
  const { data, error } = await supabase.from('projects').insert([projectData]).select().single();
  return { data, error };
};
export const updateProject = async (projectId, updates) => {
  const { data, error } = await supabase.from('projects').update(updates).eq('id', projectId).select().single();
  return { data, error };
};

// ===== Shots =====
export const getShots = async (projectId) => {
  const { data, error } = await supabase.from('shots').select('*').eq('project_id', projectId);
  return { data, error };
};
export const createShot = async (shotData) => {
  const { data, error } = await supabase.from('shots').insert([shotData]).select().single();
  return { data, error };
};
export const updateShot = async (shotId, updates) => {
  const { data, error } = await supabase.from('shots').update(updates).eq('id', shotId).select().single();
  return { data, error };
};

// ===== Takes =====
export const getTakes = async (shotId) => {
  const { data, error } = await supabase.from('takes').select('*').eq('shot_id', shotId);
  return { data, error };
};
export const createTake = async (takeData) => {
  const { data, error } = await supabase.from('takes').insert([takeData]).select().single();
  return { data, error };
};
export const updateTake = async (takeId, updates) => {
  const { data, error } = await supabase.from('takes').update(updates).eq('id', takeId).select().single();
  return { data, error };
};

// ===== AI Generations =====
export const getAIGenerations = async (projectId) => {
  const { data, error } = await supabase.from('ai_generations').select('*').eq('project_id', projectId);
  return { data, error };
};
export const createAIGeneration = async (generationData) => {
  const { data, error } = await supabase.from('ai_generations').insert([generationData]).select().single();
  return { data, error };
}; 