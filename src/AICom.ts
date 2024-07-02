import axios, { AxiosInstance } from 'axios';
import { openAIKey } from './Secrets';
import * as vscode from 'vscode';
import { ProtocolMessage, Response, SetBreakpointsArguments } from './DebuggerProtocol';

export interface prompt {
  role?: string;
  cmd: string;
}

export interface PromptOptions {
  prompt: prompt;
  maxTokens?: number;
  temperature?: number;
}

function copyPromptOptionsForPrompt(prompt: PromptOptions, newPrompt: prompt): PromptOptions {
  return {
    prompt: newPrompt,
    maxTokens: prompt.maxTokens,
    temperature: prompt.temperature
  };
}

export interface AIService {
    sendPrompt(prompt: PromptOptions): Promise<string>;
}

const apiClient = axios.create({
  baseURL: "https://api.openai.com/v1/chat/completions",
  headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openAIKey}`,
  },
});


export class ChatGPTClient implements AIService {

  private conversationHistory: { role: string, content: string}[] = [ ];
  
  private apiKey: string;
  private apiUrl: string;
  private httpClient: AxiosInstance;

  constructor(apiKey: string = openAIKey) {
    //console.log("apikey:", apiKey);
    this.apiKey = apiKey;
    this.apiUrl = 'https://api.openai.com/v1/engines/gpt-3.5-turbo/completions';
    this.httpClient = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      }
    });
  }
  
  async sendPrompt(prompt: PromptOptions): Promise<string> {
        try {
        // Add the new prompt to the conversation history
        this.conversationHistory.push({
          role: prompt.prompt.role || 'user',
          content: prompt.prompt.cmd,
      });

      try {
          const response = await apiClient.post('', {
              model: 'gpt-4o',
              messages: this.conversationHistory,
              temperature: 0.1
          });

          const data = response.data;

          if (data.choices && data.choices.length > 0) {
              const reply = data.choices[0].message.content;
              // Add the assistants reply to the conversation history
              let saveRole: string = "";
              if (prompt.prompt.role === "user"){
                saveRole = "assistant";
              }else{
                saveRole = "system";
              }
              this.conversationHistory.push({
                  role: saveRole,
                  content: reply,
              });
              return reply.trim();
          } else {
              throw new Error('No response from the API');
          }
      } catch (error) {
          if (axios.isAxiosError(error)) {
              console.error('Axios error:', error.response?.data);
          } else {
              console.error('Unexpected error:', error);
          }
          throw error;
      }
    } catch (error) {
      console.error('Error sending prompt:', error);
      throw error;
    }
  }
}

// Use natural intelligence for better results
// ...
// Actually just for debugging purposes
export class ManualNIService implements AIService {
  async sendPrompt(prompt: PromptOptions): Promise<string> {
    return new Promise(resolve => {
      vscode.window.showInputBox({ prompt: prompt.prompt.cmd }).then(result => resolve(result!!));
    });
  }
}

export class AICmdContext {
  static NONE = new AICmdContext("At anytime, ");
  static PAUSED = new AICmdContext("When paused, ");
  static SETUP = new AICmdContext("Before starting debugging, ");
  static CAUSE_FOUND = new AICmdContext("Once you have determined the cause of the bug, ");

  constructor(public explanationPrefix: string) { }
}

export interface AICmd {
  context: AICmdContext;
  explanation: string;
  callback: (params: string, aiDebuggerService: AIDebuggerService) => Promise<string>;
  
}

export const aiCmdRegistry = new Map<string, AICmd>();

export function registerAICmd(id: string, cmd: (id: string) => AICmd) {
  aiCmdRegistry.set(id, cmd(id));
}

function getAbsoluteFilePath(file: string) {
  return vscode.workspace.findFiles(file).then(files => files[0].fsPath);
}

function getRelativeFilePath(file: string) {
  let uri: vscode.Uri;
  if(file.match(/^.*:\/\/\//)) {
    // Already has a file scheme
    uri = vscode.Uri.parse(file);
  } else {
    uri = vscode.Uri.file(file);
  }
  for(const folder of vscode.workspace.workspaceFolders || [ ]) {
    if(uri.fsPath.startsWith(folder.uri.fsPath)) {
      return uri.fsPath.slice(folder.uri.fsPath.length + 1 /*remove leading slash */);
    }
  }
  console.warn("Paused file path not in workspace:", file);
  return file;
}

export const aiNextCmdInstruction = `Proceed with your next action`;
export const aiPauseNotification = `PAUSED`;

export function createPauseNotification(line: number, column: number, file: string) {
  return `${aiPauseNotification} line=${line} column=${column} file=${getRelativeFilePath(file)}`;
}

registerAICmd('BREAKPOINT', id => ({
  context: AICmdContext.NONE,
  explanation: `you can set breakpoints in the code by starting your message with "${id}" followed by the line number and the file name.`,
  callback: async (params, aiDebuggerService) => {
    const [lineParam, fileParam] = params.trim().split(" ");
    const line = parseInt(lineParam.trim());
    const file = await getAbsoluteFilePath(fileParam.trim());
    let args = aiDebuggerService.existingBreakpoints.get(file);
    if(!args) {
      args = { source: { path: file } };
      aiDebuggerService.existingBreakpoints.set(file, args);
    }
    args.breakpoints ||= [ ];
    args.breakpoints.push({ line });
    const setBreakpointsResponse = await aiDebuggerService.grabDebuggerReponse(
      await aiDebuggerService.sendToDebugger!({
        type: "request",
        command: "setBreakpoints",
        seq: -1,
        arguments: args
      })
    );
    const newBreakpoint = setBreakpointsResponse.body.breakpoints.find((bp: any) => bp.line === line);
    aiDebuggerService.sendToEditor!({
      type: "event",
      event: "breakpoint",
      seq: -1,
      body: {
        reason: "new",
        breakpoint: newBreakpoint
      }
    });
    return `The breakpoint has been set. ` + aiNextCmdInstruction;
  }
}));
registerAICmd('LINE', id => ({
  context: AICmdContext.NONE,
  explanation: `you can retrieve a line of code by starting your message with "${id}" followed by the line number and the file url.`,
  callback: async (params, aiDebuggerService) => {
    const [lineNumber, url] = params.trim().split(" ");
    const fileContent = await aiDebuggerService.fileGetter(`file:///${await getAbsoluteFilePath(url)}`);
    const lineContent = fileContent.split("\n")[parseInt(lineNumber) - 1];
    return `THe line contains: ${lineContent}`;
  }
}));
registerAICmd('CONTINUE', id => ({
  context: AICmdContext.PAUSED,
  explanation: `you can continue the execution with the message "${id}".`,
  callback: async (_params, aiDebuggerService) => {
    const promise = aiDebuggerService.schedulePauseAINotification();
    aiDebuggerService.grabDebuggerReponse(
      await aiDebuggerService.sendToDebugger!({
        type: "request",
        command: "continue",
        seq: -1,
        arguments: { threadId: aiDebuggerService.stoppedThread }
      })
    );
    aiDebuggerService.notifyEditorOfContinue();
    return promise;
  }
}));
registerAICmd('STEP', id => ({
  context: AICmdContext.PAUSED,
  explanation: `you can step through the code with the message "${id}".`,
  callback: async (_params, aiDebuggerService) => {
    const promise = aiDebuggerService.schedulePauseAINotification();
    aiDebuggerService.grabDebuggerReponse(
      await aiDebuggerService.sendToDebugger!({
        type: "request",
        command: "next",
        seq: -1,
        arguments: { threadId: aiDebuggerService.stoppedThread }
      })
    );
    aiDebuggerService.notifyEditorOfContinue();
    return promise;
  }
}));
registerAICmd('STEPINTO', id => ({
  context: AICmdContext.PAUSED,
  explanation: `you can step into a function call with the message "${id}".`,
  callback: async (_params, aiDebuggerService) => {
    const promise = aiDebuggerService.schedulePauseAINotification();
    aiDebuggerService.grabDebuggerReponse(
      await aiDebuggerService.sendToDebugger!({
        type: "request",
        command: "stepIn",
        seq: -1,
        arguments: { threadId: aiDebuggerService.stoppedThread }
      })
    );
    aiDebuggerService.notifyEditorOfContinue();
    return promise;
  }
}));
registerAICmd('STEPOUT', id => ({
  context: AICmdContext.PAUSED,
  explanation: `you can step out of a function call with the message "${id}".`,
  callback: async (_params, aiDebuggerService) => {
    const promise = aiDebuggerService.schedulePauseAINotification();
    aiDebuggerService.grabDebuggerReponse(
      await aiDebuggerService.sendToDebugger!({
        type: "request",
        command: "stepOut",
        seq: -1,
        arguments: { threadId: aiDebuggerService.stoppedThread }
      })
    );
    aiDebuggerService.notifyEditorOfContinue();
    return promise;
  }
}));
registerAICmd('VARIABLE', id => ({
  context: AICmdContext.PAUSED,
  explanation: `you can read a variable value by starting your message with "${id}" followed by the variable name.`,
  callback: async (params, aiDebuggerService) => {
    const variable_name = params.trim();
    /*const scopes = await aiDebuggerService.grabDebuggerReponse(
      await aiDebuggerService.sendToDebugger!({
        type: "request",
        command: "scopes",
        seq: -1,
        arguments: { frameId: aiDebuggerService.topFrameId!! }
      })
    );
    const variables = await aiDebuggerService.grabDebuggerReponse(
      await aiDebuggerService.sendToDebugger!({
        type: "request",
        command: "variables",
        seq: -1,
        arguments: { variablesReference: scopes.body.scopes[0].variablesReference, filter: "named" }
      })
    );
    const value = variables.body.variables.find((variable: any) => variable.name === variable_name).value;*/
    const response = await aiDebuggerService.grabDebuggerReponse(
      await aiDebuggerService.sendToDebugger!({
        type: "request",
        command: "evaluate",
        seq: -1,
        arguments: { expression: variable_name, frameId: aiDebuggerService.topFrameId!! }
      })
    );
    return `The variable value of ${variable_name} is: ${response.body.result}`;
  }
}));
registerAICmd('ERROR', id => ({
  context: AICmdContext.SETUP,
  explanation: `if you are unable to debug the code, you can report an error by starting your message with "${id}" followed by a description of the problem.`,
  callback: async (params, aiDebuggerService) => {
    aiDebuggerService.hasErrored = true;
    vscode.window.showErrorMessage(`AI ERROR: ${params}`);
    console.log("AI ERROR:", params);
    return new Promise(() => { });
  }
}));
registerAICmd('CAUSE', id => ({
  context: AICmdContext.CAUSE_FOUND,
  explanation: `you can report it by starting your message with "${id}" followed by a description of the cause in short terms.`,
  callback: async (params) => {
    vscode.window.showInformationMessage(`AI determined cause of bug: ${params}`);
    console.log("AI CAUSE:", params);
    return new Promise(() => { });
  }
}));

