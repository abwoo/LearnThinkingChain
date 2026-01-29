import type { CognitiveProfile } from '../types/CognitiveProfile';
import type { ProtocolMap } from '../types/Protocols';
import type { ExtensionSettings } from '../types/Settings';
import type { ResponseRecord } from '../types/Response';
import type { HistoryEntry } from '../core/services/HistoryService';

export interface CustomFramework {
  id: string;
  name: string;
  content: string;
  updated_at: number;
}

export type MessageType =
  | 'GET_STATE'
  | 'SAVE_PROFILE'
  | 'SAVE_MODE'
  | 'SAVE_PROTOCOLS'
  | 'SAVE_SETTINGS'
  | 'SAVE_CUSTOM_FRAMEWORKS'
  | 'WIPE_MEMORY'
  | 'HISTORY_APPEND'
  | 'HISTORY_DELETE'
  | 'HISTORY_CLEAR'
  | 'HISTORY_SET';

export interface MessagePayload {
  type: MessageType;
  profile?: CognitiveProfile;
  mode?: string;
  protocols?: ProtocolMap;
  settings?: ExtensionSettings;
  frameworks?: CustomFramework[];
  historyEntry?: HistoryEntry;
  historyId?: string;
  history?: HistoryEntry[];
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
  ltc_protocols?: ProtocolMap;
  ltc_settings?: ExtensionSettings;
  ltc_custom_frameworks?: CustomFramework[];
  ltc_latest_response?: ResponseRecord;
  ltc_response_history?: ResponseRecord[];
}

export interface PushPayload {
  ltc_active?: boolean;
  ltc_mode?: string;
  ltc_latest_response?: ResponseRecord;
  ltc_last_thinking_steps?: HistoryEntry[];
  ltc_custom_frameworks?: CustomFramework[];
}

export type ExternalMessage = {
  type: 'STATE_PUSH';
  payload?: PushPayload;
};
