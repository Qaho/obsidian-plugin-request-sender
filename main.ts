import { ButtonComponent, MarkdownPostProcessorContext, parseYaml, Plugin, setIcon } from 'obsidian';
import axios, { AxiosHeaders, HttpStatusCode } from 'axios';

type Status = 'success' | 'error';
type RequestType = 'POST' | 'GET' | 'DELETE' | 'PUT';

interface RequestResult {
  status: HttpStatusCode;
  data: any;
}

interface RequestData {
  title?: string;
  type: RequestType;
  url: string;
  headers?: Headers;
  formData?: FormData[];
  body?: string;
}

export default class MyPlugin extends Plugin {

  private resultContainer?: HTMLElement;

  async onload() {
    this.registerMarkdownCodeBlockProcessor("request-sender", (source, el, ctx) => { this.codeBlockHandler(source, el, ctx) });
  }

  onunload() {
  }

  private codeBlockHandler(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
    try {
      const mainContainer = el.createEl('div', { cls: 'main-container' });
      const buttonsContainer = mainContainer.createEl('div', { cls: 'flex-container' });
      const subContainer = mainContainer.createEl('div');

      const requestData: RequestData = parseYaml(source);
      if (!requestData.url) throw new Error('URL must be provided.');
      if (!requestData.type) throw new Error(`Request type must be provided. ('POST' | 'GET' | 'DELETE' | 'PUT')`);
      if (!requestData) throw new Error('Request data does not have all required parameters.')

      const buttonSend = new ButtonComponent(buttonsContainer);
      buttonSend.setClass('button');
      buttonSend.setButtonText(requestData.title ? requestData.title : 'Send request!');
      buttonSend.onClick(async () => {
        try {
          if (this.resultContainer) this.resultContainer.remove();
          const response: RequestResult = await this.sendRequest(requestData);
          this.createResponseElement(
            subContainer, 
            `Status: ${response.status}`, 
            JSON.stringify(response.data, undefined, 2), 
            this.getStatusForResponse(response.status));
        } catch (error) {
          this.createResponseElement(subContainer, 'Error', error, 'error');
        }
      });

      const buttonClear = new ButtonComponent(buttonsContainer);
      buttonClear.setClass('button');
      buttonClear.setButtonText('Clear');
      buttonClear.onClick(async () => {
        if (this.resultContainer) this.resultContainer.remove();
      });
    } catch (error) {
      this.createResponseElement(el, 'Error', error, 'error');
    }
  }

  private getStatusForResponse(statusCode: HttpStatusCode): Status | undefined {
    return statusCode >= 200 && statusCode < 300 ? 'success' : statusCode >= 300 ? 'error' : undefined;
  }

  private createResponseElement(el: HTMLElement, title: string, content: string, status?: Status): void {
    this.resultContainer = el.createEl('div', { cls: 'container' }); 

    const titleDiv = this.resultContainer.createEl('div', { cls: 'flex-container content status' });
    if (status) setIcon(titleDiv.createEl('span', { cls: 'icon' }), status === 'error' ? 'alert-circle' : 'check-circle-2');
    titleDiv.createEl('span', { text: title });

    const contentDiv = this.resultContainer.createEl('pre', { text: content, cls: 'content' });
    titleDiv.toggleClass('status-success', status === 'success');
    titleDiv.toggleClass('status-error', status === 'error');
    
  }

  private async sendRequest(requestData: RequestData): Promise<RequestResult> {
    let result: RequestResult = { status: HttpStatusCode.Created, data: '' };
    let headers: AxiosHeaders | undefined;
    if (requestData.headers) {
      headers = new AxiosHeaders();
      Object.entries(requestData.headers).forEach((header: any) => { if (headers) headers.set(header[0], header[1]) })
    }

    switch (requestData.type) {
      case 'POST': {
        let formData = new FormData();
        if (requestData.formData) Object.entries(requestData.formData).forEach((data: any) => formData.append(data[0], data[1]));
        
        const response = await axios.post(requestData.url, requestData.body ? requestData.body : formData, { headers });
        result.status = response.status;
        result.data = response.data;
        break;
      }
      case 'GET': {
        const response = await axios.get(requestData.url, { headers });
        result.status = response.status;
        result.data = response.data;
        break;
      }
      case 'DELETE': {
        const response = await axios.delete(requestData.url, { headers });
        result.status = response.status;
        result.data = response.data;
        break;
      }
      case 'PUT': {
        const response = await axios.put(requestData.url, requestData.body ? requestData.body : requestData.data, { headers });
        result.status = response.status;
        result.data = response.data;
        break;
      }
      default:
        throw new Error(`${requestData.type} method not supported.`);
    }

    return result;
  }
}
