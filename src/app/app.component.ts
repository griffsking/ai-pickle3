import { Component, OnInit, ViewEncapsulation, ChangeDetectionStrategy, Injectable } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { TaskService } from './services/task.service'
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import { getApp } from 'firebase/app'
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
} from 'firebase/functions'

let functionsInstance: ReturnType<typeof getFunctions> | null = null
function getFunctionsInstanceLazy() {
  if (!functionsInstance) {
    const app = getApp() // assumes app was initialized elsewhere (e.g., main.ts)
    functionsInstance = getFunctions(app, 'us-central1')
    connectFunctionsEmulator(functionsInstance, 'localhost', 5003)
  }
  return functionsInstance
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
  myInput: string = ''
  savedInput: string = ''
  textStream: string = ''
  chatRespId: number = 0
  first: boolean = true

  bigdummydataFile?: File

  constructor(public taskService: TaskService) {}

  ngOnInit() {
    document.addEventListener('keydown', (e) => {
      if (e.key !== '/') return    
      document.getElementById('inputField')!.setAttribute('readOnly','readOnly')
      document.getElementById('inputField')!.focus()
      setTimeout(() => {
        document.getElementById('inputField')!.removeAttribute('readOnly')
      },0)
    })
  }

  async ngAfterViewInit() {
    const functions = getFunctions(getApp(), 'us-central1')
    connectFunctionsEmulator(functions, 'localhost', 5003)
    signInAnonymously(getAuth()).then(() => {
      console.log('Signed in anonymously')
    })
    onAuthStateChanged(getAuth(), (user) => {
      if (user) {
        const functions = getFunctionsInstanceLazy()
        const helloWorld = httpsCallable(functions, 'helloWorld')
        helloWorld({ uid: user.uid })
          .then((resp: any) => {
            const data = resp.data
            console.log(data)
            data.forEach((message: { text: string; sender: string }) => {
              this.addToChatField(message.text, message.sender)
            })
            document
              .getElementById('chatBox')
              ?.scrollTo(0, document.getElementById('chatBox')?.scrollHeight!)
          })
          .catch((error: any) => console.error('Error:', error))
      }
    })
  }

  addToChatField(text: string, sender: string) {
    if (!text) return
    const chatMsgBox = document.createElement('div')
    chatMsgBox.className = 'messageBox'
    sender === 'user' ? chatMsgBox.classList.add("right") : chatMsgBox.classList.add("left")
    const chatMsg = document.createElement('p')
    chatMsg.style.textOverflow = 'ellipsis'
    chatMsg.style.overflow = 'hidden'
    chatMsg.style.paddingTop = '5.2px'
    chatMsg.style.paddingBottom = '5.2px'
    chatMsg.innerText = text
    chatMsgBox.appendChild(chatMsg)
    document.getElementById('chatBox')?.appendChild(chatMsgBox)
  }

  async onGoClick() {
    if (document.getElementsByClassName('sendButton')[0].classList.contains("disabled")) return
    if (this.myInput !== '') {
      this.addToChatField(this.myInput, 'user')
      this.savedInput = this.myInput
      this.myInput = ''
      await this.generateMaintask()
    }
  }

  async onGoClickEnter(event: KeyboardEvent) {
    if (document.getElementsByClassName('sendButton')[0].classList.contains("disabled")) return
    if (event.key === 'Enter' && this.myInput !== '') {
      this.addToChatField(this.myInput, 'user')
      this.savedInput = this.myInput
      this.myInput = ''
      await this.generateMaintask()
    }
  }

  async generateMaintask(): Promise<void> {
    setTimeout (() => {
      document
        .getElementById('chatBox')
        ?.scrollTo(0, document.getElementById('chatBox')?.scrollHeight!)
    }, 0)
    document.getElementsByClassName('sendButton')[0].classList.add("disabled")
    const chatMsgBox = document.createElement('div')
    chatMsgBox.className = 'messageBox'
    chatMsgBox.classList.add("left")
    const chatMsgBoxLoadingCont = document.createElement('div')
    chatMsgBoxLoadingCont.className = 'loadingcont'
    const chatMsgBoxDotCont1 = document.createElement('div')
    chatMsgBoxDotCont1.className = 'dotcont'
    const chatMsgBoxDot1 = document.createElement('div')
    chatMsgBoxDot1.className = 'dot'
    chatMsgBoxDotCont1.appendChild(chatMsgBoxDot1)
    const chatMsgBoxDotCont2 = document.createElement('div')
    chatMsgBoxDotCont2.classList.add('dotcont')
    const chatMsgBoxDot2 = document.createElement('div')
    chatMsgBoxDot2.classList.add('dot', 'dot2')
    chatMsgBoxDotCont2.appendChild(chatMsgBoxDot2)
    const chatMsgBoxDotCont3 = document.createElement('div')
    chatMsgBoxDotCont3.classList.add('dotcont')
    const chatMsgBoxDot3 = document.createElement('div')
    chatMsgBoxDot3.classList.add('dot', 'dot3')
    chatMsgBoxDotCont3.appendChild(chatMsgBoxDot3)
    chatMsgBoxLoadingCont.appendChild(chatMsgBoxDotCont1)
    chatMsgBoxLoadingCont.appendChild(chatMsgBoxDotCont2)
    chatMsgBoxLoadingCont.appendChild(chatMsgBoxDotCont3)
    chatMsgBox.appendChild(chatMsgBoxLoadingCont)
    document.getElementById('chatBox')?.appendChild(chatMsgBox)
    try {
      signInAnonymously(getAuth()).then(() => {
        console.log('Signed in anonymously')
      })
      onAuthStateChanged(getAuth(), (user) => {
        if (user) {
          const functions = getFunctionsInstanceLazy()
          const generateTaskFn = httpsCallable(functions, 'generateTask');
          (async () => {
            const { stream } = await generateTaskFn.stream({ prompt: this.savedInput, uid: user.uid })
            const chatMsg = document.createElement('p')
            chatMsg.style.textOverflow = 'ellipsis'
            chatMsg.style.overflow = 'hidden'
            chatMsg.style.paddingTop = '5.2px'
            chatMsg.style.paddingBottom = '5.2px'
            chatMsgBoxLoadingCont.remove()
            chatMsgBox.appendChild(chatMsg)
            try {
              for await (let chunk of stream) {
                chatMsg.innerText = `${chatMsg.innerText} ${chunk}`
              }
            } catch (e) {
              console.log(e)
            }
            if (chatMsg.innerText === '')
              chatMsgBox.remove()
            // re-enable input and button
            document.getElementsByClassName('sendButton')[0].classList.remove("disabled")
          })()
        }
      })
    } catch (error) {
      console.log(error, 'Failed to generate main task.')
    }
  }
}