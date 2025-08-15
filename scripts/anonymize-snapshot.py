#!/usr/bin/env python3
"""
Anonymize classroom snapshot data for testing.
Replaces real names, emails, and student numbers with fake data.
"""

import json
import random
from pathlib import Path

# Fake first and last names for generating student names
FIRST_NAMES = [
    "Alice", "Bob", "Charlie", "Diana", "Emma", "Frank", "Grace", "Henry",
    "Isabella", "Jack", "Kate", "Liam", "Maya", "Noah", "Olivia", "Peter",
    "Quinn", "Rachel", "Sam", "Tara", "Uma", "Victor", "Wendy", "Xavier",
    "Yara", "Zoe", "Aaron", "Beth", "Colin", "Daisy", "Ethan", "Fiona",
    "George", "Hannah", "Ian", "Julia", "Kevin", "Luna", "Mike", "Nina",
    "Oscar", "Paula", "Quincy", "Rosa", "Steve", "Tina", "Ulysses", "Vera",
    "William", "Xena", "Yuki", "Zachary", "Amy", "Blake", "Chloe", "David",
    "Eva", "Felix", "Gina", "Hugo", "Iris", "Jake", "Kelly", "Leo",
    "Mia", "Nathan", "Opal", "Patrick", "Queenie", "Ryan", "Sophia", "Tom",
    "Una", "Vince", "Willow", "Xander", "Yasmin", "Zara", "Adam", "Bella"
]

LAST_NAMES = [
    "Anderson", "Brown", "Clark", "Davis", "Evans", "Foster", "Garcia", "Harris",
    "Irving", "Johnson", "King", "Lopez", "Miller", "Nelson", "O'Brien", "Parker",
    "Quinn", "Roberts", "Smith", "Taylor", "Underwood", "Valdez", "Williams", "Xavier",
    "Young", "Zhang", "Adams", "Baker", "Carter", "Dixon", "Edwards", "Fisher",
    "Green", "Hill", "Jackson", "Kumar", "Lee", "Martin", "Nguyen", "Owen",
    "Patel", "Rodriguez", "Scott", "Thompson", "Turner", "Walker", "White", "Wilson",
    "Chen", "Kim", "Singh", "Ali", "Moore", "Wright", "Hall", "Allen",
    "Torres", "Ramirez", "Flores", "Rivera", "Campbell", "Mitchell", "Gonzalez", "Perez",
    "Sanchez", "Bailey", "Murphy", "Cooper", "Richardson", "Cox", "Ward", "Peterson",
    "Bennett", "Watson", "Jenkins", "Perry", "Powell", "Long", "Patterson", "Hughes"
]

def reverse_student_number(student_number):
    """Reverse a student number string."""
    return student_number[::-1]

def generate_fake_name(index, used_names):
    """Generate a unique fake name."""
    attempts = 0
    while attempts < 100:
        first = FIRST_NAMES[index % len(FIRST_NAMES)]
        last = LAST_NAMES[(index + attempts) % len(LAST_NAMES)]
        name = f"{first} {last}"
        if name not in used_names:
            used_names.add(name)
            return name
        attempts += 1
    # Fallback: add number suffix
    return f"{first} {last}{index}"

