# Make A Scene - AI-Powered Collaborative Filmmaking App

## 🎬 Overview

Make A Scene is the world's first AI-powered interactive storytelling app that transforms anyone into a filmmaker through intelligent constraint-based storyboarding and multi-device collaborative recording. Built with React Native and Expo, it democratizes filmmaking by removing technical barriers while maintaining creative quality.

## ✨ Key Features

### 🤖 AI-Powered Content Generation
- **Auto-Generated Story Prompts**: Zero-friction story creation with 50+ templates per genre
- **Smart Storyboarding**: Constraint-based AI generates guaranteed filmable scenes
- **AI Sketch Storyboards**: Professional visual storyboards generated with DALL-E 3
- **Constraint Validation Engine**: Ensures every generated scene is actually filmable

### 📱 Multi-Device Filming Foundation
- **QR Code Device Pairing**: Seamless device discovery and connection
- **Role-Based Assignment**: Primary, secondary, and angle-specific device roles
- **Synchronized Recording**: Sub-100ms synchronization across multiple devices
- **Professional Shot Types**: Multi-angle coverage, cinematic sequences, action shots

### 🎥 Professional Recording System
- **AI-Guided Direction**: Step-by-step filming instructions with visual guides
- **Quality Assessment**: Real-time recording quality analysis and feedback
- **Multiple Take Management**: Automatic take comparison and selection
- **Professional Camera Controls**: Focus, exposure, stabilization, flash modes

### 🎭 Genre-Specific Templates
- **Horror**: Suspenseful, atmospheric scenes
- **Comedy**: Timing-based humor and physical comedy
- **Romance**: Intimate, emotional moments
- **Drama**: Character-driven, dialogue-heavy scenes
- **Action**: Dynamic, movement-based sequences
- **Mystery**: Plot-driven, investigative content

## 🛠️ Technology Stack

### Frontend (React Native + Expo SDK 49)
- **React Native**: 0.72.10 with New Architecture support
- **Expo Camera**: Professional camera controls and recording
- **React Navigation**: Screen navigation and deep linking
- **Expo Media Library**: Video storage and management

### Backend & Services
- **Supabase**: PostgreSQL database with Row Level Security
- **OpenAI GPT-4o**: Story generation and storyboarding
- **DALL-E 3**: AI sketch storyboard generation
- **Real-time Sync**: WebRTC-based multi-device coordination

### AI & Processing
- **GPT-4o**: Primary AI model for content generation
- **GPT-4o-mini**: Cost-effective for prompt processing
- **DALL-E 3**: Professional storyboard sketch generation
- **Groq/Mixtral**: Fallback for high-speed processing

## 🚀 Getting Started

### Prerequisites
- Node.js 16 or later
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator or Android Emulator
- Supabase account
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd MakeAScene
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the MakeAScene directory:
   ```env
   # Supabase Configuration
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

   # OpenAI Configuration
   EXPO_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here

   # Groq Configuration (optional)
   EXPO_PUBLIC_GROQ_API_KEY=your_groq_api_key_here

   # Runway ML Configuration (optional)
   EXPO_PUBLIC_RUNWAY_API_KEY=your_runway_api_key_here
   ```

4. **Set up Supabase database**
   Use the schema definitions from `DOCS/DDP` to create your database tables.

5. **Start the development server**
   ```bash
   npm start
   ```

6. **Run on device/simulator**
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Scan QR code with Expo Go app for physical device

## 📱 App Usage Flow

### 1. Scene Creation Workflow
1. **Constraint Configuration**: Set genre, actor count, location, experience level
2. **AI Prompt Generation**: Generate tailored scene prompts based on constraints
3. **Storyboard Creation**: Generate professional shot lists with AI sketches
4. **Multi-Device Setup**: Optional device pairing for collaborative filming

### 2. Filming Process
1. **AI-Guided Instructions**: Professional filming tips for each shot
2. **Coordinated Recording**: Synchronized recording across multiple devices
3. **Quality Assessment**: Real-time feedback on recording quality
4. **Take Management**: Multiple takes with automatic quality comparison

### 3. Multi-Device Collaboration
1. **Generate Collaboration Code**: Primary device creates shareable code
2. **Device Pairing**: Secondary devices join via QR code scanning
3. **Role Assignment**: Automatic or manual device role assignment
4. **Synchronized Action**: Coordinated countdown and recording start

## 🏗️ Architecture Overview

