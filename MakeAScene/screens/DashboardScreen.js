import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useAuth } from '../src/contexts/AuthContext';
import { useProject } from '../src/contexts/ProjectContext';

const DashboardScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { projects } = useProject();

  const recentProjects = projects ? projects.slice(0, 3) : [];

  const handleCreateNewScene = () => {
    navigation.navigate('CreateScene');
  };

  const handleViewAllProjects = () => {
    navigation.navigate('ProjectList');
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.gradient}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.header}>
            <Text style={styles.welcomeText}>Welcome to the</Text>
            <Text style={styles.directorText}>Director's Chair</Text>
            <Text style={styles.userText}>Hello, {user?.email || 'Director'}</Text>
          </View>

          <View style={styles.creditsContainer}>
            <Text style={styles.creditsLabel}>Credit Balance</Text>
            <Text style={styles.creditsAmount}>$25.00</Text>
            <Text style={styles.creditsSubtext}>Premium User</Text>
          </View>

          <View style={styles.quickActionsContainer}>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={handleCreateNewScene}
            >
              <Text style={styles.primaryButtonText}>🎬 Create New Scene</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={handleViewAllProjects}
            >
              <Text style={styles.secondaryButtonText}>📋 View All Projects</Text>
            </TouchableOpacity>
          </View>

          {recentProjects.length > 0 && (
            <View style={styles.recentProjectsContainer}>
              <Text style={styles.sectionTitle}>Recent Projects</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carousel}>
                {recentProjects.map((project, index) => (
                  <TouchableOpacity 
                    key={project.id}
                    style={styles.projectCard}
                    onPress={() => navigation.navigate('ProjectDetail', { projectId: project.id })}
                  >
                    <Text style={styles.projectTitle}>{project.title}</Text>
                    <Text style={styles.projectDesc}>{project.description || 'No description'}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {recentProjects.length === 0 && (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>🎭</Text>
              <Text style={styles.emptyStateTitle}>No Projects Yet</Text>
              <Text style={styles.emptyStateDescription}>
                Start your filmmaking journey by creating your first scene!
              </Text>
            </View>
          )}

          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    backgroundColor: '#8B0000',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  welcomeText: {
    fontSize: 18,
    color: '#FFD700',
    textAlign: 'center',
    fontWeight: '300',
  },
  directorText: {
    fontSize: 32,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: 'bold',
    marginTop: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  userText: {
    fontSize: 16,
    color: '#FFD700',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  creditsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
    marginBottom: 30,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  creditsLabel: {
    fontSize: 14,
    color: '#FFD700',
    marginBottom: 5,
  },
  creditsAmount: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  creditsSubtext: {
    fontSize: 12,
    color: '#FFD700',
    marginTop: 5,
  },
  quickActionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  primaryButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#8B0000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  recentProjectsContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    color: '#FFD700',
    fontWeight: 'bold',
    marginBottom: 15,
    marginLeft: 20,
  },
  carousel: {
    paddingLeft: 20,
  },
  projectCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    width: 200,
    padding: 15,
    marginRight: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  projectTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  projectDesc: {
    fontSize: 14,
    color: '#FFD700',
    lineHeight: 20,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 48,
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 24,
    color: '#FFD700',
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
  },
  logoutButton: {
    marginHorizontal: 20,
    marginBottom: 30,
    paddingVertical: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#FFD700',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});

export default DashboardScreen;