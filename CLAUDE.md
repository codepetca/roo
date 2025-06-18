# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
A web application MVP for grading handwritten Java code submissions from high school students (grades 9-12) in Ontario. The system should generate coding questions, scan handwritten code via image upload, and provide AI-powered grading with detailed feedback.

# Claude Project Context

This project is a classroom-grade management and automation tool built using:

- **Svelte 5** (with SvelteKit for routing and server-side rendering)
- **TypeScript** for static typing
- **Supabase** for database, authentication, and storage
- **Supabase-generated TypeScript types** are used instead of hand-written interfaces

---

## 🎯 Goal

The app is used to manage a course for ~30–40 students across multiple schools. It helps:

- Receive and grade submissions (e.g., Google Docs, PDFs, images, videos)
- Automatically score or assist in scoring with AI and rubrics
- Provide feedback to students
- Track grades over time
- Communicate with students and guardians via email

---

## 🧱 Architecture Notes

- **Supabase** stores students, submissions, grades, rubrics, and feedback
- Supabase types are generated using:

  ```bash
  npx supabase gen types typescript --project-id <id> > src/lib/supabase-types.ts
