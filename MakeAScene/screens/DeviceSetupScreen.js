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
  Dimensions,
  Modal
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Camera } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { deviceService } from '../lib/multiDevice/deviceService';

const { width: screenWidth } = Dimensions.get('window');

const DeviceSetupScreen = ({ route, navigation }) => {
  const { projectId, storyboard, constraints } = route.params;
  
  // Multi-device state
  const [deviceRole, setDeviceRole] = useState('primary'); // 'primary' or 'secondary'
  const [collaborationCode, setCollaborationCode] = useState(null);
  const [connectedDevices, setConnectedDevices] = useState([]);
  const [isHost, setIsHost] = useState(true);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  
  // QR Code scanning
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [cameraPermission, setCameraPermission] = useState(null);
  
  // Device capabilities
  const [deviceCapabilities, setDeviceCapabilities] = useState(null);
  
  useEffect(() => {
    initializeDeviceService();
    detectDeviceCapabilities();
    
    return () => {
      deviceService.disconnect();
    };
  }, []);

  const initializeDeviceService = async () => {
    try {
      setLoading(true);
      await deviceService.initialize();
      
      // Set up event listeners
      deviceService.onDeviceConnected((device) => {
        setConnectedDevices(prev => [...prev, device]);
        Alert.alert('Device Connected', `${device.name} has joined the session`);
      });
      
      deviceService.onDeviceDisconnected((deviceId) => {
        setConnectedDevices(prev => prev.filter(d => d.id !== deviceId));
        Alert.alert('Device Disconnected', 'A device has left the session');
      });
      
      deviceService.onConnectionStatusChanged((status) => {
        setConnectionStatus(status);
      });
      
    } catch (error) {
      Alert.alert('Setup Error', 'Failed to initialize device service: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const detectDeviceCapabilities = async () => {
    try {
      const capabilities = await deviceService.detectCapabilities();
      setDeviceCapabilities(capabilities);
    } catch (error) {
      console.warn('Failed to detect device capabilities:', error);
    }
  };

  const createSession = async () => {
    setLoading(true);
    try {
      const session = await deviceService.createSession(projectId, storyboard);
      if (session.success) {
        setCollaborationCode(session.collaborationCode);
        setIsHost(true);
        setDeviceRole('primary');
        setConnectionStatus('hosting');
      } else {
        throw new Error(session.error);
      }
    } catch (error) {
      Alert.alert('Session Error', 'Failed to create session: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const joinSession = async (code) => {
    setLoading(true);
    try {
      const result = await deviceService.joinSession(code);
      if (result.success) {
        setCollaborationCode(code);
        setIsHost(false);
        setDeviceRole('secondary');
        setConnectionStatus('connected');
        setConnectedDevices(result.connectedDevices || []);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      Alert.alert('Join Error', 'Failed to join session: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setCameraPermission(status === 'granted');
    return status === 'granted';
  };

  const openQRScanner = async () => {
    const hasPermission = await requestCameraPermission();
    if (hasPermission) {
      setShowQRScanner(true);
    } else {
      Alert.alert('Permission Required', 'Camera permission is required to scan QR codes.');
    }
  };

  const handleQRCodeScanned = ({ data }) => {
    setShowQRScanner(false);
    
    try {
      const sessionData = JSON.parse(data);
      if (sessionData.type === 'makeascene_session') {
        joinSession(sessionData.code);
      } else {
        Alert.alert('Invalid QR Code', 'This QR code is not for Make A Scene.');
      }
    } catch (error) {
      Alert.alert('Invalid QR Code', 'Could not read the QR code.');
    }
  };

  const assignDeviceRole = (deviceId, role) => {
    Alert.alert(
      'Assign Role',
      `Assign ${role} role to this device?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Assign',
          onPress: async () => {
            try {
              await deviceService.assignRole(deviceId, role);
              setConnectedDevices(prev => 
                prev.map(device => 
                  device.id === deviceId ? { ...device, role } : device
                )
              );
            } catch (error) {
              Alert.alert('Role Assignment Error', error.message);
            }
          }
        }
      ]
    );
  };

  const startFilming = () => {
    if (connectedDevices.length === 0 && !isHost) {
      Alert.alert('Connection Required', 'Please connect to at least one other device before filming.');
      return;
    }

    // Navigate to filming screen with multi-device setup
    navigation.navigate('FilmingScreen', {
      projectId,
      storyboard,
      multiDeviceEnabled: true,
      deviceRole,
      connectedDevices,
      collaborationCode,
      isHost
    });
  };

  const skipMultiDevice = () => {
    // Navigate directly to single-device filming
    navigation.navigate('FilmingScreen', {
      projectId,
      storyboard,
      multiDeviceEnabled: false,
      deviceRole: 'primary'
    });
  };

  const renderDeviceCapabilities = () => {
    if (!deviceCapabilities) return null;

    return (
      <View style={styles.capabilitiesContainer}>
        <Text style={styles.capabilitiesTitle}>📱 Device Capabilities</Text>
        <View style={styles.capabilityRow}>
          <Text style={styles.capabilityLabel}>Model:</Text>
          <Text style={styles.capabilityValue}>{deviceCapabilities.model || 'Unknown'}</Text>
        </View>
        <View style={styles.capabilityRow}>
          <Text style={styles.capabilityLabel}>Cameras:</Text>
          <Text style={styles.capabilityValue}>{deviceCapabilities.cameras?.length || 0} cameras</Text>
        </View>
        <View style={styles.capabilityRow}>
          <Text style={styles.capabilityLabel}>Max Resolution:</Text>
          <Text style={styles.capabilityValue}>{deviceCapabilities.maxVideoResolution || '1080p'}</Text>
        </View>
        <View style={styles.capabilityRow}>
          <Text style={styles.capabilityLabel}>Storage Available:</Text>
          <Text style={styles.capabilityValue}>{deviceCapabilities.storageAvailable || 'Unknown'} GB</Text>
        </View>
      </View>
    );
  };

  const renderConnectionStatus = () => {
    const statusColors = {
      disconnected: '#666',
      connecting: '#FFD700',
      hosting: '#00CC44',
      connected: '#00CC44',
      error: '#CC3333'
    };

    const statusTexts = {
      disconnected: 'Not Connected',
      connecting: 'Connecting...',
      hosting: 'Hosting Session',
      connected: 'Connected to Session',
      error: 'Connection Error'
    };

    return (
      <View style={styles.statusContainer}>
        <View style={[styles.statusIndicator, { backgroundColor: statusColors[connectionStatus] }]} />
        <Text style={styles.statusText}>{statusTexts[connectionStatus]}</Text>
      </View>
    );
  };

  const renderQRCode = () => {
    if (!collaborationCode) return null;

    const qrData = JSON.stringify({
      type: 'makeascene_session',
      code: collaborationCode,
      projectId: projectId
    });

    return (
      <View style={styles.qrContainer}>
        <Text style={styles.qrTitle}>📷 Scan to Join Session</Text>
        <View style={styles.qrCodeWrapper}>
          <QRCode
            value={qrData}
            size={200}
            backgroundColor="white"
            color="black"
          />
        </View>
        <Text style={styles.collaborationCodeText}>Code: {collaborationCode}</Text>
      </View>
    );
  };

  const renderConnectedDevices = () => {
    if (connectedDevices.length === 0) return null;

    return (
      <View style={styles.devicesContainer}>
        <Text style={styles.devicesTitle}>🔗 Connected Devices ({connectedDevices.length})</Text>
        {connectedDevices.map((device, index) => (
          <View key={device.id} style={styles.deviceCard}>
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceName}>{device.name || `Device ${index + 1}`}</Text>
              <Text style={styles.deviceRole}>{device.role || 'Unassigned'}</Text>
              <Text style={styles.deviceModel}>{device.model || 'Unknown Model'}</Text>
            </View>
            
            {isHost && (
              <View style={styles.deviceActions}>
                <TouchableOpacity
                  style={styles.roleButton}
                  onPress={() => assignDeviceRole(device.id, 'camera_operator')}
                >
                  <Text style={styles.roleButtonText}>📹 Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.roleButton}
                  onPress={() => assignDeviceRole(device.id, 'angle_2')}
                >
                  <Text style={styles.roleButtonText}>📐 Angle 2</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderQRScanner = () => (
    <Modal visible={showQRScanner} animationType="slide">
      <SafeAreaView style={styles.scannerContainer}>
        <View style={styles.scannerHeader}>
          <TouchableOpacity onPress={() => setShowQRScanner(false)}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.scannerTitle}>Scan QR Code</Text>
          <View style={{ width: 60 }} />
        </View>
        
        <BarCodeScanner
          onBarCodeScanned={handleQRCodeScanned}
          style={styles.scanner}
        />
        
        <View style={styles.scannerOverlay}>
          <Text style={styles.scannerInstructions}>
            Point your camera at the QR code displayed on the host device
          </Text>
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
        <Text style={styles.headerTitle}>Device Setup</Text>
        <TouchableOpacity onPress={skipMultiDevice}>
          <Text style={styles.skipButton}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>📱 Multi-Device Filming</Text>
          <Text style={styles.sectionDescription}>
            Connect multiple devices to capture professional multi-angle shots. 
            One device will be the primary director, while others serve as additional cameras.
          </Text>
        </View>

        {renderConnectionStatus()}
        {renderDeviceCapabilities()}

        {connectionStatus === 'disconnected' && (
          <View style={styles.setupOptions}>
            <Text style={styles.optionsTitle}>Choose Your Setup</Text>
            
            <TouchableOpacity 
              style={styles.setupButton}
              onPress={createSession}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#1a1a1a" />
              ) : (
                <>
                  <Text style={styles.setupButtonIcon}>🎬</Text>
                  <View style={styles.setupButtonContent}>
                    <Text style={styles.setupButtonTitle}>Create Session (Host)</Text>
                    <Text style={styles.setupButtonDescription}>
                      Start a new multi-device session and invite others to join
                    </Text>
                  </View>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.setupButton}
              onPress={openQRScanner}
              disabled={loading}
            >
              <Text style={styles.setupButtonIcon}>📱</Text>
              <View style={styles.setupButtonContent}>
                <Text style={styles.setupButtonTitle}>Join Session</Text>
                <Text style={styles.setupButtonDescription}>
                  Scan a QR code to join an existing filming session
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {collaborationCode && renderQRCode()}
        {renderConnectedDevices()}

        {(connectionStatus === 'hosting' || connectionStatus === 'connected') && (
          <View style={styles.filmingActions}>
            <TouchableOpacity 
              style={styles.startFilmingButton}
              onPress={startFilming}
            >
              <Text style={styles.startFilmingButtonText}>
                🎬 Start Multi-Device Filming
              </Text>
            </TouchableOpacity>
            
            <Text style={styles.readyText}>
              {isHost 
                ? `Ready to film with ${connectedDevices.length + 1} device${connectedDevices.length > 0 ? 's' : ''}`
                : 'Connected and ready to film'
              }
            </Text>
          </View>
        )}

        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>💡 Tips for Multi-Device Filming</Text>
          <Text style={styles.helpText}>• Keep all devices on the same WiFi network</Text>
          <Text style={styles.helpText}>• Position devices at different angles for best coverage</Text>
          <Text style={styles.helpText}>• The host device controls recording start/stop</Text>
          <Text style={styles.helpText}>• Make sure all devices have enough battery and storage</Text>
        </View>
      </ScrollView>

      {renderQRScanner()}
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
  skipButton: {
    color: '#999',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoSection: {
    backgroundColor: '#2a2a2a',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  sectionDescription: {
    color: '#CCCCCC',
    fontSize: 16,
    lineHeight: 22,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  capabilitiesContainer: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  capabilitiesTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  capabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  capabilityLabel: {
    color: '#CCCCCC',
    fontSize: 14,
  },
  capabilityValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  setupOptions: {
    marginBottom: 20,
  },
  optionsTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  setupButton: {
    backgroundColor: '#FFD700',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  setupButtonIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  setupButtonContent: {
    flex: 1,
  },
  setupButtonTitle: {
    color: '#1a1a1a',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  setupButtonDescription: {
    color: '#333',
    fontSize: 14,
    lineHeight: 18,
  },
  qrContainer: {
    backgroundColor: '#2a2a2a',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  qrTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  qrCodeWrapper: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  collaborationCodeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  devicesContainer: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  devicesTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  deviceCard: {
    backgroundColor: '#333',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  deviceRole: {
    color: '#FFD700',
    fontSize: 14,
    marginBottom: 2,
  },
  deviceModel: {
    color: '#CCCCCC',
    fontSize: 12,
  },
  deviceActions: {
    flexDirection: 'row',
  },
  roleButton: {
    backgroundColor: '#555',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  roleButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  filmingActions: {
    alignItems: 'center',
    marginBottom: 20,
  },
  startFilmingButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 12,
  },
  startFilmingButtonText: {
    color: '#1a1a1a',
    fontSize: 18,
    fontWeight: 'bold',
  },
  readyText: {
    color: '#CCCCCC',
    fontSize: 16,
    textAlign: 'center',
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
  // QR Scanner Styles
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#1a1a1a',
  },
  cancelButton: {
    color: '#FFD700',
    fontSize: 16,
  },
  scannerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scanner: {
    flex: 1,
  },
  scannerOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 20,
    borderRadius: 12,
  },
  scannerInstructions: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default DeviceSetupScreen;