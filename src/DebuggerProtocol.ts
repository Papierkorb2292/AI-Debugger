// See https://microsoft.github.io/debug-adapter-protocol/specification#Base_Protocol_ProtocolMessage

export type ProtocolMessage = Request | Event | Response;

export interface ProtocolMessageBase {
    /**
     * Sequence number of the message (also known as message ID). The `seq` for
     * the first message sent by a client or debug adapter is 1, and for each
     * subsequent message is 1 greater than the previous message sent by that
     * actor. `seq` can be used to order requests, responses, and events, and to
     * associate requests with their corresponding responses. For protocol
     * messages of type `request` the sequence number can be used to cancel the
     * request.
     */
    seq: number;
}

export interface Request extends ProtocolMessageBase {
    type: 'request';
  
    /**
     * The command to execute.
     */
    command: string;
  
    /**
     * Object containing arguments for the command.
     */
    arguments?: any;
}

export interface Event extends ProtocolMessageBase {
    type: 'event';
  
    /**
     * Type of event.
     */
    event: string;
  
    /**
     * Event-specific information.
     */
    body?: any;
}

export interface Response extends ProtocolMessageBase {
    type: 'response';
  
    /**
     * Sequence number of the corresponding request.
     */
    request_seq: number;
  
    /**
     * Outcome of the request.
     * If true, the request was successful and the `body` attribute may contain
     * the result of the request.
     * If the value is false, the attribute `message` contains the error in short
     * form and the `body` may contain additional information (see
     * `ErrorResponse.body.error`).
     */
    success: boolean;
  
    /**
     * The command requested.
     */
    command: string;
  
    /**
     * Contains the raw error in short form if `success` is false.
     * This raw error might be interpreted by the client and is not shown in the
     * UI.
     * Some predefined values exist.
     * Values:
     * 'cancelled': the request was cancelled.
     * 'notStopped': the request may be retried once the adapter is in a 'stopped'
     * state.
     * etc.
     */
    message?: 'cancelled' | 'notStopped' | string;
  
    /**
     * Contains request result if success is true and error details if success is
     * false.
     */
    body?: any;
}

export interface SetBreakpointsArguments {
    /**
   * The source location of the breakpoints; either `source.path` or
   * `source.sourceReference` must be specified.
   */
  source: Source;

  /**
   * The code locations of the breakpoints.
   */
  breakpoints?: SourceBreakpoint[];

  /**
   * Deprecated: The code locations of the breakpoints.
   */
  lines?: number[];

  /**
   * A value of true indicates that the underlying source has been modified
   * which results in new breakpoint locations.
   */
  sourceModified?: boolean;
}

export interface Source {
    /**
     * The short name of the source. Every source returned from the debug adapter
     * has a name.
     * When sending a source to the debug adapter this name is optional.
     */
    name?: string;
  
    /**
     * The path of the source to be shown in the UI.
     * It is only used to locate and load the content of the source if no
     * `sourceReference` is specified (or its value is 0).
     */
    path?: string;
  
    /**
     * If the value > 0 the contents of the source must be retrieved through the
     * `source` request (even if a path is specified).
     * Since a `sourceReference` is only valid for a session, it can not be used
     * to persist a source.
     * The value should be less than or equal to 2147483647 (2^31-1).
     */
    sourceReference?: number;

    //...
  }

  export interface SourceBreakpoint {
    /**
     * The source line of the breakpoint or logpoint.
     */
    line: number;
  
    /**
     * Start position within source line of the breakpoint or logpoint. It is
     * measured in UTF-16 code units and the client capability `columnsStartAt1`
     * determines whether it is 0- or 1-based.
     */
    column?: number;
  
    /**
     * The expression for conditional breakpoints.
     * It is only honored by a debug adapter if the corresponding capability
     * `supportsConditionalBreakpoints` is true.
     */
    condition?: string;
  
    /**
     * The expression that controls how many hits of the breakpoint are ignored.
     * The debug adapter is expected to interpret the expression as needed.
     * The attribute is only honored by a debug adapter if the corresponding
     * capability `supportsHitConditionalBreakpoints` is true.
     * If both this property and `condition` are specified, `hitCondition` should
     * be evaluated only if the `condition` is met, and the debug adapter should
     * stop only if both conditions are met.
     */
    hitCondition?: string;
  
    /**
     * If this attribute exists and is non-empty, the debug adapter must not
     * 'break' (stop)
     * but log the message instead. Expressions within `{}` are interpolated.
     * The attribute is only honored by a debug adapter if the corresponding
     * capability `supportsLogPoints` is true.
     * If either `hitCondition` or `condition` is specified, then the message
     * should only be logged if those conditions are met.
     */
    logMessage?: string;
  
    /**
     * The mode of this breakpoint. If defined, this must be one of the
     * `breakpointModes` the debug adapter advertised in its `Capabilities`.
     */
    mode?: string;
  }