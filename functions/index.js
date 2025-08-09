/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { setGlobalOptions } = require("firebase-functions/v2/options");
const { onCall } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 1 });

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

exports.helloWorld = onCall((request) => {
  logger.info("helloWorld called", { uid: request.auth?.uid ?? null });
  return { message: "Hello from Firebase!", nonce: Math.random() };
});

/*exports.generateTask = onCall(async (file, prompt) => {
  const { file, prompt } = input;
  console.log(file);
  if (!file && !prompt) {
    return {
      response: 'Please provide a prompt',
      //subtasks: [],
    };
  }

  //This is the JSON part
  const imagePart = file ? await file.text() : '';

  try {
    const result = await this.experimentModel.generateContent(
      [prompt, imagePart].filter(Boolean)
    );
    const response = await result.response.text();
    console.log(response);
    return JSON.parse(response);
  } catch (error) {
    this.handleError(error, 'Failed to generate subtasks');
    throw error;
  }})*/