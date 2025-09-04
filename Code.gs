/**
 * Test which IDs are accessible in Google Classroom via Apps Script.
 */
function testClassroomIds() {
  Logger.log("=== ACTIVE USER ===");
  Logger.log("Login Email: " + Session.getActiveUser().getEmail());

  try {
    // People API call to get your own immutable userId
    const me = People.People.get("people/me", {
      personFields: "names,emailAddresses"
    });
    Logger.log("People API userId: " + me.resourceName); // e.g. "people/11234567890"
    Logger.log("People API email: " + (me.emailAddresses && me.emailAddresses[0] ? me.emailAddresses[0].value : "N/A"));
  } catch (err) {
    Logger.log("People API not enabled or permissions blocked: " + err);
  }

  Logger.log("=== COURSES ===");
  const courses = Classroom.Courses.list({ teacherId: "me" }).courses || [];
  for (const course of courses) {
    Logger.log("Course: " + course.name + " | courseId=" + course.id);

    // --- Students ---
    try {
      const students = Classroom.Courses.Students.list(course.id).students || [];
      for (const s of students) {
        Logger.log(" Student: " + s.profile.name.fullName + " | userId=" + s.userId + " | email=" + s.profile.emailAddress);
      }
    } catch (err) {
      Logger.log("  Cannot list students: " + err);
    }

    // --- Assignments ---
    try {
      const work = Classroom.Courses.CourseWork.list(course.id).courseWork || [];
      for (const w of work) {
        Logger.log(" Assignment: " + w.title + " | courseWorkId=" + w.id);

        // --- Submissions ---
        try {
          const submissions = Classroom.Courses.CourseWork.StudentSubmissions.list(course.id, w.id).studentSubmissions || [];
          for (const sub of submissions) {
            Logger.log("   Submission: submissionId=" + sub.id + " | userId=" + sub.userId);
          }
        } catch (err) {
          Logger.log("   Cannot list submissions: " + err);
        }
      }
    } catch (err) {
      Logger.log("  Cannot list coursework: " + err);
    }
  }
}