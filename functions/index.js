/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as logger from "firebase-functions/logger";
import fs from 'node:fs';
import path from 'node:path';
import "@angular/compiler";
import { onCall, onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2/options";
import { inject, Injectable } from "@angular/core";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getApp, initializeApp } from "firebase/app";
import {
  collection,
  getDocs,
  getFirestore,
  doc,
  query,
  orderBy,
  updateDoc,
  arrayUnion,
  setDoc,
  getDoc,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import { getStorage, ref, list, getDownloadURL } from "firebase/storage";
import {
  initializeApp as initAdmin,
  getApps as getAdminApps,
} from "firebase-admin/app";
import { firebaseConfig } from "firebase-functions/v1";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
//import { environment } from '../environments/environments';

//import { AI, getGenerativeModel, Schema } from "@angular/fire/ai";

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
initializeApp({
  apiKey: "AIzaSyDmr3EwHbow7ownYfppIsa9DwwLwv30m2U",
  authDomain: "ai-pickle2.firebaseapp.com",
  projectId: "ai-pickle2",
  storageBucket: "ai-pickle2.firebasestorage.app",
  messagingSenderId: "515733221066",
  appId: "1:515733221066:web:0d9454d36fc5163b14ce33",
});

if (!getAdminApps().length) {
  initAdmin();
}
//updateDocumentTool
const tools = [
  {
    functionDeclarations: [
      {
        name: "updateDocument",
        description: "Update a Firestore profile field for the user.",
        parameters: {
          type: "OBJECT",
          properties: {
            user: { type: "STRING", description: "UID of the user." },
            entry: { type: "STRING", description: "Field path to update." },
            value: { type: "STRING", description: "New value." },
          },
          required: ["user", "entry", "value"],
        },
      },
      {
        name: "getImage",
        description: "Obtain a user's profile image to be interpreted by the model.",
        parameters: {
          type: "OBJECT",
          properties: {
            user: { type: "STRING", description: "UID of the user." }
          },
          required: ["user"],
        },
      },
    ],
  },
];

let experimentModel;

function getModel() {
  if (!experimentModel) {
    const apiKey = "AIzaSyDmr3EwHbow7ownYfppIsa9DwwLwv30m2U";
    if (!apiKey) {
      logger.error(
        "Gemini API key missing. Set GOOGLE_API_KEY in env or secrets."
      );
      throw new Error("MISSING_API_KEY");
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    experimentModel = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      tools,
      systemInstruction: `You are a professional Jewish matchmaker. Analyze the JSON data and return data based off of keywords from the prompt.
    If the prompt asks you to change an entry in their profile (not mentioning their profile picture) to a new value, updateDocument should be used, followed by saying that the change should have been made.
    If the prompt asks you how to improve their profile picture, getImage should be used, followed by saying the word "potato" and nothing else.`
    //I don't know why the prompt is only saying potato sometimes, but I'm getting too sleepy to go on further...
    
    //If the prompt asks how to improve their profile picture, getImage should be used, followed by saying what is in the picture.`
    //If the prompt is asking how to improve their profile (not picture), the response should only point out one or two entries in that specific user's profile data that are empty or 0, as well as mention the profile's firstName.
    });
  }
  return experimentModel;
}

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

export const helloWorld = onCall(async (request) => {
  const chatRef = await getDocs(
    query(
      collection(
        doc(collection(getFirestore(getApp()), "chats"), request.data.uid),
        "messages"
      ),
      orderBy("timestamp")
    )
  );

  const storage = getStorage(getApp(), "gs://ai-pickle2.firebasestorage.app");
  logger.info(request.data.uid);
  const storageRef = ref(storage, "profiles/" + request.data.uid + "/images");
  const firstImage = await list(storageRef, { maxResults: 1 });
  //logger.info(firstImage.items);
  //Use this to copy a sample uid to anon auth
  /*const profilesRef = doc(getFirestore(getApp()), "settings", "u01");
  const profilesRef2 = doc(getFirestore(getApp()), "settings", request.data.uid);
  const profilesSnap = await getDoc(profilesRef);
  await setDoc(profilesRef2, profilesSnap.data());*/

  let messages = [];
  chatRef.forEach((message) => {
    messages.push(message.data());
  });
  return messages;
});

