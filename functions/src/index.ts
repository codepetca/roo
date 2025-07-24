import {onRequest} from "firebase-functions/v2/https";
import {logger} from "firebase-functions";

export const helloWorld = onRequest((request, response) => {
  logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});

export const testRoo = onRequest((request, response) => {
  const message = "Roo auto-grading system is alive!";
  logger.info("Roo test function called", {structuredData: true});
  
  response.json({
    message,
    timestamp: new Date().toISOString(),
    status: "success"
  });
});