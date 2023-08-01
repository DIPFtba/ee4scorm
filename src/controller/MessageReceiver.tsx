import { PreloadResultStruct } from './PreloadResultStruct';

/**
 * Service that receives messages from the task players 
 * and delivers them to the configured listeners. 
 * 
 * All listeners are called with the frame window of the sending task player
 * (besides the specific message content).
 */
export default class MessageReceiver {
  private playerReadyListener : ((source: MessageEventSource) => void) | 'noListener' = 'noListener'; 
  private preloadReturnListener : ((source: MessageEventSource, result : PreloadResultStruct) => void) | 'noListener' = 'noListener'; 
  private getUserIdReturnListener : ((source: MessageEventSource, result : string) => void) | 'noListener' = 'noListener'; 
  private loginDialogClosedListener : ((source: MessageEventSource, result : string) => void) | 'noListener' = 'noListener'; 
  private getTaskReturnListener : ((source: MessageEventSource, result: GetTaskReturn) => void) | 'noListener' = 'noListener'; 
  private getScoringResultReturnListener : ((source: MessageEventSource, result: string) => void) | 'noListener' = 'noListener'; 
  
  private traceLogListener : ((source: MessageEventSource, metaData: string, logEntriesList: string[]) => void) | 'noListener' = 'noListener'; 
  private recordingListener : ((source: MessageEventSource, metaData: string, recordingEntriesList: string[]) => void) | 'noListener' = 'noListener'; 
  private getTasksStateReturnListener : ((source: MessageEventSource, userId: string, state: string) => void) | 'noListener' = 'noListener'; 

  private taskSwitchRequestListener : ((source: MessageEventSource, request: RequestType, requestDetails?: TaskRequestDetails) => void) | 'noListener' = 'noListener'; 

  //pass external scoringResult requests to the runtime
  private getScoringResultListener : ((source: MessageEventSource, result: string) => void) | 'noListener' = 'noListener'; 

  /**
   * Start to receive messages.
   */
  public startReceiving() {
    window.addEventListener("message", (event) => {
      this.processMessageEvent(event);
    })
  
  }
  
  public setPlayerReadyListener(listener: (source: MessageEventSource) => void) : void {
    this.playerReadyListener = listener;
  }

  public setPreloadReturnListener(listener: (source: MessageEventSource, result : PreloadResultStruct) => void) : void {
    this.preloadReturnListener = listener;
  }

  public setGetUserIdReturnListener(listener: (source: MessageEventSource, result : string) => void) : void {
    this.getUserIdReturnListener = listener;
  }

  public setLoginDialogClosedListener(listener: (source: MessageEventSource, result : string) => void) : void {
    this.loginDialogClosedListener = listener;
  }

  public setGetTaskReturnListener(listener: (source: MessageEventSource, result: GetTaskReturn) => void) : void {
    this.getTaskReturnListener = listener;
  }

  public setGetScoringResultReturnListener(listener: (source: MessageEventSource, result: string) => void) : void {
    this.getScoringResultReturnListener = listener;
  }

  public setTraceLogListener(listener: (source: MessageEventSource, metaData: string, logEntriesList: string[]) => void) : void {
    this.traceLogListener = listener;
  }

  public setRecordingListener(listener: (source: MessageEventSource, metaData: string, recordingEntriesList: string[]) => void) : void {
    this.recordingListener = listener;
  }

  public setGetTasksStateReturnListener(listener: (source: MessageEventSource, userId: string, state: string) => void) : void {
    this.getTasksStateReturnListener = listener;
  }

  public setTaskSwitchRequestListener(listener: (source: MessageEventSource, request: RequestType, requestDetails?: TaskRequestDetails) => void) : void {
    this.taskSwitchRequestListener = listener;
  }


  public setGetScoringResultListener(listener: (source: MessageEventSource, result: string) => void) : void {
    this.getScoringResultListener = listener;
  }

  private processMessageEvent(event : MessageEvent<any>) : void {
    const { origin, data, source } = event;

    if (source === null) {
      console.warn(`Ignoring message without source.`);
      return;
    }

    //allow external parent frame to send getScoringResult requests
    try {
      let tmp = JSON.parse(data);
      if(tmp?.eventType == "getScoringResult" && this.getScoringResultListener !== 'noListener'){
        this.getScoringResultListener(source, JSON.stringify(tmp));
        return;
      }
    } catch (e) {
      console.info(`Ignoring message with non-JSON data: ${data}`);
      return;      
    }


    if (origin !== window.origin) {
      console.warn(`Ignoring message from wrong origin. Message origin is ${origin}. Accepted origin is ${window.origin}.`);
      return;
    }

    let dataObject;
    try {
      dataObject = JSON.parse(data);
    } catch (e) {
      console.info(`Ignoring message with non-JSON data: ${data}`);
      return;
    }

    const eventType = dataObject.eventType;

    if (eventType === 'taskPlayerReady' && this.playerReadyListener !== 'noListener') {
      this.playerReadyListener(source);
      return;
    }

    if (eventType === 'setPreloadReturn' && this.preloadReturnListener !== 'noListener') {
      const result : PreloadResultStruct = { isSuccess: dataObject.isSuccess, message: dataObject.message };
      this.preloadReturnListener(source, result);
      return;
    }

    if (eventType === 'getUserIdReturn' && this.getUserIdReturnListener !== 'noListener') {
      this.getUserIdReturnListener(source, dataObject.id);
      return;
    }

    if (eventType === 'loginDialogClosed' && this.loginDialogClosedListener !== 'noListener') {
      this.loginDialogClosedListener(source, dataObject.fieldValue);
      return;
    }

    if (eventType === 'getTaskReturn' && this.getTaskReturnListener !== 'noListener') {
      this.getTaskReturnListener(source, {scope: dataObject.scope, item: dataObject.item, task: dataObject.task});
      return;
    }

    if (eventType === 'getScoringResultReturn' && this.getScoringResultReturnListener !== 'noListener') {
      this.getScoringResultReturnListener(source, JSON.stringify(dataObject.result));
      return;
    }

    if (eventType === 'traceLogTransmission' && this.traceLogListener !== 'noListener') {
      const {metaData, logEntriesList} = dataObject.traceLogData;
      console.log(dataObject.traceLogData);
      this.traceLogListener(source, JSON.stringify(metaData), logEntriesList.map((entry : object) => JSON.stringify(entry)));
      return;
    }

    if (eventType === 'recordingTransmission' && this.recordingListener !== 'noListener') {
      const {metaData, recordingEntriesList} = dataObject.recordingData;
      this.recordingListener(source, JSON.stringify(metaData), recordingEntriesList.map((entry : object) => JSON.stringify(entry)));
      return;
    }

    if (eventType === 'getTasksStateReturn' && this.getTasksStateReturnListener !== 'noListener') {
      const {userId, state} = dataObject;
      this.getTasksStateReturnListener(source, userId, JSON.stringify(state));
      return;
    }

    if (eventType === 'taskSwitchRequest' && this.taskSwitchRequestListener !== 'noListener') {
      const {request, scope, item, task} = dataObject;
      this.taskSwitchRequestListener(source, request, request === 'goToTask' ? {scope, item, task} : undefined);
      return;
    }

    // console.warn(`Ignoring message not matching any listener: ${data}`)

  }
}


/**
 * Structures describing a task switch request:
 */
export type RequestType = 'nextTask' | 'previousTask' | 'cancelTask' | 'goToTask';

export interface TaskRequestDetails {
  item?: string, 
  task: string, 
  scope: string
}

export interface GetTaskReturn {
  item: string, 
  task?: string, 
  scope: string
}
