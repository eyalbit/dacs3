## SKILLS Guide - Building Playwright Code with Skills Pattern

This guide explains how to use **Skills** to build scraping code efficiently without repeating instructions.

## What are Skills?

**Skills** are pre-built, reusable scraping patterns that encapsulate common operations:

- ✅ **Reusable** - Write once, use anywhere
- ✅ **Configurable** - Pass selectors and options
- ✅ **Composable** - Combine multiple skills
- ✅ **Type-safe** - Full TypeScript support
- ✅ **Testable** - Easy to unit test

Think of Skills as **Lego blocks** for web scraping.

---

## Available Skills

### 1. TableExtractionSkill

**Purpose**: Extract data from HTML tables

**When to use**:
- Data is displayed in `<table>` elements
- You want to convert table to CSV or array

**Configuration**:
```typescript
interface TableExtractionConfig {
  tableSelector: string;        // CSS selector for table
  includeHeader?: boolean;       // Include header row (default: true)
  outputFormat?: 'array' | 'csv'; // Output format (default: 'array')
}
```

**Example**:
```typescript
import { TableExtractionSkill } from './skills';

const skill = new TableExtractionSkill(page, {
  tableSelector: 'table.options-chain',
  includeHeader: true,
  outputFormat: 'csv',
});

const result = await skill.execute('./output/options.csv');

if (result.success) {
  console.log('Saved to:', result.data);
} else {
  console.error('Error:', result.error);
}
```

---

### 2. CSVDownloadSkill

**Purpose**: Click download button and save CSV file

**When to use**:
- Website has a "Download CSV" button
- You want to trigger download and save file

**Configuration**:
```typescript
interface CSVDownloadConfig {
  downloadButtonSelector: string;  // CSS selector for button
  timeout?: number;                // Download timeout (default: 10000)
}
```

**Example**:
```typescript
import { CSVDownloadSkill } from './skills';

const skill = new CSVDownloadSkill(page, {
  downloadButtonSelector: 'button.download-csv',
  timeout: 15000,
});

const result = await skill.execute(
  './downloads',      // Output directory
  'options_bac.csv'   // Optional: custom filename
);

if (result.success) {
  console.log('Downloaded to:', result.data);
}
```

---

### 3. MultiExpirationSkill

**Purpose**: Scrape options data across multiple expiration dates

**When to use**:
- Page has an expiration date dropdown
- You need data for all expirations
- Table updates when expiration changes

**Configuration**:
```typescript
interface MultiExpirationConfig {
  expirationDropdownSelector: string;  // Selector for dropdown
  tableSelector: string;               // Selector for table
  waitAfterSelect?: number;            // Wait after selecting (default: 1000ms)
  includeHeader?: boolean;             // Include headers (default: true)
}
```

**Example**:
```typescript
import { MultiExpirationSkill } from './skills';

const skill = new MultiExpirationSkill(page, {
  expirationDropdownSelector: 'select#expiration',
  tableSelector: 'table.options-chain',
  waitAfterSelect: 1500,
});

const result = await skill.execute();

if (result.success) {
  // result.data = { "Jan 2026": [[...]], "Feb 2026": [[...]] }
  for (const [expiration, tableData] of Object.entries(result.data)) {
    console.log(`${expiration}: ${tableData.length} rows`);
  }
}
```

---

## Creating Custom Skills

### Step 1: Extend BaseSkill

```typescript
// src/skills/MyCustomSkill.ts
import { BaseSkill } from './BaseSkill';
import { SkillResult } from '../types';

export interface MyCustomConfig {
  selector: string;
  threshold: number;
}

export class MyCustomSkill extends BaseSkill<MyCustomConfig, string[]> {
  constructor(page: Page, config: MyCustomConfig) {
    super(page, config);
  }

  async execute(): Promise<SkillResult<string[]>> {
    try {
      // 1. Validate configuration
      this.validateConfig(['selector', 'threshold']);

      // 2. Perform scraping logic
      const data = await this.page.$$eval(
        this.config.selector,
        (elements, threshold) => {
          return elements
            .map(el => el.textContent?.trim() || '')
            .filter(text => text.length > threshold);
        },
        this.config.threshold
      );

      // 3. Return success result
      return this.success(data);

    } catch (error) {
      // 4. Return error result
      return this.error(error instanceof Error ? error.message : 'Unknown error');
    }
  }
}
```

