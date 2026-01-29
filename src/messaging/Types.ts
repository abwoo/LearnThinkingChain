import type { CognitiveProfile } from '../types/CognitiveProfile';
import type { ProtocolMap } from '../types/Protocols';
import type { ExtensionSettings } from '../types/Settings';
import type { ResponseRecord } from '../types/Response';
import type { HistoryEntry } from '../core/services/HistoryService';
import type { FrameworkEntry } from '../core/services/FrameworkService';

export type MessageType =
  | 'GET_STATE'
  | 'SAVE_PROFILE'
  | 'SAVE_MODE'
  | 'SAVE_PROTOCOLS'
  | 'SAVE_SETTINGS'
  | 'WIPE_MEMORY'
  | 'HISTORY_APPEND'
  | 'HISTORY_DELETE'
  | 'HISTORY_CLEAR'
  | 'HISTORY_SET'
  | 'FRAMEWORK_ADD'
  | 'FRAMEWORK_DELETE'
  | 'FRAMEWORK_SET';

export interface MessagePayload {
  type: MessageType;
  profile?: CognitiveProfile;
  mode?: string;
  protocols?: ProtocolMap;
  settings?: ExtensionSettings;
  historyEntry?: HistoryEntry;
  historyId?: string;
  history?: HistoryEntry[];
  frameworkName?: string;
  frameworkId?: string;
  frameworks?: FrameworkEntry[];
}

export interface MessageResponse {
  success?: boolean;
  error?: string;
}

export interface ExtensionState {
  ltc_active?: boolean;
  ltc_mode?: string;
  ltc_profile?: CognitiveProfile;
  ltc_last_thinking_steps?: HistoryEntry[];
  ltc_frameworks?: FrameworkEntry[];
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
  ltc_frameworks?: FrameworkEntry[];
}

export type ExternalMessage = {
  type: 'STATE_PUSH';
  payload?: PushPayload;
};
