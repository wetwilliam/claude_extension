# Gemini Handler 整合測試指南

## 📋 整合摘要

已成功將 3 個重複的 Gemini 處理文件整合為單一的 `gemini_handler.js`：

### 移除的舊文件
- ❌ `gemini_final.js` (332 行) - 事件系統 + 剪貼簿檢測
- ❌ `gemini_auto_handler.js` (939 行) - 完整功能 + 調試工具
- ❌ `gemini_auto_handler_simple.js` (180 行) - 簡化版本

### 新的統一文件
- ✅ `gemini_handler.js` (678 行) - 整合所有功能

**代碼減少**: 1,451 行 → 678 行 (**減少 53.3%**)

---

## 🎯 整合功能清單

### 保留的核心功能

#### 1. **多源 Prompt 檢測**
- ✅ localStorage 自動檢測
- ✅ 剪貼簿自動檢測
- ✅ 智能關鍵詞識別
- ✅ Chrome 消息監聽

#### 2. **輸入框檢測** (8 種選擇器策略)
- ✅ Quill 編輯器支援
- ✅ Rich Textarea 支援
- ✅ ContentEditable 支援
- ✅ 尺寸和可見性驗證

#### 3. **發送按鈕檢測** (2 大策略)
- ✅ 精確選擇器匹配 (11 種)
- ✅ 位置關係檢測
- ✅ 圖標特徵識別

#### 4. **自動化工作流**
- ✅ 頁面就緒檢測
- ✅ 文字自動輸入
- ✅ 剪貼簿輔助貼上
- ✅ 事件觸發系統
- ✅ 多種發送方式 (按鈕 + 鍵盤)

#### 5. **SPA 支援**
- ✅ MutationObserver 監聽
- ✅ URL 變化檢測
- ✅ 頁面重新處理

#### 6. **OCR 特殊處理**
- ✅ 僅輸入不發送
- ✅ 用戶手動上傳圖片提示

#### 7. **調試工具**
- ✅ `window.geminiDebug.findInput()` - 查找輸入框
- ✅ `window.geminiDebug.findSendButton()` - 查找發送按鈕
- ✅ `window.geminiDebug.testInput(text)` - 測試輸入
- ✅ `window.geminiDebug.testSend()` - 測試發送
- ✅ `window.geminiDebug.fullTest(text)` - 完整流程測試
- ✅ `window.geminiDebug.checkStatus()` - 檢查頁面狀態
- ✅ `window.geminiDebug.cleanup()` - 清理測試數據
- ✅ `window.geminiDebug.simulate(text, type)` - 模擬自動提示

### 新增改進

#### 1. **配置化設計**
```javascript
const CONFIG = {
  DOMAIN: 'gemini.google.com',
  TIMEOUT: { ... },
  SELECTORS: { ... },
  AI_KEYWORDS: [ ... ]
}
```

#### 2. **統一錯誤處理**
- 所有函數都有 try-catch
- 友好的錯誤提示
- 自動重試機制

#### 3. **代碼質量提升**
- 現代 ES6+ 語法
- 統一命名規範
- 清晰的函數分組
- 詳細的註釋

---

## 🧪 測試計劃

### 基礎測試 (必須通過)

#### Test 1: 頁面載入檢測
```javascript
// 在 Gemini 頁面控制台執行
window.geminiDebug.checkStatus()
```
**預期結果**:
```javascript
{
  readyState: "complete",
  hasAngular: true,
  hasRichTextarea: true,
  hasQuillEditor: true,
  inputBoxFound: true,
  sendButtonFound: true
}
```

#### Test 2: 輸入框檢測
```javascript
window.geminiDebug.findInput()
```
**預期結果**: 返回 DOM 元素或 null

#### Test 3: 發送按鈕檢測
```javascript
window.geminiDebug.findSendButton()
```
**預期結果**: 返回 Button 元素或 null

---

### 功能測試

#### Test 4: 手動輸入測試
```javascript
await window.geminiDebug.testInput("這是一個測試輸入")
```
**預期結果**:
- 輸入框中出現文字
- 返回 `true`

#### Test 5: 發送測試
```javascript
await window.geminiDebug.testSend()
```
**預期結果**:
- 消息被發送（或嘗試多種方法）
- 返回 `true`

#### Test 6: 完整流程測試
```javascript
await window.geminiDebug.fullTest("完整測試內容")
```
**預期結果**:
- 輸入成功
- 發送成功
- 返回 `"✅ 完整測試成功"`

---

### 實際使用場景測試

#### Scenario 1: localStorage 自動輸入
```javascript
// 模擬擴展設置 localStorage
window.geminiDebug.simulate("請總結以下內容：測試文章...", "summary")
```
**預期行為**:
1. 檢測到 localStorage prompt
2. 自動輸入到 Gemini
3. 自動發送
4. localStorage 被清除

