import { GoogleGenerativeAI } from "@google/generative-ai";
import config from "./config.js";

export default class ChatGPT {
  private genAI: any;
  private model: any;
  private conversationHistory: Map<string, string[]>;
  constructor() {
    this.genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
    this.conversationHistory = new Map();
  }
  async test() {
    const response = await this.getChatResponse("hello");
    console.log("response test: ", response);
  }
  async getChatResponse(message: string) {
    try {
      const result = await this.model.generateContent(message);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini API error:', error);
      return '抱歉，我暂时无法回复。请稍后再试。';
    }
  }
  async getChatGPTReply(content, contactId) {
    const history = this.conversationHistory.get(contactId) || [];
    
    const contextMessage = history.length > 0 
      ? `Previous conversation:\n${history.join('\n')}\n\nUser: ${content}`
      : content;
    
    const response = await this.getChatResponse(contextMessage);
    
    history.push(`User: ${content}`);
    history.push(`AI: ${response}`);
    if (history.length > 10) history.splice(0, 2);
    this.conversationHistory.set(contactId, history);
    
    console.log("response: ", response);
    return response;
  }

  async replyMessage(contact, content) {
    const { id: contactId } = contact;
    try {
      if (
        content.trim().toLocaleLowerCase() ===
        config.resetKey.toLocaleLowerCase()
      ) {
        this.conversationHistory.set(contactId, []);
        await contact.say("对话已被重置");
        return;
      }
      const message = await this.getChatGPTReply(content, contactId);

      if (
        (contact.topic && contact?.topic() && config.groupReplyMode) ||
        (!contact.topic && config.privateReplyMode)
      ) {
        const result = content + "\n-----------\n" + message;
        await contact.say(result);
        return;
      } else {
        await contact.say(message);
      }
    } catch (e: any) {
      console.error(e);
      if (e.message.includes("timed out")) {
        await contact.say(
          content +
            "\n-----------\nERROR: Please try again, Gemini timed out for waiting response."
        );
      }
    }
  }
}
