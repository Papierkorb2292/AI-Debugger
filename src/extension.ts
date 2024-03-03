// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Socket } from 'net';
import { ChildProcess } from 'child_process';
import { PassThrough }from 'stream';
import { DebugAdapterInlineImplementation } from 'vscode';
const net = require('net');
const cp = require('child_process');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "ai-debugger" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('ai-debugger.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from AI Debugger!');
	});

	context.subscriptions.push(disposable);

	const createConnection = net.createConnection;
	net.createConnection = function(...args: any[]) {
		console.log("createConnection");
		const connection: Socket = createConnection.apply(this, args);
		const wrapped = wrapDebugAdapterStreams({
			stdin: connection,
			stdout: connection
		});
		Object.assign(connection, wrapped.stdin, wrapped.stdout);
		return connection;
	};

	const spawn = cp.spawn;
	cp.spawn = function(...args: any[]) {
		console.log("spawn");
		const child: ChildProcess = spawn.apply(this, args);
		const wrapped = wrapDebugAdapterStreams({
			stdin: child.stdin!,
			stdout: child.stdout!
		});
		Object.assign(child, wrapped);
		return child;
	};

	const fork = cp.fork;
	cp.fork = function(...args: any[]) {
		console.log("fork");
		const child: ChildProcess = fork.apply(this, args);
		const wrapped = wrapDebugAdapterStreams({
			stdin: child.stdin!,
			stdout: child.stdout!
		});
		Object.assign(child, wrapped);
		return child;
	};
	
	const inlineImplementationConstructor = DebugAdapterInlineImplementation.prototype.constructor;
	DebugAdapterInlineImplementation.prototype.constructor = function(debugAdapter: vscode.DebugAdapter) {
		console.log("DebugAdapterInlineImplementation");
		inlineImplementationConstructor.apply(this, [wrapDebugAdapter(debugAdapter)]);
	};

	context.subscriptions.push({
		dispose() {
			net.createConnection = createConnection;
			cp.spawn = spawn;
			cp.fork = fork;
		}
	});
}

interface DebuggerStreams {
	stdin: NodeJS.WritableStream;
	stdout: NodeJS.ReadableStream;
}

//Mostly copied from https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/debug/node/debugAdapter.ts#L22
class StreamDebugAdapter implements vscode.DebugAdapter {
	
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

function wrapDebugAdapterStreams(streams: DebuggerStreams): DebuggerStreams {
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

function wrapDebugAdapter(debugAdapter: vscode.DebugAdapter): vscode.DebugAdapter {
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

// This method is called when your extension is deactivated
export function deactivate() {}
