import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useProject } from '../src/contexts/ProjectContext';

export default function ProjectDetailScreen({ navigation }) {
  const route = useRoute();
  const { projectId } = route.params;
  const {
    currentProject,
    shots,
    loading,
    error,
    loadProject,
    updateCurrentProject,
    addProject,
  } = useProject();

  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '', genre: '' });
  const [newShotTitle, setNewShotTitle] = useState('');
  const [addingShot, setAddingShot] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  useEffect(() => {
    loadProject(projectId);
  }, [projectId]);

  useEffect(() => {
    if (currentProject) {
      setEditForm({
        title: currentProject.title || '',
        description: currentProject.description || '',
        genre: currentProject.genre || '',
      });
    }
  }, [currentProject]);

  const handleEdit = () => setEditMode(true);
  const handleCancelEdit = () => setEditMode(false);

  const handleSaveEdit = async () => {
    await updateCurrentProject(projectId, editForm);
    setEditMode(false);
  };

  const handleAddShot = async () => {
    if (!newShotTitle.trim()) return;
    setAddingShot(true);
    await addProject({
      project_id: projectId,
      title: newShotTitle,
      shot_type: 'default',
      status: 'not_started',
    });
    setNewShotTitle('');
    setAddingShot(false);
  };

  // Placeholder for AI generation (implement actual call as needed)
  const handleAIGenerate = async () => {
    setAiGenerating(true);
    // Call your AI generation function here
    setTimeout(() => setAiGenerating(false), 1500);
  };

  if (loading || !currentProject) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#007AFF" /></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Project Details</Text>
      {error && <Text style={styles.error}>{error.message || String(error)}</Text>}
      {editMode ? (
        <View style={styles.editForm}>
          <TextInput
            style={styles.input}
            value={editForm.title}
            onChangeText={text => setEditForm(f => ({ ...f, title: text }))}
            placeholder="Title"
          />
          <TextInput
            style={styles.input}
            value={editForm.description}
            onChangeText={text => setEditForm(f => ({ ...f, description: text }))}
            placeholder="Description"
          />
          <TextInput
            style={styles.input}
            value={editForm.genre}
            onChangeText={text => setEditForm(f => ({ ...f, genre: text }))}
            placeholder="Genre"
          />
          <View style={styles.row}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveEdit}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEdit}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.metaBox}>
          <Text style={styles.metaTitle}>{currentProject.title}</Text>
          <Text style={styles.metaDesc}>{currentProject.description}</Text>
          <Text style={styles.metaGenre}>Genre: {currentProject.genre}</Text>
          <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
      )}
      <Text style={styles.sectionHeader}>Shots</Text>
      <FlatList
        data={shots}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.shotItem}>
            <Text style={styles.shotTitle}>{item.title || 'Untitled Shot'}</Text>
            <Text style={styles.shotStatus}>Status: {item.status}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No shots yet.</Text>}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="New shot title"
          value={newShotTitle}
          onChangeText={setNewShotTitle}
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAddShot} disabled={addingShot}>
          <Text style={styles.addButtonText}>{addingShot ? 'Adding...' : 'Add Shot'}</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.sectionHeader}>AI Storyboard</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Storyboard prompt"
          value={aiPrompt}
          onChangeText={setAiPrompt}
        />
        <TouchableOpacity style={styles.aiButton} onPress={handleAIGenerate} disabled={aiGenerating}>
          <Text style={styles.aiButtonText}>{aiGenerating ? 'Generating...' : 'Generate'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 28, fontWeight: 'bold', marginBottom: 16, color: '#007AFF', textAlign: 'center' },
  error: { color: 'red', marginBottom: 8, textAlign: 'center' },
  metaBox: { backgroundColor: 'white', padding: 16, borderRadius: 8, marginBottom: 16, alignItems: 'center' },
  metaTitle: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  metaDesc: { fontSize: 16, color: '#666', marginTop: 4 },
  metaGenre: { fontSize: 14, color: '#888', marginTop: 4 },
  editButton: { marginTop: 10, backgroundColor: '#007AFF', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
  editButtonText: { color: 'white', fontWeight: 'bold' },
  editForm: { backgroundColor: 'white', padding: 16, borderRadius: 8, marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, backgroundColor: 'white', marginBottom: 8, flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  saveButton: { backgroundColor: '#34C759', padding: 10, borderRadius: 8, flex: 1, marginRight: 8 },
  saveButtonText: { color: 'white', fontWeight: 'bold', textAlign: 'center' },
  cancelButton: { backgroundColor: '#ccc', padding: 10, borderRadius: 8, flex: 1 },
  cancelButtonText: { color: '#333', fontWeight: 'bold', textAlign: 'center' },
  sectionHeader: { fontSize: 20, fontWeight: 'bold', marginTop: 24, marginBottom: 8, color: '#007AFF' },
  shotItem: { backgroundColor: 'white', padding: 12, borderRadius: 8, marginBottom: 10 },
  shotTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  shotStatus: { fontSize: 14, color: '#888', marginTop: 2 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 8 },
  addButton: { backgroundColor: '#007AFF', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  addButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  aiButton: { backgroundColor: '#34C759', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  aiButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  empty: { color: '#888', textAlign: 'center', marginTop: 16, fontSize: 16 },
}); 