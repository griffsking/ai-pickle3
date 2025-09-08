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
import { collection, getDocs, getFirestore, doc, query, updateDoc, arrayUnion, setDoc, getDoc, addDoc, Timestamp } from 'firebase/firestore';
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
  appId: "1:515733221066:web:0d9454d36fc5163b14ce33"    
});

const updateDocumentTool = {
  functionDeclarations: [{
    name: 'updateDocument',
    description: 'Update a document in the Firestore database by replacing a designated entry with a new value when the user requests a change to their profile',
    parameters: Schema.object({
      properties: {
        user: Schema.string({
          description: `The user requesting the document change.`
        }),
        entry: Schema.string({
          description: `The entry in the user's profile document to be updated.`
        }),
        value: Schema.string({
          description: `The value that will replace the designated entry in the user's profile document.`
        }),
      },
      required: ['user', 'entry', 'value']
    })
  }]
};

const experimentModel = getGenerativeModel(getAI(getApp(), { backend: new GoogleAIBackend() }), {
  model: 'gemini-2.5-flash',
  /*generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: Schema.object({
      properties: {
        response: Schema.string()
      }
    })
  },*/
  tools: updateDocumentTool,
  systemInstruction: `You are a professional Jewish matchmaker. Analyze the JSON data and return data based off of keywords from the prompt.
  If the prompt is asking how to improve their profile, the response should only point out entries in that specific user's profile data that are empty or 0, as well as mention the profile's firstName.
  If the prompt asks you to change an entry in their profile to a new value, updateDocumentTool should be used, followed by saying that the change should have been made.`
  //If the prompt asks you to change an entry in their profile to a new value, the response should be structured as such: "[<profile_entry_to_change>, <new_value>]", followed by saying that the change should have been made.`
  //If the prompt is asking how to improve their profile, the response should only point out entries in the specific ${ request.data.uid } profile data that are empty or 0, as well as mention the profile's firstName.
});

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

export const helloWorld = onCall(async (request) => {
  const chatRef = await getDocs(query(collection(doc(collection(getFirestore(getApp()), 'chats'), 'u01'), 'messages')));
  let messages = [];
  chatRef.forEach(message => {
    messages.push(message.data());
  });
  return messages;
});

export const generateTask = onCall(async (request) => {
  const chatRef = doc(getFirestore(getApp()), "chats", request.data.uid);
  const chatSnap = await getDoc(chatRef);

  const matchSnapshot = await getDocs(
    collection(getFirestore(getApp()), 'profiles')
  );
  const matchList = matchSnapshot.docs.map((doc) => doc.data());
  const matchString = JSON.stringify(matchList);
  const blob = new Blob([matchString], { type: 'application/json' });
  const bigdummydataFile = new File([blob], 'dummydata.json', {
    type: 'application/json',
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
    await addDoc(collection(doc(collection(getFirestore(getApp()), 'chats'), 'u01'), 'messages'), {
      sender: "user",
      text: request.data.prompt,
      timestamp: Timestamp.now()
    });
    await addDoc(collection(doc(collection(getFirestore(getApp()), 'chats'), 'u01'), 'messages'), {
      sender: "ai",
      text: response,
      timestamp: Timestamp.now()
    });
    return { response: response };
    //return JSON.parse(response);
  /*} catch (error) {
    throw new Error("Failed to generate subtasks");
  }*/});

  async function updateDocument(request) {
    console.log("Request:");
    //console.log(request);
    //{user, entry, value}
    /*console.log(user);
    console.log(entry);
    console.log(value);

    const profileRef = doc(getFirestore(getApp()), 'profiles', user);
    await updateDoc(profileRef, {
      [entry]: value
    });*/
    return "Respond saying that the changes have been made.";
  }