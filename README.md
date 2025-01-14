# AI Debugger VSCode Extension

This is being developed as a JugendForscht project. The corresponding documentation for it can be found under `JugendForscht/JugendForscht.tex` (in German).

## Introduction

Existing coding AIs, like Devin, are able to debug code by adding print statements to it. In contrast, the idea of this project is letting an AI control an actual VSCode debug process through means of the debug adapter protocol. To do this, the AI needs a bug description from the user and can then, after having stepped through the code, report its findings back to the user.

Note that that, at the moment, the AI doesn't seem to be able to solve more complex bugs, especially when data structures are involved, to which the AI doesn't have a good access. Examples of bugs the AI was and wasn't able to solve, can be found in `testWorkspace/test.py`.

Also note that the AI has only been tested together with the python debugger. There's no guarentee that injecting the AI communication works with every debugger.

## Usage

This extension doesn't provide its own AI. Thus, if you want to try it out, you must already have access to an LLM. Because we are currently using ChatGPT-4o, the code to communicate with it already exists in the extension. To use it, you must create a `src/Secrets.ts` file and add your OpenAI API key to it: `export const openAIKey = "..."`. Note that we don't provide any guarantee concerning the amount of tokens send to the AI. However, if you'd like to use another AI, you can instead implement the `AIService` interface yourself and replace the `ChatGPTClient` in `extension.ts:44` with it.

Now, when running the extension, a new launch configuration should be accessible, which you can access in your `launch.json` file through `Add Configuration` -> `AI Debugger` and then typing the name of another launch configuration that should be used as the delegate, which means this other launch configuration will be run with an AI attached, when the AI launch configuration is started.

To let the AI try to find the cause of a bug, you should first fill in the `"prompt"` property in the new launch configuration with a description of where and what the bug is. This should include a file name (relative to the workspace folder) as well as a line number. To give the AI a simple entry point to the code, we recommend to point it to tests that reveal the bug. By doing this, the test can be the only thing that is run by the launch configuration, meaning the debugger doesn't have to worry about the code surrounding the bug.

Lastly, before starting your program, you also need to set a breakpoint at an early point in the file, because the AI is only initialized once the program pauses for the first time.

You are now ready to start the AI launch configuration. While running it, we recommend to keep an eye on the Debug Console of the extension, because it contains, amongst other things, a log of the messages send to and received by ChatGPT-4o. After pausing for the first time, the AI now usually starts with setting a breakpoint at the provided line from the prompt, continue the execution until there and then start stepping through the code until the problem is found. Once the problem is found, an information message will appear in your editor explaining the cause of the bug that the AI determined and you can stop the debug process.

## License

This program is licensed under the Apache License 2.0