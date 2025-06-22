import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import { supabase } from "$lib/server/supabase.ts";
import * as Sentry from "@sentry/sveltekit";

export const GET: RequestHandler = async ({ params }) => {
  try {
    const { testId } = params;

    const { data: test, error } = await supabase
      .from("coding_tests")
      .select(
        `
        *,
        test_questions (
          *,
          questions (
            id,
            question_text,
            concepts,
            rubric
          )
        )
      `,
      )
      .eq("id", testId)
      .single();

    if (error) {
      return json({ error: "Test not found" }, { status: 404 });
    }

    return json({ test });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { api_route: "tests/[testId]", operation: "fetch" },
      extra: { testId: params.testId },
    });
    return json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch test",
      },
      { status: 500 },
    );
  }
};

export const PUT: RequestHandler = async ({ params, request }) => {
  try {
    const { testId } = params;
    const updateData = await request.json();

    const { data: test, error } = await supabase
      .from("coding_tests")
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", testId)
      .select()
      .single();

    if (error) {
      return json({ error: "Failed to update test" }, { status: 500 });
    }

    return json({
      success: true,
      test,
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { api_route: "tests/[testId]", operation: "update" },
      extra: { testId: params.testId },
    });
    return json(
      {
        error: error instanceof Error ? error.message : "Failed to update test",
      },
      { status: 500 },
    );
  }
};

export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const { testId } = params;


    // Get all test attempts for this test
    const { data: attempts, error: attemptsError } = await supabase
      .from("test_attempts")
      .select("id")
      .eq("test_id", testId);

    if (attemptsError) {
      return json({ error: "Failed to fetch test attempts" }, { status: 500 });
    }


    // Delete all related data in the correct order (child to parent)
    if (attempts && attempts.length > 0) {
      const attemptIds = attempts.map((a) => a.id);

      // 1. Get all answer IDs first, then delete answer history
      const { data: answers } = await supabase
        .from("test_answers")
        .select("id")
        .in("attempt_id", attemptIds);

      if (answers && answers.length > 0) {
        const answerIds = answers.map((a) => a.id);
        const { error: historyError } = await supabase
          .from("answer_history")
          .delete()
          .in("answer_id", answerIds);

        if (historyError) {
          // Continue anyway - this is not critical
        }
      }

      // 2. Delete test answers
      const { error: answersError } = await supabase
        .from("test_answers")
        .delete()
        .in("attempt_id", attemptIds);

      if (answersError) {
        return json(
          { error: "Failed to delete test answers" },
          { status: 500 },
        );
      }

      // 3. Delete test attempts
      const { error: attemptsDeleteError } = await supabase
        .from("test_attempts")
        .delete()
        .eq("test_id", testId);

      if (attemptsDeleteError) {
        return json(
          { error: "Failed to delete test attempts" },
          { status: 500 },
        );
      }

    }

    // 4. Delete test questions
    const { error: questionsError } = await supabase
      .from("test_questions")
      .delete()
      .eq("test_id", testId);

    if (questionsError) {
      return json(
        { error: "Failed to delete test questions" },
        { status: 500 },
      );
    }

    // 5. Finally delete the test itself
    const { error: testError } = await supabase
      .from("coding_tests")
      .delete()
      .eq("id", testId);

    if (testError) {
      return json({ error: "Failed to delete test" }, { status: 500 });
    }

    return json({ success: true });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { api_route: "tests/[testId]", operation: "delete" },
      extra: { testId: params.testId },
    });
    return json(
      {
        error: error instanceof Error ? error.message : "Failed to delete test",
      },
      { status: 500 },
    );
  }
};
