// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Socket } from 'net';
import { ChildProcess } from 'child_process';
import { PassThrough }from 'stream';
import { DebugAdapterInlineImplementation } from 'vscode';
import { wrapDebugAdapter, wrapDebugAdapterStreams } from './DebuggerMiddleware';
import { DummyDebugAdapter } from './DummyDebugAdapter';
import { aiCmdRegistry, AIDebuggerService, ChatGPTClient, ChatGPTClientAdmin, CoderClient, ManualNIService } from './AICom';
import { File } from 'buffer';
const net = require('net');
//const cp = require('child_process');
import * as cp from 'child_process';
import { AITerminal } from './AITerminal';
const diagnostics_channel = require("diagnostics_channel")

function readSourceFile(url: string): Thenable<string> {
	return vscode.workspace.fs.readFile(vscode.Uri.parse(url)).then(buffer => buffer.toString())
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	let currentAIDebuggerService: AIDebuggerService | undefined;
	context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory('ai-debugger', {
		createDebugAdapterDescriptor: function (session: vscode.DebugSession, executable: vscode.DebugAdapterExecutable | undefined): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
			currentAIDebuggerService?.dispose()
			currentAIDebuggerService = undefined;

			console.log("Starting AI Debugger...");

			const delegate = session.configuration.delegate;
			const prompt = session.configuration.prompt as string;
			const aiDebuggerService = new AIDebuggerService(
				new CoderClient("localhost"),
				new ChatGPTClientAdmin(),
				// Using only vscode.workspace.fs doesn't work for source references, but introducing the ai to source references would make things more complicated. Ignoring them for now...
				readSourceFile,
				{
					prompt: { cmd: prompt }
				}
			);
			currentAIDebuggerService = aiDebuggerService;
			const dummyAdapter = new DummyDebugAdapter();
			const dummyInlineImplementation = new vscode.DebugAdapterInlineImplementation(dummyAdapter);
			dummyAdapter.disposable = injectDebuggerMiddleware(aiDebuggerService);
			vscode.debug.startDebugging(session.workspaceFolder, delegate, session);
			return dummyInlineImplementation;
		}
	}));
	context.subscriptions.push(vscode.debug.onDidTerminateDebugSession(() => currentAIDebuggerService?.exit()))
	context.subscriptions.push({
		dispose() {
			currentAIDebuggerService?.dispose();
		}
	});
}

// This method is called when your extension is deactivated
export function deactivate() {}

type Mutable<T> = {
	-readonly [K in keyof T]: T[K] 
}

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
	const childProcessSpawn = (cp.ChildProcess.prototype as any).spawn;
	(cp.ChildProcess.prototype as any).spawn = function(...args: any[]) {
		console.log("spawn");
		const res: any = childProcessSpawn.apply(this, args);
		const wrapped = wrapDebugAdapterStreams({
			stdin: this.stdin!,
			stdout: this.stdout!
		}, aiDebuggerService);
		Object.assign(this, wrapped);
		return res;
	};
	const inlineImplementationConstructor = DebugAdapterInlineImplementation.prototype.constructor;
	DebugAdapterInlineImplementation.prototype.constructor = function(debugAdapter: vscode.DebugAdapter) {
		console.log("DebugAdapterInlineImplementation");
		inlineImplementationConstructor.apply(this, [wrapDebugAdapter(debugAdapter, aiDebuggerService)]);
	};

	return {
		dispose(): void {
			net.createConnection = createConnection;
			(cp.ChildProcess.prototype as any).spawn = childProcessSpawn;
			DebugAdapterInlineImplementation.prototype.constructor = inlineImplementationConstructor;
		}
	};
}