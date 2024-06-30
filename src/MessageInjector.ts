import AsyncLock from "async-lock";
import { ProtocolMessage } from "./DebuggerProtocol";

// Maps seq values from debug adapter protocol messages, so additional messages can be injected
export class MessageInjector {
    private nextSourceSeq = 1;
    private nextTargetSeq = 1;
    private sourceMessageQueue: (ProtocolMessage | null | RemovedMessage)[] = [ ];
    private pendingRequestsMapping = new Map<number, number>();

    private messageSenderLock = new AsyncLock();

    constructor(private messageSender: (message: ProtocolMessage) => void) { }

    private addToQueue(seq: number, message: ProtocolMessage | RemovedMessage) {
        this.messageSenderLock.acquire('send', async () => {
            const index = seq - this.nextSourceSeq;
            while(index >= this.sourceMessageQueue.length) {
                this.sourceMessageQueue.push(null);
            }
            this.sourceMessageQueue[index] = message;

            this.sendMessages();
        });
    }

    mapIfResponse(message: ProtocolMessage): void {
        if(message.type === 'response') {
            const seq = this.pendingRequestsMapping.get(message.request_seq)!!;
            this.pendingRequestsMapping.delete(message.request_seq);
            message.request_seq = seq;
        }
    }

    queueMessage(message: ProtocolMessage): void {
        this.addToQueue(message.seq, message);
    }

    removeMessage(seq: number): void {
        this.addToQueue(seq, RemovedMessage.Instance);
    }

    private sendMessages() {
        while(this.sourceMessageQueue.length !== 0 && this.sourceMessageQueue[0] !== null) {
            const message = this.sourceMessageQueue.shift()!!;
            if(message === RemovedMessage.Instance) {
                this.nextSourceSeq++;
                continue;
            }
            if(message.type === 'request') {
                this.pendingRequestsMapping.set(this.nextTargetSeq, this.nextSourceSeq);
            }
            this.nextSourceSeq++;
            message.seq = this.nextTargetSeq++;
            this.messageSender(message);
        }
    }

    injectMessage(message: ProtocolMessage): Promise<number> {
        return this.messageSenderLock.acquire('send', async () => {
            message.seq = this.nextTargetSeq++;
            console.log("injecting message", message);
            this.messageSender(message);
            return message.seq;
        });
    }
}

enum RemovedMessage { Instance }