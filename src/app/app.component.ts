import { ViewChild, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChangeDetectionStrategy } from '@angular/core';
import { TaskWithSubtasks, Task, TaskService } from './services/task.service';
import { Timestamp } from 'firebase/firestore';
import { InlineDataPart } from 'firebase/ai';
// import * as roughProfiles from '../assets/dummydata.json';
import { DummyData } from './dummydata.component';
//import { functions } from '../firebaseConfig';
//import { httpsCallable } from 'firebase/functions';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, DummyData],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  // @ViewChild('room') roomImage! : CheckboximageComponent;

  myInput: string = '';
  textStream: string = '';
  chatRespId: number = 0;
  generatedTask?: TaskWithSubtasks;
  dummydata: Blob = new Blob();

  @ViewChild('dummydata') bigdummydata!: DummyData;

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
    // Load JSON asset from the Angular assets folder
    const response = await fetch('assets/dummydata.json');
    const jsonData = await response.json();
    // Convert JSON object to string and create a Blob
    const jsonString = JSON.stringify(jsonData);
    const blob = new Blob([jsonString], { type: 'application/json' });
    // Create a File instance for the AI service
    this.bigdummydataFile = new File([blob], 'dummydata.json', {
      type: 'application/json',
    });
  }

  async callFunction() {
    //const helloWorld = httpsCallable(functions, 'helloWorld');
    //const result = await helloWorld();
    //console.log(result.data);
    //return result.data;
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
    await this.callFunction();
  }

  async onGoClickEnter(event: KeyboardEvent) {
    if (event.key === 'Enter') await this.generateMaintask();
  }

  async generateMaintask(): Promise<void> {
    try {
      const file = this.bigdummydataFile;
      const { title: generatedTitle, subtasks: generatedSubtasks } =
        await this.taskService.generateTask({
          file,
          prompt: `What does Jason love?`,
          // prompt: `What is in the image?`,
          // prompt: `What is in the text file?`,
        });
      document.getElementById('resp' + this.chatRespId)!.innerText = document
        .getElementById('resp' + this.chatRespId)
        ?.innerText.concat(' ' + generatedTitle)!;

      const newTaskRef = this.taskService.createTaskRef();
      const maintask: Task = {
        id: newTaskRef.id,
        title: generatedTitle,
        completed: false,
        owner: this.taskService.currentUser?.uid || this.taskService.localUid!,
        createdTime: Timestamp.fromDate(new Date()),
        priority: 'none',
      };
      const subtasks = generatedSubtasks?.map((generatedSubtask, i) => {
        return {
          id: this.taskService.createTaskRef().id,
          title: generatedSubtask,
          completed: false,
          parentId: newTaskRef.id,
          order: i,
          owner: maintask.owner,
          createdTime: maintask.createdTime,
        };
      });
      this.generatedTask = { maintask, subtasks };
    } catch (error) {
      this.handleError(error, 'Failed to generate main task.');
    }
  }

  handleError(error: any, userMessage?: string, duration: number = 3000): void {
    this.taskService.handleError(error, userMessage, duration);
  }
}
