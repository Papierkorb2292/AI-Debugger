import * as vscode from 'vscode';

export class DummyDebugAdapter implements vscode.DebugAdapter {
    disposable: vscode.Disposable | null = null;
    
    private messageEventEmitter = new vscode.EventEmitter<vscode.DebugProtocolMessage>();
    
    onDidSendMessage = this.messageEventEmitter.event
    
    handleMessage(message: any) {
        if(message.type === 'request' && message.command === 'initialize') {
            // Immediately close the debug session, only the delegate session is necessary for debugging
            this.messageEventEmitter.fire({
                type: 'event',
                seq: 1,
                event: 'terminated'
            });
        }
    }
    
    dispose() {
        this.disposable?.dispose()
    }
}