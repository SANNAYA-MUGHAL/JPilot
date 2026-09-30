import fs from 'node:fs';
import path from 'node:path';
import type {
  TrelloBoard,
  TrelloList,
  TrelloLabel,
  TrelloCard,
  TrelloChecklist,
  TrelloAttachment,
  CreateCardOptions,
} from '../../types/trello.js';

export class TrelloClient {
  private apiKey: string | null = null;
  private token: string | null = null;
  private isLive: boolean = false;
  private mockCards: Map<string, TrelloCard> = new Map();
  private mockChecklists: Map<string, TrelloChecklist[]> = new Map();
  private mockAttachments: Map<string, TrelloAttachment[]> = new Map();

  constructor() {
    const key = process.env.TRELLO_API_KEY;
    const tok = process.env.TRELLO_TOKEN;
    if (key && tok && !key.includes('placeholder') && !tok.includes('placeholder')) {
      this.apiKey = key;
      this.token = tok;
      this.isLive = true;
    }
  }

  public isLiveApi(): boolean {
    return this.isLive;
  }

  private getAuthParams(): string {
    return `key=${this.apiKey}&token=${this.token}`;
  }

  public async getOrCreateBoard(boardName: string): Promise<TrelloBoard> {
    if (!this.isLive) {
      return {
        id: 'mock_board_ai_job_apps',
        name: boardName,
        url: `https://trello.com/b/mock_board_ai_job_apps/${encodeURIComponent(boardName)}`,
      };
    }

    // Live Trello API call
    try {
      const url = `https://api.trello.com/1/members/me/boards?${this.getAuthParams()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const boards = (await res.json()) as any[];
      const existing = boards.find((b) => b.name.toLowerCase() === boardName.toLowerCase());
      if (existing) {
        return { id: existing.id, name: existing.name, url: existing.url };
      }

      // Create new board
      const createUrl = `https://api.trello.com/1/boards/?name=${encodeURIComponent(boardName)}&${this.getAuthParams()}`;
      const createRes = await fetch(createUrl, { method: 'POST' });
      const created = (await createRes.json()) as any;
      return { id: created.id, name: created.name, url: created.url };
    } catch (err: any) {
      console.warn(`Trello API getOrCreateBoard failed: ${err.message}. Falling back to simulation.`);
      return {
        id: 'sim_board_ai_job_apps',
        name: boardName,
        url: `https://trello.com/b/sim_board/${encodeURIComponent(boardName)}`,
      };
    }
  }

  public async getLists(boardId: string): Promise<TrelloList[]> {
    if (!this.isLive) {
      const defaultLists = [
        '🔥 High Match',
        '🟢 Ready to Apply',
        '📤 Applied',
        '📞 Interview',
        '📝 Assignment',
        '⏳ Waiting',
        '❌ Rejected',
        '🏆 Offer',
        '🗃️ Archived',
      ];
      return defaultLists.map((name, i) => ({
        id: `mock_list_${i + 1}`,
        name,
        idBoard: boardId,
        pos: i + 1,
      }));
    }

    try {
      const url = `https://api.trello.com/1/boards/${boardId}/lists?${this.getAuthParams()}`;
      const res = await fetch(url);
      return (await res.json()) as TrelloList[];
    } catch {
      return [];
    }
  }

  public async createCard(listId: string, options: CreateCardOptions): Promise<TrelloCard> {
    if (!this.isLive) {
      const cardId = 'card_' + Math.random().toString(36).substring(2, 10);
      const card: TrelloCard = {
        id: cardId,
        name: options.name,
        desc: options.desc,
        idList: listId,
        idBoard: 'mock_board_ai_job_apps',
        url: `https://trello.com/c/${cardId}/${encodeURIComponent(options.name.slice(0, 20))}`,
        idLabels: options.idLabels,
      };
      this.mockCards.set(cardId, card);
      return card;
    }

    const url = `https://api.trello.com/1/cards?idList=${listId}&name=${encodeURIComponent(options.name)}&desc=${encodeURIComponent(options.desc)}&${this.getAuthParams()}`;
    const res = await fetch(url, { method: 'POST' });
    return (await res.json()) as TrelloCard;
  }

  public async createChecklist(cardId: string, name: string, items: string[]): Promise<TrelloChecklist> {
    if (!this.isLive) {
      const clId = 'cl_' + Math.random().toString(36).substring(2, 10);
      const checklist: TrelloChecklist = {
        id: clId,
        idCard: cardId,
        name,
        checkItems: items.map((item, idx) => ({
          id: `item_${idx + 1}`,
          name: item,
          state: 'incomplete',
        })),
      };

      const existing = this.mockChecklists.get(cardId) || [];
      existing.push(checklist);
      this.mockChecklists.set(cardId, existing);
      return checklist;
    }

    const url = `https://api.trello.com/1/checklists?idCard=${cardId}&name=${encodeURIComponent(name)}&${this.getAuthParams()}`;
    const res = await fetch(url, { method: 'POST' });
    const cl = (await res.json()) as TrelloChecklist;

    for (const item of items) {
      const itemUrl = `https://api.trello.com/1/checklists/${cl.id}/checkItems?name=${encodeURIComponent(item)}&${this.getAuthParams()}`;
      await fetch(itemUrl, { method: 'POST' });
    }

    return cl;
  }

  public async addAttachment(cardId: string, filePath: string, name: string): Promise<TrelloAttachment> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Attachment file does not exist: ${filePath}`);
    }

    const stats = fs.statSync(filePath);

    if (!this.isLive) {
      const attId = 'att_' + Math.random().toString(36).substring(2, 10);
      const att: TrelloAttachment = {
        id: attId,
        name,
        url: `file://${filePath}`,
        bytes: stats.size,
      };

      const existing = this.mockAttachments.get(cardId) || [];
      existing.push(att);
      this.mockAttachments.set(cardId, existing);
      return att;
    }

    // Live multipart file upload
    const formData = new FormData();
    const fileBlob = new Blob([fs.readFileSync(filePath)]);
    formData.append('file', fileBlob, name);
    formData.append('name', name);

    const url = `https://api.trello.com/1/cards/${cardId}/attachments?${this.getAuthParams()}`;
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
    });
    return (await res.json()) as TrelloAttachment;
  }

  public async addUrlAttachment(cardId: string, url: string, name: string): Promise<TrelloAttachment> {
    if (!this.isLive) {
      const attId = 'att_url_' + Math.random().toString(36).substring(2, 10);
      const att: TrelloAttachment = {
        id: attId,
        name,
        url,
      };
      const existing = this.mockAttachments.get(cardId) || [];
      existing.push(att);
      this.mockAttachments.set(cardId, existing);
      return att;
    }

    const reqUrl = `https://api.trello.com/1/cards/${cardId}/attachments?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}&${this.getAuthParams()}`;
    const res = await fetch(reqUrl, { method: 'POST' });
    return (await res.json()) as TrelloAttachment;
  }

  public getMockCard(cardId: string): TrelloCard | undefined {
    return this.mockCards.get(cardId);
  }

  public getMockChecklists(cardId: string): TrelloChecklist[] {
    return this.mockChecklists.get(cardId) || [];
  }

  public getMockAttachments(cardId: string): TrelloAttachment[] {
    return this.mockAttachments.get(cardId) || [];
  }
}
