import { PassThrough } from 'stream';
import * as vscode from 'vscode';

export interface DebuggerStreams {
	stdin: NodeJS.WritableStream;
	stdout: NodeJS.ReadableStream;
}

//Mostly copied from https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/debug/node/debugAdapter.ts#L22
export class StreamDebugAdapter implements vscode.DebugAdapter {
	
	private static readonly TWO_CRLF = '\r\n\r\n';
	private static readonly HEADER_LINESEPARATOR = /\r?\n/;	// allow for non-RFC 2822 conforming line separators
	private static readonly HEADER_FIELDSEPARATOR = /: */;

	private readonly onDidSendMessageEmitter = new vscode.EventEmitter<vscode.DebugProtocolMessage>();

	private rawData = Buffer.allocUnsafe(0);
	private contentLength = -1;

	readonly onDidSendMessage = this.onDidSendMessageEmitter.event;

	constructor(private readonly streams: DebuggerStreams) {
		streams.stdout.on('data', (data: Buffer) => this.handleData(data));
	}

	private handleData(data: Buffer) {
		this.rawData = Buffer.concat([this.rawData, data]);

		while (true) {
			if (this.contentLength >= 0) {
				if (this.rawData.length >= this.contentLength) {
					const message = this.rawData.toString('utf8', 0, this.contentLength);
					this.rawData = this.rawData.slice(this.contentLength);
					this.contentLength = -1;
					if (message.length > 0) {
						try {
							this.onDidSendMessageEmitter.fire(<vscode.DebugProtocolMessage>JSON.parse(message));
						} catch (e: any) {
							console.error('Error handling data from AI-wrapped debug adapter:', e);
							this.streams.stdin.write(`Content-Length: ${this.contentLength}${StreamDebugAdapter.TWO_CRLF}${message}`, 'utf8');
						}
					}
					continue;	// there may be more complete messages to process
				}
			} else {
				const idx = this.rawData.indexOf(StreamDebugAdapter.TWO_CRLF);
				if (idx !== -1) {
					const header = this.rawData.toString('utf8', 0, idx);
					const lines = header.split(StreamDebugAdapter.HEADER_LINESEPARATOR);
					for (const h of lines) {
						const kvPair = h.split(StreamDebugAdapter.HEADER_FIELDSEPARATOR);
						if (kvPair[0] === 'Content-Length') {
							this.contentLength = Number(kvPair[1]);
						}
					}
					this.rawData = this.rawData.slice(idx + StreamDebugAdapter.TWO_CRLF.length);
					continue;
				}
			}
			break;
		}
	}

	handleMessage(message: vscode.DebugProtocolMessage): void {
		const json = JSON.stringify(message);
		this.streams.stdin.write(`Content-Length: ${Buffer.byteLength(json, 'utf8')}${StreamDebugAdapter.TWO_CRLF}${json}`, 'utf8');
	}

	dispose() {
		this.onDidSendMessageEmitter.dispose();
	}
}

export function wrapDebugAdapterStreams(streams: DebuggerStreams): DebuggerStreams {
	const inputAdapter = new StreamDebugAdapter(streams);
	const resultPassThroughIn = new PassThrough();
	const resultPassThroughOut = new PassThrough();
	const resultDebugAdapter = new StreamDebugAdapter({
		stdin: resultPassThroughIn,
		stdout: resultPassThroughOut
	});
	const wrappedDebugAdapter = wrapDebugAdapter(inputAdapter);
	wrappedDebugAdapter.onDidSendMessage((message: vscode.DebugProtocolMessage) => {
		resultDebugAdapter.handleMessage(message);
	});
	resultDebugAdapter.onDidSendMessage((message: vscode.DebugProtocolMessage) => {
		wrappedDebugAdapter.handleMessage(message);
	});
	return {
		stdin: resultPassThroughOut,
		stdout: resultPassThroughIn
	};
}

export function wrapDebugAdapter(debugAdapter: vscode.DebugAdapter): vscode.DebugAdapter {
	const wrappedOnDidSendMessage = new vscode.EventEmitter<vscode.DebugProtocolMessage>();
	debugAdapter.onDidSendMessage((message: vscode.DebugProtocolMessage) => {
		console.log("onDidSendMessage", message);
		wrappedOnDidSendMessage.fire(message);
	});
	return {
		onDidSendMessage: wrappedOnDidSendMessage.event,
		handleMessage: (message: vscode.DebugProtocolMessage) => {
			console.log("handleMessage", message);
			return debugAdapter.handleMessage(message);
		},
		dispose: () => {
			wrappedOnDidSendMessage.dispose();
		}
	};
}