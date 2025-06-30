import { v4 as uuidv4 } from 'uuid';
import * as FileSystem from 'expo-file-system';

// Multi-Device Foundation (Week 6-8 Feature)
class DeviceService {
  constructor() {
    this.deviceId = uuidv4();
    this.isInitialized = false;
    this.connectedDevices = new Map();
    this.deviceRole = 'primary'; // primary, secondary, angle_1, angle_2, etc.
    this.sessionId = null;
    this.syncTimeOffset = 0;
    this.networkConnection = null;
    this.collaborationCode = null;
  }

  // Initialize device service
  async initialize() {
    try {
      // Detect device capabilities
      await this.detectDeviceCapabilities();
      
      // Setup networking
      this.setupNetworking();
      
      this.isInitialized = true;
      console.log('DeviceService initialized:', this.deviceId);
      
      return { success: true, deviceId: this.deviceId };
    } catch (error) {
      console.error('DeviceService initialization failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Device Capability Detection
  async detectDeviceCapabilities() {
    // This would be expanded with actual device detection
    this.capabilities = {
      hasCamera: true,
      hasMultipleCameras: true, // Front/back
      supportsHD: true,
      supports4K: false, // Detected based on device
      hasLidar: false,
      supportsProRAW: false,
      maxVideoResolution: '1080p',
      storageAvailable: 1000, // MB
      networkType: 'WiFi', // 5G, 4G, WiFi
      batteryLevel: 100,
      memoryAvailable: 2048 // MB
    };

    return this.capabilities;
  }

  // QR Code Generation for Device Pairing
  generateCollaborationCode() {
    this.collaborationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.sessionId = uuidv4();
    
    const pairingData = {
      code: this.collaborationCode,
      sessionId: this.sessionId,
      hostDeviceId: this.deviceId,
      hostCapabilities: this.capabilities,
      timestamp: Date.now()
    };

    return {
      collaborationCode: this.collaborationCode,
      qrData: JSON.stringify(pairingData),
      sessionId: this.sessionId
    };
  }

  // Join existing session via QR code
  async joinSession(qrData) {
    try {
      const pairingData = JSON.parse(qrData);
      
      // Validate pairing data
      if (!pairingData.code || !pairingData.sessionId) {
        throw new Error('Invalid collaboration code');
      }

      // Check if session is still valid (within 5 minutes)
      const timeElapsed = Date.now() - pairingData.timestamp;
      if (timeElapsed > 300000) { // 5 minutes
        throw new Error('Collaboration code expired');
      }

      this.sessionId = pairingData.sessionId;
      this.collaborationCode = pairingData.code;
      
      // Connect to host device
      await this.connectToHost(pairingData.hostDeviceId);
      
      return {
        success: true,
        sessionId: this.sessionId,
        hostDeviceId: pairingData.hostDeviceId
      };
    } catch (error) {
      console.error('Failed to join session:', error);
      return { success: false, error: error.message };
    }
  }

  // Device Role Assignment
  assignDeviceRole(role, deviceId = this.deviceId) {
    const validRoles = ['primary', 'secondary', 'angle_1', 'angle_2', 'angle_3', 'angle_4'];
    
    if (!validRoles.includes(role)) {
      throw new Error(`Invalid device role: ${role}`);
    }

    if (deviceId === this.deviceId) {
      this.deviceRole = role;
    }

    const assignment = {
      deviceId,
      role,
      timestamp: Date.now(),
      assignedBy: this.deviceId
    };

    // Broadcast role assignment to all connected devices
    this.broadcastToDevices('role_assignment', assignment);

    return assignment;
  }

  // Auto-assign roles based on device capabilities
  autoAssignRoles() {
    const devices = Array.from(this.connectedDevices.values());
    devices.push({ deviceId: this.deviceId, capabilities: this.capabilities });

    // Sort by capabilities (better cameras get primary roles)
    devices.sort((a, b) => {
      const scoreA = this.calculateDeviceScore(a.capabilities);
      const scoreB = this.calculateDeviceScore(b.capabilities);
      return scoreB - scoreA;
    });

    const assignments = devices.map((device, index) => {
      const roles = ['primary', 'secondary', 'angle_1', 'angle_2', 'angle_3', 'angle_4'];
      const role = roles[index] || `angle_${index}`;
      
      if (device.deviceId === this.deviceId) {
        this.deviceRole = role;
      }

      return {
        deviceId: device.deviceId,
        role,
        score: this.calculateDeviceScore(device.capabilities)
      };
    });

    // Broadcast assignments to all devices
    this.broadcastToDevices('auto_role_assignment', assignments);

    return assignments;
  }

  // Calculate device capability score for role assignment
  calculateDeviceScore(capabilities) {
    let score = 0;
    
    if (capabilities.supports4K) score += 50;
    if (capabilities.supportsProRAW) score += 30;
    if (capabilities.hasLidar) score += 20;
    if (capabilities.maxVideoResolution === '1080p') score += 10;
    if (capabilities.networkType === '5G') score += 15;
    if (capabilities.batteryLevel > 50) score += 10;
    
    score += capabilities.storageAvailable / 100; // Storage in GB
    score += capabilities.memoryAvailable / 100; // Memory in MB
    
    return score;
  }

  // Time Synchronization for coordinated recording
  async synchronizeTime() {
    const startTime = Date.now();
    
    // Send ping to all devices
    const pings = Array.from(this.connectedDevices.keys()).map(async (deviceId) => {
      const pingStart = Date.now();
      await this.sendToDevice(deviceId, 'ping', { timestamp: pingStart });
      const pingEnd = Date.now();
      const roundTripTime = pingEnd - pingStart;
      
      return { deviceId, roundTripTime };
    });

    const results = await Promise.all(pings);
    
    // Calculate average latency
    const avgLatency = results.reduce((sum, r) => sum + r.roundTripTime, 0) / results.length;
    this.syncTimeOffset = avgLatency / 2; // Half round-trip time
    
    console.log('Time synchronization complete:', {
      avgLatency: avgLatency + 'ms',
      syncOffset: this.syncTimeOffset + 'ms'
    });

    return {
      avgLatency,
      syncOffset: this.syncTimeOffset,
      connectedDevices: results.length
    };
  }

  // Coordinated Recording Start
  async startCoordinatedRecording(countdown = 3) {
    if (this.deviceRole !== 'primary') {
      throw new Error('Only primary device can start coordinated recording');
    }

    const recordingId = uuidv4();
    const startTimestamp = Date.now() + (countdown * 1000) + this.syncTimeOffset;

    const recordingCommand = {
      recordingId,
      startTimestamp,
      countdown,
      command: 'start_recording'
    };

    // Send to all connected devices
    this.broadcastToDevices('coordinated_recording', recordingCommand);

    // Return countdown for UI
    return {
      recordingId,
      startTimestamp,
      countdown,
      connectedDevices: this.connectedDevices.size
    };
  }

  // Stop coordinated recording
  async stopCoordinatedRecording(recordingId) {
    if (this.deviceRole !== 'primary') {
      throw new Error('Only primary device can stop coordinated recording');
    }

    const stopCommand = {
      recordingId,
      stopTimestamp: Date.now(),
      command: 'stop_recording'
    };

    this.broadcastToDevices('coordinated_recording', stopCommand);

    return stopCommand;
  }

  // Network Setup (WebRTC simulation)
  setupNetworking() {
    // In a real implementation, this would setup WebRTC peer connections
    // For now, we'll simulate with local state management
    this.networkConnection = {
      status: 'connected',
      quality: 'excellent',
      latency: 25, // ms
      bandwidth: 100 // Mbps
    };
  }

  // Connect to host device
  async connectToHost(hostDeviceId) {
    // Simulate connection establishment
    return new Promise((resolve) => {
      setTimeout(() => {
        this.connectedDevices.set(hostDeviceId, {
          deviceId: hostDeviceId,
          role: 'primary',
          capabilities: {},
          connectionQuality: 'excellent',
          lastPing: Date.now()
        });
        
        resolve({ success: true, hostDeviceId });
      }, 1000);
    });
  }

  // Send message to specific device
  async sendToDevice(deviceId, type, data) {
    // Simulate network communication
    console.log(`Sending ${type} to ${deviceId}:`, data);
    
    // In real implementation, this would use WebRTC data channels
    return { success: true, deviceId, type, data };
  }

  // Broadcast to all connected devices
  broadcastToDevices(type, data) {
    const connectedDeviceIds = Array.from(this.connectedDevices.keys());
    
    console.log(`Broadcasting ${type} to ${connectedDeviceIds.length} devices:`, data);
    
    return connectedDeviceIds.map(deviceId => 
      this.sendToDevice(deviceId, type, data)
    );
  }

  // Get connected devices status
  getDevicesStatus() {
    const devices = Array.from(this.connectedDevices.values());
    
    return {
      totalDevices: devices.length + 1, // Include self
      primaryDevice: this.deviceRole === 'primary' ? this.deviceId : null,
      devices: [
        {
          deviceId: this.deviceId,
          role: this.deviceRole,
          capabilities: this.capabilities,
          isLocal: true
        },
        ...devices
      ]
    };
  }

  // Handle device disconnection
  handleDeviceDisconnection(deviceId) {
    if (this.connectedDevices.has(deviceId)) {
      const device = this.connectedDevices.get(deviceId);
      this.connectedDevices.delete(deviceId);
      
      console.log(`Device disconnected: ${deviceId} (${device.role})`);
      
      // If primary device disconnected, reassign roles
      if (device.role === 'primary' && this.connectedDevices.size > 0) {
        this.autoAssignRoles();
      }

      return { deviceId, role: device.role, disconnected: true };
    }
  }

  // Cleanup and disconnect
  async disconnect() {
    // Notify all devices of disconnection
    this.broadcastToDevices('device_disconnecting', { deviceId: this.deviceId });
    
    // Clear connections
    this.connectedDevices.clear();
    this.sessionId = null;
    this.collaborationCode = null;
    
    console.log('DeviceService disconnected');
    
    return { success: true };
  }

  // Device status monitoring
  startStatusMonitoring() {
    this.statusInterval = setInterval(() => {
      // Update device capabilities
      this.detectDeviceCapabilities();
      
      // Check connection quality
      this.checkConnectionQuality();
      
      // Ping connected devices
      if (this.connectedDevices.size > 0) {
        this.pingConnectedDevices();
      }
    }, 5000); // Every 5 seconds
  }

  stopStatusMonitoring() {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }
  }

  // Check network connection quality
  checkConnectionQuality() {
    // Simulate network quality assessment
    const qualities = ['excellent', 'good', 'fair', 'poor'];
    const randomQuality = qualities[Math.floor(Math.random() * qualities.length)];
    
    if (this.networkConnection) {
      this.networkConnection.quality = randomQuality;
      this.networkConnection.latency = randomQuality === 'excellent' ? 25 : 
                                       randomQuality === 'good' ? 50 : 
                                       randomQuality === 'fair' ? 100 : 200;
    }
  }

  // Ping connected devices to check health
  async pingConnectedDevices() {
    const deviceIds = Array.from(this.connectedDevices.keys());
    
    for (const deviceId of deviceIds) {
      try {
        await this.sendToDevice(deviceId, 'ping', { timestamp: Date.now() });
        
        // Update last ping time
        const device = this.connectedDevices.get(deviceId);
        if (device) {
          device.lastPing = Date.now();
        }
      } catch (error) {
        console.error(`Failed to ping device ${deviceId}:`, error);
        this.handleDeviceDisconnection(deviceId);
      }
    }
  }
}

// Export singleton instance
export const deviceService = new DeviceService();

export default DeviceService;