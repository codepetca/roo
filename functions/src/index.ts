import {onRequest} from "firebase-functions/v2/https";
import {logger} from "firebase-functions";

export const api = onRequest({cors: true}, (request, response) => {
  logger.info("Roo API function called", {
    method: request.method,
    path: request.path,
    structuredData: true
  });
  
  response.json({
    message: "Roo auto-grading system API",
    timestamp: new Date().toISOString(),
    status: "active",
    version: "1.0.0"
  });
});