import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getProject, getProjects, createProject, updateProject, getShots, createShot, updateShot } from '../../lib/supabase/supabase';

const ProjectContext = createContext();

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [shots, setShots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load all projects
  const loadProjects = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getProjects();
    setProjects(data || []);
    setError(error);
    setLoading(false);
  }, []);

  // Load a single project and its shots
  const loadProject = useCallback(async (projectId) => {
    setLoading(true);
    const { data, error } = await getProject(projectId);
    setCurrentProject(data || null);
    setError(error);
    if (data) {
      const { data: shotsData } = await getShots(projectId);
      setShots(shotsData || []);
    } else {
      setShots([]);
    }
    setLoading(false);
  }, []);

  // Add, update, and refresh helpers
  const addProject = async (projectData) => {
    const { data, error } = await createProject(projectData);
    if (!error) loadProjects();
    setError(error);
    return { data, error };
  };

  const updateCurrentProject = async (projectId, updates) => {
    const { data, error } = await updateProject(projectId, updates);
    if (!error) loadProject(projectId);
    setError(error);
    return { data, error };
  };

  // Real-time subscriptions can be added here as needed

  return (
    <ProjectContext.Provider value={{
      projects,
      currentProject,
      shots,
      loading,
      error,
      loadProjects,
      loadProject,
      addProject,
      updateCurrentProject
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  return useContext(ProjectContext);
} 