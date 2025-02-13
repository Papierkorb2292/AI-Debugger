import axios, { AxiosInstance } from 'axios';

import { openAIKey, openAIAdminKey } from './Secrets'; 

import * as vscode from 'vscode';
import { ProtocolMessage, Response, SetBreakpointsArguments } from './DebuggerProtocol';
import { AITerminal, AITerminalMessage } from './AITerminal';
import { exit } from 'process';
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
    sendPrompt(prompt: PromptOptions, terminalMessageCallback: (msg: AITerminalMessage) => void): Promise<string>;
}
export interface AIAdminService{
    getBalance(terminalMessageCallback: (msg: AITerminalMessage) => void): Promise<number>;
}

const apiClient = axios.create({
  baseURL: "https://api.openai.com/v1/chat/completions",
  headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openAIKey}`,
  },
});
const apiClientAdmin = axios.create({
  baseURL: "https://api.openai.com/v1",
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${openAIAdminKey}`,
},
});

export class ChatGPTClientAdmin implements AIAdminService{
  async getBalance(terminalMessageCallback: (msg:AITerminalMessage) => void): Promise<number> {
    try {
      const response = await apiClientAdmin.get("/dashboard/billing/credit_grants");
      terminalMessageCallback({"role": "info", content: "current balance: " + response.data.total_available})
      return response.data.total_available;
    } catch (error: any) {
      console.error(`Error: ${error.response?.status}, ${error.response?.data || error.message}`);
      return 404;
    }
  }
}

