export interface TrelloBoard {
  id: string;
  name: string;
  url: string;
}

export interface TrelloList {
  id: string;
  name: string;
  idBoard: string;
  pos?: number;
}

export interface TrelloLabel {
  id: string;
  idBoard: string;
  name: string;
  color: string;
}

export interface TrelloCheckItem {
  id?: string;
  name: string;
  state: 'complete' | 'incomplete';
}

export interface TrelloChecklist {
  id: string;
  idCard: string;
  name: string;
  checkItems: TrelloCheckItem[];
}

export interface TrelloAttachment {
  id: string;
  name: string;
  url: string;
  bytes?: number;
}

export interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  idList: string;
  idBoard: string;
  url: string;
  idLabels?: string[];
  checklists?: TrelloChecklist[];
  attachments?: TrelloAttachment[];
}

export interface CreateCardOptions {
  name: string;
  desc: string;
  idList: string;
  idLabels?: string[];
  pos?: 'top' | 'bottom' | number;
}
