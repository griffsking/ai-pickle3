import { Component, OnInit } from '@angular/core';
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
import { getAuth, signInAnonymously } from 'firebase/auth';

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
})
@Injectable({
  providedIn: 'root',
})
export class AppComponent implements OnInit {
  myInput: string = '';
  textStream: string = '';
  chatRespId: number = 0;
  first: boolean = true;

  bigdummydataFile?: File;

  constructor(public taskService: TaskService) {}

  ngOnInit() {
    document
      .getElementsByClassName('sendButton')[0]
      .addEventListener('click', (event) => {
        this.myInput = '';
      });
  }

  async ngAfterViewInit() {
    const auth = getAuth();
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
    const helloWorld = httpsCallable(getFunctionsInstanceLazy(), 'helloWorld');
    const hw = await helloWorld({ uid: 'u01' });
    const hwMessages = Array.isArray(hw.data)
      ? hw.data
      : (hw.data as any)?.result || [];
    hwMessages.forEach((m: any) => this.addToChatField(m.text, m.sender));
  }

  addToChatFieldButton() {
    this.addToChatField(this.myInput, 'user');
    this.myInput = '';
  }

  addToChatFieldEnter(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.addToChatField(this.myInput, 'user');
      this.myInput = '';
    }
  }

  addToChatField(text: string, sender: string) {
    if (text) {
      const chatMsgBox = document.createElement('div');
      chatMsgBox.style.width = '50%';
      chatMsgBox.style.margin = 'auto';
      if (sender === 'user') chatMsgBox.style.marginRight = '0.85rem';
      else chatMsgBox.style.marginLeft = '0.85rem';
      chatMsgBox.style.marginBottom = '0.5rem';
      chatMsgBox.style.paddingLeft = '0.5rem';
      chatMsgBox.style.paddingRight = '0.5rem';
      chatMsgBox.style.lineHeight = '1.35';
      chatMsgBox.style.backgroundColor = 'var(--color-gray-500)';
      chatMsgBox.style.borderRadius = 'var(--radius-md)';
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
    try {
      const generateTask = httpsCallable(
        getFunctionsInstanceLazy(),
        'generateTask'
      );
      const res: any = await generateTask({ prompt: this.myInput, uid: 'u01' });
      const generatedResponse = res?.data?.response ?? res?.data ?? '';
      this.addToChatField(generatedResponse, 'ai');
      if (!generatedResponse) {
        console.error('Empty response from generateTask', res);
        return;
      }
    } catch (error) {
      console.log(error, 'Failed to generate main task.');
    }
  }
}
