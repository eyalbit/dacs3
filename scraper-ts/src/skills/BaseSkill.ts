/**
 * Base Skill
 *
 * Abstract base class for all scraping skills.
 */

import { Page } from 'playwright';
import { ISkill, SkillResult } from '../types';

export abstract class BaseSkill<TConfig = any, TResult = any> implements ISkill<TResult> {
  protected readonly page: Page;
  protected readonly config: TConfig;

  constructor(page: Page, config: TConfig) {
    this.page = page;
    this.config = config;
  }

  /**
   * Execute the skill
   */
  abstract execute(...args: any[]): Promise<SkillResult<TResult>>;

  /**
   * Validate required configuration keys
   */
  protected validateConfig(requiredKeys: (keyof TConfig)[]): void {
    const missingKeys = requiredKeys.filter(key => !(key in (this.config as object)));

    if (missingKeys.length > 0) {
      throw new Error(`Missing required config keys: ${missingKeys.join(', ')}`);
    }
  }

  /**
   * Create success result
   */
  protected success(data: TResult): SkillResult<TResult> {
    return {
      success: true,
      data,
    };
  }

  /**
   * Create error result
   */
  protected error(message: string): SkillResult<TResult> {
    return {
      success: false,
      error: message,
    };
  }
}
