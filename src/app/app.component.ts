import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChangeDetectionStrategy } from '@angular/core';
import { TaskService } from './services/task.service';
import { getApp } from 'firebase/app';
import 'firebase/functions';
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
} from 'firebase/functions';
import { Injectable } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

let functionsInstance: ReturnType<typeof getFunctions> | null = null;
function getFunctionsInstanceLazy() {
  if (!functionsInstance) {
    const app = getApp(); // assumes app was initialized elsewhere (e.g., main.ts)
    functionsInstance = getFunctions(app, 'us-central1');
    connectFunctionsEmulator(functionsInstance, 'localhost', 5003);
  }
  return functionsInstance;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
@Injectable({
  providedIn: 'root',
})
export class AppComponent implements OnInit {
  myInput: string = '';
  savedInput: string = '';
  textStream: string = '';
  chatRespId: number = 0;
  first: boolean = true;

  bigdummydataFile?: File;

  constructor(public taskService: TaskService) {}

  ngOnInit() {
    document
      .getElementsByClassName('sendButton')[0]
      .addEventListener('click', (event) => {
        this.savedInput = this.myInput;
        this.myInput = '';
      });
  }

  async ngAfterViewInit() {
    const functions = getFunctions(getApp(), 'us-central1');
    connectFunctionsEmulator(functions, 'localhost', 5003);
    signInAnonymously(getAuth()).then(() => {
      console.log('Signed in anonymously');
    });
    onAuthStateChanged(getAuth(), (user) => {
      if (user) {
        fetch('https://5003-firebase-ai-pickle2-1753311192596.cluster-ux5mmlia3zhhask7riihruxydo.cloudworkstations.dev/ai-pickle2/us-central1/helloWorld', {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ data: { uid: user.uid }})
        })
        .then(response => response.json())
        .then(data => {
          data.result.forEach((message: { text: string; sender: string; }) => {
            this.addToChatField(message.text, message.sender)
          });
          document.getElementById("chatBox")?.scrollTo(0, document.getElementById("chatBox")?.scrollHeight!)
      }).catch(error => console.error('Error:', error));
      }
    });
  }

  addToChatFieldButton() {
    this.addToChatField(this.myInput, 'user');
    this.savedInput = this.myInput;
    this.myInput = '';
  }

  addToChatFieldEnter(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.addToChatField(this.myInput, 'user');
      this.savedInput = this.myInput;
      this.myInput = '';
    }
  }

  addToChatField(text: string, sender: string) {
    if (text) {
      const chatMsgBox = document.createElement('div');
      chatMsgBox.className = "messageBox";
      if (sender === 'user') chatMsgBox.style.marginRight = '0.85rem';
      else chatMsgBox.style.marginLeft = '0.85rem';
      const chatMsg = document.createElement('p');
      chatMsg.style.textOverflow = 'ellipsis';
      chatMsg.style.overflow = 'hidden';
      chatMsg.innerText = text;
      chatMsgBox.appendChild(chatMsg);
      document.getElementById('chatBox')?.appendChild(chatMsgBox);
    }
  }

  async onGoClick() {
    await this.generateMaintask();
  }

  async onGoClickEnter(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      await this.generateMaintask();
    }
  }

  async generateMaintask(): Promise<void> {
    document.getElementById("chatBox")?.scrollTo(0, document.getElementById("chatBox")?.scrollHeight!)
    const chatMsgBox = document.createElement('div');
    chatMsgBox.className = "messageBox";
    chatMsgBox.style.marginLeft = '0.85rem'
    const chatMsgBoxLoadingCont = document.createElement('div');
    chatMsgBoxLoadingCont.className = "loadingcont";
    const chatMsgBoxDotCont1 = document.createElement('div');
    chatMsgBoxDotCont1.className = "dotcont";
    const chatMsgBoxDot1 = document.createElement('div');
    chatMsgBoxDot1.className = "dot";
    chatMsgBoxDotCont1.appendChild(chatMsgBoxDot1);
    const chatMsgBoxDotCont2 = document.createElement('div');
    chatMsgBoxDotCont2.classList.add("dotcont");
    const chatMsgBoxDot2 = document.createElement('div');
    chatMsgBoxDot2.classList.add("dot");
    chatMsgBoxDot2.classList.add("dot2");
    chatMsgBoxDotCont2.appendChild(chatMsgBoxDot2);
    const chatMsgBoxDotCont3 = document.createElement('div');
    chatMsgBoxDotCont3.classList.add("dotcont");
    const chatMsgBoxDot3 = document.createElement('div');
    chatMsgBoxDot3.classList.add("dot");
    chatMsgBoxDot3.classList.add("dot3");
    chatMsgBoxDotCont3.appendChild(chatMsgBoxDot3);
    chatMsgBoxLoadingCont.appendChild(chatMsgBoxDotCont1);
    chatMsgBoxLoadingCont.appendChild(chatMsgBoxDotCont2);
    chatMsgBoxLoadingCont.appendChild(chatMsgBoxDotCont3);
    chatMsgBox.appendChild(chatMsgBoxLoadingCont);
    document.getElementById('chatBox')?.appendChild(chatMsgBox);
    try {
      signInAnonymously(getAuth()).then(() => {
        console.log('Signed in anonymously');
      });
      onAuthStateChanged(getAuth(), (user) => {
        if (user) {
          fetch('https://5003-firebase-ai-pickle2-1753311192596.cluster-ux5mmlia3zhhask7riihruxydo.cloudworkstations.dev/ai-pickle2/us-central1/generateTask', {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ data: { prompt: this.savedInput, uid: user.uid } })
          })
          .then(response => response.json())
          .then(data => {
            const chatMsg = document.createElement('p');
            chatMsg.style.textOverflow = 'ellipsis';
            chatMsg.style.overflow = 'hidden';
            chatMsg.innerText = data.result.response;
            chatMsgBoxLoadingCont.remove();
            chatMsgBox.appendChild(chatMsg);
            //this.addToChatField(data.result.response, "ai")
          });
        }
      });
      //let something = await resp.json();
      //console.log(something);
      //.then(response => response.json())
      //.then(data => data.result)
      //.catch(error => console.error('Error:', error));
      //this.addToChatField(generatedResponse, "ai");
    } catch (error) {
      console.log(error, 'Failed to generate main task.');
    }
  }
}
