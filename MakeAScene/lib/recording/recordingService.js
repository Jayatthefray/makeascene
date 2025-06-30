import { Camera } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid';
import { deviceService } from '../multiDevice/deviceService';

// Enhanced Recording System (Week 4-6 Feature)
class RecordingService {
  constructor() {
    this.isInitialized = false;
    this.cameraRef = null;
    this.currentRecording = null;
    this.recordingQuality = '1080p';
    this.audioEnabled = true;
    this.flashMode = Camera.Constants.FlashMode.off;
    this.cameraType = Camera.Constants.Type.back;
    this.stabilization = true;
    this.focusMode = Camera.Constants.AutoFocus.on;
    this.whiteBalance = Camera.Constants.WhiteBalance.auto;
  }

  // Initialize recording service
  async initialize() {
    try {
      // Request camera permissions
      const cameraPermission = await Camera.requestCameraPermissionsAsync();
      const audioPermission = await Camera.requestMicrophonePermissionsAsync();
      const mediaLibraryPermission = await MediaLibrary.requestPermissionsAsync();

      if (cameraPermission.status !== 'granted') {
        throw new Error('Camera permission not granted');
      }

      if (audioPermission.status !== 'granted') {
        console.warn('Audio permission not granted - recording without audio');
        this.audioEnabled = false;
      }

      if (mediaLibraryPermission.status !== 'granted') {
        console.warn('Media library permission not granted - manual save required');
      }

      this.isInitialized = true;
      console.log('RecordingService initialized');

      return { 
        success: true, 
        permissions: {
          camera: cameraPermission.status,
          audio: audioPermission.status,
          mediaLibrary: mediaLibraryPermission.status
        }
      };
    } catch (error) {
      console.error('RecordingService initialization failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Set camera reference from component
  setCameraRef(ref) {
    this.cameraRef = ref;
  }

  // Professional Recording Configuration
  configureRecording(options = {}) {
    const {
      quality = '1080p',
      stabilization = true,
      audio = true,
      flashMode = Camera.Constants.FlashMode.off,
      cameraType = Camera.Constants.Type.back,
      focusMode = Camera.Constants.AutoFocus.on,
      whiteBalance = Camera.Constants.WhiteBalance.auto
    } = options;

    // Quality mapping to Expo Camera constants
    const qualityMap = {
      '720p': Camera.Constants.VideoQuality['720p'],
      '1080p': Camera.Constants.VideoQuality['1080p'],
      '4K': Camera.Constants.VideoQuality['2160p'] // 4K
    };

    this.recordingQuality = qualityMap[quality] || qualityMap['1080p'];
    this.stabilization = stabilization;
    this.audioEnabled = audio;
    this.flashMode = flashMode;
    this.cameraType = cameraType;
    this.focusMode = focusMode;
    this.whiteBalance = whiteBalance;

    return {
      quality,
      stabilization,
      audio,
      flashMode,
      cameraType
    };
  }

  // Start Single Device Recording
  async startRecording(shotData = {}) {
    if (!this.isInitialized || !this.cameraRef) {
      throw new Error('Recording service not properly initialized');
    }

    try {
      const recordingId = uuidv4();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `scene_${shotData.shotNumber || 'unknown'}_take_${timestamp}`;

      const recordingOptions = {
        quality: this.recordingQuality,
        stabilization: this.stabilization,
        audio: this.audioEnabled,
        mute: !this.audioEnabled,
        maxDuration: shotData.maxDuration || 60, // seconds
        maxFileSize: 100 * 1024 * 1024, // 100MB
      };

      // Start recording
      const recordingPromise = this.cameraRef.recordAsync(recordingOptions);
      
      this.currentRecording = {
        id: recordingId,
        filename,
        startTime: Date.now(),
        shotData,
        deviceId: deviceService.deviceId,
        deviceRole: deviceService.deviceRole,
        promise: recordingPromise
      };

      console.log('Recording started:', recordingId);

      return {
        success: true,
        recordingId,
        filename,
        deviceRole: deviceService.deviceRole
      };
    } catch (error) {
      console.error('Failed to start recording:', error);
      return { success: false, error: error.message };
    }
  }

  // Stop Single Device Recording
  async stopRecording() {
    if (!this.currentRecording) {
      throw new Error('No active recording to stop');
    }

    try {
      // Stop the recording
      this.cameraRef.stopRecording();
      
      // Wait for the recording to complete
      const recordingResult = await this.currentRecording.promise;
      
      const endTime = Date.now();
      const duration = (endTime - this.currentRecording.startTime) / 1000; // seconds

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(recordingResult.uri);

      const completedRecording = {
        ...this.currentRecording,
        endTime,
        duration,
        uri: recordingResult.uri,
        fileSize: fileInfo.size,
        status: 'completed'
      };

      // Save to media library if permissions granted
      try {
        await MediaLibrary.saveToLibraryAsync(recordingResult.uri);
        completedRecording.savedToLibrary = true;
      } catch (error) {
        console.warn('Could not save to media library:', error);
        completedRecording.savedToLibrary = false;
      }

      // Clear current recording
      this.currentRecording = null;

      console.log('Recording completed:', completedRecording.id);

      return {
        success: true,
        recording: completedRecording
      };
    } catch (error) {
      console.error('Failed to stop recording:', error);
      this.currentRecording = null;
      return { success: false, error: error.message };
    }
  }

  // Multi-Device Coordinated Recording
  async startCoordinatedRecording(shotData, countdown = 3) {
    if (!deviceService.isInitialized) {
      throw new Error('Device service not initialized for multi-device recording');
    }

    // Only primary device can initiate coordinated recording
    if (deviceService.deviceRole === 'primary') {
      // Start coordinated countdown across all devices
      const coordinationResult = await deviceService.startCoordinatedRecording(countdown);
      
      // Start local recording after countdown
      setTimeout(async () => {
        await this.startRecording({
          ...shotData,
          isCoordinated: true,
          recordingId: coordinationResult.recordingId
        });
      }, countdown * 1000);

      return coordinationResult;
    } else {
      // Secondary devices wait for coordination signal
      return this.waitForCoordinationSignal();
    }
  }

  // Wait for coordination signal (secondary devices)
  async waitForCoordinationSignal() {
    return new Promise((resolve) => {
      const handleCoordination = (data) => {
        if (data.command === 'start_recording') {
          const delay = data.startTimestamp - Date.now();
          
          setTimeout(async () => {
            await this.startRecording({
              isCoordinated: true,
              recordingId: data.recordingId,
              role: deviceService.deviceRole
            });
          }, Math.max(0, delay));

          resolve({
            success: true,
            recordingId: data.recordingId,
            role: deviceService.deviceRole
          });
        }
      };

      // Listen for coordination signals
      // In real implementation, this would be a WebRTC data channel listener
      deviceService.onCoordinationSignal = handleCoordination;
    });
  }

  // AI-Guided Recording with Overlay
  async startAIGuidedRecording(shotData, storyboardSketch) {
    const recordingOptions = {
      ...shotData,
      hasAIGuidance: true,
      storyboardSketch,
      aiInstructions: this.generateAIInstructions(shotData)
    };

    return this.startRecording(recordingOptions);
  }

  // Generate AI instructions for filming
  generateAIInstructions(shotData) {
    const { shotType, description, cameraPosition, actorPositions } = shotData;

    const instructions = {
      cameraSetup: this.getCameraSetupInstructions(shotType),
      positioning: this.getPositioningInstructions(cameraPosition, actorPositions),
      movement: this.getMovementInstructions(shotType),
      timing: this.getTimingInstructions(shotData),
      tips: this.getProTips(shotType)
    };

    return instructions;
  }

  // Camera setup instructions based on shot type
  getCameraSetupInstructions(shotType) {
    const setups = {
      'selfie': 'Use front camera, hold at arm\'s length, ensure face is centered',
      'single_handheld': 'Use back camera, hold steady with both hands, maintain eye level',
      'two_shot_handheld': 'Frame both subjects, leave headroom, use rule of thirds',
      'group_static': 'Use tripod if available, wide angle, ensure everyone is visible',
      'moving_tracking': 'Follow subject smoothly, keep steady pace, anticipate movement',
      'cinematic_sequence': 'Plan camera movement, use multiple angles, maintain continuity'
    };

    return setups[shotType] || 'Follow standard filming practices';
  }

  // Positioning instructions
  getPositioningInstructions(cameraPosition, actorPositions) {
    return {
      camera: cameraPosition || 'Eye level, stable position',
      actors: actorPositions || 'Natural, well-lit positions',
      lighting: 'Avoid backlighting, use natural light when possible',
      background: 'Check for distracting elements, keep it simple'
    };
  }

  // Movement instructions
  getMovementInstructions(shotType) {
    const movements = {
      'moving_tracking': 'Smooth follow movement, maintain consistent distance',
      'cinematic_sequence': 'Planned camera movement, coordinate with actors',
      'static': 'Keep camera steady, minimal movement'
    };

    return movements[shotType] || 'Keep camera steady';
  }

  // Timing instructions
  getTimingInstructions(shotData) {
    const { estimatedDuration, dialogue } = shotData;
    
    return {
      duration: `Aim for ${estimatedDuration || 30} seconds`,
      pacing: dialogue ? 'Allow time for dialogue delivery' : 'Maintain steady pacing',
      action: 'Start recording before action, continue after completion'
    };
  }

  // Professional tips based on shot type
  getProTips(shotType) {
    const tips = {
      'selfie': ['Keep phone steady', 'Good lighting on face', 'Practice expression'],
      'single_handheld': ['Use both hands', 'Breathe steadily', 'Focus on subject'],
      'two_shot_handheld': ['Leave room for both subjects', 'Check framing often', 'Maintain balance'],
      'group_static': ['Count subjects before recording', 'Use tripod if possible', 'Wide shot'],
      'moving_tracking': ['Practice movement first', 'Smooth motion', 'Keep subject in frame'],
      'cinematic_sequence': ['Plan shots in advance', 'Multiple angles', 'Maintain continuity']
    };

    return tips[shotType] || ['Keep camera steady', 'Good lighting', 'Practice first'];
  }

  // Quality Assessment
  async assessRecordingQuality(recordingUri) {
    try {
      // Basic file info assessment
      const fileInfo = await FileSystem.getInfoAsync(recordingUri);
      
      let qualityScore = 100;
      let issues = [];

      // File size check (too small might indicate problems)
      if (fileInfo.size < 1024 * 1024) { // Less than 1MB
        qualityScore -= 20;
        issues.push('File size very small - possible recording issue');
      }

      // Duration check would require video analysis library
      // For now, we'll simulate quality scoring
      const stabilityScore = Math.floor(Math.random() * 40) + 60; // 60-100
      const audioQualityScore = this.audioEnabled ? Math.floor(Math.random() * 30) + 70 : 0;
      const framingScore = Math.floor(Math.random() * 30) + 70;

      qualityScore = Math.floor((stabilityScore + audioQualityScore + framingScore) / 3);

      if (stabilityScore < 70) issues.push('Camera stability could be improved');
      if (audioQualityScore < 70 && this.audioEnabled) issues.push('Audio quality needs improvement');
      if (framingScore < 70) issues.push('Framing and composition could be better');

      return {
        overallScore: qualityScore,
        stabilityScore,
        audioQualityScore,
        framingScore,
        issues,
        fileSize: fileInfo.size,
        recommendations: this.getQualityRecommendations(qualityScore, issues)
      };
    } catch (error) {
      console.error('Quality assessment failed:', error);
      return {
        overallScore: 0,
        error: error.message
      };
    }
  }

  // Quality improvement recommendations
  getQualityRecommendations(score, issues) {
    if (score >= 90) {
      return ['Excellent recording! Ready for final scene.'];
    } else if (score >= 75) {
      return ['Good quality. Consider minor improvements.', ...issues];
    } else if (score >= 60) {
      return ['Acceptable quality but could be improved.', ...issues, 'Consider retaking for best results.'];
    } else {
      return ['Quality needs significant improvement.', ...issues, 'Recommend retaking this shot.'];
    }
  }

  // Camera Control Methods
  async switchCamera() {
    this.cameraType = this.cameraType === Camera.Constants.Type.back 
      ? Camera.Constants.Type.front 
      : Camera.Constants.Type.back;
    
    return this.cameraType;
  }

  async toggleFlash() {
    const flashModes = [
      Camera.Constants.FlashMode.off,
      Camera.Constants.FlashMode.on,
      Camera.Constants.FlashMode.auto
    ];
    
    const currentIndex = flashModes.indexOf(this.flashMode);
    this.flashMode = flashModes[(currentIndex + 1) % flashModes.length];
    
    return this.flashMode;
  }

  // Get current recording status
  getRecordingStatus() {
    if (!this.currentRecording) {
      return { isRecording: false };
    }

    const elapsed = (Date.now() - this.currentRecording.startTime) / 1000;
    
    return {
      isRecording: true,
      recordingId: this.currentRecording.id,
      elapsed,
      deviceRole: this.currentRecording.deviceRole,
      filename: this.currentRecording.filename
    };
  }

  // Cleanup resources
  cleanup() {
    if (this.currentRecording) {
      this.stopRecording().catch(console.error);
    }
    
    this.cameraRef = null;
    this.isInitialized = false;
    
    console.log('RecordingService cleaned up');
  }
}

// Export singleton instance
export const recordingService = new RecordingService();

export default RecordingService;