function getCmdExplanationsForContext(context: AICmdContext) {
  return Array.from(aiCmdRegistry.values())
    .filter(cmd => cmd.context === context)
    .map(cmd => `${cmd.context.explanationPrefix}${cmd.explanation}`)
    .join("\n");
}

function createAIInstructionPrompt(userPrompt: PromptOptions) {
  return copyPromptOptionsForPrompt(userPrompt, {
    cmd: `
      You are a debugger. Your task is to debug a problem in running code.

      As a debugger, you are able to do the following things:
      
      ${getCmdExplanationsForContext(AICmdContext.NONE)}
      ${getCmdExplanationsForContext(AICmdContext.PAUSED)}

      When you send such a message, do not include any explanation, just the command.
      When you don't know the code at a certain line, use the "LINE" command to request it.

      As a debugger, you will receive the message ${aiPauseNotification} when the code execution is paused, followed by the line number, column number and the file name.
      
      The following bug is to be fixed: ${userPrompt.prompt.cmd}

      Start with debugging the code by setting breakpoints. Afterwards, you can start code execution with the message "CONTINUE".
      ${getCmdExplanationsForContext(AICmdContext.CAUSE_FOUND)}
      ${getCmdExplanationsForContext(AICmdContext.SETUP)}
    `,
    role: "system"
  });
}