export const helloWorld2 = onCall(async (request) => {

  const storage = getStorage(getApp(), "gs://ai-pickle2.firebasestorage.app");
  // const storageRef = ref(storage, "profiles/" + request.data.uid + "/images");
  const storageRef = ref(storage, "profiles/" + request.data.uid + "/images/image0.jpg");
  // const firstImage = await list(storageRef, { maxResults: 1 });
  const getImage = await getDownloadURL(storageRef);
  // .then((url) => {
  //   const response = await fetch(url);
  //   const data = await response.json();
  //   return data;
  // });
  logger.info("///////////////");
  const response = await fetch(getImage);
  const data = await response.blob();
  return {image: data};
});

async function fileToGenerativePart(file) {
    const base64EncodedDataPromise = new Promise((resolve) => {
      //Is the FileReader gonna be a problem?
      //const reader = new FileReader();
      //Yes, it is a problem. Because it's a client-side web API/browser API.
      //AKA, not a server-side API.
      file = file.slice(0,30);

      let contents = fs.readFileSync(file, 'base64');
      logger.info("88888888888888888888");
      //There must be null bytes in the image file buffer. Need to figure out
      //how to get rid of those without compromising the data.
      //
      //After removing the zero bytes, it's saying "ENOENT: no such file or directory".
      //Probably because removing the zero bytes compromised the data in a way that
      //made it unidentifiable. What is one to do?

      //logger.info(contents.substring(0,1));
      contents = contents.split(',')[1];
      //It has to be the second element of the array returned from splitting it
      //up between commas. This skips over the URI type, MIME type, and the base64 identifier.
      //So it's essentially skipping: "data:image/jpeg;base64,".
      
      //logger.info(contents);   There is very much contents
      // return contents;
      resolve(contents);
    });
    return { inlineData: { data: await base64EncodedDataPromise, mimeType: file.type } };
}

