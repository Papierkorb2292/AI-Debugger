// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Socket } from 'net';
import { ChildProcess } from 'child_process';
import { PassThrough }from 'stream';
import { DebugAdapterInlineImplementation } from 'vscode';
import { wrapDebugAdapter, wrapDebugAdapterStreams } from './DebuggerMiddleware';
import { DummyDebugAdapter } from './DummyDebugAdapter';
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

	context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory('ai-debugger', {
		createDebugAdapterDescriptor: function (session: vscode.DebugSession, executable: vscode.DebugAdapterExecutable | undefined): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
			const delegate = session.configuration.delegate;
			const prompt = session.configuration.prompt;
			const dummyAdapter = new DummyDebugAdapter();
			const dummyInlineImplementation = new vscode.DebugAdapterInlineImplementation(dummyAdapter);
			dummyAdapter.disposable = injectDebuggerMiddleware()
			vscode.debug.startDebugging(session.workspaceFolder, delegate, session)
			return dummyInlineImplementation;
		}
	}));
}

// This method is called when your extension is deactivated
export function deactivate() {}

function injectDebuggerMiddleware(): { dispose(): void } {
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

	return {
		dispose(): void {
			net.createConnection = createConnection;
			cp.spawn = spawn;
			cp.fork = fork;
		}
	};
}