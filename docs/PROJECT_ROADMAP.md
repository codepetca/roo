# Project Roadmap - High-Level Overview

**Last Updated**: January 2025  
**For detailed implementation plans**, see `docs/development/detailed-roadmap.md`

## **Project Goal** 🎯

Enable teachers using restricted school accounts to easily export Google Classroom data to this webapp for AI-powered grading. Teachers log in with personal Gmail accounts, link school emails, and import classroom data to Firestore. Students access results through secure authentication.

## **Current Status** (~75% Complete)

### ✅ **Fully Implemented & Working**
- **Teacher Onboarding**: OAuth-based Google Sheet creation with automatic service account permissions
- **AppScript Integration**: Automated data extraction from Google Forms to personal sheets via board account
- **Firebase Backend**: Secure webhook-based sync from AppScript to Firestore with comprehensive API
- **AI Grading**: Gemini 1.5 Flash integration with generous grading for programming assignments
- **Teacher Authentication**: Google OAuth with personal Gmail accounts, school email linking
- **DataConnect-Ready Architecture**: Normalized entities with versioning and audit trails
- **Type Safety**: Comprehensive Zod validation and shared type system across all boundaries
- **Testing Infrastructure**: 90+ tests covering services, schemas, and business logic

### 🚧 **In Development** 
- **Teacher Dashboard**: Basic interface exists, needs complete submission management and grading UI
- **Student Authentication**: Email passcode system implemented, needs onboarding workflow completion
- **Student Portal**: Basic dashboard structure exists, needs grade display and feedback features

### ❌ **Critical Missing Components**
- **Student Onboarding Flow**: No mechanism for teachers to invite students or distribute access credentials
- **Email Integration**: Passcode distribution system not connected to email service
- **Complete Student Access**: Students can't discover/register for the system independently
- **Production Automation**: AppScript scheduling needs formal production setup and monitoring

## Development Phases

### **Phase 1: Complete Student Access System** (NEW PRIORITY - 4-6 weeks)
**Goal**: Enable students to securely access their grades through the webapp  
**Why First**: Completing the student access workflow delivers immediate value and validates the full system end-to-end

**1.1 Student Onboarding & Discovery**
- Create teacher-initiated student invitation system (`/dashboard/teacher/students/invite`)
- Build student registration landing page (`/students/join/{classroomToken}`)
- Email service integration for passcode distribution (SendGrid/AWS SES)
- Classroom roster import and management tools

**1.2 Enhanced Student Portal**
- Complete student dashboard with detailed grade history and AI feedback
- Assignment progress tracking and performance analytics
- Grade inquiry/appeal system for student-teacher communication
- Mobile-responsive design for student accessibility

**1.3 Teacher Student Management**
- Bulk student invitation workflow with email templates
- Student access management (enable/disable accounts, passcode reset)
- Student progress monitoring and engagement analytics
- Integration with existing teacher onboarding flow

### **Phase 2: Enhanced Teacher Experience** (3-4 weeks)
**Goal**: Complete the teacher grading and management workflow with advanced features

**2.1 Advanced Grading Interface**
- Manual grade override system with comprehensive audit trails
- Bulk grading operations for multiple students/assignments
- Custom rubric creation and application with AI integration
- Grade distribution analytics and class performance insights

**2.2 Classroom Management Excellence**
- Advanced student roster management with import/export capabilities
- Real-time assignment analytics and performance trend monitoring
- Optional grade posting back to Google Classroom
- Parent/guardian access controls and notification system

### **Phase 3: Production Hardening & Scale** (2-3 weeks)
**Goal**: Make system production-ready with robust automation and multi-user support

**3.1 Automation & Reliability**
- Reliable nightly AppScript scheduling with monitoring and alerting
- Comprehensive error recovery and retry mechanisms
- Performance optimization for large classrooms (100+ students)
- Advanced logging and debugging capabilities

**3.2 Enterprise Scale & Security**
- Multi-teacher support with proper permissions and data isolation
- Data retention policies and privacy compliance (FERPA/COPPA)
- Advanced security measures and comprehensive audit logging
- Backup strategies and disaster recovery procedures

### **Phase 4: Advanced Features** (Future - Long-term Vision)
**Goal**: Enhanced capabilities and institutional integration  
**Key Components**:
- Document submission grading (Google Docs/Sheets/PDFs)
- Advanced rubric-based assessment and plagiarism detection
- Learning analytics with predictive insights
- School information system integrations (Canvas, Schoology, etc.)

## System Architecture Overview

### **Complete Data Flow** (End-to-End)
```
Teacher (Personal Gmail) → OAuth → Google Sheet (_roo_data) → Share with Board Account
     ↓                              ↓                                    ↓
Board Account → Google Forms → Collect Student Data → AppScript (Nightly)
     ↓                              ↓                       ↓
AppScript Processing → Consolidate Data → Webhook → Firebase Functions
     ↓                              ↓                       ↓
Firebase → Firestore → AI Grading (Gemini) → Teacher/Student Dashboards
```