export class AIDebuggerService {
  public hasErrored = false;
  public stoppedThread?: number;
  public sendToEditor?: (message: ProtocolMessage) => Promise<number>;
  public sendToDebugger?: (message: ProtocolMessage) => Promise<number>;
  public topFrameId?: number;
  public existingBreakpoints = new Map<string, SetBreakpointsArguments>();
  
  private hasStarted = false;

  private scheduledPauseAINotificationCallback?: (prompt: string) => void;
  private hasEnteredPauseForNotification = false;

  private debuggerResponsesCallback = new Map<number, (response: Response) => void>();

  constructor(
    public aiService: AIService,
    public fileGetter: (url: string) => Thenable<string>,
    private initialPrompt: PromptOptions
  ) { }

  setMessageSenders(sendToEditor: (message: ProtocolMessage) => Promise<number>, sendToDebugger: (message: ProtocolMessage) => Promise<number>) {
    this.sendToEditor = sendToEditor;
    this.sendToDebugger = sendToDebugger;
  }

  grabDebuggerReponse(requestSeq: number): Promise<Response> {
    return new Promise(resolve => {
      this.debuggerResponsesCallback.set(requestSeq, resolve);
    });
  }

  onEditorMessage(message: ProtocolMessage): boolean {
    console.log("EDITOR:", JSON.stringify(message));
    if(message.type === "request" && message.command === "setBreakpoints") {
      const args = message.arguments as SetBreakpointsArguments;
      this.existingBreakpoints.set(args.source.path!!, args);
    }
    return true;
  }

