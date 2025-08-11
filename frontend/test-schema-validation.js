// Test script to validate schema parsing with sample data
import { z } from 'zod';

// Simplified reproduction of the schemas (just what we need for testing)
const baseEntitySchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});

const dashboardUserSchema = baseEntitySchema.extend({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['teacher', 'student', 'admin']),
  schoolEmail: z.string().email().optional(),
  classroomIds: z.array(z.string()).default([]),
  totalStudents: z.number().int().min(0).default(0),
  totalClassrooms: z.number().int().min(0).default(0)
});

const classroomSchema = baseEntitySchema.extend({
  teacherId: z.string(),
  name: z.string().min(1),
  section: z.string().optional(),
  description: z.string().optional(),
  externalId: z.string().optional(),
  enrollmentCode: z.string().optional(),
  alternateLink: z.string().url().optional(),
  courseState: z.enum(['ACTIVE', 'ARCHIVED', 'PROVISIONED']).default('ACTIVE'),
  studentIds: z.array(z.string()).default([]),
  assignmentIds: z.array(z.string()).default([]),
  studentCount: z.number().int().min(0).default(0),
  assignmentCount: z.number().int().min(0).default(0),
  activeSubmissions: z.number().int().min(0).default(0),
  ungradedSubmissions: z.number().int().min(0).default(0),
  assignments: z.array(z.any()).default([])
});

const recentActivitySchema = z.object({
  type: z.enum(['submission', 'grade', 'assignment']),
  timestamp: z.string(),
  details: z.record(z.unknown())
});

const teacherDashboardStatsSchema = z.object({
  totalStudents: z.number().int().min(0),
  totalAssignments: z.number().int().min(0),
  ungradedSubmissions: z.number().int().min(0),
  averageGrade: z.number().optional()
});

const teacherDashboardSchema = z.object({
  teacher: dashboardUserSchema,
  classrooms: z.array(classroomSchema),
  recentActivity: z.array(recentActivitySchema),
  stats: teacherDashboardStatsSchema
});

// Sample data that matches what the backend is returning
const sampleDashboardData = {
  teacher: {
    id: "ApEKjhJcM1cD8aTYRGC60sVwPiO2",
    email: "teacher@test.com",
    name: "teacher",
    role: "teacher",
    schoolEmail: "test.codepet@gmail.com", // This field exists
    classroomIds: [],
    totalStudents: 0,
    totalClassrooms: 0,
    createdAt: "2025-08-10T18:26:17.000Z",
    updatedAt: "2025-08-11T12:43:35.000Z"
  },
  classrooms: [
    {
      id: "classroom_737120750044",
      teacherId: "test.codepet@gmail.com",
      name: "11 CS P1",
      section: "03",
      description: undefined, // This field might be undefined
      externalId: "737120750044",
      enrollmentCode: "tajztjz",
      alternateLink: "https://classroom.example.com/placeholder",
      courseState: "ACTIVE",
      studentIds: ["student_440044938_at_gapps_yrdsb.ca"],
      assignmentIds: ["classroom_737120750044_assignment_786261061461"],
      studentCount: 26,
      assignmentCount: 20,
      activeSubmissions: 0,
      ungradedSubmissions: 0,
      createdAt: "2025-08-11T12:43:35.738Z",
      updatedAt: "2025-08-11T12:43:35.738Z",
      assignments: []
    }
  ],
  recentActivity: [
    {
      type: "submission",
      timestamp: "2025-08-11T12:43:35.957Z",
      details: {
        classroomId: "classroom_737120750044",
        classroomName: "11 CS P1",
        studentName: "Student Name",
        assignmentId: "assignment_123"
      }
    }
  ],
  stats: {
    totalStudents: 78,
    totalAssignments: 53,
    ungradedSubmissions: 0,
    averageGrade: 89.14
  }
};

// Test the validation
console.log('🧪 Testing schema validation...');

try {
  const result = teacherDashboardSchema.parse(sampleDashboardData);
  console.log('✅ Schema validation passed!');
  console.log('📊 Validated data:', {
    teacherEmail: result.teacher.email,
    teacherSchoolEmail: result.teacher.schoolEmail,
    classroomCount: result.classrooms.length,
    firstClassroomName: result.classrooms[0]?.name
  });
} catch (error) {
  console.error('❌ Schema validation failed:', error);
  if (error.issues) {
    console.error('📋 Detailed issues:');
    error.issues.forEach(issue => {
      console.error(`  - Path: ${issue.path.join('.')} | Code: ${issue.code} | Message: ${issue.message}`);
    });
  }
}

// Also test with missing optional fields (like what happens when schoolEmail was undefined during import)
console.log('\n🧪 Testing with missing optional fields...');

const sampleDataWithMissingFields = {
  ...sampleDashboardData,
  teacher: {
    ...sampleDashboardData.teacher,
    // Remove schoolEmail entirely (like what happens in Firestore when undefined is stripped)
    schoolEmail: undefined
  },
  classrooms: sampleDashboardData.classrooms.map(classroom => ({
    ...classroom,
    // Remove optional fields
    description: undefined,
    section: undefined
  }))
};

// Remove undefined fields to simulate Firestore cleaning
const cleanData = JSON.parse(JSON.stringify(sampleDataWithMissingFields, (key, value) => 
  value === undefined ? undefined : value
));

try {
  const result2 = teacherDashboardSchema.parse(cleanData);
  console.log('✅ Schema validation passed with missing fields!');
} catch (error) {
  console.error('❌ Schema validation failed with missing fields:', error);
  if (error.issues) {
    console.error('📋 Detailed issues:');
    error.issues.forEach(issue => {
      console.error(`  - Path: ${issue.path.join('.')} | Code: ${issue.code} | Message: ${issue.message} | Expected: ${issue.expected} | Received: ${issue.received}`);
    });
  }
}