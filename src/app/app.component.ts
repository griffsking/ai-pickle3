import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChangeDetectionStrategy } from '@angular/core';
import { TaskService } from './services/task.service';
import { getApp } from 'firebase/app';
import 'firebase/functions';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { Injectable } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';

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
  history: string[] = [];

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
    const functions = getFunctions(getApp(), 'us-central1');
    connectFunctionsEmulator(functions, 'localhost', 5003);

    const x = await fetch('https://5003-firebase-ai-pickle2-1753311192596.cluster-ux5mmlia3zhhask7riihruxydo.cloudworkstations.dev/ai-pickle2/us-central1/helloWorld', {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ data: {} })
    })
    .then(response => response.json())
    .then(data => console.log(data.result))
    .catch(error => console.error('Error:', error));
  }

  addToChatFieldEnter(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.addToChatField();
      this.myInput = '';
    }
  }

  addToChatField() {
    if (this.myInput) {
      const chatMsgBox = document.createElement('div');
      chatMsgBox.style.width = '50%';
      chatMsgBox.style.margin = 'auto';
      chatMsgBox.style.marginBottom = '0.5rem';
      chatMsgBox.style.marginRight = '0.85rem';
      chatMsgBox.style.paddingLeft = '0.5rem';
      chatMsgBox.style.paddingRight = '0.5rem';
      chatMsgBox.style.lineHeight = '1.35';
      chatMsgBox.style.backgroundColor = 'var(--color-gray-500)';
      chatMsgBox.style.borderRadius = 'var(--radius-md)';
      const chatMsg = document.createElement('p');
      chatMsg.style.textOverflow = 'ellipsis';
      chatMsg.style.overflow = 'hidden';
      chatMsg.innerText = this.myInput;
      chatMsgBox.appendChild(chatMsg);
      document.getElementById('chatBox')?.appendChild(chatMsgBox);
      setTimeout(() => {
        const chatMsgResp = document.createElement('div');
        chatMsgResp.style.width = '50%';
        chatMsgResp.style.margin = 'auto';
        chatMsgResp.style.marginBottom = '0.5rem';
        chatMsgResp.style.marginLeft = '0.85rem';
        chatMsgResp.style.paddingLeft = '0.5rem';
        chatMsgResp.style.paddingRight = '0.5rem';
        chatMsgResp.style.lineHeight = '1.35';
        chatMsgResp.style.backgroundColor = 'var(--color-gray-500)';
        chatMsgResp.style.borderRadius = 'var(--radius-md)';
        const respMsg = document.createElement('p');
        respMsg.style.textOverflow = 'ellipsis';
        respMsg.style.overflow = 'hidden';
        this.chatRespId++;
        respMsg.id = 'resp' + this.chatRespId;
        respMsg.innerText = this.textStream;
        chatMsgResp.appendChild(respMsg);
        document.getElementById('chatBox')?.appendChild(chatMsgResp);
      }, 250);
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
    this.history.push(this.myInput);
    try {
      const { response: generatedResponse } =
      await fetch('https://5003-firebase-ai-pickle2-1753311192596.cluster-ux5mmlia3zhhask7riihruxydo.cloudworkstations.dev/ai-pickle2/us-central1/generateTask', {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ data: { prompt: this.myInput, history: this.history, uid: "u03" } })
      })
      .then(response => response.json())
      .then(data => data.result)
      .catch(error => console.error('Error:', error));
      document.getElementById('resp' + this.chatRespId)!.innerText = document
        .getElementById('resp' + this.chatRespId)
        ?.innerText.concat(' ' + generatedResponse)!;
    } catch (error) {
      console.log(error, 'Failed to generate main task.');
    }
  }
}
