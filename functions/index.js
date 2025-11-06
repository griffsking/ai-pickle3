/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as logger from "firebase-functions/logger";
import "@angular/compiler";
import { onCall, onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2/options";
import { inject, Injectable } from "@angular/core";
import { getGenerativeModel, Schema } from "@angular/fire/ai";
import { getAI, GoogleAIBackend } from "@angular/fire/ai";
import { getApp, initializeApp } from "firebase/app";
import {
  collection,
  getDocs,
  getFirestore,
  doc,
  query,
  updateDoc,
  arrayUnion,
  setDoc,
  getDoc,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import {
  initializeApp as initAdmin,
  getApps as getAdminApps,
} from "firebase-admin/app";
import { firebaseConfig } from "firebase-functions/v1";
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
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
  apiKey: "AIzaSyBToTul3CFDKt3Ip9TTuEzgL_5-syLefSM",
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
  ],
}];

let experimentModel;

function getModel() {
  if (!experimentModel) {
    experimentModel = getGenerativeModel(
      getAI(getApp(), { backend: new GoogleAIBackend() }),
      {
        model: "gemini-2.5-flash-lite",
        tools,
        systemInstruction: `You are a professional Jewish matchmaker. Analyze the JSON data and return data based off of keywords from the prompt.
      If the prompt asks you to change an entry in their profile to a new value, updateDocument should be used, followed by saying that the change should have been made.
      If the prompt is asking how to improve their profile, the response should only point out one or two entries in that specific user's profile data that are empty or 0, as well as mention the profile's firstName.`
      }
    );
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
      )
    )
  );

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

export const generateTask = onCall(async (request) => {
  const model = getModel();
  const chatRef = doc(getFirestore(getApp()), "chats", request.data.uid);
  const chatSnap = await getDoc(chatRef);
  const profileRef = doc(getFirestore(getApp()), "profiles", request.data.uid);
  const profileSnap = await getDoc(profileRef);
  logger.info(profileSnap.data().firstName);
  const matchSnapshot = await getDocs(
    collection(getFirestore(getApp()), "profiles")
  );
  const matchList = matchSnapshot.docs.map((doc) => doc.data());
  const matchString = JSON.stringify(matchList);
  const blob = new Blob([matchString], { type: "application/json" });
  const bigdummydataFile = new File([blob], "dummydata.json", {
    type: "application/json",
  });

  if (!bigdummydataFile && !request.data.prompt) {
    return {
      response: "Please provide a prompt",
    };
  }

  const imagePart = await bigdummydataFile.text();
  try {
    logger.info("both: " + [request.data.prompt, imagePart]);
    //The input and the network logs are the same
    // for successes and fails.
    
    logger.info(request.data.prompt);
    request.data.prompt = request.data.prompt.concat(" My uid is " + request.data.uid + ".");
    logger.info(request.data.prompt);
    //What is the best way of letting the
    //model know who the user making the request is?
    //Why is this returning result: null now?
    //The server seems to be refusing requests now???
    const result = await model.generateContent(
      [request.data.prompt, imagePart]
    );
    logger.info("is it getting to this part?");
    // Debug: log tool call if present to ensure tools wiring is correct
    try {
      const candidate = result?.response?.candidates?.[0];
      const parts = candidate?.content?.parts || [];
      const toolPart = parts.find((p) => p.functionCall);
      if (toolPart && toolPart.functionCall) {
        logger.info("Tool call detected", toolPart.functionCall);
      }
    } catch (e) {
      logger.warn("Unable to inspect tool call", e);
    }
    // Execute tool call if present and return model-complete reply
    const candidate = result?.response?.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const toolPart = parts.find((p) => p.functionCall);
    if (toolPart && toolPart.functionCall) {
      const { name, args } = toolPart.functionCall;
      if (name === "updateDocument") {
        const toolResult = await updateDocument({
          ...args,
          user: request.data.uid,
        });
        logger.info("3//////////////////////////////");
        const followup = await model.generateContent([
          {
            functionResponse: { name: "updateDocument", response: toolResult },
          },
        ]);
        const finalText = await followup.response.text();
        await addDoc(
          collection(
            doc(collection(getFirestore(getApp()), "chats"), request.data.uid),
            "messages"
          ),
          { sender: "ai", text: finalText, timestamp: Timestamp.now() }
        );
        return { response: finalText };
      }
    }

    let response = await result.response.text();
    /*if (JSON.parse(response).response[0] == "[") {
      console.log(JSON.parse(response).response.substring(
        JSON.parse(response).response.indexOf("[") + 1,
        JSON.parse(response).response.indexOf(",")
      ));
      const entry = JSON.parse(response).response.substring(
        JSON.parse(response).response.indexOf("[") + 1,
        JSON.parse(response).response.indexOf(",")
      );
      console.log(JSON.parse(response).response.substring(
        JSON.parse(response).response.indexOf(",") + 1,
        JSON.parse(response).response.indexOf("]")
      ));
      const value = JSON.parse(response).response.substring(
        JSON.parse(response).response.indexOf(",") + 1,
        JSON.parse(response).response.indexOf("]")
      );
      const profileRef = doc(getFirestore(getApp()), 'profiles', request.data.uid);
      await updateDoc(profileRef, {
        [entry.replaceAll('"', '')]: value.replaceAll('"', '')
      });
      console.log(response);
      console.log(response.slice(response.indexOf("["), response.indexOf("]") + 2));
      console.log(response[response.indexOf("]") + 2]);
      response = response.replaceAll(response.slice(response.indexOf("["), response.indexOf("]") + 2), '');
      if (response[response.indexOf(":") + 3] === " ")
        response[response.indexOf(":") + 3] = '';
      response[response.indexOf(":") + 3].toUpperCase();
      console.log(response);
      //response.response = response.response.slice(response.response.indexOf("]") + 1);
    }*/
    /*let newMessageHistory = chatSnap.data().messagehistory;
    newMessageHistory.push({
      sender: "user",
      text: request.data.prompt,
      timestamp: Timestamp.now()
    });
    newMessageHistory.push({
      sender: "ai",
      text: response,
      //text: JSON.parse(response).response,
      timestamp: Timestamp.now()
    });
    await updateDoc(doc(getFirestore(getApp()), 'chats', 'u01'), {
      messagehistory: newMessageHistory
    });*/
    await addDoc(
      collection(
        doc(collection(getFirestore(getApp()), "chats"), request.data.uid),
        "messages"
      ),
      {
        sender: "user",
        text: request.data.prompt,
        timestamp: Timestamp.now(),
      }
    );
    await addDoc(
      collection(
        doc(collection(getFirestore(getApp()), "chats"), request.data.uid),
        "messages"
      ),
      {
        sender: "ai",
        text: response,
        timestamp: Timestamp.now(),
      }
    );
    return { response: response };
  } catch (error) {
    logger.error("generateContent didn't work", error);
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
