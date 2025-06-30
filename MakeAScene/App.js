import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { AuthProvider } from './src/contexts/AuthContext';
import { ProjectProvider } from './src/contexts/ProjectContext';
import ProjectListScreen from './screens/ProjectListScreen';
import ProjectDetailScreen from './screens/ProjectDetailScreen';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';

const Stack = createStackNavigator();

// Page Component
const Page = ({ route, navigation }) => {
  const { pageNumber, totalPages } = route.params;
  
  const goToNext = () => {
    if (pageNumber < totalPages) {
      navigation.push('Page', { pageNumber: pageNumber + 1, totalPages });
    }
  };
  
  const goToPrevious = () => {
    if (pageNumber > 1) {
      navigation.goBack();
    }
  };

  const goToFirst = () => {
    navigation.popToTop();
  };

  const goToLast = () => {
    navigation.push('Page', { pageNumber: totalPages, totalPages });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      
      <View style={styles.content}>
        <Text style={styles.pageNumber}>Page {pageNumber}</Text>
        <Text style={styles.pageTitle}>Welcome to Page {pageNumber}</Text>
        <Text style={styles.pageDescription}>
          This is page {pageNumber} of {totalPages}. You can navigate between pages using the buttons below.
        </Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, pageNumber === 1 && styles.buttonDisabled]} 
            onPress={goToPrevious}
            disabled={pageNumber === 1}
          >
            <Text style={styles.buttonText}>← Previous</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, pageNumber === totalPages && styles.buttonDisabled]} 
            onPress={goToNext}
            disabled={pageNumber === totalPages}
          >
            <Text style={styles.buttonText}>Next →</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.navContainer}>
          <TouchableOpacity style={styles.navButton} onPress={goToFirst}>
            <Text style={styles.navButtonText}>First Page</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.navButton} onPress={goToLast}>
            <Text style={styles.navButtonText}>Last Page</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>Progress: {pageNumber} / {totalPages}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(pageNumber / totalPages) * 100}%` }]} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

// Home Component
const Home = ({ navigation }) => {
  const totalPages = 12;
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      
      <View style={styles.content}>
        <Text style={styles.title}>12-Page App</Text>
        <Text style={styles.subtitle}>Simple Navigation Demo</Text>
        
        <Text style={styles.description}>
          This app demonstrates simple navigation between 12 pages. 
          You can move forward and backward through the pages.
        </Text>
        
        <TouchableOpacity 
          style={styles.startButton} 
          onPress={() => navigation.push('Page', { pageNumber: 1, totalPages })}
        >
          <Text style={styles.startButtonText}>Start Journey</Text>
        </TouchableOpacity>
        
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>Features:</Text>
          <Text style={styles.infoItem}>• Navigate between 12 pages</Text>
          <Text style={styles.infoItem}>• Forward and backward navigation</Text>
          <Text style={styles.infoItem}>• Jump to first or last page</Text>
          <Text style={styles.infoItem}>• Progress indicator</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

function RootNavigator() {
  const { user, loading } = require('./src/contexts/AuthContext').useAuth();
  if (loading) return null; // Optionally show a splash/loading screen
  return (
    <Stack.Navigator>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ProjectList" component={ProjectListScreen} options={{ title: 'Projects' }} />
          <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen} options={{ title: 'Project Details' }} />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  startButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 40,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  infoItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  pageNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  pageDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 20,
    flex: 0.45,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  navContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 40,
  },
  navButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 15,
    flex: 0.45,
  },
  navButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
    fontWeight: '600',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
});

export default function App() {
  return (
    <AuthProvider>
      <ProjectProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </ProjectProvider>
    </AuthProvider>
  );
} 