#### Scenario 2: 剪貼簿自動檢測
```javascript
// 1. 複製包含 AI 關鍵詞的文字到剪貼簿
// 2. 重新載入 Gemini 頁面
// 3. 觀察控制台輸出
```
**預期行為**:
1. 檢測到剪貼簿內容
2. 識別 AI 關鍵詞
3. 自動輸入並發送
4. 剪貼簿被清空

#### Scenario 3: OCR 模式
```javascript
window.geminiDebug.simulate("請識別這張圖片中的文字", "ocr")
```
**預期行為**:
1. 檢測到 OCR 動作
2. 自動輸入提示文字
3. **不自動發送**
4. 顯示提示：請上傳圖片後手動發送

#### Scenario 4: 擴展彈出選單觸發
```
1. 在任意網頁點擊擴展圖標
2. 選擇「總結」功能
3. 觀察 Gemini 頁面行為
```
**預期行為**:
1. 開啟 Gemini 新視窗
2. 自動輸入總結提示
3. 自動發送

---

## 🐛 常見問題排查

### 問題 1: 找不到輸入框
**可能原因**:
- 頁面尚未完全載入
- Gemini UI 結構變化

**排查步驟**:
```javascript
// 檢查頁面狀態
window.geminiDebug.checkStatus()

// 手動搜索
document.querySelectorAll('[contenteditable="true"]')
```

### 問題 2: 發送按鈕點擊失敗
**可能原因**:
- 按鈕被禁用
- Gemini 需要新的選擇器

**排查步驟**:
```javascript
// 檢查所有按鈕
document.querySelectorAll('button').forEach(btn => {
  console.log(btn, btn.getBoundingClientRect());
});
```

### 問題 3: 自動輸入不生效
**可能原因**:
- 事件未正確觸發
- Quill 編輯器特殊處理

**排查步驟**:
```javascript
// 檢查輸入框類型
const input = window.geminiDebug.findInput();
console.log({
  classList: input.classList,
  contentEditable: input.contentEditable,
  parent: input.closest('rich-textarea')
});
```

---

## 📊 性能指標

### 代碼優化結果
| 指標 | 整合前 | 整合後 | 改善 |
|------|--------|--------|------|
| 文件數量 | 3 個 | 1 個 | -66.7% |
| 總代碼行數 | 1,451 行 | 678 行 | -53.3% |
| 重複代碼 | 高 | 無 | 100% 消除 |
| 調試工具 | 分散 | 統一 | 統一化 |
| 配置管理 | 硬編碼 | 配置化 | 可維護性 ↑ |

### 功能完整性
- ✅ 所有原有功能保留
- ✅ 新增配置化設計
- ✅ 統一錯誤處理
- ✅ 現代化語法

---

## ✅ 驗收標準

### 必須通過的測試
- [ ] Test 1: 頁面狀態檢查返回全部 true
- [ ] Test 2: 能找到輸入框
- [ ] Test 3: 能找到發送按鈕
- [ ] Test 4: 手動輸入測試成功
- [ ] Test 5: 發送測試成功（至少一種方法）
- [ ] Test 6: 完整流程測試成功

### 場景測試
- [ ] Scenario 1: localStorage 觸發成功
- [ ] Scenario 2: 剪貼簿檢測成功
- [ ] Scenario 3: OCR 模式僅輸入不發送
- [ ] Scenario 4: 擴展選單觸發正常

### 代碼質量
- [ ] 無 console.error 錯誤
- [ ] 無未捕獲異常
- [ ] manifest.json 正確配置
- [ ] 舊文件完全移除

---

## 🚀 部署步驟

1. **重新載入擴展**
   ```
   chrome://extensions/ → 重新載入
   ```

2. **清除緩存** (可選)
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   ```

3. **測試基本功能**
   - 開啟 Gemini 頁面
   - 打開控制台
   - 執行 `window.geminiDebug.checkStatus()`

4. **測試實際場景**
   - 從擴展選單觸發總結功能
   - 觀察自動輸入和發送

5. **監控錯誤**
   - 觀察控制台是否有紅色錯誤
   - 檢查網絡請求是否正常

---

## 📝 後續優化建議

### 短期 (1-2 週)
- [ ] 添加單元測試 (Jest)
- [ ] 增加錯誤上報機制
- [ ] 優化超時配置

### 中期 (1 個月)
- [ ] 支援更多 Gemini UI 變體
- [ ] 添加性能監控
- [ ] 實現 A/B 測試框架

### 長期 (3 個月)
- [ ] 支援其他 AI 平台 (ChatGPT, Perplexity)
- [ ] 雲端配置同步
- [ ] 機器學習優化按鈕檢測

---

**整合完成時間**: 2025-12-22
**整合工程師**: Claude Sonnet 4.5
**版本**: v2.0 統一版
