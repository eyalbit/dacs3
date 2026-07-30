# Testing Guide - מדריך בדיקות

מדריך מלא להרצת בדיקות באינטגרציית Barchart.

---

## 🎯 מה בדקנו?

### ✅ **Page Objects** (2 tests)
- **BarchartLoginPage** - טופס התחברות
- **BarchartScreenerPage** - Screener + חילוץ נתונים

### ✅ **Skills** (2 tests)
- **BarchartLoginSkill** - Login + Session persistence
- **BarchartScreenerSkill** - Screener runner

### ✅ **Integration** (1 test)
- **Complete Workflow** - Login → Screener → Results

**סה"כ:** 5 קבצי test עם 20+ מקרי בדיקה

---

## 🚀 הרצת Tests

### כל ה-Tests
```bash
npm test
```

### עם דפדפן גלוי (Debug)
```bash
npm run test:headed
```

### עם Playwright Inspector
```bash
npm run test:debug
```

### Test ספציפי
```bash
npx playwright test tests/integration/complete-workflow.test.ts
```

### רק Integration Tests
```bash
npx playwright test tests/integration/
```

### רק Skills Tests
```bash
npx playwright test tests/skills/
```

### HTML Report
```bash
npm test
npm run test:report
```

---

## 📋 Test Structure

```
tests/
├── setup.ts                              # Helper functions
│
├── pages/                                # Page Object tests
│   ├── BarchartLoginPage.test.ts        # 4 tests
│   └── BarchartScreenerPage.test.ts     # 5 tests
│
├── skills/                               # Skills tests
│   ├── BarchartLoginSkill.test.ts       # 4 tests
│   └── BarchartScreenerSkill.test.ts    # 3 tests
│
├── integration/                          # E2E tests
│   └── complete-workflow.test.ts        # 3 tests
│
└── README.md                             # Documentation
```

---

## 📝 מקרי בדיקה

### 1. BarchartLoginPage Tests

```typescript
✅ should navigate to login page
✅ should perform complete login flow
✅ should detect successful login
✅ should handle invalid credentials gracefully
```

### 2. BarchartScreenerPage Tests

```typescript
✅ should navigate to screener page
✅ should click "See Results" button
✅ should extract symbols from results
✅ should run complete screener workflow
```

### 3. BarchartLoginSkill Tests

```typescript
✅ should perform login and save session
✅ should reuse existing session
✅ should force fresh login when requested
✅ should clear session
```

### 4. BarchartScreenerSkill Tests

```typescript
✅ should run screener with auto-login
✅ should use getSymbols() shortcut
✅ should handle missing screener URL
```

### 5. Complete Workflow Tests

```typescript
✅ should complete full workflow: login → screener → results
✅ should reuse session in second run
✅ should handle multiple symbols correctly
```

---

## ⚙️ Configuration

### .env (Required)

```bash
BARCHART_EMAIL=eb.bitan@gmail.com
BARCHART_PASSWORD=100%Gamba
BARCHART_LOGIN_URL=https://www.barchart.com/login
BARCHART_SCREENER_URL=https://www.barchart.com/stocks/stocks-screener?screener=478448
TEST_HEADLESS=true
```

### playwright.config.ts

```typescript
{
  testDir: './tests',
  fullyParallel: false,  // Sequential (avoid session conflicts)
  workers: 1,            // Single worker
  timeout: 60000,        // 60 seconds per test
}
```

---

## 🧪 Example Test

```typescript
import { test, expect } from '@playwright/test';
import { BarchartScreenerSkill } from '../../src/skills/BarchartScreenerSkill';
import { getBarchartConfig } from '../setup';

test('should get symbols from screener', async ({ page }) => {
  const config = getBarchartConfig();
  
  const skill = new BarchartScreenerSkill(page, {
    screenerUrl: config.screenerUrl,
    loginConfig: config,
  });
  
  const symbols = await skill.getSymbols();
  
  expect(symbols.length).toBeGreaterThan(0);
  console.log('Found symbols:', symbols);
});
```

---

## 🐛 Debugging

### 1. ראה את הדפדפן
```bash
npm run test:headed
```

### 2. Playwright Inspector
```bash
npm run test:debug
```

### 3. Screenshots
```typescript
await page.screenshot({ path: 'debug.png' });
```

### 4. Console.log
```typescript
console.log('Symbols:', symbols);
```

### 5. Breakpoint
```typescript
await page.pause(); // Opens inspector
```

---

## 📊 Test Results

### Success Example
```
Running 20 tests using 1 worker

✓ BarchartLoginPage › should navigate to login page (2.3s)
✓ BarchartLoginPage › should perform complete login flow (4.1s)
✓ BarchartScreenerPage › should extract symbols from results (6.2s)
✓ BarchartLoginSkill › should reuse existing session (1.8s)
✓ Complete Workflow › should complete full workflow (8.5s)

20 passed (45s)
```

### View HTML Report
```bash
npm run test:report
```

---

## 🔄 CI/CD

### GitHub Actions
```yaml
- name: Run Tests
  run: npm test
  env:
    BARCHART_EMAIL: ${{ secrets.BARCHART_EMAIL }}
    BARCHART_PASSWORD: ${{ secrets.BARCHART_PASSWORD }}
```

### Local Pre-commit
```bash
# Add to .git/hooks/pre-commit
npm test || exit 1
```

---

## 🚨 Troubleshooting

### בעיה: Timeout
```bash
# הגדל timeout
# playwright.config.ts
timeout: 120000 // 2 minutes
```

### בעיה: Session conflicts
```bash
# נקה sessions
rm -rf .auth/*.json
npm test
```

### בעיה: Missing credentials
```bash
# בדוק .env
cat .env | grep BARCHART
```

### בעיה: Flaky tests
```bash
# הרץ שוב עם retries
npx playwright test --retries=2
```

---

## ✅ מה ש-Tests מכסים

### Functionality Coverage
- ✅ Login flow
- ✅ Session persistence
- ✅ Screener navigation
- ✅ "See Results" click
- ✅ Symbol extraction
- ✅ CSV download (optional)
- ✅ Error handling
- ✅ Multi-symbol handling

### Edge Cases
- ✅ Invalid credentials
- ✅ Missing URLs
- ✅ Session expiration
- ✅ No results scenario
- ✅ Network errors

### Performance
- ✅ Session reuse speed
- ✅ Timeout handling
- ✅ Parallel execution (disabled for safety)

---

## 📚 Resources

- **[Playwright Docs](https://playwright.dev/)** - Documentation
- **[Best Practices](https://playwright.dev/docs/best-practices)** - Guidelines
- **[tests/README.md](tests/README.md)** - Detailed test docs

---

## 🎯 Next Steps

### להוסיף בעתיד:
- [ ] Visual regression tests
- [ ] API tests (if Barchart has API)
- [ ] Performance benchmarks
- [ ] Load testing
- [ ] Mobile viewport tests

---

**Tests מוכנים להרצה! 🧪✨**

```bash
npm test
```
