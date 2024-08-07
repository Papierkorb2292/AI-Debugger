// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Socket } from 'net';
import { ChildProcess } from 'child_process';
import { PassThrough }from 'stream';
import { DebugAdapterInlineImplementation } from 'vscode';
import { wrapDebugAdapter, wrapDebugAdapterStreams } from './DebuggerMiddleware';
import { DummyDebugAdapter } from './DummyDebugAdapter';
import { AIDebuggerService, ChatGPTClient, ManualNIService } from './AICom';
import { File } from 'buffer';
const net = require('net');
const cp = require('child_process');

function readSourceFile(url: string): Thenable<string> {
	return vscode.workspace.fs.readFile(vscode.Uri.parse(url)).then(buffer => buffer.toString())
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory('ai-debugger', {
		createDebugAdapterDescriptor: function (session: vscode.DebugSession, executable: vscode.DebugAdapterExecutable | undefined): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
			console.log("Starting AI Debugger...");
			const delegate = session.configuration.delegate;
			const prompt = session.configuration.prompt as string;
			const aiDebuggerService = new AIDebuggerService(
				new ChatGPTClient(),
				// Using only vscode.workspace.fs doesn't work for source references, but introducing the ai to source references would make things more complicated. Ignoring them for now...
				readSourceFile,
				{
					prompt: { cmd: prompt }
				}
			);
			const dummyAdapter = new DummyDebugAdapter();
			const dummyInlineImplementation = new vscode.DebugAdapterInlineImplementation(dummyAdapter);
			dummyAdapter.disposable = injectDebuggerMiddleware(aiDebuggerService);
			vscode.debug.startDebugging(session.workspaceFolder, delegate, session);
			return dummyInlineImplementation;
		}
	}));
}

// This method is called when your extension is deactivated
export function deactivate() {}

function injectDebuggerMiddleware(aiDebuggerService: AIDebuggerService): { dispose(): void } {
	const createConnection = net.createConnection;
	net.createConnection = function(...args: any[]) {
		console.log("createConnection");
		const connection: Socket = createConnection.apply(this, args);
		const wrapped = wrapDebugAdapterStreams({
			stdin: connection,
			stdout: connection
		}, aiDebuggerService);
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
		}, aiDebuggerService);
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
		}, aiDebuggerService);
		Object.assign(child, wrapped);
		return child;
	};
	
	const inlineImplementationConstructor = DebugAdapterInlineImplementation.prototype.constructor;
	DebugAdapterInlineImplementation.prototype.constructor = function(debugAdapter: vscode.DebugAdapter) {
		console.log("DebugAdapterInlineImplementation");
		inlineImplementationConstructor.apply(this, [wrapDebugAdapter(debugAdapter, aiDebuggerService)]);
	};

	return {
		dispose(): void {
			net.createConnection = createConnection;
			cp.spawn = spawn;
			cp.fork = fork;
		}
	};
}