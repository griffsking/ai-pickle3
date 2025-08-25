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
import { inject, Injectable } from '@angular/core';
import { getGenerativeModel, Schema } from "@angular/fire/ai";
import { getAI, GoogleAIBackend } from '@angular/fire/ai';
import { getApp, initializeApp } from 'firebase/app';
import { collection, getDocs, getFirestore, doc, updateDoc } from 'firebase/firestore';
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

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

export const helloWorld = onCall((request) => {
    return "Hello World!";
});

export const generateTask = onCall(async (request) => {
  initializeApp({
    apiKey: "AIzaSyBToTul3CFDKt3Ip9TTuEzgL_5-syLefSM",
    authDomain: "ai-pickle2.firebaseapp.com",
    projectId: "ai-pickle2",
    storageBucket: "ai-pickle2.firebasestorage.app",
    messagingSenderId: "515733221066",
    appId: "1:515733221066:web:0d9454d36fc5163b14ce33"    
  });
  const matchSnapshot = await getDocs(
    collection(getFirestore(getApp()), 'profiles')
  );
  const matchList = matchSnapshot.docs.map((doc) => doc.data());
  const matchString = JSON.stringify(matchList);
  const blob = new Blob([matchString], { type: 'application/json' });
  const bigdummydataFile = new File([blob], 'dummydata.json', {
    type: 'application/json',
  });
  
  const experimentModel = getGenerativeModel(getAI(getApp(), { backend: new GoogleAIBackend() }), {
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: Schema.object({
        properties: {
          response: Schema.string()
        }
      })
    },
    systemInstruction: `You are a professional Jewish matchmaker. Analyze the JSON data and return data based off of keywords from the prompt.
    If the prompt is asking how to improve their profile, the response should only point out entries in the specific ${ request.data.uid } profile data that are empty or 0, as well as mention the profile's firstName.
    You should treat ${ request.data.history } as message memory.
    If the prompt asks you to change an entry in their profile to a new value, the response should be structured as such: "[<profile_entry_to_change>, <new_value>]", followed by saying that the change should have been made.`
  });
  if (!bigdummydataFile && !request.data.prompt) {
    return {
      response: 'Please provide a prompt'
    };
  }

  const imagePart = await bigdummydataFile.text();
  //try {
    const result = await experimentModel.generateContent(
      [request.data.prompt, imagePart].filter(Boolean)
    );
    let response = await result.response.text();
    if (JSON.parse(response).response[0] == "[") {
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
    }
    return JSON.parse(response);
  /*} catch (error) {
    throw new Error("Failed to generate subtasks");
  }*/});