export const generateTask = onCall({timeoutSeconds: 300}, async (request) => {
  logger.info("generateTask:start", {
    node: process.version,
    hasFile: typeof File !== "undefined",
    hasBlob: typeof Blob !== "undefined",
    uid: request?.data?.uid || null,
    hasPrompt: !!request?.data?.prompt,
  });

  const model = getModel();

  const chatRef = doc(getFirestore(getApp()), "chats", request.data.uid);
  let chatSnap;
  try {
    chatSnap = await getDoc(chatRef);
    logger.info("generateTask:chatSnap", { exists: chatSnap.exists() });
  } catch (e) {
    logger.error("generateTask:chatSnap:error", e);
  }

  const profileRef = doc(getFirestore(getApp()), "profiles", request.data.uid);
  let profileSnap;
  try {
    profileSnap = await getDoc(profileRef);
    logger.info("generateTask:profileSnap", { exists: profileSnap.exists() });
    if (profileSnap.exists()) {
      const fn = profileSnap.data()?.firstName || null;
      logger.info("generateTask:firstName", { firstName: fn });
    }
  } catch (e) {
    logger.error("generateTask:profileSnap:error", e);
  }

  let matchSnapshot;
  try {
    matchSnapshot = await getDocs(
      collection(getFirestore(getApp()), "profiles")
    );
  } catch (e) {
    logger.error("generateTask:matchSnapshot:error", e);
  }
  const matchList = (matchSnapshot?.docs || []).map((d) => d.data());
  logger.info("generateTask:matchList", { count: matchList.length });

  const matchString = JSON.stringify(matchList);
  if (!matchString && !request.data?.prompt) {
    return { response: "Please provide a prompt" };
  }
  const imagePart = matchString; // pass JSON directly

  logger.info("generateTask:inputs", {
    promptLen: (request.data?.prompt || "").length,
    jsonLen: imagePart.length,
  });
  const originalPrompt = request.data?.prompt || "";
  const effectivePrompt =
    originalPrompt + " My uid is " + (request.data?.uid || "");
  logger.info("generateTask:effectivePrompt", { len: effectivePrompt.length });

  try {
    let result;
    try {
      result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: effectivePrompt }, { text: imagePart }],
          },
        ],
        tools,
      });
      logger.info("generateTask:model:ok");
    } catch (e) {
      logger.error("generateTask:model:error", e);
      return { error: "MODEL_ERROR" };
    }

    try {
      const candidate = result?.response?.candidates?.[0];
      const parts = candidate?.content?.parts || [];
      logger.info("generateTask:model:candidate", {
        parts: parts.length,
        hasFunctionCall: !!parts.find((p) => p.functionCall),
      });
    } catch (e) {
      logger.warn("generateTask:model:candidate:inspect:error", e);
    }
    // Execute tool call if present and return model-complete reply
    const candidate = result?.response?.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const toolPart = parts.find((p) => p.functionCall);
    if (toolPart && toolPart.functionCall) {
      const { name, args } = toolPart.functionCall;
      logger.info("generateTask:toolCall", { name, args });
      if (name === "updateDocument") {
        const toolResult = await updateDocument({
          ...args,
          user: request.data.uid,
        });
        logger.info("3//////////////////////////////");
        let followup, finalText;
        try {
          followup = await model.generateContent({
            contents: [
              {
                role: "tool",
                parts: [
                  {
                    functionResponse: {
                      name: "updateDocument",
                      response: toolResult,
                    },
                  },
                ],
              },
            ],
          });
          finalText = await followup.response.text();
          logger.info("generateTask:followup:ok", {
            textLen: finalText.length,
          });
        } catch (e) {
          logger.error("generateTask:followup:error", e);
          finalText = "Profile updated.";
        }
        try {
          await addDoc(
            collection(
              doc(
                collection(getFirestore(getApp()), "chats"),
                request.data.uid
              ),
              "messages"
            ),
            { sender: "ai", text: finalText, timestamp: Timestamp.now() }
          );
          logger.info("generateTask:write:ai:ok");
        } catch (e) {
          logger.error("generateTask:write:ai:error", e);
        }
        return { response: finalText };
      }

      if (name === "getImage") {
        const toolResult = await getImage({
          ...args,
          user: request.data.uid,
        });
        logger.info("4//////////////////////////////");
        let followup, finalText;
        try {
          //logger.info("toolResult:");
          //logger.info(toolResult);
          followup = await model.generateContent([request.data.uid, toolResult]);
          finalText = await followup.response.text();
          //Almost there... Just need an actual response...
          logger.info("generateTask:followup:ok");
          logger.info(finalText);
        } catch (e) {
          logger.error("generateTask:followup:error", e);
          finalText = "idk something.";
        }
        return { response: finalText };
      }
    }

    let response;
    try {
      response = await result.response.text();
      logger.info("generateTask:response:text", { textLen: response.length });
    } catch (e) {
      logger.error("generateTask:response:text:error", e);
      response = "";
    }

    try {
      await addDoc(
        collection(
          doc(collection(getFirestore(getApp()), "chats"), request.data.uid),
          "messages"
        ),
        { sender: "user", text: originalPrompt, timestamp: Timestamp.now() }
      );
      logger.info("generateTask:write:user:ok");
    } catch (e) {
      logger.error("generateTask:write:user:error", e);
    }

    try {
      await addDoc(
        collection(
          doc(collection(getFirestore(getApp()), "chats"), request.data.uid),
          "messages"
        ),
        { sender: "ai", text: response, timestamp: Timestamp.now() }
      );
      logger.info("generateTask:write:ai:ok");
    } catch (e) {
      logger.error("generateTask:write:ai:error", e);
    }
    return { response: response };
  } catch (error) {
    logger.error("generateTask:UNHANDLED", error);
    return { error: "UNHANDLED", message: String(error?.message || error) };
  }
});