def anonymize_json(data):
    """Anonymize the classroom snapshot JSON data."""
    
    # Track mappings for consistency
    name_mapping = {}
    student_number_mapping = {}
    student_id_mapping = {}
    used_names = set()
    
    # Pre-populate teacher mapping
    name_mapping["Stewart Chan"] = "Dev CodePet"
    name_mapping["Test Teacher"] = "Dev CodePet"  # Handle already anonymized
    
    # First pass: collect all unique names and student numbers
    def collect_identifiers(obj):
        if isinstance(obj, dict):
            # Collect teacher name
            if obj.get("email") == "stewart.chan@gapps.yrdsb.ca":
                name_mapping["Stewart Chan"] = "Dev CodePet"
            
            # Collect student data
            if "name" in obj and "email" in obj:
                email = obj["email"]
                name = obj["name"]
                
                # Check if it's a student email (9-digit@gapps.yrdsb.ca)
                if "@gapps.yrdsb.ca" in email and email.split("@")[0].isdigit():
                    student_number = email.split("@")[0]
                    if name not in name_mapping and name != "Stewart Chan":
                        # Generate fake name
                        fake_name = generate_fake_name(len(name_mapping), used_names)
                        name_mapping[name] = fake_name
                    
                    # Always map student number (even if name was already mapped)
                    if student_number not in student_number_mapping:
                        reversed_number = reverse_student_number(student_number)
                        student_number_mapping[student_number] = reversed_number
            
            # Collect submission-level student data (new fields)
            if "studentEmail" in obj and "studentName" in obj:
                email = obj["studentEmail"]
                name = obj["studentName"]
                
                # Check if it's a student email (9-digit@gapps.yrdsb.ca)
                if "@gapps.yrdsb.ca" in email and email.split("@")[0].isdigit():
                    student_number = email.split("@")[0]
                    if name not in name_mapping and name != "Stewart Chan":
                        # Generate fake name
                        fake_name = generate_fake_name(len(name_mapping), used_names)
                        name_mapping[name] = fake_name
                    
                    # Always map student number (even if name was already mapped)
                    if student_number not in student_number_mapping:
                        reversed_number = reverse_student_number(student_number)
                        student_number_mapping[student_number] = reversed_number
            
            # Also collect student emails without associated names
            if "email" in obj:
                email = obj["email"]
                if "@gapps.yrdsb.ca" in email and email.split("@")[0].isdigit():
                    student_number = email.split("@")[0]
                    if student_number not in student_number_mapping:
                        reversed_number = reverse_student_number(student_number)
                        student_number_mapping[student_number] = reversed_number
            
            # Collect student IDs
            if "studentId" in obj:
                student_id = obj["studentId"]
                if student_id not in student_id_mapping:
                    # Generate a fake student ID (keep same length)
                    fake_id = ''.join(random.choices('0123456789', k=len(student_id)))
                    student_id_mapping[student_id] = fake_id
            
            for value in obj.values():
                collect_identifiers(value)
        elif isinstance(obj, list):
            for item in obj:
                collect_identifiers(item)
    
    collect_identifiers(data)
    
    # Second pass: apply replacements
    def replace_identifiers(obj):
        if isinstance(obj, dict):
            new_obj = {}
            for key, value in obj.items():
                # Replace teacher email (including teacherEmail field)
                if key in ["email", "teacherEmail"] and value == "stewart.chan@gapps.yrdsb.ca":
                    new_obj[key] = "dev.codepet@gmail.com"
                # Replace student emails
                elif key in ["email", "studentEmail"] and "@gapps.yrdsb.ca" in str(value):
                    student_number = value.split("@")[0]
                    if student_number.isdigit():  # Only reverse if it's a student number
                        if student_number in student_number_mapping:
                            new_obj[key] = f"{student_number_mapping[student_number]}@gapps.yrdsb.ca"
                        else:
                            # Reverse it on the fly if not in mapping
                            reversed_number = reverse_student_number(student_number)
                            new_obj[key] = f"{reversed_number}@gapps.yrdsb.ca"
                    else:
                        new_obj[key] = value
                # Replace names
                elif key in ["name", "displayName", "studentName"] and isinstance(value, str) and value in name_mapping:
                    new_obj[key] = name_mapping[value]
                # Replace student IDs
                elif key == "studentId" and value in student_id_mapping:
                    new_obj[key] = student_id_mapping[value]
                # Replace Google URLs with placeholders
                elif key in ["alternateLink", "formUrl", "responseUrl", "thumbnailUrl", "photoUrl"]:
                    if "classroom.google.com" in str(value):
                        new_obj[key] = "https://classroom.example.com/placeholder"
                    elif "docs.google.com/forms" in str(value):
                        new_obj[key] = "https://forms.example.com/placeholder"
                    elif "docs.google.com/spreadsheets" in str(value):
                        new_obj[key] = "https://sheets.example.com/placeholder"
                    elif "googleusercontent.com" in str(value) or str(value).startswith("//lh"):
                        new_obj[key] = "https://cdn.example.com/placeholder.png"
                    else:
                        new_obj[key] = value
                # Fix incomplete quiz data
                elif key == "quizData" and isinstance(value, dict):
                    quiz_data = dict(value)
                    # Add required fields if missing
                    if "formId" not in quiz_data:
                        quiz_data["formId"] = f"quiz_form_{random.randint(100000, 999999)}"
                    if "formUrl" not in quiz_data:
                        quiz_data["formUrl"] = "https://forms.example.com/placeholder"
                    if "title" not in quiz_data:
                        quiz_data["title"] = "Sample Quiz"
                    if "isQuiz" not in quiz_data:
                        quiz_data["isQuiz"] = True
                    if "collectEmailAddresses" not in quiz_data:
                        quiz_data["collectEmailAddresses"] = True
                    if "allowResponseEditing" not in quiz_data:
                        quiz_data["allowResponseEditing"] = False
                    if "totalQuestions" not in quiz_data:
                        quiz_data["totalQuestions"] = len(quiz_data.get("questions", []))
                    if "totalPoints" not in quiz_data:
                        quiz_data["totalPoints"] = 100
                    if "autoGradableQuestions" not in quiz_data:
                        quiz_data["autoGradableQuestions"] = 0
                    if "manualGradingRequired" not in quiz_data:
                        quiz_data["manualGradingRequired"] = True
                    if "requireSignIn" not in quiz_data:
                        quiz_data["requireSignIn"] = True
                    new_obj[key] = quiz_data
                # Replace course group emails
                elif key == "courseGroupEmail":
                    new_obj[key] = value.replace("@gapps.yrdsb.ca", "@example.com")
                # Recursively process nested objects
                elif isinstance(value, (dict, list)):
                    new_obj[key] = replace_identifiers(value)
                else:
                    new_obj[key] = value
            
            # Add missing required fields for submissions
            if "studentEmail" in new_obj and "studentName" in new_obj:
                # This looks like a submission object, ensure required fields exist
                if "updatedAt" not in new_obj:
                    new_obj["updatedAt"] = new_obj.get("submittedAt", "2025-01-15T12:00:00.000Z")
                if "attachments" not in new_obj:
                    new_obj["attachments"] = []
                # Fix grade.gradedBy if present
                if "grade" in new_obj and isinstance(new_obj["grade"], dict):
                    if new_obj["grade"].get("gradedBy") == "teacher":
                        new_obj["grade"]["gradedBy"] = "manual"
                    
            return new_obj
        elif isinstance(obj, list):
            return [replace_identifiers(item) for item in obj]
        else:
            return obj
    
    return replace_identifiers(data)

def main():
    source_file = Path("/Users/stew/Repos/vibe/roo/frontend/e2e/fixtures/classroom-snapshot-stewart.chan-2025-08-15.json")
    output_file = Path("/Users/stew/Repos/vibe/roo/frontend/e2e/fixtures/classroom-snapshot-mock.json")
    
    print(f"Reading {source_file}...")
    with open(source_file, 'r') as f:
        data = json.load(f)
    
    print("Anonymizing data...")
    anonymized_data = anonymize_json(data)
    
    print(f"Writing anonymized data to {output_file}...")
    with open(output_file, 'w') as f:
        json.dump(anonymized_data, f, indent=2)
    
    print("✅ Anonymization complete!")
    print(f"Fresh anonymized test data is now available in {output_file}")

if __name__ == "__main__":
    main()