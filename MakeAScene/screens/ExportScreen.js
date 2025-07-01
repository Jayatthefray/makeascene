import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Modal,
  Share,
  Linking
} from 'react-native';
import { Video } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { useProject } from '../src/contexts/ProjectContext';
import { exportService } from '../lib/export/exportService';
import { shareService } from '../lib/share/shareService';

const ExportScreen = ({ route, navigation }) => {
  const { projectId, finalVideoUri, storyboard } = route.params;
  const [exportSettings, setExportSettings] = useState({
    quality: '1080p',
    format: 'mp4',
    platform: 'general',
    includeWatermark: false
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportedVideoUri, setExportedVideoUri] = useState(finalVideoUri);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [mediaPermission, setMediaPermission] = useState(null);

  const { updateProject } = useProject();

  useEffect(() => {
    requestMediaPermission();
  }, []);

  const requestMediaPermission = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    setMediaPermission(status === 'granted');
  };

  const updateExportSetting = (key, value) => {
    setExportSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const exportVideo = async () => {
    if (!mediaPermission) {
      Alert.alert(
        'Permission Required',
        'Media library permission is required to save videos.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Grant Permission', onPress: requestMediaPermission }
        ]
      );
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      const result = await exportService.exportVideo(
        finalVideoUri,
        exportSettings,
        (progress) => setExportProgress(progress)
      );

      if (result.success) {
        setExportedVideoUri(result.exportedUri);
        
        // Save to media library
        await MediaLibrary.saveToLibraryAsync(result.exportedUri);
        
        // Update project
        await updateProject(projectId, {
          exportedVideoUri: result.exportedUri,
          exportSettings
        });

        Alert.alert(
          'Export Complete!',
          'Your video has been saved to your photo library.',
          [
            { text: 'Share', onPress: () => setShowShareOptions(true) },
            { text: 'Done', style: 'default' }
          ]
        );
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      Alert.alert('Export Error', error.message);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const shareVideo = async (platform) => {
    try {
      const result = await shareService.shareVideo(exportedVideoUri, platform, storyboard);
      
      if (result.success) {
        if (platform === 'system') {
          // Use system share sheet
          await Share.share({
            url: exportedVideoUri,
            title: storyboard.title,
            message: `Check out my scene: ${storyboard.title}`
          });
        } else {
          // Platform-specific sharing
          if (result.url) {
            await Linking.openURL(result.url);
          }
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      Alert.alert('Share Error', error.message);
    }
  };

  const createNewProject = () => {
    navigation.navigate('Dashboard');
  };

  const returnToProjects = () => {
    navigation.navigate('ProjectList');
  };

  const renderQualityOptions = () => (
    <View style={styles.settingSection}>
      <Text style={styles.settingLabel}>Quality</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {['720p', '1080p', '4K'].map((quality) => (
          <TouchableOpacity
            key={quality}
            style={[
              styles.optionButton,
              exportSettings.quality === quality && styles.selectedOptionButton
            ]}
            onPress={() => updateExportSetting('quality', quality)}
          >
            <Text style={[
              styles.optionButtonText,
              exportSettings.quality === quality && styles.selectedOptionButtonText
            ]}>
              {quality}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderFormatOptions = () => (
    <View style={styles.settingSection}>
      <Text style={styles.settingLabel}>Format</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {[
          { key: 'mp4', label: 'MP4', desc: 'Best compatibility' },
          { key: 'mov', label: 'MOV', desc: 'High quality' },
          { key: 'gif', label: 'GIF', desc: 'Social media' }
        ].map((format) => (
          <TouchableOpacity
            key={format.key}
            style={[
              styles.formatButton,
              exportSettings.format === format.key && styles.selectedFormatButton
            ]}
            onPress={() => updateExportSetting('format', format.key)}
          >
            <Text style={[
              styles.formatButtonTitle,
              exportSettings.format === format.key && styles.selectedFormatButtonTitle
            ]}>
              {format.label}
            </Text>
            <Text style={[
              styles.formatButtonDesc,
              exportSettings.format === format.key && styles.selectedFormatButtonDesc
            ]}>
              {format.desc}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderPlatformOptimization = () => (
    <View style={styles.settingSection}>
      <Text style={styles.settingLabel}>Optimize for Platform</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {[
          { key: 'general', label: '📱 General', desc: 'Best overall quality' },
          { key: 'instagram', label: '📷 Instagram', desc: 'Square format' },
          { key: 'tiktok', label: '🎵 TikTok', desc: 'Vertical format' },
          { key: 'youtube', label: '📺 YouTube', desc: 'Widescreen' }
        ].map((platform) => (
          <TouchableOpacity
            key={platform.key}
            style={[
              styles.platformButton,
              exportSettings.platform === platform.key && styles.selectedPlatformButton
            ]}
            onPress={() => updateExportSetting('platform', platform.key)}
          >
            <Text style={styles.platformButtonEmoji}>{platform.label.split(' ')[0]}</Text>
            <Text style={[
              styles.platformButtonTitle,
              exportSettings.platform === platform.key && styles.selectedPlatformButtonTitle
            ]}>
              {platform.label.split(' ')[1]}
            </Text>
            <Text style={styles.platformButtonDesc}>{platform.desc}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderWatermarkOption = () => (
    <View style={styles.settingSection}>
      <TouchableOpacity
        style={styles.watermarkToggle}
        onPress={() => updateExportSetting('includeWatermark', !exportSettings.includeWatermark)}
      >
        <View style={styles.watermarkToggleContent}>
          <Text style={styles.watermarkLabel}>Include Make A Scene Watermark</Text>
          <Text style={styles.watermarkDescription}>
            Support the app by including our small watermark
          </Text>
        </View>
        <View style={[
          styles.toggle,
          exportSettings.includeWatermark && styles.toggleActive
        ]}>
          <View style={[
            styles.toggleButton,
            exportSettings.includeWatermark && styles.toggleButtonActive
          ]} />
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderVideoPreview = () => (
    <View style={styles.previewSection}>
      <Text style={styles.previewTitle}>📽️ Video Preview</Text>
      <TouchableOpacity
        style={styles.previewContainer}
        onPress={() => setShowVideoModal(true)}
      >
        <Video
          source={{ uri: exportedVideoUri }}
          style={styles.previewVideo}
          resizeMode="contain"
          isLooping
          isMuted
          shouldPlay={false}
        />
        <View style={styles.previewOverlay}>
          <Text style={styles.previewPlayButton}>▶️</Text>
          <Text style={styles.previewText}>Tap to play full screen</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderShareOptions = () => (
    <Modal visible={showShareOptions} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.shareModalContainer}>
        <View style={styles.shareModalHeader}>
          <TouchableOpacity onPress={() => setShowShareOptions(false)}>
            <Text style={styles.modalCloseButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.shareModalTitle}>Share Your Scene</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={styles.shareOptions}>
          <TouchableOpacity
            style={styles.shareOption}
            onPress={() => {
              setShowShareOptions(false);
              shareVideo('system');
            }}
          >
            <Text style={styles.shareOptionIcon}>📱</Text>
            <View style={styles.shareOptionContent}>
              <Text style={styles.shareOptionTitle}>System Share</Text>
              <Text style={styles.shareOptionDescription}>Share via Messages, Email, AirDrop, etc.</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shareOption}
            onPress={() => {
              setShowShareOptions(false);
              shareVideo('instagram');
            }}
          >
            <Text style={styles.shareOptionIcon}>📷</Text>
            <View style={styles.shareOptionContent}>
              <Text style={styles.shareOptionTitle}>Instagram</Text>
              <Text style={styles.shareOptionDescription}>Share to Instagram Stories or Feed</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shareOption}
            onPress={() => {
              setShowShareOptions(false);
              shareVideo('tiktok');
            }}
          >
            <Text style={styles.shareOptionIcon}>🎵</Text>
            <View style={styles.shareOptionContent}>
              <Text style={styles.shareOptionTitle}>TikTok</Text>
              <Text style={styles.shareOptionDescription}>Share to TikTok</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shareOption}
            onPress={() => {
              setShowShareOptions(false);
              shareVideo('youtube');
            }}
          >
            <Text style={styles.shareOptionIcon}>📺</Text>
            <View style={styles.shareOptionContent}>
              <Text style={styles.shareOptionTitle}>YouTube</Text>
              <Text style={styles.shareOptionDescription}>Upload to YouTube</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shareOption}
            onPress={() => {
              setShowShareOptions(false);
              shareVideo('twitter');
            }}
          >
            <Text style={styles.shareOptionIcon}>🐦</Text>
            <View style={styles.shareOptionContent}>
              <Text style={styles.shareOptionTitle}>Twitter</Text>
              <Text style={styles.shareOptionDescription}>Tweet your video</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderVideoModal = () => (
    <Modal visible={showVideoModal} animationType="fade" presentationStyle="overFullScreen">
      <SafeAreaView style={styles.videoModalContainer}>
        <View style={styles.videoModalHeader}>
          <TouchableOpacity onPress={() => setShowVideoModal(false)}>
            <Text style={styles.modalCloseButton}>✕ Close</Text>
          </TouchableOpacity>
        </View>

        <Video
          source={{ uri: exportedVideoUri }}
          style={styles.fullScreenVideo}
          useNativeControls
          resizeMode="contain"
          shouldPlay
        />
      </SafeAreaView>
    </Modal>
  );

  const renderExportModal = () => (
    <Modal visible={isExporting} animationType="fade" presentationStyle="pageSheet">
      <SafeAreaView style={styles.exportModalContainer}>
        <View style={styles.exportContent}>
          <Text style={styles.exportTitle}>🎬 Exporting Your Video</Text>
          <Text style={styles.exportDescription}>
            Creating your final video with {exportSettings.quality} quality in {exportSettings.format.toUpperCase()} format.
          </Text>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${exportProgress}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(exportProgress)}%</Text>
          </View>

          <ActivityIndicator size="large" color="#FFD700" style={{ marginTop: 20 }} />
        </View>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Export & Share</Text>
        <TouchableOpacity onPress={() => setShowShareOptions(true)}>
          <Text style={styles.shareButton}>Share</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>🎉</Text>
          <Text style={styles.successTitle}>Scene Complete!</Text>
          <Text style={styles.successDescription}>
            Congratulations! You've successfully created your scene. 
            Choose your export settings and share your masterpiece.
          </Text>
        </View>

        {renderVideoPreview()}
        {renderQualityOptions()}
        {renderFormatOptions()}
        {renderPlatformOptimization()}
        {renderWatermarkOption()}

        <View style={styles.exportSection}>
          <TouchableOpacity
            style={[styles.exportButton, isExporting && styles.disabledButton]}
            onPress={exportVideo}
            disabled={isExporting}
          >
            {isExporting ? (
              <ActivityIndicator color="#1a1a1a" />
            ) : (
              <Text style={styles.exportButtonText}>💾 Export Video</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.exportNote}>
            Video will be saved to your photo library and optimized for {exportSettings.platform}
          </Text>
        </View>

        <View style={styles.navigationSection}>
          <TouchableOpacity style={styles.navButton} onPress={createNewProject}>
            <Text style={styles.navButtonText}>🎬 Create New Scene</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navButton} onPress={returnToProjects}>
            <Text style={styles.navButtonText}>📁 View All Projects</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsSection}>
          <Text style={styles.statsTitle}>📊 Scene Statistics</Text>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Shots:</Text>
            <Text style={styles.statValue}>{storyboard.shots.length}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Final Duration:</Text>
            <Text style={styles.statValue}>{storyboard.estimatedDuration}s</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Genre:</Text>
            <Text style={styles.statValue}>{storyboard.genre || 'Drama'}</Text>
          </View>
        </View>
      </ScrollView>

      {renderShareOptions()}
      {renderVideoModal()}
      {renderExportModal()}
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
  shareButton: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  successContainer: {
    backgroundColor: '#2a2a2a',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  successTitle: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  successDescription: {
    color: '#CCCCCC',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  previewSection: {
    marginBottom: 20,
  },
  previewTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  previewContainer: {
    position: 'relative',
    height: 200,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewVideo: {
    width: '100%',
    height: '100%',
  },
  previewOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewPlayButton: {
    fontSize: 32,
    marginBottom: 8,
  },
  previewText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  settingSection: {
    marginBottom: 20,
  },
  settingLabel: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  optionButton: {
    backgroundColor: '#333',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 12,
  },
  selectedOptionButton: {
    backgroundColor: '#FFD700',
  },
  optionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedOptionButtonText: {
    color: '#1a1a1a',
  },
  formatButton: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 100,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedFormatButton: {
    borderColor: '#FFD700',
  },
  formatButtonTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  selectedFormatButtonTitle: {
    color: '#FFD700',
  },
  formatButtonDesc: {
    color: '#CCCCCC',
    fontSize: 12,
    textAlign: 'center',
  },
  selectedFormatButtonDesc: {
    color: '#FFFFFF',
  },
  platformButton: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 110,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPlatformButton: {
    borderColor: '#FFD700',
  },
  platformButtonEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  platformButtonTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  selectedPlatformButtonTitle: {
    color: '#FFD700',
  },
  platformButtonDesc: {
    color: '#CCCCCC',
    fontSize: 11,
    textAlign: 'center',
  },
  watermarkToggle: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  watermarkToggleContent: {
    flex: 1,
  },
  watermarkLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  watermarkDescription: {
    color: '#CCCCCC',
    fontSize: 14,
  },
  toggle: {
    width: 50,
    height: 30,
    backgroundColor: '#333',
    borderRadius: 15,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#FFD700',
  },
  toggleButton: {
    width: 26,
    height: 26,
    backgroundColor: '#FFFFFF',
    borderRadius: 13,
    alignSelf: 'flex-start',
  },
  toggleButtonActive: {
    alignSelf: 'flex-end',
  },
  exportSection: {
    alignItems: 'center',
    marginVertical: 20,
  },
  exportButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginBottom: 12,
  },
  exportButtonText: {
    color: '#1a1a1a',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.5,
  },
  exportNote: {
    color: '#CCCCCC',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 18,
  },
  navigationSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
  },
  navButton: {
    backgroundColor: '#333',
    flex: 0.48,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statsSection: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 40,
  },
  statsTitle: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statLabel: {
    color: '#CCCCCC',
    fontSize: 14,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Share Modal Styles
  shareModalContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  shareModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  shareModalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    color: '#FFD700',
    fontSize: 16,
  },
  shareOptions: {
    flex: 1,
    padding: 20,
  },
  shareOption: {
    backgroundColor: '#2a2a2a',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  shareOptionIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  shareOptionContent: {
    flex: 1,
  },
  shareOptionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  shareOptionDescription: {
    color: '#CCCCCC',
    fontSize: 14,
  },
  // Video Modal Styles
  videoModalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoModalHeader: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1,
  },
  fullScreenVideo: {
    flex: 1,
  },
  // Export Modal Styles
  exportModalContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
  },
  exportContent: {
    padding: 40,
    alignItems: 'center',
  },
  exportTitle: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  exportDescription: {
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

export default ExportScreen;