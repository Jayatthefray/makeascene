import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { useProject } from '../src/contexts/ProjectContext';
import aiService from '../lib/ai/aiService';

const StoryboardScreen = ({ route, navigation }) => {
  const { projectId, storyboard: initialStoryboard, constraints } = route.params;
  const [storyboard, setStoryboard] = useState(initialStoryboard);
  const [selectedShot, setSelectedShot] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingShotIndex, setEditingShotIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [sketchImages, setSketchImages] = useState({});
  const [regeneratingShot, setRegeneratingShot] = useState(null);

  const { updateProject } = useProject();

  useEffect(() => {
    // Load existing sketch images if any
    loadSketchImages();
  }, []);

  const loadSketchImages = async () => {
    const sketches = {};
    for (const shot of storyboard.shots) {
      if (shot.sketchImageUrl) {
        sketches[shot.shotNumber] = shot.sketchImageUrl;
      }
    }
    setSketchImages(sketches);
  };

  const regenerateShot = async (shotIndex) => {
    setRegeneratingShot(shotIndex);
    setLoading(true);

    try {
      const shot = storyboard.shots[shotIndex];
      
      // Regenerate shot description and storyboard
      const shotResult = await aiService.regenerateShot(shot, constraints);
      if (!shotResult.success) {
        throw new Error(shotResult.error);
      }

      // Generate new sketch
      const sketchResult = await aiService.generateSketchStoryboard(
        shotResult.data.description,
        shotResult.data.shotType
      );

      // Update storyboard
      const updatedShots = [...storyboard.shots];
      updatedShots[shotIndex] = { ...shot, ...shotResult.data };
      
      const updatedStoryboard = { ...storyboard, shots: updatedShots };
      setStoryboard(updatedStoryboard);

      // Update sketch images
      if (sketchResult.success) {
        setSketchImages(prev => ({
          ...prev,
          [shot.shotNumber]: sketchResult.data.imageUrl
        }));
      }

      // Save to project
      await updateProject(projectId, { storyboard: updatedStoryboard });

    } catch (error) {
      Alert.alert('Regeneration Error', error.message);
    } finally {
      setLoading(false);
      setRegeneratingShot(null);
    }
  };

  const editShot = (shotIndex) => {
    setEditingShotIndex(shotIndex);
    setSelectedShot({ ...storyboard.shots[shotIndex] });
    setIsEditing(true);
  };

  const saveEditedShot = async () => {
    if (!selectedShot) return;

    setLoading(true);
    try {
      // Update the shot in storyboard
      const updatedShots = [...storyboard.shots];
      updatedShots[editingShotIndex] = selectedShot;
      
      const updatedStoryboard = { ...storyboard, shots: updatedShots };
      setStoryboard(updatedStoryboard);

      // If description changed, regenerate sketch
      if (selectedShot.description !== storyboard.shots[editingShotIndex].description) {
        const sketchResult = await aiService.generateSketchStoryboard(
          selectedShot.description,
          selectedShot.shotType
        );
        
        if (sketchResult.success) {
          setSketchImages(prev => ({
            ...prev,
            [selectedShot.shotNumber]: sketchResult.data.imageUrl
          }));
        }
      }

      // Save to project
      await updateProject(projectId, { storyboard: updatedStoryboard });

      setIsEditing(false);
      setSelectedShot(null);
      setEditingShotIndex(-1);
    } catch (error) {
      Alert.alert('Save Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const addNewShot = async () => {
    setLoading(true);
    try {
      const newShotNumber = storyboard.shots.length + 1;
      const newShot = {
        shotNumber: newShotNumber,
        shotType: 'single_handheld',
        description: 'New shot description',
        dialogue: '',
        cameraPosition: 'Medium shot',
        actorPositions: 'Actor positioned center frame',
        duration: 30,
        difficulty: 2
      };

      const updatedShots = [...storyboard.shots, newShot];
      const updatedStoryboard = { ...storyboard, shots: updatedShots };
      setStoryboard(updatedStoryboard);

      // Generate sketch for new shot
      const sketchResult = await aiService.generateSketchStoryboard(
        newShot.description,
        newShot.shotType
      );
      
      if (sketchResult.success) {
        setSketchImages(prev => ({
          ...prev,
          [newShot.shotNumber]: sketchResult.data.imageUrl
        }));
      }

      // Save to project
      await updateProject(projectId, { storyboard: updatedStoryboard });
    } catch (error) {
      Alert.alert('Add Shot Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteShot = (shotIndex) => {
    Alert.alert(
      'Delete Shot',
      'Are you sure you want to delete this shot?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedShots = storyboard.shots.filter((_, index) => index !== shotIndex);
            
            // Renumber remaining shots
            const renumberedShots = updatedShots.map((shot, index) => ({
              ...shot,
              shotNumber: index + 1
            }));

            const updatedStoryboard = { ...storyboard, shots: renumberedShots };
            setStoryboard(updatedStoryboard);

            // Save to project
            await updateProject(projectId, { storyboard: updatedStoryboard });
          }
        }
      ]
    );
  };

  const proceedToFilming = () => {
    // Navigate to device setup or directly to filming
    navigation.navigate('DeviceSetupScreen', {
      projectId,
      storyboard,
      constraints
    });
  };

  const renderShotCard = (shot, index) => (
    <View key={shot.shotNumber} style={styles.shotCard}>
      <View style={styles.shotHeader}>
        <Text style={styles.shotNumber}>Shot {shot.shotNumber}</Text>
        <Text style={styles.shotType}>{shot.shotType.replace('_', ' ')}</Text>
        <Text style={styles.shotDuration}>{shot.duration}s</Text>
      </View>

      {sketchImages[shot.shotNumber] && (
        <TouchableOpacity onPress={() => setSelectedShot(shot)}>
          <Image 
            source={{ uri: sketchImages[shot.shotNumber] }} 
            style={styles.sketchImage} 
            resizeMode="contain"
          />
        </TouchableOpacity>
      )}

      <Text style={styles.shotDescription}>{shot.description}</Text>
      
      <View style={styles.shotDetails}>
        <Text style={styles.detailLabel}>Camera:</Text>
        <Text style={styles.detailValue}>{shot.cameraPosition}</Text>
      </View>

      <View style={styles.shotDetails}>
        <Text style={styles.detailLabel}>Actors:</Text>
        <Text style={styles.detailValue}>{shot.actorPositions}</Text>
      </View>

      {shot.dialogue && (
        <View style={styles.dialogueContainer}>
          <Text style={styles.detailLabel}>Dialogue:</Text>
          <Text style={styles.dialogueText}>"{shot.dialogue}"</Text>
        </View>
      )}

      <View style={styles.difficultyContainer}>
        <Text style={styles.detailLabel}>Difficulty:</Text>
        <View style={styles.difficultyStars}>
          {[...Array(5)].map((_, i) => (
            <Text key={i} style={styles.star}>
              {i < shot.difficulty ? '⭐' : '☆'}
            </Text>
          ))}
        </View>
      </View>

      <View style={styles.shotActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => editShot(index)}
        >
          <Text style={styles.actionButtonText}>✏️ Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, regeneratingShot === index && styles.disabledButton]}
          onPress={() => regenerateShot(index)}
          disabled={regeneratingShot === index}
        >
          {regeneratingShot === index ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.actionButtonText}>🔄 Regenerate</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => deleteShot(index)}
        >
          <Text style={styles.actionButtonText}>🗑️ Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEditModal = () => (
    <Modal visible={isEditing} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.editModalContainer}>
        <View style={styles.editHeader}>
          <TouchableOpacity onPress={() => setIsEditing(false)}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.editTitle}>Edit Shot {selectedShot?.shotNumber}</Text>
          <TouchableOpacity onPress={saveEditedShot} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#FFD700" />
            ) : (
              <Text style={styles.saveButton}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.editContent}>
          <View style={styles.editSection}>
            <Text style={styles.editLabel}>Shot Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {['single_handheld', 'two_shot_handheld', 'group_static', 'moving_tracking', 'complex_blocking'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.shotTypeButton,
                    selectedShot?.shotType === type && styles.selectedShotTypeButton
                  ]}
                  onPress={() => setSelectedShot(prev => ({ ...prev, shotType: type }))}
                >
                  <Text style={[
                    styles.shotTypeButtonText,
                    selectedShot?.shotType === type && styles.selectedShotTypeButtonText
                  ]}>
                    {type.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.editSection}>
            <Text style={styles.editLabel}>Description</Text>
            <TextInput
              style={styles.editTextInput}
              value={selectedShot?.description || ''}
              onChangeText={(text) => setSelectedShot(prev => ({ ...prev, description: text }))}
              multiline
              placeholder="Describe what happens in this shot..."
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.editSection}>
            <Text style={styles.editLabel}>Dialogue</Text>
            <TextInput
              style={styles.editTextInput}
              value={selectedShot?.dialogue || ''}
              onChangeText={(text) => setSelectedShot(prev => ({ ...prev, dialogue: text }))}
              multiline
              placeholder="Any dialogue for this shot..."
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.editSection}>
            <Text style={styles.editLabel}>Camera Position</Text>
            <TextInput
              style={styles.editTextInput}
              value={selectedShot?.cameraPosition || ''}
              onChangeText={(text) => setSelectedShot(prev => ({ ...prev, cameraPosition: text }))}
              placeholder="Camera angle and position..."
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.editSection}>
            <Text style={styles.editLabel}>Actor Positions</Text>
            <TextInput
              style={styles.editTextInput}
              value={selectedShot?.actorPositions || ''}
              onChangeText={(text) => setSelectedShot(prev => ({ ...prev, actorPositions: text }))}
              placeholder="Where actors should be positioned..."
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.editSection}>
            <Text style={styles.editLabel}>Duration: {selectedShot?.duration}s</Text>
            <View style={styles.durationContainer}>
              {[15, 30, 45, 60, 90].map((duration) => (
                <TouchableOpacity
                  key={duration}
                  style={[
                    styles.durationButton,
                    selectedShot?.duration === duration && styles.selectedDurationButton
                  ]}
                  onPress={() => setSelectedShot(prev => ({ ...prev, duration }))}
                >
                  <Text style={[
                    styles.durationButtonText,
                    selectedShot?.duration === duration && styles.selectedDurationButtonText
                  ]}>
                    {duration}s
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderImageModal = () => (
    <Modal visible={!!selectedShot && !isEditing} animationType="fade" presentationStyle="overFullScreen">
      <View style={styles.imageModalContainer}>
        <TouchableOpacity 
          style={styles.imageModalCloseButton}
          onPress={() => setSelectedShot(null)}
        >
          <Text style={styles.imageModalCloseText}>✕</Text>
        </TouchableOpacity>
        
        {selectedShot && sketchImages[selectedShot.shotNumber] && (
          <Image 
            source={{ uri: sketchImages[selectedShot.shotNumber] }} 
            style={styles.fullScreenImage} 
            resizeMode="contain"
          />
        )}
        
        <View style={styles.imageModalInfo}>
          <Text style={styles.imageModalTitle}>Shot {selectedShot?.shotNumber}</Text>
          <Text style={styles.imageModalDescription}>{selectedShot?.description}</Text>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Storyboard Review</Text>
        <TouchableOpacity onPress={addNewShot} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#FFD700" />
          ) : (
            <Text style={styles.addButton}>+ Add Shot</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.storyboardInfo}>
          <Text style={styles.storyboardTitle}>{storyboard.title}</Text>
          <Text style={styles.storyboardDescription}>{storyboard.description}</Text>
          <Text style={styles.shotCount}>{storyboard.shots.length} shots • Estimated {storyboard.estimatedDuration}s</Text>
        </View>

        {storyboard.shots.map((shot, index) => renderShotCard(shot, index))}

        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={styles.proceedButton}
            onPress={proceedToFilming}
          >
            <Text style={styles.proceedButtonText}>📱 Set Up Devices & Start Filming</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {renderEditModal()}
      {renderImageModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    color: '#FFD700',
    fontSize: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButton: {
    color: '#FFD700',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  storyboardInfo: {
    backgroundColor: '#2a2a2a',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  storyboardTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  storyboardDescription: {
    color: '#CCCCCC',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 12,
  },
  shotCount: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  shotCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  shotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  shotNumber: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
  },
  shotType: {
    color: '#FFFFFF',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  shotDuration: {
    color: '#CCCCCC',
    fontSize: 14,
  },
  sketchImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#333',
  },
  shotDescription: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 12,
  },
  shotDetails: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
    width: 80,
  },
  detailValue: {
    color: '#CCCCCC',
    fontSize: 14,
    flex: 1,
  },
  dialogueContainer: {
    marginBottom: 12,
  },
  dialogueText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 4,
  },
  difficultyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  difficultyStars: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  star: {
    fontSize: 16,
    marginRight: 2,
  },
  shotActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 0.3,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#cc3333',
  },
  disabledButton: {
    backgroundColor: '#666',
    opacity: 0.5,
  },
  actionContainer: {
    marginTop: 20,
    marginBottom: 40,
  },
  proceedButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  proceedButtonText: {
    color: '#1a1a1a',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Edit Modal Styles
  editModalContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  cancelButton: {
    color: '#FFD700',
    fontSize: 16,
  },
  editTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveButton: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
  },
  editContent: {
    flex: 1,
    padding: 20,
  },
  editSection: {
    marginBottom: 24,
  },
  editLabel: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  editTextInput: {
    backgroundColor: '#2a2a2a',
    color: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  shotTypeButton: {
    backgroundColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  selectedShotTypeButton: {
    backgroundColor: '#FFD700',
  },
  shotTypeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  selectedShotTypeButtonText: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
  durationContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  durationButton: {
    backgroundColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedDurationButton: {
    backgroundColor: '#FFD700',
  },
  durationButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  selectedDurationButtonText: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
  // Image Modal Styles
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalCloseButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalCloseText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  fullScreenImage: {
    width: '90%',
    height: '60%',
  },
  imageModalInfo: {
    position: 'absolute',
    bottom: 60,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 20,
    borderRadius: 12,
  },
  imageModalTitle: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  imageModalDescription: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 22,
  },
});

export default StoryboardScreen;