  onDebuggerMessage(message: ProtocolMessage): boolean {
    console.log("DEBUGGER:", JSON.stringify(message));
    if(message.type === "response") {
      const callback = this.debuggerResponsesCallback.get(message.request_seq);
      if(callback) {
        callback(message);
        this.debuggerResponsesCallback.delete(message.request_seq);
        return false;
      }
    }
    if(message.type === "event" && message.event === "stopped") {
      if(!this.hasStarted) {
        this.hasStarted = true;
        console.log("INITIAL:", this.initialPrompt);
        this.aiService.sendPrompt(createAIInstructionPrompt(this.initialPrompt))
          .then(response => this.handleAiResponse(response));
      }
      this.hasEnteredPauseForNotification = true;
      this.stoppedThread = message.body.threadId;
    } else if(this.hasEnteredPauseForNotification && message.type === "response" && message.command === "stackTrace") {
      this.hasEnteredPauseForNotification = false;
      const frame = message.body.stackFrames[0];
      this.topFrameId = frame.id;
      if(this.scheduledPauseAINotificationCallback) {
        this.scheduledPauseAINotificationCallback(createPauseNotification(frame.line, frame.column, frame.source.path));
      }
    }
    return true;
  }
  
  notifyEditorOfContinue() {
    this.sendToEditor!({ type: "event", event: "continued", seq: -1, body: { threadId: this.stoppedThread } });
  }
  
  schedulePauseAINotification(): Promise<string> {
    return new Promise(resolve => {
      this.scheduledPauseAINotificationCallback = resolve;
    });
  }

  handleAiResponse(response: string) {
    console.log("RESPONSE:", response);
    const cmdEnd = response.indexOf(' ');
    const cmd = cmdEnd === -1 ? response : response.slice(0, cmdEnd);
    const params = cmdEnd === -1 ? '' : response.slice(cmdEnd + 1);
    const aiCmd = aiCmdRegistry.get(cmd.toUpperCase());
    if(aiCmd) {
      aiCmd.callback(params, this).then(response => {
        console.log("PROMPT:", response);
        this.aiService.sendPrompt(copyPromptOptionsForPrompt(this.initialPrompt, { cmd: response }))
          .then(response => this.handleAiResponse(response));
      });
      return;
    }
    console.error("AI SEND UNKNOWN COMMAND");
    this.aiService.sendPrompt(copyPromptOptionsForPrompt(this.initialPrompt, { cmd: `Your messages contains an unknown command. As a debugger, you are only able to do the aforementioned actions. ` + aiNextCmdInstruction }))
      .then(response => this.handleAiResponse(response));
  }
}