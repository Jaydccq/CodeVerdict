import { Injectable, Logger } from '@nestjs/common';
import { WebClient } from '@slack/web-api';
import { SECRETS } from '../config/env';

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);
  private readonly client: WebClient | null;
  private readonly channel: string | undefined;

  constructor() {
    this.client = SECRETS.SLACK_BOT_TOKEN
      ? new WebClient(SECRETS.SLACK_BOT_TOKEN)
      : null;
    this.channel = SECRETS.SLACK_ALERT_CHANNEL;
  }

  async alert(text: string): Promise<void> {
    if (!this.client || !this.channel) return;
    try {
      await this.client.chat.postMessage({
        channel: this.channel,
        text,
      });
    } catch (err) {
      this.logger.warn(
        `Slack alert failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