async function updateDocument(request) {
  logger.info("updateDocument", request);
  const { user, entry, value } = request || {};
  const uid = String(user || "").trim();
  const field = String(entry || "").trim();
  const newValue = value === undefined || value === null ? "" : value;

  if (!uid || !field) {
    return { ok: false, error: "Missing required arguments: user, entry" };
  }

  try {
    // Use the same client SDK pattern as helloWorld
    const ref = doc(collection(getFirestore(getApp()), "profiles"), uid);
    await setDoc(ref, { [field]: newValue }, { merge: true });
    return { ok: true, updated: { user: uid, entry: field, value: newValue } };
  } catch (e) {
    logger.error("updateDocument failed", e);
    return { ok: false, error: "WRITE_FAILED" };
  }
}

async function getImage(request) {
  const { user } = request || {};
  const uid = String(user || "").trim();

  if (!uid) {
    return { ok: false, error: "Missing required arguments: user" };
  }

  try {
    // Use the same client SDK pattern as helloWorld
    const storage = getStorage(getApp(), "gs://ai-pickle2.firebasestorage.app");
    // const storageRef = ref(storage, "profiles/" + request.data.uid + "/images");
    const storageRef = ref(storage, "profiles/" + uid + "/images/image0.jpg");
    // const firstImage = await list(storageRef, { maxResults: 1 });
    const getImage = await getDownloadURL(storageRef);
    const response = await fetch(getImage);

    /*
    Ultimately, Blob and file are store data the same way, it's just that File has
    some properties that Blob doesn't, like time modified, data modified,
    and file name.

    Question is, are these exclusive File properties needed to encode the image
    data the way we need to?
    */

    //const imageBlob = new Blob([await response.arrayBuffer()], { type: "image/jpeg" });
    //const imageBlob2 = new Blob([await response.blob()], { type: "image/jpeg" });
    //I'm pretty sure the data stored between these is the same



    //const imageFile = new File([await response.arrayBuffer()], 'newimage.jpeg', {
      type: "image/jpeg"
    //});
    //const imageFile2 = new File([await response.blob()], 'newimage.jpeg', {
      type: "image/jpeg"
    //});
    //I'm pretty sure the data stored between these is the same too
    
    //const imageBlobUrl = URL.createObjectURL(imageBlob);

    //let responseBuffer = await response.arrayBuffer();

    //Is this new buffer needed?
    //responseBuffer = Buffer.from(responseBuffer);
    //Yes, because fs.readFileSync requires either an argument of type Buffer or URL.

    //fs.createWriteStream('newimage.jpeg').write(arrayBuffer);
    // const dv = new DataView(await response.arrayBuffer());
    //let responseBuffer  = new Uint8Array(await response.arrayBuffer());
    //responseBuffer = responseBuffer.filter(byte => byte != 0);
    //responseBuffer = responseBuffer.slice(0,30);
    //Apparently type Buffer is not enough, it's gotta be a Uint8Array TypedArray
    //too. Would have been great for it to mention that before.

    logger.info("666666666666666666666666666666666");
    //logger.info(Buffer.from(await response.arrayBuffer()).toString('base64'));



    const imagePart = { inlineData: { data: Buffer.from(await response.arrayBuffer()).toString('base64'), mimeType: "image/jpeg" }};
    //This should be the correct format I'm pretty sure...
    
    
    //const imagePart = null;
    //const imagePart = await fileToGenerativePart(responseBuffer);
    logger.info("777777777777777777777777777777777");
    //logger.info(imagePart);
    return imagePart;
  } catch (e) {
    logger.error("getImage failed", e);
    return { ok: false, error: "GET_IMAGE_FAILED" };
  }
}