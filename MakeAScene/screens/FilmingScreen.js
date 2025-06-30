import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Alert,
  Dimensions,
  ActivityIndicator,
  Modal
} from 'react-native';
import { Camera } from 'expo-camera';
import { recordingService } from '../lib/recording/recordingService';
import { deviceService } from '../lib/multiDevice/deviceService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const FilmingScreen = ({ route, navigation }) => {
  const { projectId, storyboard, multiDeviceEnabled, deviceRole } = route.params;
  
  // Camera and recording state
  const cameraRef = useRef(null);
  const [cameraPermission, setCameraPermission] = useState(null);
  const [currentShotIndex, setCurrentShotIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingCountdown, setRecordingCountdown] = useState(0);
  const [recordedTakes, setRecordedTakes] = useState({});
  const [cameraType, setCameraType] = useState(Camera.Constants.Type.back);
  const [flashMode, setFlashMode] = useState(Camera.Constants.FlashMode.off);

  // Multi-device state
  const [connectedDevices, setConnectedDevices] = useState([]);
  const [syncStatus, setSyncStatus] = useState('ready');
  const [deviceStatus, setDeviceStatus] = useState(null);

  // UI state
  const [showStoryboard, setShowStoryboard] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [loading, setLoading] = useState(false);

  const currentShot = storyboard?.shots?.[currentShotIndex];

  useEffect(() => {
    initializeServices();
    
    return () => {
      // Cleanup
      recordingService.cleanup();
      if (multiDeviceEnabled) {
        deviceService.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (cameraRef.current) {
      recordingService.setCameraRef(cameraRef.current);
    }
  }, [cameraRef.current]);

  const initializeServices = async () => {
    try {
      // Initialize recording service
      const recordingInit = await recordingService.initialize();
      if (!recordingInit.success) {
        throw new Error('Failed to initialize recording: ' + recordingInit.error);
      }
      setCameraPermission(recordingInit.permissions.camera);

      // Initialize device service for multi-device
      if (multiDeviceEnabled) {
        await deviceService.initialize();
        deviceService.startStatusMonitoring();
        updateDeviceStatus();
      }
    } catch (error) {
      Alert.alert('Initialization Error', error.message);
    }
  };

  const updateDeviceStatus = () => {
    if (multiDeviceEnabled) {
      const status = deviceService.getDevicesStatus();
      setDeviceStatus(status);
      setConnectedDevices(status.devices);
    }
  };

  // Recording Functions
  const startRecording = async () => {
    if (!currentShot) {
      Alert.alert('Error', 'No shot selected');
      return;
    }

    try {
      setLoading(true);

      if (multiDeviceEnabled && deviceRole === 'primary') {
        // Coordinated multi-device recording
        await startCoordinatedRecording();
      } else if (multiDeviceEnabled && deviceRole !== 'primary') {
        // Secondary device waits for signal
        Alert.alert('Waiting', 'Waiting for primary device to start recording...');
        return;
      } else {
        // Single device recording
        await startSingleDeviceRecording();
      }
    } catch (error) {
      Alert.alert('Recording Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const startSingleDeviceRecording = async () => {
    const shotData = {
      shotNumber: currentShot.shotNumber,
      shotType: currentShot.shotType,
      maxDuration: currentShot.duration,
      description: currentShot.description
    };

    const result = await recordingService.startRecording(shotData);
    if (result.success) {
      setIsRecording(true);
      setShowInstructions(false);
    } else {
      throw new Error(result.error);
    }
  };

  const startCoordinatedRecording = async () => {
    // Synchronize time across devices
    await deviceService.synchronizeTime();
    
    // Start countdown
    const countdown = 3;
    setRecordingCountdown(countdown);
    
    for (let i = countdown; i > 0; i--) {
      setRecordingCountdown(i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setRecordingCountdown(0);

    const shotData = {
      shotNumber: currentShot.shotNumber,
      shotType: currentShot.shotType,
      maxDuration: currentShot.duration,
      description: currentShot.description,
      deviceRole: deviceRole
    };

    const result = await recordingService.startCoordinatedRecording(shotData, 0);
    if (result.success) {
      setIsRecording(true);
      setShowInstructions(false);
      setSyncStatus('recording');
    } else {
      throw new Error(result.error);
    }
  };

  const stopRecording = async () => {
    try {
      const result = await recordingService.stopRecording();
      if (result.success) {
        setIsRecording(false);
        
        // Add to recorded takes
        const takeKey = `shot_${currentShot.shotNumber}`;
        const existingTakes = recordedTakes[takeKey] || [];
        setRecordedTakes(prev => ({
          ...prev,
          [takeKey]: [...existingTakes, result.recording]
        }));

        // Assess quality
        const qualityAssessment = await recordingService.assessRecordingQuality(result.recording.uri);
        
        // Show quality feedback
        showQualityFeedback(qualityAssessment);
        
        setSyncStatus('ready');
      }
    } catch (error) {
      Alert.alert('Stop Recording Error', error.message);
      setIsRecording(false);
    }
  };

  const showQualityFeedback = (assessment) => {
    const { overallScore, recommendations } = assessment;
    const qualityText = overallScore >= 90 ? 'Excellent!' : 
                       overallScore >= 75 ? 'Good' : 
                       overallScore >= 60 ? 'Acceptable' : 'Needs Improvement';

    Alert.alert(
      `Take Quality: ${qualityText} (${overallScore}/100)`,
      recommendations.join('\n'),
      [
        { text: 'Retake', onPress: () => retakeCurrentShot() },
        { text: 'Continue', onPress: () => moveToNextShot() }
      ]
    );
  };

  const retakeCurrentShot = () => {
    // Stay on current shot for retake
    setShowInstructions(true);
  };

  const moveToNextShot = () => {
    if (currentShotIndex < storyboard.shots.length - 1) {
      setCurrentShotIndex(currentShotIndex + 1);
      setShowInstructions(true);
    } else {
      // All shots completed
      Alert.alert(
        'Scene Complete!',
        'Congratulations! You have completed filming all shots.',
        [
          { text: 'Review', onPress: () => navigation.navigate('ReviewScreen', { projectId, recordedTakes }) },
          { text: 'Finish', onPress: () => navigation.navigate('Dashboard') }
        ]
      );
    }
  };

  // Camera Controls
  const switchCamera = async () => {
    const newType = cameraType === Camera.Constants.Type.back 
      ? Camera.Constants.Type.front 
      : Camera.Constants.Type.back;
    setCameraType(newType);
  };

  const toggleFlash = () => {
    const flashModes = [
      Camera.Constants.FlashMode.off,
      Camera.Constants.FlashMode.on,
      Camera.Constants.FlashMode.auto
    ];
    const currentIndex = flashModes.indexOf(flashMode);
    setFlashMode(flashModes[(currentIndex + 1) % flashModes.length]);
  };

  // Storyboard Display
  const renderStoryboardOverlay = () => {
    if (!showStoryboard || !currentShot) return null;

    return (
      <Modal visible={showStoryboard} transparent animationType="slide">
        <View style={styles.storyboardModal}>
          <View style={styles.storyboardContainer}>
            <Text style={styles.storyboardTitle}>Shot {currentShot.shotNumber}</Text>
            
            {currentShot.sketchImageUrl && (
              <Image 
                source={{ uri: currentShot.sketchImageUrl }} 
                style={styles.storyboardImage}
                resizeMode="contain"
              />
            )}
            
            <Text style={styles.storyboardDescription}>{currentShot.description}</Text>
            
            <View style={styles.storyboardDetails}>
              <Text style={styles.detailText}>📷 {currentShot.cameraPosition}</Text>
              <Text style={styles.detailText}>👥 {currentShot.actorPositions}</Text>
              <Text style={styles.detailText}>⏱️ {currentShot.duration}s</Text>
            </View>

            <TouchableOpacity 
              style={styles.closeStoryboardButton}
              onPress={() => setShowStoryboard(false)}
            >
              <Text style={styles.closeButtonText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // AI Instructions Overlay
  const renderInstructionsOverlay = () => {
    if (!showInstructions || !currentShot) return null;

    const instructions = recordingService.generateAIInstructions(currentShot);

    return (
      <View style={styles.instructionsOverlay}>
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>🎬 Shot {currentShot.shotNumber} Instructions</Text>
          
          <View style={styles.instructionSection}>
            <Text style={styles.instructionLabel}>📷 Camera Setup:</Text>
            <Text style={styles.instructionText}>{instructions.cameraSetup}</Text>
          </View>

          <View style={styles.instructionSection}>
            <Text style={styles.instructionLabel}>📍 Positioning:</Text>
            <Text style={styles.instructionText}>{instructions.positioning.camera}</Text>
            <Text style={styles.instructionText}>{instructions.positioning.actors}</Text>
          </View>

          <View style={styles.instructionSection}>
            <Text style={styles.instructionLabel}>💡 Pro Tips:</Text>
            {instructions.tips.map((tip, index) => (
              <Text key={index} style={styles.tipText}>• {tip}</Text>
            ))}
          </View>

          <TouchableOpacity 
            style={styles.startRecordingButton}
            onPress={() => setShowInstructions(false)}
          >
            <Text style={styles.startRecordingButtonText}>Ready to Record</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Multi-device Status
  const renderDeviceStatus = () => {
    if (!multiDeviceEnabled || !deviceStatus) return null;

    return (
      <View style={styles.deviceStatusContainer}>
        <Text style={styles.deviceStatusTitle}>
          📱 {deviceStatus.totalDevices} Device{deviceStatus.totalDevices > 1 ? 's' : ''} Connected
        </Text>
        <Text style={styles.deviceRole}>Role: {deviceRole}</Text>
        <Text style={styles.syncStatus}>Status: {syncStatus}</Text>
      </View>
    );
  };

  if (cameraPermission === null) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.permissionText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (cameraPermission !== 'granted') {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Camera permission is required to record scenes.</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={initializeServices}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Camera View */}
      <View style={styles.cameraContainer}>
        <Camera
          ref={cameraRef}
          style={styles.camera}
          type={cameraType}
          flashMode={flashMode}
          ratio="16:9"
        >
          {/* Recording Countdown */}
          {recordingCountdown > 0 && (
            <View style={styles.countdownOverlay}>
              <Text style={styles.countdownText}>{recordingCountdown}</Text>
            </View>
          )}

          {/* Recording Indicator */}
          {isRecording && (
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>REC</Text>
            </View>
          )}

          {/* Device Status */}
          {renderDeviceStatus()}

          {/* Shot Info */}
          <View style={styles.shotInfoContainer}>
            <Text style={styles.shotInfoText}>
              Shot {currentShot?.shotNumber} of {storyboard?.shots?.length}
            </Text>
            <Text style={styles.shotTypeText}>{currentShot?.shotType?.replace('_', ' ')}</Text>
          </View>
        </Camera>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        {/* Top Controls */}
        <View style={styles.topControls}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowStoryboard(true)}>
            <Text style={styles.storyboardButton}>📋 Storyboard</Text>
          </TouchableOpacity>
        </View>

        {/* Camera Controls */}
        <View style={styles.cameraControls}>
          <TouchableOpacity style={styles.controlButton} onPress={switchCamera}>
            <Text style={styles.controlButtonText}>🔄</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlButton} onPress={toggleFlash}>
            <Text style={styles.controlButtonText}>
              {flashMode === Camera.Constants.FlashMode.off ? '⚡' : 
               flashMode === Camera.Constants.FlashMode.on ? '💡' : '🔆'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Recording Button */}
        <View style={styles.recordingControls}>
          {!isRecording ? (
            <TouchableOpacity 
              style={[styles.recordButton, loading && styles.disabledButton]}
              onPress={startRecording}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <View style={styles.recordButtonInner} />
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
              <View style={styles.stopButtonInner} />
            </TouchableOpacity>
          )}
        </View>

        {/* Shot Navigation */}
        <View style={styles.shotNavigation}>
          <TouchableOpacity 
            style={[styles.navButton, currentShotIndex === 0 && styles.disabledNavButton]}
            onPress={() => setCurrentShotIndex(Math.max(0, currentShotIndex - 1))}
            disabled={currentShotIndex === 0}
          >
            <Text style={styles.navButtonText}>← Prev Shot</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.navButton, currentShotIndex === storyboard?.shots?.length - 1 && styles.disabledNavButton]}
            onPress={() => setCurrentShotIndex(Math.min(storyboard.shots.length - 1, currentShotIndex + 1))}
            disabled={currentShotIndex === storyboard?.shots?.length - 1}
          >
            <Text style={styles.navButtonText}>Next Shot →</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Overlays */}
      {renderStoryboardOverlay()}
      {renderInstructionsOverlay()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 20,
  },
  permissionText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 20,
  },
  permissionButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  permissionButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  countdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  countdownText: {
    color: '#FFD700',
    fontSize: 100,
    fontWeight: 'bold',
  },
  recordingIndicator: {
    position: 'absolute',
    top: 50,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ff0000',
    marginRight: 8,
  },
  recordingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deviceStatusContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 8,
  },
  deviceStatusTitle: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
  },
  deviceRole: {
    color: '#FFFFFF',
    fontSize: 10,
  },
  syncStatus: {
    color: '#FFFFFF',
    fontSize: 10,
  },
  shotInfoContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 8,
  },
  shotInfoText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
  },
  shotTypeText: {
    color: '#FFFFFF',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  controlsContainer: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    color: '#FFD700',
    fontSize: 16,
  },
  storyboardButton: {
    color: '#FFD700',
    fontSize: 16,
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  controlButton: {
    backgroundColor: '#333333',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonText: {
    fontSize: 24,
  },
  recordingControls: {
    alignItems: 'center',
    marginBottom: 20,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ff0000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  recordButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ff0000',
  },
  stopButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#666666',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  stopButtonInner: {
    width: 30,
    height: 30,
    backgroundColor: '#FFFFFF',
  },
  disabledButton: {
    opacity: 0.5,
  },
  shotNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  navButton: {
    backgroundColor: '#333333',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  disabledNavButton: {
    opacity: 0.3,
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  storyboardModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  storyboardContainer: {
    backgroundColor: '#2a2a2a',
    padding: 20,
    borderRadius: 15,
    width: '100%',
    maxWidth: 400,
  },
  storyboardTitle: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  storyboardImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 15,
  },
  storyboardDescription: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 15,
    lineHeight: 22,
  },
  storyboardDetails: {
    marginBottom: 20,
  },
  detailText: {
    color: '#CCC',
    fontSize: 14,
    marginBottom: 5,
  },
  closeStoryboardButton: {
    backgroundColor: '#FFD700',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: 'bold',
  },
  instructionsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  instructionsContainer: {
    backgroundColor: '#2a2a2a',
    padding: 20,
    borderRadius: 15,
    width: '100%',
    maxWidth: 400,
  },
  instructionsTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  instructionSection: {
    marginBottom: 15,
  },
  instructionLabel: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 3,
  },
  tipText: {
    color: '#CCC',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 2,
  },
  startRecordingButton: {
    backgroundColor: '#FFD700',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  startRecordingButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default FilmingScreen;