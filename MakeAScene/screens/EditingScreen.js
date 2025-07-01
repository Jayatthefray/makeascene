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
  Dimensions,
  ActivityIndicator,
  Modal,
  Slider
} from 'react-native';
import { Video } from 'expo-av';
import { useProject } from '../src/contexts/ProjectContext';
import { videoEditingService } from '../lib/editing/videoEditingService';

const { width: screenWidth } = Dimensions.get('window');

const EditingScreen = ({ route, navigation }) => {
  const { projectId, selectedTakes, storyboard, recordedTakes } = route.params;
  const [editingTakes, setEditingTakes] = useState([]);
  const [selectedTakeIndex, setSelectedTakeIndex] = useState(-1);
  const [previewUri, setPreviewUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [transitions, setTransitions] = useState({});
  const [effects, setEffects] = useState({});
  const [compilationProgress, setCompilationProgress] = useState(0);
  const [isCompiling, setIsCompiling] = useState(false);

  const { updateProject } = useProject();

  useEffect(() => {
    initializeEditingTakes();
  }, []);

  const initializeEditingTakes = () => {
    const takes = [];
    
    storyboard.shots.forEach(shot => {
      const shotKey = `shot_${shot.shotNumber}`;
      const selectedTakeId = selectedTakes[shotKey];
      
      if (selectedTakeId) {
        const takeData = recordedTakes[shotKey]?.find(take => take.id === selectedTakeId);
        if (takeData) {
          takes.push({
            ...takeData,
            shotNumber: shot.shotNumber,
            shotDescription: shot.description,
            trimStart: 0,
            trimEnd: takeData.duration || 30,
            volume: 1.0,
            speed: 1.0
          });
        }
      }
    });
    
    setEditingTakes(takes);
    
    // Initialize default transitions
    const defaultTransitions = {};
    takes.forEach((_, index) => {
      if (index > 0) {
        defaultTransitions[index] = {
          type: 'cut',
          duration: 0
        };
      }
    });
    setTransitions(defaultTransitions);
  };

  const updateTakeProperty = (index, property, value) => {
    setEditingTakes(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [property]: value };
      return updated;
    });
  };

  const setTransition = (index, type, duration = 0.5) => {
    setTransitions(prev => ({
      ...prev,
      [index]: { type, duration }
    }));
  };

  const addEffect = (takeIndex, effectType, settings = {}) => {
    setEffects(prev => ({
      ...prev,
      [takeIndex]: {
        ...prev[takeIndex],
        [effectType]: settings
      }
    }));
  };

  const removeEffect = (takeIndex, effectType) => {
    setEffects(prev => {
      const updated = { ...prev };
      if (updated[takeIndex]) {
        delete updated[takeIndex][effectType];
        if (Object.keys(updated[takeIndex]).length === 0) {
          delete updated[takeIndex];
        }
      }
      return updated;
    });
  };

  const moveTake = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    
    setEditingTakes(prev => {
      const updated = [...prev];
      const [movedTake] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, movedTake);
      return updated;
    });
  };

  const generatePreview = async () => {
    setLoading(true);
    try {
      const editingData = {
        takes: editingTakes,
        transitions,
        effects
      };

      const result = await videoEditingService.generatePreview(editingData);
      if (result.success) {
        setPreviewUri(result.previewUri);
        setShowPreviewModal(true);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      Alert.alert('Preview Error', 'Failed to generate preview: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const compileVideo = async () => {
    Alert.alert(
      'Compile Video',
      'Ready to compile your final video? This may take a few minutes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Compile',
          onPress: async () => {
            setIsCompiling(true);
            setCompilationProgress(0);

            try {
              const editingData = {
                takes: editingTakes,
                transitions,
                effects,
                projectId,
                storyboard
              };

              const result = await videoEditingService.compileVideo(
                editingData,
                (progress) => setCompilationProgress(progress)
              );

              if (result.success) {
                // Update project with final video
                await updateProject(projectId, {
                  finalVideoUri: result.videoUri,
                  status: 'complete',
                  editingData
                });

                // Navigate to export screen
                navigation.navigate('ExportScreen', {
                  projectId,
                  finalVideoUri: result.videoUri,
                  storyboard
                });
              } else {
                throw new Error(result.error);
              }
            } catch (error) {
              Alert.alert('Compilation Error', error.message);
            } finally {
              setIsCompiling(false);
              setCompilationProgress(0);
            }
          }
        }
      ]
    );
  };

  const renderTakeCard = (take, index) => {
    const isSelected = selectedTakeIndex === index;
    const takeEffects = effects[index] || {};
    
    return (
      <TouchableOpacity
        key={take.id}
        style={[styles.takeCard, isSelected && styles.selectedTakeCard]}
        onPress={() => setSelectedTakeIndex(isSelected ? -1 : index)}
      >
        <Image
          source={{ uri: take.thumbnailUrl || take.uri }}
          style={styles.takeImage}
          resizeMode="cover"
        />
        
        <View style={styles.takeInfo}>
          <Text style={styles.takeTitle}>Shot {take.shotNumber}</Text>
          <Text style={styles.takeDuration}>
            {(take.trimEnd - take.trimStart).toFixed(1)}s
          </Text>
          
          {Object.keys(takeEffects).length > 0 && (
            <View style={styles.effectsIndicator}>
              <Text style={styles.effectsText}>
                {Object.keys(takeEffects).join(', ')}
              </Text>
            </View>
          )}
        </View>

        {/* Transition indicator */}
        {index > 0 && transitions[index] && (
          <View style={styles.transitionIndicator}>
            <Text style={styles.transitionText}>
              {transitions[index].type}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEditingControls = () => {
    if (selectedTakeIndex === -1) return null;
    
    const selectedTake = editingTakes[selectedTakeIndex];
    
    return (
      <View style={styles.editingControls}>
        <Text style={styles.controlsTitle}>
          Edit Shot {selectedTake.shotNumber}
        </Text>

        {/* Trim Controls */}
        <View style={styles.controlSection}>
          <Text style={styles.controlLabel}>Trim</Text>
          <View style={styles.trimControls}>
            <Text style={styles.trimLabel}>Start: {selectedTake.trimStart.toFixed(1)}s</Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={selectedTake.duration || 30}
              value={selectedTake.trimStart}
              onValueChange={(value) => updateTakeProperty(selectedTakeIndex, 'trimStart', value)}
              minimumTrackTintColor="#FFD700"
              maximumTrackTintColor="#333"
              thumbStyle={{ backgroundColor: '#FFD700' }}
            />
            
            <Text style={styles.trimLabel}>End: {selectedTake.trimEnd.toFixed(1)}s</Text>
            <Slider
              style={styles.slider}
              minimumValue={selectedTake.trimStart}
              maximumValue={selectedTake.duration || 30}
              value={selectedTake.trimEnd}
              onValueChange={(value) => updateTakeProperty(selectedTakeIndex, 'trimEnd', value)}
              minimumTrackTintColor="#FFD700"
              maximumTrackTintColor="#333"
              thumbStyle={{ backgroundColor: '#FFD700' }}
            />
          </View>
        </View>

        {/* Volume Control */}
        <View style={styles.controlSection}>
          <Text style={styles.controlLabel}>Volume: {Math.round(selectedTake.volume * 100)}%</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            value={selectedTake.volume}
            onValueChange={(value) => updateTakeProperty(selectedTakeIndex, 'volume', value)}
            minimumTrackTintColor="#FFD700"
            maximumTrackTintColor="#333"
            thumbStyle={{ backgroundColor: '#FFD700' }}
          />
        </View>

        {/* Speed Control */}
        <View style={styles.controlSection}>
          <Text style={styles.controlLabel}>Speed: {selectedTake.speed.toFixed(1)}x</Text>
          <Slider
            style={styles.slider}
            minimumValue={0.5}
            maximumValue={2.0}
            value={selectedTake.speed}
            onValueChange={(value) => updateTakeProperty(selectedTakeIndex, 'speed', value)}
            minimumTrackTintColor="#FFD700"
            maximumTrackTintColor="#333"
            thumbStyle={{ backgroundColor: '#FFD700' }}
          />
        </View>

        {/* Transition Controls */}
        {selectedTakeIndex > 0 && (
          <View style={styles.controlSection}>
            <Text style={styles.controlLabel}>Transition to Previous</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {['cut', 'fade', 'dissolve', 'wipe'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.transitionButton,
                    transitions[selectedTakeIndex]?.type === type && styles.selectedTransitionButton
                  ]}
                  onPress={() => setTransition(selectedTakeIndex, type, type === 'cut' ? 0 : 0.5)}
                >
                  <Text style={[
                    styles.transitionButtonText,
                    transitions[selectedTakeIndex]?.type === type && styles.selectedTransitionButtonText
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Effects */}
        <View style={styles.controlSection}>
          <Text style={styles.controlLabel}>Effects</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { type: 'stabilize', label: 'Stabilize' },
              { type: 'brightness', label: 'Brightness' },
              { type: 'contrast', label: 'Contrast' },
              { type: 'saturation', label: 'Saturation' }
            ].map((effect) => {
              const hasEffect = effects[selectedTakeIndex]?.[effect.type];
              return (
                <TouchableOpacity
                  key={effect.type}
                  style={[
                    styles.effectButton,
                    hasEffect && styles.selectedEffectButton
                  ]}
                  onPress={() => {
                    if (hasEffect) {
                      removeEffect(selectedTakeIndex, effect.type);
                    } else {
                      addEffect(selectedTakeIndex, effect.type, { intensity: 0.5 });
                    }
                  }}
                >
                  <Text style={[
                    styles.effectButtonText,
                    hasEffect && styles.selectedEffectButtonText
                  ]}>
                    {effect.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    );
  };

  const renderPreviewModal = () => (
    <Modal visible={showPreviewModal} animationType="fade" presentationStyle="overFullScreen">
      <SafeAreaView style={styles.previewModalContainer}>
        <View style={styles.previewModalHeader}>
          <TouchableOpacity onPress={() => setShowPreviewModal(false)}>
            <Text style={styles.modalCloseButton}>✕ Close</Text>
          </TouchableOpacity>
          <Text style={styles.previewModalTitle}>Preview</Text>
        </View>

        {previewUri && (
          <Video
            source={{ uri: previewUri }}
            style={styles.previewVideo}
            useNativeControls
            resizeMode="contain"
            shouldPlay
          />
        )}
      </SafeAreaView>
    </Modal>
  );

  const renderCompilationModal = () => (
    <Modal visible={isCompiling} animationType="fade" presentationStyle="pageSheet">
      <SafeAreaView style={styles.compilationModalContainer}>
        <View style={styles.compilationContent}>
          <Text style={styles.compilationTitle}>🎬 Compiling Your Video</Text>
          <Text style={styles.compilationDescription}>
            Please wait while we create your final video. This may take a few minutes.
          </Text>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${compilationProgress}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(compilationProgress)}%</Text>
          </View>

          <ActivityIndicator size="large" color="#FFD700" style={{ marginTop: 20 }} />
        </View>
      </SafeAreaView>
    </Modal>
  );

  const getTotalDuration = () => {
    return editingTakes.reduce((total, take) => {
      return total + (take.trimEnd - take.trimStart) / take.speed;
    }, 0);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Video Editor</Text>
        <Text style={styles.durationText}>{getTotalDuration().toFixed(1)}s</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.timelineSection}>
          <Text style={styles.sectionTitle}>📽️ Timeline</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeline}>
            {editingTakes.map((take, index) => renderTakeCard(take, index))}
          </ScrollView>
        </View>

        {renderEditingControls()}

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.previewButton, loading && styles.disabledButton]}
            onPress={generatePreview}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.actionButtonText}>👁️ Preview</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.compileButton]}
            onPress={compileVideo}
          >
            <Text style={styles.actionButtonText}>🎬 Compile Video</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>✨ Editing Tips</Text>
          <Text style={styles.helpText}>• Tap a shot to edit its timing and effects</Text>
          <Text style={styles.helpText}>• Drag shots to reorder them</Text>
          <Text style={styles.helpText}>• Add transitions between shots for smooth flow</Text>
          <Text style={styles.helpText}>• Preview before compiling to see your changes</Text>
        </View>
      </ScrollView>

      {renderPreviewModal()}
      {renderCompilationModal()}
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
  durationText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  timelineSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  timeline: {
    marginBottom: 16,
  },
  takeCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 8,
    marginRight: 8,
    width: 120,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedTakeCard: {
    borderColor: '#FFD700',
  },
  takeImage: {
    width: '100%',
    height: 80,
    borderRadius: 6,
    marginBottom: 8,
    backgroundColor: '#333',
  },
  takeInfo: {
    alignItems: 'center',
  },
  takeTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  takeDuration: {
    color: '#CCCCCC',
    fontSize: 10,
  },
  effectsIndicator: {
    marginTop: 4,
  },
  effectsText: {
    color: '#FFD700',
    fontSize: 8,
    textAlign: 'center',
  },
  transitionIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFD700',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  transitionText: {
    color: '#1a1a1a',
    fontSize: 8,
    fontWeight: 'bold',
  },
  editingControls: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  controlsTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  controlSection: {
    marginBottom: 20,
  },
  controlLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  trimControls: {
    paddingHorizontal: 8,
  },
  trimLabel: {
    color: '#CCCCCC',
    fontSize: 12,
    marginBottom: 4,
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: 8,
  },
  transitionButton: {
    backgroundColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  selectedTransitionButton: {
    backgroundColor: '#FFD700',
  },
  transitionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  selectedTransitionButtonText: {
    color: '#1a1a1a',
  },
  effectButton: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
  },
  selectedEffectButton: {
    backgroundColor: '#FFD700',
  },
  effectButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  selectedEffectButtonText: {
    color: '#1a1a1a',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    flex: 0.48,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  previewButton: {
    backgroundColor: '#333',
  },
  compileButton: {
    backgroundColor: '#FFD700',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.5,
  },
  helpSection: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 40,
  },
  helpTitle: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  helpText: {
    color: '#CCCCCC',
    fontSize: 14,
    marginBottom: 6,
    lineHeight: 18,
  },
  // Preview Modal Styles
  previewModalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#1a1a1a',
  },
  previewModalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
  },
  previewVideo: {
    flex: 1,
  },
  // Compilation Modal Styles
  compilationModalContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
  },
  compilationContent: {
    padding: 40,
    alignItems: 'center',
  },
  compilationTitle: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  compilationDescription: {
    color: '#CCCCCC',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default EditingScreen;