### **Authentication Architecture** 
```
Teachers: Personal Gmail (OAuth) ↔ Board Email (Linked)
Students: Email → Passcode → Firebase Auth → Role-Based Access
AppScript: Runs in Board Account → Webhook to Firebase (API Key Auth)
```

### **Key Technologies**
- **Frontend**: SvelteKit + Svelte 5 + TypeScript + TailwindCSS
- **Backend**: Firebase Functions + TypeScript + Zod validation  
- **Database**: Firestore (normalized entities) + Google Sheets (data source)
- **AI**: Google Gemini 1.5 Flash with generous grading for programming
- **Email**: SendGrid/AWS SES for student passcode distribution
- **AppScript**: Board account automation for data collection and sync

### **Current System Capabilities**
- **Complete Teacher Flow**: OAuth → Sheet Creation → AppScript → Data Sync → AI Grading
- **Partial Student Flow**: Passcode Auth → Basic Dashboard (needs completion)
- **Data Architecture**: DataConnect-ready with versioning and audit trails  
- **Type Safety**: Comprehensive Zod schemas with 90+ test coverage
- **Production Ready**: Core infrastructure stable and tested

## Development Principles

### **Quality Gates** (ALL MUST PASS)
- **Test-Driven Development**: Red-Green-Refactor cycle for all new features
- **Type Safety First**: No `any` types, comprehensive Zod validation at all boundaries
- **Schema-First Design**: API contracts drive development decisions
- **Quality Checks**: Tests + linting + type checking + build must pass before commits

### **Implementation Strategy**
1. **Student Access First**: Complete the missing student onboarding/portal (highest impact)
2. **Incremental Delivery**: Build on existing solid foundation, avoid rewrites
3. **Production Focus**: Prioritize reliability and user experience over advanced features
4. **Email Integration**: Critical missing piece for student access workflow

## **Immediate Next Steps** (Phase 1 Priority)

### **Week 1-2: Student Onboarding Foundation**
- [ ] **Email Service Integration**: Connect SendGrid/AWS SES to Firebase Functions
- [ ] **Student Invitation System**: Build teacher interface for bulk student invitations
- [ ] **Registration Landing Page**: Create `/students/join/{token}` with passcode workflow
- [ ] **Enhanced Passcode Distribution**: Email templates and delivery tracking

### **Week 3-4: Complete Student Portal**
- [ ] **Grade History Display**: Enhanced student dashboard with detailed AI feedback
- [ ] **Assignment Progress**: Visual progress tracking and performance analytics
- [ ] **Mobile Responsiveness**: Ensure student portal works well on mobile devices
- [ ] **Student-Teacher Communication**: Grade inquiry and response system

### **Week 5-6: Teacher Student Management**
- [ ] **Roster Management**: Import/export capabilities and bulk operations
- [ ] **Access Controls**: Enable/disable student accounts, reset passcodes
- [ ] **Monitoring Dashboard**: Track student engagement and progress
- [ ] **Integration Testing**: End-to-end workflow validation

### **Success Metrics for Phase 1**
- [ ] Teachers can invite entire class rosters with one-click
- [ ] Students receive passcodes via email and can self-register
- [ ] Students can view all their grades with AI feedback
- [ ] Teachers can manage student access and monitor engagement
- [ ] System handles 100+ students per teacher reliably

## **Technology Integration Notes**

### **Existing Systems to Leverage**
- **Passcode Auth**: `functions/src/routes/auth/passcode.ts` - Already implemented, needs email integration
- **Student Dashboard**: `frontend/src/routes/dashboard/student/+page.svelte` - Basic structure exists
- **Teacher Dashboard**: Core functionality present, extend with student management
- **Email Templates**: Need to create reusable templates for passcode distribution

### **New Components to Build**
- **Email Service**: Firebase Function integration with SendGrid/AWS SES
- **Student Invitation Workflow**: Teacher-initiated bulk invitation system
- **Registration Landing**: Token-based student registration with classroom linking
- **Roster Import**: CSV/Google Classroom integration for student lists

---

## **Project Completion Timeline**

**Estimated Timeline to Full Production**: 9-13 weeks
- **Phase 1** (Student Access): 4-6 weeks ← **CURRENT PRIORITY**
- **Phase 2** (Enhanced Teacher): 3-4 weeks  
- **Phase 3** (Production Hardening): 2-3 weeks

**Target Launch**: Q2 2025 for pilot teachers, Q3 2025 for full deployment

---

**For Implementation Details**: See `docs/development/detailed-roadmap.md`  
**For Architecture Information**: See `docs/development/current-architecture.md`