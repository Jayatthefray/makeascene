import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  Image,
  Alert,
  Modal
} from 'react-native';
import aiService from '../lib/ai/aiService';
import { deviceService } from '../lib/multiDevice/deviceService';
import { useProject } from '../src/contexts/ProjectContext';

const CreateSceneScreen = ({ navigation }) => {
  // Core state
  const [step, setStep] = useState(1); // 1: Constraints, 2: Generate, 3: Storyboard, 4: Multi-device
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Constraint configuration
  const [constraints, setConstraints] = useState({
    genre: 'drama',
    actorCount: 2,
    location: 'indoor',
    timeOfDay: 'day',
    experienceLevel: 'beginner',
    equipment: ['smartphone'],
    maxDuration: 60
  });

  // Generated content
  const [generatedPrompt, setGeneratedPrompt] = useState(null);
  const [storyboard, setStoryboard] = useState(null);
  const [sketchImages, setSketchImages] = useState({});

  // Multi-device state
  const [multiDeviceEnabled, setMultiDeviceEnabled] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState(null);
  const [collaborationCode, setCollaborationCode] = useState(null);

  const { addProject } = useProject();

  useEffect(() => {
    // Initialize device service
    deviceService.initialize();
  }, []);

  // Step 1: Configure Constraints
  const renderConstraintsStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>🎬 Scene Setup</Text>
      <Text style={styles.stepSubtitle}>Configure your filming constraints</Text>

      <View style={styles.constraintSection}>
        <Text style={styles.constraintLabel}>Genre</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.genreScrollView}>
          {['horror', 'comedy', 'romance', 'drama', 'action', 'mystery'].map((genre) => (
            <TouchableOpacity
              key={genre}
              style={[
                styles.genreButton,
                constraints.genre === genre && styles.selectedGenreButton
              ]}
              onPress={() => setConstraints(prev => ({ ...prev, genre }))}
            >
              <Text style={[
                styles.genreText,
                constraints.genre === genre && styles.selectedGenreText
              ]}>
                {genre.charAt(0).toUpperCase() + genre.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.constraintSection}>
        <Text style={styles.constraintLabel}>Number of Actors: {constraints.actorCount}</Text>
        <View style={styles.actorCountContainer}>
          {[1, 2, 3, 4, 5, 6].map((count) => (
            <TouchableOpacity
              key={count}
              style={[
                styles.actorCountButton,
                constraints.actorCount === count && styles.selectedActorButton
              ]}
              onPress={() => setConstraints(prev => ({ ...prev, actorCount: count }))}
            >
              <Text style={[
                styles.actorCountText,
                constraints.actorCount === count && styles.selectedActorText
              ]}>
                {count}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.constraintSection}>
        <Text style={styles.constraintLabel}>Location</Text>
        <View style={styles.locationContainer}>
          {[
            { key: 'indoor', label: '🏠 Indoor', icon: '🏠' },
            { key: 'outdoor', label: '🌳 Outdoor', icon: '🌳' },
            { key: 'mixed', label: '🌍 Mixed', icon: '🌍' }
          ].map((location) => (
            <TouchableOpacity
              key={location.key}
              style={[
                styles.locationButton,
                constraints.location === location.key && styles.selectedLocationButton
              ]}
              onPress={() => setConstraints(prev => ({ ...prev, location: location.key }))}
            >
              <Text style={styles.locationIcon}>{location.icon}</Text>
              <Text style={[
                styles.locationText,
                constraints.location === location.key && styles.selectedLocationText
              ]}>
                {location.label.split(' ')[1]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.constraintSection}>
        <Text style={styles.constraintLabel}>Experience Level</Text>
        <View style={styles.experienceContainer}>
          {[
            { key: 'beginner', label: 'Beginner' },
            { key: 'intermediate', label: 'Intermediate' },
            { key: 'advanced', label: 'Advanced' }
          ].map((level) => (
            <TouchableOpacity
              key={level.key}
              style={[
                styles.experienceButton,
                constraints.experienceLevel === level.key && styles.selectedExperienceButton
              ]}
              onPress={() => setConstraints(prev => ({ ...prev, experienceLevel: level.key }))}
            >
              <Text style={[
                styles.experienceText,
                constraints.experienceLevel === level.key && styles.selectedExperienceText
              ]}>
                {level.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={styles.nextButton}
        onPress={() => setStep(2)}
      >
        <Text style={styles.nextButtonText}>Generate Scene Prompt 🚀</Text>
      </TouchableOpacity>
    </View>
  );

  // Step 2: Generate AI Prompt
  const generateScenePrompt = async () => {
    setLoading(true);
    setError(null);

    try {
      // First validate constraints
      const validation = aiService.validateConstraints(constraints);
      if (!validation.isValid) {
        throw new Error(`Invalid constraints: ${validation.violations.join(', ')}`);
      }

      // Generate AI prompt
      const result = await aiService.generateStoryPrompt(constraints);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      setGeneratedPrompt(result.data);
      setStep(3);
    } catch (err) {
      setError(err.message);
      Alert.alert('Generation Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Review Generated Prompt and Create Storyboard
  const generateStoryboard = async () => {
    setLoading(true);
    setError(null);

    try {
      // Generate storyboard with shots
      const storyboardResult = await aiService.generateStoryboard(generatedPrompt, constraints);
      
      if (!storyboardResult.success) {
        throw new Error(storyboardResult.error);
      }

      setStoryboard(storyboardResult.data);

      // Generate sketch images for each shot
      const sketches = {};
      for (const shot of storyboardResult.data.shots) {
        const sketchResult = await aiService.generateSketchStoryboard(
          shot.description,
          shot.shotType
        );
        
        if (sketchResult.success) {
          sketches[shot.shotNumber] = sketchResult.data.imageUrl;
        }
      }
      
      setSketchImages(sketches);
      setStep(4);
    } catch (err) {
      setError(err.message);
      Alert.alert('Storyboard Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderGenerateStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>✨ AI Scene Generation</Text>
      
      {!generatedPrompt && (
        <View style={styles.generateContainer}>
          <Text style={styles.generateDescription}>
            Ready to create your {constraints.genre} scene with {constraints.actorCount} actor(s) 
            in an {constraints.location} location!
          </Text>
          
          <TouchableOpacity
            style={[styles.generateButton, loading && styles.disabledButton]}
            onPress={generateScenePrompt}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.generateButtonText}>🎭 Generate Scene</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {generatedPrompt && (
        <View style={styles.promptContainer}>
          <Text style={styles.promptTitle}>{generatedPrompt.title}</Text>
          <Text style={styles.promptDescription}>{generatedPrompt.description}</Text>
          
          <View style={styles.promptDetails}>
            <Text style={styles.detailLabel}>Duration:</Text>
            <Text style={styles.detailValue}>{generatedPrompt.estimatedDuration}s</Text>
          </View>

          {generatedPrompt.dialogue && (
            <View style={styles.dialogueContainer}>
              <Text style={styles.detailLabel}>Dialogue:</Text>
              <Text style={styles.dialogueText}>{generatedPrompt.dialogue}</Text>
            </View>
          )}

          <View style={styles.instructionsContainer}>
            <Text style={styles.detailLabel}>Blocking Instructions:</Text>
            <Text style={styles.instructionsText}>{generatedPrompt.blockingInstructions}</Text>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.regenerateButton}
              onPress={generateScenePrompt}
            >
              <Text style={styles.regenerateButtonText}>🔄 Regenerate</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.continueButton}
              onPress={generateStoryboard}
            >
              <Text style={styles.continueButtonText}>Create Storyboard 🎨</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  // Step 4: Storyboard Review and Multi-device Setup
  const renderStoryboardStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>🎨 Professional Storyboard</Text>
      
      {storyboard && (
        <ScrollView style={styles.storyboardContainer}>
          {storyboard.shots.map((shot, index) => (
            <View key={shot.shotNumber} style={styles.shotCard}>
              <View style={styles.shotHeader}>
                <Text style={styles.shotNumber}>Shot {shot.shotNumber}</Text>
                <Text style={styles.shotType}>{shot.shotType.replace('_', ' ')}</Text>
                <Text style={styles.shotDuration}>{shot.duration}s</Text>
              </View>

              {sketchImages[shot.shotNumber] && (
                <Image 
                  source={{ uri: sketchImages[shot.shotNumber] }} 
                  style={styles.sketchImage} 
                  resizeMode="contain"
                />
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
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.multiDeviceSection}>
        <Text style={styles.sectionTitle}>📱 Multi-Device Filming</Text>
        
        <TouchableOpacity
          style={[
            styles.multiDeviceToggle,
            multiDeviceEnabled && styles.multiDeviceToggleActive
          ]}
          onPress={() => setMultiDeviceEnabled(!multiDeviceEnabled)}
        >
          <Text style={[
            styles.multiDeviceToggleText,
            multiDeviceEnabled && styles.multiDeviceToggleTextActive
          ]}>
            {multiDeviceEnabled ? 'Multi-Device Enabled' : 'Enable Multi-Device'}
          </Text>
        </TouchableOpacity>

        {multiDeviceEnabled && (
          <View style={styles.multiDeviceControls}>
            <TouchableOpacity
              style={styles.generateCodeButton}
              onPress={generateCollaborationCode}
            >
              <Text style={styles.generateCodeButtonText}>Generate Collaboration Code</Text>
            </TouchableOpacity>

            {collaborationCode && (
              <View style={styles.collaborationCodeContainer}>
                <Text style={styles.collaborationCodeLabel}>Share this code:</Text>
                <Text style={styles.collaborationCode}>{collaborationCode}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.startFilmingButton}
        onPress={startFilming}
      >
        <Text style={styles.startFilmingButtonText}>🎬 Start Filming</Text>
      </TouchableOpacity>
    </View>
  );

  // Generate collaboration code for multi-device
  const generateCollaborationCode = async () => {
    try {
      const result = deviceService.generateCollaborationCode();
      setCollaborationCode(result.collaborationCode);
      
      // Update device status
      setDeviceStatus(deviceService.getDevicesStatus());
    } catch (error) {
      Alert.alert('Error', 'Failed to generate collaboration code');
    }
  };

  // Start filming process
  const startFilming = async () => {
    try {
      // Create project in database
      const projectData = {
        title: generatedPrompt.title,
        description: generatedPrompt.description,
        genre: constraints.genre,
        storyboard: storyboard,
        constraints: constraints,
        multiDeviceEnabled: multiDeviceEnabled,
        collaborationCode: collaborationCode,
        status: 'filming'
      };

      const project = await addProject(projectData);
      
      // Navigate to filming screen
      navigation.navigate('FilmingScreen', {
        projectId: project.id,
        storyboard: storyboard,
        multiDeviceEnabled: multiDeviceEnabled,
        deviceRole: deviceService.deviceRole
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to create project: ' + error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Scene</Text>
        <Text style={styles.stepIndicator}>Step {step}/4</Text>
      </View>

      <ScrollView style={styles.content}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {step === 1 && renderConstraintsStep()}
        {step === 2 && renderGenerateStep()}
        {step === 3 && renderStoryboardStep()}
      </ScrollView>
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
  stepIndicator: {
    color: '#FFD700',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  errorContainer: {
    backgroundColor: '#ff4444',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  errorText: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#CCC',
    textAlign: 'center',
    marginBottom: 30,
  },
  constraintSection: {
    marginBottom: 25,
  },
  constraintLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 10,
  },
  genreScrollView: {
    flexDirection: 'row',
  },
  genreButton: {
    backgroundColor: '#333',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#555',
  },
  selectedGenreButton: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  genreText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  selectedGenreText: {
    color: '#1a1a1a',
  },
  actorCountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actorCountButton: {
    backgroundColor: '#333',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#555',
  },
  selectedActorButton: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  actorCountText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  selectedActorText: {
    color: '#1a1a1a',
  },
  locationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  locationButton: {
    backgroundColor: '#333',
    flex: 1,
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#555',
  },
  selectedLocationButton: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  locationIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  locationText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  selectedLocationText: {
    color: '#1a1a1a',
  },
  experienceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  experienceButton: {
    backgroundColor: '#333',
    flex: 1,
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#555',
  },
  selectedExperienceButton: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  experienceText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  selectedExperienceText: {
    color: '#1a1a1a',
  },
  nextButton: {
    backgroundColor: '#FFD700',
    padding: 18,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 30,
  },
  nextButtonText: {
    color: '#1a1a1a',
    fontSize: 18,
    fontWeight: 'bold',
  },
  generateContainer: {
    alignItems: 'center',
    padding: 30,
  },
  generateDescription: {
    color: '#CCC',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  generateButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    minWidth: 200,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#666',
  },
  generateButtonText: {
    color: '#1a1a1a',
    fontSize: 18,
    fontWeight: 'bold',
  },
  promptContainer: {
    backgroundColor: '#2a2a2a',
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  promptTitle: {
    color: '#FFD700',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  promptDescription: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  promptDetails: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  detailLabel: {
    color: '#FFD700',
    fontWeight: 'bold',
    marginRight: 10,
  },
  detailValue: {
    color: '#FFFFFF',
    flex: 1,
  },
  dialogueContainer: {
    marginBottom: 15,
  },
  dialogueText: {
    color: '#FFFFFF',
    fontStyle: 'italic',
    fontSize: 14,
    lineHeight: 20,
  },
  instructionsContainer: {
    marginBottom: 20,
  },
  instructionsText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  regenerateButton: {
    backgroundColor: '#666',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    flex: 0.45,
    alignItems: 'center',
  },
  regenerateButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    flex: 0.45,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#1a1a1a',
    fontWeight: 'bold',
  },
  storyboardContainer: {
    maxHeight: 400,
    marginBottom: 20,
  },
  shotCard: {
    backgroundColor: '#2a2a2a',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#444',
  },
  shotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  shotNumber: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
  },
  shotType: {
    color: '#CCC',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  shotDuration: {
    color: '#FFD700',
    fontSize: 14,
  },
  sketchImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#333',
  },
  shotDescription: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 10,
    lineHeight: 20,
  },
  shotDetails: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  difficultyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  difficultyStars: {
    flexDirection: 'row',
  },
  star: {
    fontSize: 16,
    marginRight: 2,
  },
  multiDeviceSection: {
    backgroundColor: '#2a2a2a',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  multiDeviceToggle: {
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#555',
  },
  multiDeviceToggleActive: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  multiDeviceToggleText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  multiDeviceToggleTextActive: {
    color: '#1a1a1a',
  },
  multiDeviceControls: {
    marginTop: 15,
  },
  generateCodeButton: {
    backgroundColor: '#666',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  generateCodeButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  collaborationCodeContainer: {
    marginTop: 15,
    alignItems: 'center',
  },
  collaborationCodeLabel: {
    color: '#CCC',
    marginBottom: 5,
  },
  collaborationCode: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  startFilmingButton: {
    backgroundColor: '#FFD700',
    padding: 20,
    borderRadius: 25,
    alignItems: 'center',
  },
  startFilmingButtonText: {
    color: '#1a1a1a',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default CreateSceneScreen;