### Step 2: Export from Skills Module

```typescript
// src/skills/index.ts
export { MyCustomSkill, MyCustomConfig } from './MyCustomSkill';
```

### Step 3: Use Your Skill

```typescript
import { MyCustomSkill } from './skills';

const skill = new MyCustomSkill(page, {
  selector: '.data-item',
  threshold: 5,
});

const result = await skill.execute();
console.log(result.data);
```

---

## Combining Skills

Skills can be composed together:

```typescript
import { 
  TableExtractionSkill, 
  MultiExpirationSkill,
  CSVDownloadSkill 
} from './skills';

async function scrapeFull(page: Page) {
  // Step 1: Try download button first
  const downloadSkill = new CSVDownloadSkill(page, {
    downloadButtonSelector: 'button.download',
  });

  let result = await downloadSkill.execute('./downloads');

  // Step 2: If download fails, extract table
  if (!result.success) {
    const tableSkill = new TableExtractionSkill(page, {
      tableSelector: 'table.options-data',
      outputFormat: 'csv',
    });

    result = await tableSkill.execute('./output/options.csv');
  }

  return result;
}
```

---

## Skills vs Direct Playwright Code

### ❌ Without Skills (Repetitive)

```typescript
// Page A
const headers = await page.$$eval('table thead th', els => els.map(e => e.textContent));
const rows = await page.$$eval('table tbody tr', rows => 
  rows.map(r => Array.from(r.querySelectorAll('td')).map(c => c.textContent))
);
const data = [headers, ...rows];
fs.writeFileSync('output.csv', data.map(r => r.join(',')).join('\n'));

// Page B - SAME CODE REPEATED
const headers2 = await page.$$eval('table thead th', els => els.map(e => e.textContent));
const rows2 = await page.$$eval('table tbody tr', rows => 
  rows.map(r => Array.from(r.querySelectorAll('td')).map(c => c.textContent))
);
// ... copy-paste ...
```

### ✅ With Skills (DRY)

```typescript
// Page A
const skill = new TableExtractionSkill(page, {
  tableSelector: 'table',
  outputFormat: 'csv',
});
await skill.execute('output.csv');

// Page B - REUSE
await skill.execute('output2.csv');
```

---

## Common Patterns

### Pattern 1: Extract → Validate → Save

```typescript
async function extractAndSave(page: Page, symbol: string) {
  const skill = new TableExtractionSkill(page, {
    tableSelector: 'table.options-chain',
    includeHeader: true,
    outputFormat: 'csv',
  });

  const filename = `${symbol}_${Date.now()}.csv`;
  const result = await skill.execute(`./output/${filename}`);

  if (!result.success) {
    throw new Error(`Failed to extract: ${result.error}`);
  }

  // Validate
  const validation = validateCSVFile(result.data as string, 10);
  if (!validation.isValid) {
    throw new Error(`Invalid CSV: ${validation.errorMessage}`);
  }

  return result.data;
}
```

### Pattern 2: Try Multiple Strategies

```typescript
async function scrapeWithFallback(page: Page) {
  // Strategy 1: Download button
  const downloadSkill = new CSVDownloadSkill(page, {
    downloadButtonSelector: 'button.download',
  });

  let result = await downloadSkill.execute('./downloads');
  if (result.success) return result.data;

  // Strategy 2: Extract table
  const tableSkill = new TableExtractionSkill(page, {
    tableSelector: 'table.options-data',
    outputFormat: 'csv',
  });

  result = await tableSkill.execute('./output/fallback.csv');
  return result.data;
}
```

