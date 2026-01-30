import type { CognitiveProfile } from '../types/CognitiveProfile';
import type { ProtocolMap } from '../types/Protocols';
import type { ExtensionSettings } from '../types/Settings';
import type { ResponseRecord } from '../types/Response';
import type { HistoryEntry } from '../core/services/HistoryService';
import type { ThinkingFramework } from '../core/storage/FrameworkStore';

export type MessageType =
  | 'GET_STATE'
  | 'SAVE_PROFILE'
  | 'SAVE_MODE'
  | 'SAVE_PROTOCOLS'
  | 'SAVE_SETTINGS'
  | 'WIPE_MEMORY'
  | 'ADD_HISTORY_ENTRY'
  | 'SET_HISTORY'
  | 'DELETE_HISTORY'
  | 'CLEAR_HISTORY'
  | 'SAVE_FRAMEWORK'
  | 'DELETE_FRAMEWORK'
  | 'SET_ACTIVE_FRAMEWORK';

export interface MessagePayload {
  type: MessageType;
  profile?: CognitiveProfile;
  mode?: string;
  protocols?: ProtocolMap;
  settings?: ExtensionSettings;
  historyEntry?: HistoryEntry;
  history?: HistoryEntry[];
  historyIndex?: number;
  historyId?: string;
  framework?: ThinkingFramework;
  frameworkId?: string;
}

export interface MessageResponse {
  success?: boolean;
  error?: string;
}

export interface ExtensionState {
  ltc_active?: boolean;
  ltc_mode?: string;
  ltc_profile?: CognitiveProfile;
  ltc_last_thinking_steps?: Array<{ title: string; desc: string }>;
  ltc_protocols?: ProtocolMap;
  ltc_settings?: ExtensionSettings;
  ltc_latest_response?: ResponseRecord;
  ltc_response_history?: ResponseRecord[];
}

export interface PushPayload {
  ltc_active?: boolean;
  ltc_mode?: string;
  ltc_latest_response?: ResponseRecord;
  ltc_last_thinking_steps?: HistoryEntry[];
  ltc_frameworks?: ThinkingFramework[];
}

export type ExternalMessage = {
  type: 'STATE_PUSH';
  payload?: PushPayload;
};
