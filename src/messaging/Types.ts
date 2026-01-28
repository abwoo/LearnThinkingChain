import type { CognitiveProfile } from '../types/CognitiveProfile';
import type { ProtocolMap } from '../types/Protocols';
import type { ExtensionSettings } from '../types/Settings';

export type MessageType =
  | 'GET_STATE'
  | 'SAVE_PROFILE'
  | 'SAVE_MODE'
  | 'SAVE_PROTOCOLS'
  | 'SAVE_SETTINGS'
  | 'WIPE_MEMORY';

export interface MessagePayload {
  type: MessageType;
  profile?: CognitiveProfile;
  mode?: string;
  protocols?: ProtocolMap;
  settings?: ExtensionSettings;
}

export interface MessageResponse {
  success?: boolean;
  error?: string;
}