### Pattern 3: Process Each Expiration

```typescript
async function processAllExpirations(page: Page) {
  const multiExpSkill = new MultiExpirationSkill(page, {
    expirationDropdownSelector: 'select#expiration',
    tableSelector: 'table.options-chain',
  });

  const result = await multiExpSkill.execute();

  if (!result.success) {
    throw new Error(result.error);
  }

  // Process each expiration
  for (const [expiration, tableData] of Object.entries(result.data!)) {
    const csvPath = `./output/${expiration.replace(/\s+/g, '_')}.csv`;
    
    const csvContent = tableData.map(row => row.join(',')).join('\n');
    fs.writeFileSync(csvPath, csvContent);
    
    console.log(`Saved ${expiration}: ${tableData.length} rows`);
  }
}
```

---

## Skill Guidelines

When creating skills, follow these guidelines:

### ✅ DO

- **Single Responsibility** - One skill, one job
- **Configuration Over Code** - Pass selectors as config
- **Return Results** - Use `SkillResult<T>` type
- **Handle Errors** - Catch and return error messages
- **Validate Config** - Use `validateConfig()` helper
- **Document Types** - Export config interfaces

### ❌ DON'T

- **Don't Hardcode** - No hardcoded selectors/URLs
- **Don't Mix Concerns** - Navigation ≠ extraction
- **Don't Swallow Errors** - Always return error info
- **Don't Use `any`** - Specify types for config and result
- **Don't Skip Validation** - Always validate config

---

## Skill Naming Convention

Follow this naming pattern:

```
<Action><Subject>Skill

Examples:
- TableExtractionSkill   (Extract + Table)
- CSVDownloadSkill        (Download + CSV)
- MultiExpirationSkill    (Multi + Expiration)
- LoginAuthenticationSkill (Login + Authentication)
- DataValidationSkill      (Validate + Data)
```

---

## When to Create a New Skill

Create a new skill when you:

1. **Repeat the same pattern** 3+ times
2. **Have a distinct operation** (login, download, extract, etc.)
3. **Need different configurations** for same operation
4. **Want to test in isolation**

Don't create a skill if:

1. **One-time operation** - Just use Playwright directly
2. **Too specific** - Can't be reused elsewhere
3. **Too simple** - Single line operations don't need skills

---

## Testing Skills

Skills are easy to unit test:

```typescript
// __tests__/TableExtractionSkill.test.ts
import { test, expect } from '@playwright/test';
import { TableExtractionSkill } from '../src/skills';

test('extracts table data', async ({ page }) => {
  // Setup mock page
  await page.setContent(`
    <table>
      <thead><tr><th>Header</th></tr></thead>
      <tbody><tr><td>Data</td></tr></tbody>
    </table>
  `);

  // Create skill
  const skill = new TableExtractionSkill(page, {
    tableSelector: 'table',
    includeHeader: true,
  });

  // Execute
  const result = await skill.execute();

  // Assert
  expect(result.success).toBe(true);
  expect(result.data).toEqual([
    ['Header'],
    ['Data']
  ]);
});
```

---

## Summary

**Skills = Reusable Scraping Patterns**

- 📦 **Pre-built** - TableExtraction, CSVDownload, MultiExpiration
- 🔧 **Configurable** - Pass selectors and options
- 🎯 **Composable** - Combine multiple skills
- ✅ **Type-safe** - Full TypeScript support
- 🧪 **Testable** - Easy to unit test

Use skills to avoid repeating scraping logic and build maintainable code!

---

## Next Steps

1. ✅ Read this SKILLS guide
2. 📖 Review existing skills in `src/skills/`
3. 🔨 Use skills in your scrapers
4. 🎨 Create custom skills when needed
5. 🧪 Write tests for your skills
