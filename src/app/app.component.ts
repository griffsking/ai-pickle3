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
    const functions = getFunctions(getApp(), 'us-central1');
    connectFunctionsEmulator(functions, 'localhost', 5003);
    fetch('https://5003-firebase-ai-pickle2-1753311192596.cluster-ux5mmlia3zhhask7riihruxydo.cloudworkstations.dev/ai-pickle2/us-central1/helloWorld', {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ data: { uid: "u01" } })
    })
    .then(response => response.json())
    .then(data => {
      data.result.forEach((message: { text: string; sender: string; }) => {
        this.addToChatField(message.text, message.sender)
      })
  })
    .catch(error => console.error('Error:', error));
}

  addToChatFieldButton() {
    this.addToChatField(this.myInput, "user");
    this.myInput = '';
  }

  addToChatFieldEnter(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.addToChatField(this.myInput, "user");
      this.myInput = '';
    }
  }

  addToChatField(text: string, sender: string) {
    if (text) {
      const chatMsgBox = document.createElement('div');
      chatMsgBox.style.width = '50%';
      chatMsgBox.style.margin = 'auto';
      if (sender === 'user')
        chatMsgBox.style.marginRight = '0.85rem';
      else
        chatMsgBox.style.marginLeft = '0.85rem';
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
      const { response: generatedResponse } =
      await fetch('https://5003-firebase-ai-pickle2-1753311192596.cluster-ux5mmlia3zhhask7riihruxydo.cloudworkstations.dev/ai-pickle2/us-central1/generateTask', {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ data: { prompt: this.myInput, uid: "u01" } })
      })
      .then(response => response.json())
      .then(data => data.result)
      .catch(error => console.error('Error:', error));
      this.addToChatField(generatedResponse, "ai");
    } catch (error) {
      console.log(error, 'Failed to generate main task.');
    }
  }
}
