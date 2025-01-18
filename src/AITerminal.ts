import * as vscode from 'vscode'

export class AITerminal implements vscode.Pseudoterminal, vscode.Disposable {
    onDidWrite: vscode.Event<string>
    private pausedCallback?: AITermminalPausedCallback
    private readonly onDidWriteEventEmitter = new vscode.EventEmitter<string>()
    private readonly terminalName = "AI Debugger"
    private readonly disposables: vscode.Disposable[] = []

    constructor(private readonly callbacks: AITerminalCallback) {
        this.onDidWriteEventEmitter = new vscode.EventEmitter<string>()
        this.onDidWrite = this.onDidWriteEventEmitter.event
        this.disposables.push(this.onDidWriteEventEmitter)
        this.disposables.push(vscode.window.createTerminal({
            name: this.terminalName,
            pty: this
        }))
        this.disposables.push(callbacks.addMessageEvent(message => {
            this.onDidWriteEventEmitter.fire(`${message.role.toUpperCase()}: ${message.content.replaceAll("\n","\r\n")}\r\n`)
        }))
    }
    open(initialDimensions: vscode.TerminalDimensions | undefined): void { }
    close(): void {
        this.callbacks.onClose()
    }
    handleInput(data: string): void {
        if(data == "p") {
            // Pause/Unpause
            if(this.pausedCallback) {
                console.log("Unpausing AI")
                this.pausedCallback.onContinue()
                this.pausedCallback = undefined
                this.onDidWriteEventEmitter.fire("Unpaused\r\n")
            } else {
                console.log("Pausing AI")
                this.pausedCallback = this.callbacks.onPause()
                this.onDidWriteEventEmitter.fire("Paused\r\n")
            }
            return
        }
        if(data == "s" && this.pausedCallback) {
            // Step
            console.log("AI Step")
            this.pausedCallback.onStep()
            return
        }
    }
    focus() {
        vscode.window.terminals.find(terminal => terminal.name == this.terminalName)?.show()
    }

    dispose() {
        for(const disposable of this.disposables) {
            disposable.dispose()
        }
    }
}

export interface AITerminalCallback {
    addMessageEvent: vscode.Event<AITerminalMessage>,
    onClose(): void,
    onPause(): AITermminalPausedCallback
}

export interface AITermminalPausedCallback {
    onStep(): void,
    onContinue(): void
}

export interface AITerminalMessage {
    role: "system" | "user" | "assistent" | "info",
    content: string
}