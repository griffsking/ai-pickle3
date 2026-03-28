import * as logger from "firebase-functions/logger"
import "@angular/compiler"
import { onCall } from "firebase-functions/v2/https"
import { setGlobalOptions } from "firebase-functions/v2/options"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { getApp, initializeApp } from "firebase/app"
import {
  collection,
  getDocs,
  getFirestore,
  doc,
  query,
  orderBy,
  limit,
  setDoc,
  getDoc,
  addDoc,
  Timestamp,
} from "firebase/firestore"
import { getStorage, ref, list, getDownloadURL } from "firebase/storage"
import {
  initializeApp as initAdmin,
  getApps as getAdminApps,
} from "firebase-admin/app"
import testProfile from "../src/app/test_profiles.json" with { type: "json" }

setGlobalOptions({ maxInstances: 1 })
if (!getAdminApps().length) {
  initializeApp({
    // apiKey: process.env.FIREBASE_API_KEY,
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: "ai-pickle2.firebaseapp.com",
    projectId: "ai-pickle2",
    storageBucket: "ai-pickle2.firebasestorage.app",
    messagingSenderId: "515733221066",
    appId: "1:515733221066:web:0d9454d36fc5163b14ce33",
  })
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
        description: "Obtain a user's profile picture.",
        parameters: {
          type: "OBJECT",
          properties: {
            user: { type: "STRING", description: "UID of the user. The UID is always supplied, so there's no reason to ask the user for it." }
          },
          required: ["user"],
        },
      },
      {
        name: "addPrompt",
        description: "Add to the user's prompts.",
        parameters: {
          type: "OBJECT",
          properties: {
            user: { type: "STRING", description: "UID of the user." },
            question: { type: "STRING", description: "The question the user provides." },
            answer: { type: "STRING", description: "The answer the user provides." }
          },
          required: ["user"],
        },
      },
    ],
  },
]

let experimentModel

//region getModel
function getModel() {
  if (!experimentModel) {
    const apiKey = process.env.API_KEY
    if (!apiKey) {
      logger.error(
        "Gemini API key missing. Set GOOGLE_API_KEY in env or secrets."
      )
      throw new Error("MISSING_API_KEY")
    }
    const genAI = new GoogleGenerativeAI(apiKey)
    experimentModel = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite", //Do not ever use gemini-2.5-flash without the "-lite", it doesn't work!
      tools,
      systemInstruction: `You are a professional Jewish matchmaker. Analyze the JSON data and return data based off of keywords from the prompt.
      If the prompt asks something among the lines of "What is my ---?" or "Can you tell me what my --- is?", check if what they're asking for exists in their profile.
      If the prompt asks you to change an entry in their profile (not mentioning their profile picture) to a new value, updateDocument should be used, followed by saying that the change should have been made.
      If the prompt asks for advice on their profile picture, you must call the getImage function and then provide feedback on the image.
      If the prompt asks to add a prompt to their profile, ask them for a question and an answer to that question. After the user has given a question and an answer, call the addPrompt function to append a new map field onto the end of the user's prompt array field which contains a "question" field and an "answer" field, without replacing the preexisitng prompt elements.
      If the prompt asks to add a prompt to their profile and includes a question and an answer to that question, call the addPrompt function to append a new map field onto the end of the user's prompt array field which contains a "question" field and an "answer" field, without replacing the preexisitng prompt elements.
      Answers should never be blunt, always answer the user in a casual, but professional manner.`
      // If none of the previously mentioned instructions are triggered, you must say that you're an AI dating coach and that you only respond to questions about dating advice and the user's profile.`
    })
  }
  return experimentModel
}

//region helloWorld
export const helloWorld = onCall(async (request) => {
  console.log(request.data.uid)
  const chatRef = await getDocs(
    query(
      collection(
        doc(collection(getFirestore(getApp()), "chats"), request.data.uid),
        "messages"
      ),
      orderBy("timestamp"),
      limit(50)
    )
  )

  // const storage = getStorage(getApp(), "gs://ai-pickle2.firebasestorage.app")
  // logger.info(request.data.uid)
  // const storageRef = ref(storage, "profiles/" + request.data.uid + "/images")
  // const firstImage = await list(storageRef, { maxResults: 1 })
  //logger.info(firstImage.items)
  //Use this to copy a sample uid to anon auth
  /*const profilesRef = doc(getFirestore(getApp()), "settings", "u01")
  const profilesRef2 = doc(getFirestore(getApp()), "settings", request.data.uid)
  const profilesSnap = await getDoc(profilesRef)
  await setDoc(profilesRef2, profilesSnap.data())*/

  let messages = []
  chatRef.forEach((message) => {
    messages.push(message.data())
  })
  return messages
})

//region helloWorld2
export const helloWorld2 = onCall(async (request) => {
  const storage = getStorage(getApp(), "gs://ai-pickle2.firebasestorage.app")
  const storageRef = ref(storage, "profiles/" + request.data.uid + "/images/image0.jpg")
  const getImage = await getDownloadURL(storageRef)
  const response = await fetch(getImage)
  const data = await response.blob()
  return {image: data}
})

