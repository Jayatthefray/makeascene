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
  Modal
} from 'react-native';
import { Video } from 'expo-av';
import { useProject } from '../src/contexts/ProjectContext';
import { recordingService } from '../lib/recording/recordingService';

const { width: screenWidth } = Dimensions.get('window');

const ReviewScreen = ({ route, navigation }) => {
  const { projectId, recordedTakes, storyboard } = route.params;
  const [selectedTakes, setSelectedTakes] = useState({});
  const [playingVideo, setPlayingVideo] = useState(null);
  const [videoStatus, setVideoStatus] = useState({});
  const [loading, setLoading] = useState(false);
  const [qualityAnalysis, setQualityAnalysis] = useState({});
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [currentVideoUri, setCurrentVideoUri] = useState(null);

  const { updateProject } = useProject();

  useEffect(() => {
    // Initialize selected takes with the first take for each shot
    initializeSelectedTakes();
    // Analyze quality for all takes
    analyzeAllTakes();
  }, []);

  const initializeSelectedTakes = () => {
    const initialSelections = {};
    Object.keys(recordedTakes).forEach(shotKey => {
      const takes = recordedTakes[shotKey];
      if (takes && takes.length > 0) {
        initialSelections[shotKey] = takes[0].id;
      }
    });
    setSelectedTakes(initialSelections);
  };

  const analyzeAllTakes = async () => {
    const analysis = {};
    for (const shotKey of Object.keys(recordedTakes)) {
      const takes = recordedTakes[shotKey];
      for (const take of takes) {
        try {
          const assessment = await recordingService.assessRecordingQuality(take.uri);
          analysis[take.id] = assessment;
        } catch (error) {
          console.warn('Failed to analyze take:', take.id, error);
        }
      }
    }
    setQualityAnalysis(analysis);
  };

  const selectTake = (shotKey, takeId) => {
    setSelectedTakes(prev => ({
      ...prev,
      [shotKey]: takeId
    }));
  };

  const playVideo = (uri, takeId) => {
    setCurrentVideoUri(uri);
    setShowVideoModal(true);
  };

  const retakeShot = (shotNumber) => {
    Alert.alert(
      'Retake Shot',
      `Do you want to retake shot ${shotNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Retake',
          onPress: () => {
            // Navigate back to filming screen for this specific shot
            navigation.navigate('FilmingScreen', {
              projectId,
              storyboard,
              startFromShot: shotNumber - 1,
              multiDeviceEnabled: false
            });
          }
        }
      ]
    );
  };

  const proceedToEditing = async () => {
    setLoading(true);
    try {
      // Validate that all shots have selected takes
      const missingShots = [];
      storyboard.shots.forEach(shot => {
        const shotKey = `shot_${shot.shotNumber}`;
        if (!selectedTakes[shotKey]) {
          missingShots.push(shot.shotNumber);
        }
      });

      if (missingShots.length > 0) {
        Alert.alert(
          'Missing Takes',
          `Please select takes for shots: ${missingShots.join(', ')}`,
          [{ text: 'OK' }]
        );
        return;
      }

      // Update project with selected takes
      await updateProject(projectId, {
        selectedTakes,
        status: 'editing'
      });

      // Navigate to editing screen
      navigation.navigate('EditingScreen', {
        projectId,
        selectedTakes,
        storyboard,
        recordedTakes
      });

    } catch (error) {
      Alert.alert('Error', 'Failed to proceed to editing: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getQualityColor = (score) => {
    if (score >= 90) return '#00CC44';
    if (score >= 75) return '#FFD700';
    if (score >= 60) return '#FF8800';
    return '#CC3333';
  };

  const getQualityText = (score) => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Poor';
  };

  const renderTakeCard = (take, shotKey, shotNumber) => {
    const isSelected = selectedTakes[shotKey] === take.id;
    const analysis = qualityAnalysis[take.id];
    const overallScore = analysis?.overallScore || 0;

    return (
      <View key={take.id} style={[styles.takeCard, isSelected && styles.selectedTakeCard]}>
        <TouchableOpacity
          style={styles.videoThumbnail}
          onPress={() => playVideo(take.uri, take.id)}
        >
          <Image
            source={{ uri: take.thumbnailUrl || take.uri }}
            style={styles.thumbnailImage}
            resizeMode="cover"
          />
          <View style={styles.playButton}>
            <Text style={styles.playButtonText}>▶️</Text>
          </View>
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{Math.round(take.duration || 0)}s</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.takeInfo}>
          <Text style={styles.takeTitle}>Take {take.takeNumber}</Text>
          <Text style={styles.takeTime}>
            {new Date(take.recordedAt).toLocaleTimeString()}
          </Text>

          {analysis && (
            <View style={styles.qualityContainer}>
              <Text style={styles.qualityLabel}>Quality:</Text>
              <Text style={[styles.qualityScore, { color: getQualityColor(overallScore) }]}>
                {getQualityText(overallScore)} ({overallScore}/100)
              </Text>
            </View>
          )}

          {analysis?.recommendations && analysis.recommendations.length > 0 && (
            <View style={styles.recommendationsContainer}>
              <Text style={styles.recommendationsTitle}>Feedback:</Text>
              {analysis.recommendations.slice(0, 2).map((rec, index) => (
                <Text key={index} style={styles.recommendationText}>• {rec}</Text>
              ))}
            </View>
          )}
        </View>

        <View style={styles.takeActions}>
          <TouchableOpacity
            style={[styles.selectButton, isSelected && styles.selectedButton]}
            onPress={() => selectTake(shotKey, take.id)}
          >
            <Text style={[styles.selectButtonText, isSelected && styles.selectedButtonText]}>
              {isSelected ? '✓ Selected' : 'Select'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderShotSection = (shot, shotKey) => {
    const takes = recordedTakes[shotKey] || [];
    
    if (takes.length === 0) {
      return (
        <View key={shotKey} style={styles.shotSection}>
          <View style={styles.shotHeader}>
            <Text style={styles.shotTitle}>Shot {shot.shotNumber}</Text>
            <Text style={styles.shotType}>{shot.shotType.replace('_', ' ')}</Text>
          </View>
          <View style={styles.noTakesContainer}>
            <Text style={styles.noTakesText}>No takes recorded</Text>
            <TouchableOpacity
              style={styles.retakeButton}
              onPress={() => retakeShot(shot.shotNumber)}
            >
              <Text style={styles.retakeButtonText}>📹 Record Take</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View key={shotKey} style={styles.shotSection}>
        <View style={styles.shotHeader}>
          <Text style={styles.shotTitle}>Shot {shot.shotNumber}</Text>
          <Text style={styles.shotType}>{shot.shotType.replace('_', ' ')}</Text>
          <TouchableOpacity
            style={styles.retakeButton}
            onPress={() => retakeShot(shot.shotNumber)}
          >
            <Text style={styles.retakeButtonText}>+ Retake</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.shotDescription}>{shot.description}</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.takesScrollView}>
          {takes.map(take => renderTakeCard(take, shotKey, shot.shotNumber))}
        </ScrollView>
      </View>
    );
  };

  const renderVideoModal = () => (
    <Modal visible={showVideoModal} animationType="fade" presentationStyle="overFullScreen">
      <SafeAreaView style={styles.videoModalContainer}>
        <View style={styles.videoModalHeader}>
          <TouchableOpacity onPress={() => setShowVideoModal(false)}>
            <Text style={styles.modalCloseButton}>✕ Close</Text>
          </TouchableOpacity>
        </View>

        {currentVideoUri && (
          <Video
            source={{ uri: currentVideoUri }}
            style={styles.fullScreenVideo}
            useNativeControls
            resizeMode="contain"
            shouldPlay
            onPlaybackStatusUpdate={(status) => setVideoStatus(status)}
          />
        )}
      </SafeAreaView>
    </Modal>
  );

  const getSelectedTakesCount = () => {
    return Object.keys(selectedTakes).length;
  };

  const getTotalShotsCount = () => {
    return storyboard.shots.length;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Takes</Text>
        <View style={styles.progressIndicator}>
          <Text style={styles.progressText}>
            {getSelectedTakesCount()}/{getTotalShotsCount()}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>📽️ Scene Review</Text>
          <Text style={styles.summaryDescription}>
            Review your recorded takes and select the best one for each shot. 
            You can retake any shot or proceed to editing when ready.
          </Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{getTotalShotsCount()}</Text>
              <Text style={styles.statLabel}>Total Shots</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {Object.values(recordedTakes).reduce((total, takes) => total + takes.length, 0)}
              </Text>
              <Text style={styles.statLabel}>Takes Recorded</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{getSelectedTakesCount()}</Text>
              <Text style={styles.statLabel}>Selected</Text>
            </View>
          </View>
        </View>

        {storyboard.shots.map(shot => {
          const shotKey = `shot_${shot.shotNumber}`;
          return renderShotSection(shot, shotKey);
        })}

        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[
              styles.proceedButton,
              (getSelectedTakesCount() < getTotalShotsCount() || loading) && styles.disabledButton
            ]}
            onPress={proceedToEditing}
            disabled={getSelectedTakesCount() < getTotalShotsCount() || loading}
          >
            {loading ? (
              <ActivityIndicator color="#1a1a1a" />
            ) : (
              <Text style={styles.proceedButtonText}>
                🎬 Proceed to Editing
              </Text>
            )}
          </TouchableOpacity>

          {getSelectedTakesCount() < getTotalShotsCount() && (
            <Text style={styles.incompleteText}>
              Please select takes for all shots before proceeding
            </Text>
          )}
        </View>
      </ScrollView>

      {renderVideoModal()}
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
  progressIndicator: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  progressText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  summaryContainer: {
    backgroundColor: '#2a2a2a',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  summaryTitle: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  summaryDescription: {
    color: '#CCCCCC',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#CCCCCC',
    fontSize: 12,
    marginTop: 4,
  },
  shotSection: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  shotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  shotTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
  },
  shotType: {
    color: '#FFFFFF',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  retakeButton: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retakeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  shotDescription: {
    color: '#CCCCCC',
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 16,
  },
  takesScrollView: {
    marginTop: 8,
  },
  takeCard: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    width: screenWidth * 0.7,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedTakeCard: {
    borderColor: '#FFD700',
  },
  videoThumbnail: {
    position: 'relative',
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#555',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateX: -20 }, { translateY: -20 }],
  },
  playButtonText: {
    fontSize: 16,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  takeInfo: {
    marginBottom: 12,
  },
  takeTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  takeTime: {
    color: '#999',
    fontSize: 12,
    marginBottom: 8,
  },
  qualityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  qualityLabel: {
    color: '#CCCCCC',
    fontSize: 12,
    marginRight: 6,
  },
  qualityScore: {
    fontSize: 12,
    fontWeight: '600',
  },
  recommendationsContainer: {
    marginTop: 8,
  },
  recommendationsTitle: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  recommendationText: {
    color: '#CCCCCC',
    fontSize: 11,
    lineHeight: 14,
  },
  takeActions: {
    alignItems: 'center',
  },
  selectButton: {
    backgroundColor: '#555',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
  },
  selectedButton: {
    backgroundColor: '#FFD700',
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedButtonText: {
    color: '#1a1a1a',
  },
  noTakesContainer: {
    alignItems: 'center',
    padding: 20,
  },
  noTakesText: {
    color: '#999',
    fontSize: 16,
    marginBottom: 16,
  },
  actionContainer: {
    marginTop: 20,
    alignItems: 'center',
    marginBottom: 40,
  },
  proceedButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 12,
  },
  proceedButtonText: {
    color: '#1a1a1a',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#666',
    opacity: 0.5,
  },
  incompleteText: {
    color: '#CC3333',
    fontSize: 14,
    textAlign: 'center',
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
  modalCloseButton: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  fullScreenVideo: {
    flex: 1,
  },
});

export default ReviewScreen;