### Data Models
```typescript
interface Project {
  id: string;
  title: string;
  genre: Genre;
  storyboard: Shot[];
  constraints: FilmingConstraints;
  multiDeviceEnabled: boolean;
  collaborationCode?: string;
}

interface Shot {
  shotNumber: number;
  shotType: ShotType;
  description: string;
  cameraPosition: string;
  actorPositions: string;
  duration: number;
  difficulty: number;
  sketchImageUrl?: string;
}
```

### Service Architecture
- **AIService**: Handles OpenAI API calls and content generation
- **DeviceService**: Manages multi-device coordination and networking
- **RecordingService**: Controls camera, recording, and quality assessment
- **Supabase**: Database operations and real-time synchronization

## 🎯 Features Implemented from PRD

### ✅ Core Feature Set 1: Instant Content Creation Engine
- [x] Auto-Generated Story Prompts with 50+ templates per genre
- [x] Smart Storyboarding with Constraint Engine
- [x] Real-time constraint validation
- [x] Genre-specific prompt generation

### ✅ Core Feature Set 2: Visual Storyboard Revolution
- [x] AI-Generated Sketch Storyboards using DALL-E 3
- [x] Interactive storyboard display system
- [x] Professional visual storytelling format
- [x] Export-ready storyboard layouts

### ✅ Core Feature Set 3: Multi-Device Foundation
- [x] QR Code device discovery and pairing
- [x] Automatic device capability detection
- [x] Role-based device assignment system
- [x] Time synchronization for coordinated recording

### ✅ Enhanced Recording & Compilation System
- [x] Professional camera interface with AI overlays
- [x] Multi-device coordinated recording
- [x] Quality assessment and feedback system
- [x] Take management and comparison

## 💰 Monetization (Ready for Implementation)

### Pricing Tiers
- **Free**: 1 scene, basic features, single device
- **Creator ($7.99)**: 8 scenes, AI sketches, 2-device sync
- **Producer ($14.99)**: 20 scenes, all features, 4-device sync
- **Studio ($29.99)**: 50 scenes, professional tools, 6-device sync

### Cost Analysis (2025 Pricing)
- Scene Generation: ~$0.25 per scene (AI costs)
- Video Processing: ~$0.40 per scene (if using Runway ML)
- Target Margins: 85-90% on paid tiers

## 🎨 Design Philosophy

### Cinematic First
Every interface element feels like professional filmmaking tools while remaining accessible to beginners.

### Progressive Disclosure
Advanced features unlock as users gain experience, preventing overwhelming new users.

### Social by Default
Optimized for group activities and collaborative creation rather than solo content.

### Guided Discovery
Users never feel lost - AI provides direction and professional tips at every step.

## 🔧 Development Roadmap

### Phase 1: MVP Foundation (Completed)
- ✅ Auto-generated prompts
- ✅ AI sketch storyboards
- ✅ Multi-device foundation
- ✅ Basic recording system

### Phase 2: Enhanced Features (Future)
- [ ] Advanced multi-device shot types
- [ ] Professional editing pipeline
- [ ] Social sharing and community features
- [ ] Advanced AI director mode

### Phase 3: Scale & Platform (Future)
- [ ] International localization
- [ ] Professional creator tools
- [ ] Platform monetization features
- [ ] Advanced analytics and insights

## 📊 Success Metrics

### User Acquisition
- Target: 100K downloads in first 6 months
- Onboarding completion: >80%
- First scene creation: >70% within 24 hours

### Engagement
- Daily Active Users: 25% of monthly users
- Session Duration: Average 15 minutes
- Scenes per User: 3+ scenes per month

### Business
- Free-to-paid conversion: 8%
- Monthly Recurring Revenue: $50K by month 12
- Customer Lifetime Value: $35 average

## 🔒 Privacy & Security

### Data Protection
- Row Level Security (RLS) in Supabase
- End-to-end encryption for sensitive data
- GDPR and CCPA compliant
- User data export and deletion capabilities

### Content Safety
- OpenAI content moderation
- Age-appropriate content filtering
- Community guidelines enforcement
- Parental controls for family accounts

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines for details on:
- Code style and standards
- Testing requirements
- Pull request process
- Issue reporting

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Documentation**: Check the `/DOCS` folder for detailed specifications
- **Issues**: Report bugs via GitHub Issues
- **Discord**: Join our developer community
- **Email**: support@makeascene.app

## 🎬 Demo & Examples

Visit our demo videos and example scenes to see Make A Scene in action:
- Single-device horror scene creation
- Multi-device romantic comedy filming
- Professional drama storyboarding
- Family-friendly collaborative creation

---

**Make A Scene** - Transforming anyone into a filmmaker through AI-powered collaborative storytelling.

*Built with ❤️ using React Native, Expo, Supabase, and OpenAI*