//region generateTask
export const generateTask = onCall({timeoutSeconds: 300}, async (request, response) => {
  const model = getModel()
  if (testProfile.use) {
    for (let prop in testProfile) {
      if (prop === "use" || prop === "uid") continue
      const ref = doc(collection(getFirestore(getApp()), "profiles"), testProfile.uid)
      await setDoc(ref, { [prop]: testProfile[prop] }, { merge: true })
    }
  }

  const chatRef = await getDocs(
    query(
      collection(
        doc(collection(getFirestore(getApp()), "chats"), request.data.uid),
        "messages"
      ),
      orderBy("timestamp"),
      limit(50)
    )
  )
  let history= []
  chatRef.forEach((message) => {
    history.push(message.data())
  })

  const profileRef = doc(getFirestore(getApp()), "profiles", request.data.uid)
  const profileSnap = await getDoc(profileRef)

  const originalPrompt = request.data?.prompt || ""
  const effectivePrompt = originalPrompt + " My uid is " + (request.data?.uid || "")

  let result
  // Generate the main content stream
  console.log(profileSnap.data())
  try {
    result = await model.generateContentStream({
      contents: [
        {
          role: "user",
          parts: [{ text: effectivePrompt }, { text: JSON.stringify({profileData: profileSnap.data(), history: history}) }],
        },
      ],
      tools,
    })
  } catch (e) {
    logger.error("Failed to generate main content stream", e)
    return { error: "MODEL_ERROR" }
  }
  let candidate = '', functionResponse = ''
  for await (let chunk of result.stream) {
    candidate = chunk.candidates
    if (chunk.candidates[0].content.parts[0].text) {
      response.sendChunk(chunk.candidates[0].content.parts[0].text)
      functionResponse = functionResponse.concat(chunk.candidates[0].content.parts[0].text)
    }
  }

  // Add the user's message to the database
  try {
    await addDoc(
      collection(
        doc(collection(getFirestore(getApp()), "chats"), request.data.uid),
        "messages"
      ),
      { sender: "user", text: originalPrompt, timestamp: Timestamp.now() }
    )
  } catch (e) {
    logger.error("Failed to store user message", e)
  }

  // Check and run function call
  const parts = candidate[0]?.content?.parts || []
  const toolPart = parts.find((p) => p.functionCall)
  if (toolPart && toolPart.functionCall) {
    const { name, args } = toolPart.functionCall
    let toolResult
    if (name === "updateDocument") {
      toolResult = await updateDocument({
        ...args,
        user: request.data.uid,
      })
    }
    else if (name === "getImage") {
      toolResult = await getImage({
        ...args,
        user: request.data.uid,
      })
    }
    else if (name === "addPrompt") {
      toolResult = await addPrompt({
        ...args,
        user: request.data.uid,
      })
    }
    try {
      result = await model.generateContentStream({
        contents: [
          {
            role: "user",
            parts: toolResult?.inlineData ? [{ text: effectivePrompt }, toolResult] : [{ text: effectivePrompt }],
          },
          candidate[0].content,
          {
            role: "model",
            parts: [
              {
                functionResponse: {
                  name: name,
                  response: toolResult,
                }
      }]}]})} catch (e) {
      logger.error("Failed to generate function call stream", e)
    }
    functionResponse = ''
    for await (let chunk of result.stream) {
      response.sendChunk(chunk.text())
      functionResponse = functionResponse.concat(chunk.text())
    }
  }

  // Add the ai's message to the database
  try {
    await addDoc(
      collection(
        doc(
          collection(getFirestore(getApp()), "chats"),
          request.data.uid
        ),
        "messages"
      ),
      { sender: "ai", text: functionResponse, timestamp: Timestamp.now() }
    )
  } catch (e) {
    logger.error("Failed to store ai message", e)
  }

  return { result }
})

//region updateDoc
async function updateDocument(request) {
  const { user, entry, value } = request || {}
  const uid = String(user || "").trim()
  const field = String(entry || "").trim()
  const newValue = value === undefined || value === null ? "" : value

  if (!uid || !field) {
    return { ok: false, error: "Missing required arguments: user, entry" }
  }

  try {
    // Use the same client SDK pattern as helloWorld
    const ref = doc(collection(getFirestore(getApp()), "profiles"), uid)
    await setDoc(ref, { [field]: newValue }, { merge: true })
    return { ok: true, updated: { user: uid, entry: field, value: newValue } }
  } catch (e) {
    logger.error("updateDocument failed", e)
    return { ok: false, error: "WRITE_FAILED" }
  }
}

//region getImage
async function getImage(request) {
  const { user } = request || {}
  const uid = String(user || "").trim()

  if (!uid)
    return { ok: false, error: "Missing required arguments: user" }
  
  try {
    const storage = getStorage(getApp(), "gs://ai-pickle2.firebasestorage.app")
    const storageRef = ref(storage, "profiles/BnSB86UDtLUXVwkLgoo4meVtq682/images/image0.jpg")
    const getImage = await getDownloadURL(storageRef)
    const response = await fetch(getImage)
    const imagePart = { inlineData: { data: Buffer.from(await response.arrayBuffer()).toString('base64'), mimeType: "image/jpeg" }}
    return imagePart
  } catch (e) {
    logger.error("getImage failed", e)
    return { ok: false, error: "GET_IMAGE_FAILED" }
  }
}

//region addPrompt
async function addPrompt(request) {
    const { user, question, answer } = request || {}
    const uid = String(user || "").trim()
    console.log(request)
    console.log(question)
    console.log(answer)
    const ref = doc(collection(getFirestore(getApp()), "profiles"), uid)
    await setDoc(ref, { "prompt": [ {"question": question, "answer": answer } ] }, { merge: true })
    return { ok: true }
}