// TODO remove or rework code (3.5 in url is not optimal)
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
  
  async sendPrompt(prompt: PromptOptions, terminalMessageCallback: (msg: AITerminalMessage) => void): Promise<string> {
        try {
        // Add the new prompt to the conversation history
        this.conversationHistory.push({
          role: prompt.prompt.role || 'user',
          content: prompt.prompt.cmd,
      });

      try {
          const inputData = {
            model: 'gpt-4o', // maybe mini? check results
            messages: this.conversationHistory,
            temperature: 0
          };

          const response = await apiClient.post('', inputData).catch(async (err) => {
            if(err.response && err.response.status === 429) {
              const waitTimeSeconds = err.response.headers['retry-after'] || 60;
              terminalMessageCallback({ role: "info", content: `Hit OpenAI request limit, waiting ${waitTimeSeconds}s...`})
              console.log(`WARN: Hit OpenAI request limit, waiting ${waitTimeSeconds}s...`)
              await new Promise(r => setTimeout(r, waitTimeSeconds*1000));
              return apiClient.post('', inputData);
            } else {
              throw err;
            }
          });
          const data = response.data;
          console.log("API USAGE:", data.usage)
          terminalMessageCallback({ role: "info", content: `Token amount: ${data.usage.total_tokens}`})
          if (data.choices && data.choices.length > 0) {
              const reply = data.choices[0].message.content;
              // Add the assistants reply to the conversation history
              this.conversationHistory.push({
                  role: "assistant",
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

function getAbsoluteFilePath(file: string): Thenable<string | undefined> {
  return vscode.workspace.findFiles(file).then(files => files[0]?.fsPath);
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
  return `${aiPauseNotification} on line ${line} in file=${getRelativeFilePath(file)}`;
}

registerAICmd('BREAKPOINT', id => ({
  context: AICmdContext.NONE,
  explanation: `you can set breakpoints in the code by starting your message with "${id}" followed by the line number and the file name.`,
  callback: async (params, aiDebuggerService) => {
    const [lineParam, fileParam] = params.trim().split(" ");
    const line = parseInt(lineParam.trim());
    const file = await getAbsoluteFilePath(fileParam.trim());
    if(!file) {
      return "There exists no such file. ";
    }
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
    return `The breakpoint has been set. `;
  }
}));
registerAICmd('LINE', id => ({
  context: AICmdContext.NONE,
  explanation: `you can retrieve a line of code by starting your message with "${id}" followed by the line number and the file url. Only use file paths known to you.`,
  callback: async (params, aiDebuggerService) => {
    const [lineNumber, url] = params.trim().split(" ");
    const filePath = await getAbsoluteFilePath(url);
    if(!filePath) {
      return "There is no such file.";
    }
    const fileContent = await aiDebuggerService.fileGetter(filePath.startsWith("/") ? `file://${filePath}` : `file:///${filePath}`);
    const lineContent = fileContent.split("\n")[parseInt(lineNumber) - 1];
    return `The line contains: ${lineContent}`;
  }
}));
registerAICmd('CONTINUE', id => ({
  context: AICmdContext.PAUSED,
  explanation: `you can continue the execution with the message "${id}". Only do this if you know a breakpoint will be hit.`,
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
  explanation: `you can step out of a function call with the message "${id}". This will only pause after the method you are in is done. Stepping out when you are not in a method call will stop the entire program, so only step out when you are sure you are in a method.`,
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
registerAICmd('EVAL', id => ({
  context: AICmdContext.PAUSED,
  explanation: `you can evaluate an expression by starting your message with "${id}" followed by the expression. Use this to keep track of variables after they have been assigned.`,
  callback: async (params, aiDebuggerService) => {
    const variable_name = params.trim();
    const evaluation = await aiDebuggerService.grabDebuggerReponse(
      await aiDebuggerService.sendToDebugger!({
        type: "request",
        command: "evaluate",
        seq: -1,
        arguments: { expression: variable_name, frameId: aiDebuggerService.topFrameId!! }
      })
    );
    const children = evaluation.body.variablesReference == 0 ? [] : (await aiDebuggerService.grabDebuggerReponse(
      await aiDebuggerService.sendToDebugger!({
        type: "request",
        command: "variables",
        seq: -1,
        arguments: { variablesReference: evaluation.body.variablesReference }
      })
    )).body.variables;
    let childrenString = "";
    if(children.length === 0) {
      childrenString = `This value has no children`;
    } else if(children.some((variable: any) => variable.name === "0")) {
      const highestIndex = children.reduce((maxIndex: number, variable: any) => {
        const index = parseInt(variable.name);
        return isNaN(index) ? maxIndex : Math.max(maxIndex, index);
      }, 0);
      childrenString = `This value is indexable from 0 to ${highestIndex}`;
    } else{
      childrenString = `This value has the following properties: ${children.map((variable: any) => variable.name).join(", ")}`;
    }
    return `The value of ${variable_name} is: ${evaluation.body.result}. ${childrenString}`;
  }
}));
registerAICmd('ERROR', id => ({
  context: AICmdContext.SETUP,
  explanation: `if you are unable to debug the code, you can report an error by starting your message with "${id}" followed by a description of the problem.`,
  callback: async (params, aiDebuggerService) => {
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

function removeLeadingSpaces(input: string): string {
  let lines = input.split("\n")
  for(let i = 0; i < lines.length; i++) {
    lines[i] = lines[i].trimStart()
  }
  return lines.join("\n")
}

function createAIInstructionPrompt(userPrompt: PromptOptions) {
  return copyPromptOptionsForPrompt(userPrompt, {
    cmd: removeLeadingSpaces(`
      You are a debugger. Your task is to debug a problem in running code.

      As a debugger, you are able to do the following things:
      
      ${getCmdExplanationsForContext(AICmdContext.NONE)}
      ${getCmdExplanationsForContext(AICmdContext.PAUSED)}

      You generate only exactly one command at a time without any explanation.

      As a debugger, you will receive the message ${aiPauseNotification} when the code execution is paused, followed by the line number and the file name of the code that will be executed next.

      Always request lines of code immediately before, immediately after and directly at the pause location using the LINE command. Keep requested line to a minimum.
      Be aware that lines before or after the current line might be part of different scopes.
      A line is only executed once you step over it. Variables are undefined when paused at their assignment, step over the assignment to read their value.
      Make sure not to step over lines that throw errors.
      
      Go through the code step by step and step into functions to determine the cause of the bug. Read the values of variables and function parameters.
      The following bug is to be fixed: ${userPrompt.prompt.cmd}

      Start with debugging the code by setting breakpoints. Afterwards, you can start code execution with the message "CONTINUE".
      Afterwards, start stepping through the code using STEP, STEPINTO and STEPOUT.
      Set breakpoints to skip over irrelevant loops. Use the LINE command to get the next few lines to determine the line number for this breakpoint.
      Stepout will step out of entire methods, not only step out of the loop, so breakpoints must be used to skip only loops.
      ${getCmdExplanationsForContext(AICmdContext.CAUSE_FOUND)}
      ${getCmdExplanationsForContext(AICmdContext.SETUP)}
    `),
    role: "system"
  });
}

export class AIDebuggerService implements vscode.Disposable {
  public stoppedThread?: number;
  public sendToEditor?: (message: ProtocolMessage) => Promise<number>;
  public sendToDebugger?: (message: ProtocolMessage) => Promise<number>;
  public topFrameId?: number;
  public existingBreakpoints = new Map<string, SetBreakpointsArguments>();
  
  private hasStarted = false;

  private scheduledPauseAINotificationCallback?: (prompt: string) => void;
  private hasEnteredPauseForNotification = false;

  private debuggerResponsesCallback = new Map<number, (response: Response) => void>();
  private lastPauseLine?: number;

  private pausedRunStepPromise?: Promise<void>
  
  private terminalAddMessageEventEmitter = new vscode.EventEmitter<AITerminalMessage>()
  private readonly aiTerminal: AITerminal;
  private readonly addTerminalMessage: (msg: AITerminalMessage) => void = msg => this.terminalAddMessageEventEmitter.fire(msg)

  private shouldExit = false;
  private oldBalance: number = 0;

  constructor(
    public aiService: AIService,
    public aiAdminService: AIAdminService,
    public fileGetter: (url: string) => Thenable<string>,
    private initialPrompt: PromptOptions,
  ) {
    const _this = this;
    this.aiTerminal = new AITerminal({
      addMessageEvent: this.terminalAddMessageEventEmitter.event,
      onClose() {
        _this.shouldExit = true
      },
      onPause() {
        const callback = {
          resolve: () => {},
          createNewPausePromise() {
            _this.pausedRunStepPromise = new Promise<void>(resolve => {
              callback.resolve = resolve
            })
          },

          onStep() {
            const previousResolve = this.resolve;
            this.createNewPausePromise()
            previousResolve()
          },
          onContinue() {
            _this.pausedRunStepPromise = undefined;
            this.resolve()
          }
        }
        callback.createNewPausePromise()
        return callback;
      }
    });

    this.initializeBalance();
  }

  private async initializeBalance() {
    try {
      this.oldBalance = await this.aiAdminService.getBalance(this.addTerminalMessage);
      console.log(`Old balance: ${this.oldBalance}`);
      if (this.oldBalance < 0.20){
        console.error("Insufficient balance, please top up your account.");
        exit(1);
      }
    } catch (error) {
      console.error("Error fetching balance", error);
    }
  }


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
        this.aiTerminal.focus();
        const instructionPrompt = createAIInstructionPrompt(this.initialPrompt)
        console.log("AI INSTRUCTION:", instructionPrompt);
        this.addTerminalMessage({role: "system", content: instructionPrompt.prompt.cmd})
        // Delay because vscode.workspace.findFiles doesn't work immediately after starting a debugger
        // I don't see any api callback that would fix this, so setTimeout it is
        setTimeout(() => {
          this.aiService.sendPrompt(createAIInstructionPrompt(this.initialPrompt), this.addTerminalMessage)
            .then(response => this.handleAiResponse(response));
        }, 2000)
      }
      this.hasEnteredPauseForNotification = true;
      this.stoppedThread = message.body.threadId;
    } else if(this.hasEnteredPauseForNotification && message.type === "response" && message.command === "stackTrace") {
      this.hasEnteredPauseForNotification = false;
      const frame = message.body.stackFrames[0];
      this.topFrameId = frame.id;
      if(this.lastPauseLine !== frame.line) {
        this.lastPauseLine = frame.line
        if(this.scheduledPauseAINotificationCallback) {
          this.scheduledPauseAINotificationCallback(createPauseNotification(frame.line, frame.column, frame.source.path));
        }
      } else {
        // The AI expects to skip an entire line, so we step until the next line is reached
        this.sendToDebugger!({
          type: "request",
          command: "next",
          seq: -1,
          arguments: { threadId: this.stoppedThread }
        })
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
    console.log("AI RESPONSE:", response);
    this.addTerminalMessage({role: "assistent", content: response})
    const cmdEnd = response.indexOf(' ');
    const cmd = cmdEnd === -1 ? response : response.slice(0, cmdEnd);
    const params = cmdEnd === -1 ? '' : response.slice(cmdEnd + 1);
    const aiCmd = aiCmdRegistry.get(cmd.toUpperCase());
    if(aiCmd) {
      aiCmd.callback(params, this).then(response => {
        console.log("AI PROMPT:", response);
        if(this.shouldExit) {
          console.log("AI EXITED");
          return;
        }
        this.addTerminalMessage({role: "user", content: response})
        const sendPrompt = () => this.aiService.sendPrompt(copyPromptOptionsForPrompt(this.initialPrompt, { cmd: response }), this.addTerminalMessage)
          .then(response => this.handleAiResponse(response));
        if(this.pausedRunStepPromise) {
          this.pausedRunStepPromise.then(sendPrompt)
        } else {
          sendPrompt()
        }
      });
      return;
    }
    console.error("AI SEND UNKNOWN COMMAND");
    this.aiService.sendPrompt(copyPromptOptionsForPrompt(this.initialPrompt, { cmd: `Your messages contains an unknown command. As a debugger, you are only able to do the aforementioned actions. ` + aiNextCmdInstruction }), this.addTerminalMessage)
      .then(response => this.handleAiResponse(response));
  }

  dispose() {
    this.aiTerminal.dispose()
    this.exit()
  }

  exit() {
    this.shouldExit = true;
    const newBalance: number = this.oldBalance - (this.aiAdminService.getBalance(this.addTerminalMessage) as any)
    this.addTerminalMessage(("newBalance" + newBalance) as any)
  }
}