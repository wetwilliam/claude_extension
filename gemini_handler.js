// gemini_handler.js - 統一的 Gemini 自動化處理器
// 整合了所有 Gemini 處理功能：localStorage 檢測、剪貼簿檢測、智能關鍵詞識別、SPA 監聽

(function() {
  'use strict';

  console.log('🚀 Gemini Handler 統一版本載入...');
  console.log('📍 當前URL:', window.location.href);

  // ==================== 防重複機制 ====================
  let isProcessing = false;
  let lastProcessedContent = '';

  // ✅ FIX #2: 明確授權機制
  let userConsentGiven = false;

  // ==================== 配置常量 ====================
  const CONFIG = {
    // 域名檢查
    DOMAIN: 'gemini.google.com',

    // ✅ FIX #3: 持久化防重複機制
    PROCESSED_PROMPTS_KEY: 'gemini-processed-prompts',
    MAX_PROCESSED_HISTORY: 10,

    // 時間配置 (毫秒)
    TIMEOUT: {
      PROMPT_EXPIRY: 5 * 60 * 1000,      // prompt 有效期 5 分鐘
      PAGE_READY_CHECK: 500,              // 頁面就緒檢查間隔
      PAGE_READY_MAX_ATTEMPTS: 60,        // 最多等待 30 秒
      INIT_DELAY: 1000,                   // 初始化延遲
      INPUT_DELAY: 200,                   // 輸入操作延遲
      SEND_DELAY: 1500,                   // 發送操作延遲
      EVENT_DELAY: 100,                   // 事件觸發延遲
      RETRY_DELAY: 3000                   // 重試延遲
    },

    // 選擇器配置
    SELECTORS: {
      INPUT: [
        'rich-textarea div.ql-editor[contenteditable="true"]',
        'div.ql-editor.textarea.new-input-ui[contenteditable="true"]',
        'div.ql-editor[role="textbox"][contenteditable="true"]',
        'div.ql-editor[aria-label*="提示"][contenteditable="true"]',
        'div.ql-editor[contenteditable="true"]',
        'rich-textarea [contenteditable="true"]',
        '[role="textbox"][contenteditable="true"]',
        'div[contenteditable="true"]'
      ],
      SEND_BUTTON: [
        'button[aria-label*="Send message"]',
        'button[aria-label*="傳送訊息"]',
        'button[data-testid*="send"]',
        'button[title*="Send"]',
        'button[title*="傳送"]',
        'button svg[viewBox="0 0 24 24"]',
        'button[class*="send"]',
        'button[class*="submit"]',
        'div[role="button"][aria-label*="Send"]',
        'div[role="button"][aria-label*="傳送"]',
        'button[type="submit"]',
        'button'
      ]
    },

    // AI 關鍵詞配置
    AI_KEYWORDS: [
      '我希望你扮演', '請總結', '請翻譯', '摘要助手', '翻譯助理',
      '總結以下內容', '翻譯以下內容', '搜尋', '識別這張圖片',
      '標題：', '來源：', '內容：'
    ],

    // 最小內容長度檢測
    MIN_CLIPBOARD_LENGTH: 50
  };

  // ==================== 域名檢查 ====================
  if (!window.location.href.includes(CONFIG.DOMAIN)) {
    console.warn('⚠️ 非 Gemini 域名，跳過初始化');
    return;
  }

  // ==================== 工具函數 ====================

  /**
   * ✅ FIX #3: 檢查內容是否已被處理過（持久化）
   */
  function hasBeenProcessed(content) {
    try {
      const processed = JSON.parse(localStorage.getItem(CONFIG.PROCESSED_PROMPTS_KEY) || '[]');
      const fingerprint = content.substring(0, 100); // 使用前 100 字符作為指紋
      return processed.includes(fingerprint);
    } catch (error) {
      console.warn('⚠️ 無法檢查處理歷史:', error);
      return false;
    }
  }

  /**
   * ✅ FIX #3: 標記內容為已處理（持久化）
   */
  function markAsProcessed(content) {
    try {
      const processed = JSON.parse(localStorage.getItem(CONFIG.PROCESSED_PROMPTS_KEY) || '[]');
      const fingerprint = content.substring(0, 100);

      // 避免重複添加
      if (!processed.includes(fingerprint)) {
        processed.push(fingerprint);

        // 保持最近 10 條記錄，防止存儲膨脹
        if (processed.length > CONFIG.MAX_PROCESSED_HISTORY) {
          processed.shift();
        }

        localStorage.setItem(CONFIG.PROCESSED_PROMPTS_KEY, JSON.stringify(processed));
        console.log('✅ 已標記為已處理:', fingerprint.substring(0, 30) + '...');
      }
    } catch (error) {
      console.error('❌ 無法記錄已處理內容:', error);
    }
  }

  /**
   * 檢查元素是否可見
   */
  function isElementVisible(element) {
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0'
    );
  }

  /**
   * 等待指定時間
   */
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==================== 核心功能：輸入框檢測 ====================

  /**
   * 查找 Gemini 輸入框
   */
  function findGeminiInputBox() {
    console.log('🔍 開始搜索 Gemini 輸入框...');

    for (const selector of CONFIG.SELECTORS.INPUT) {
      try {
        const elements = document.querySelectorAll(selector);

        for (const element of elements) {
          if (!isElementVisible(element) || element.disabled || element.readOnly) {
            continue;
          }

          // 檢查尺寸
          const rect = element.getBoundingClientRect();
          const hasReasonableSize = rect.height > 15 && rect.width > 100;

          if (!hasReasonableSize) continue;

          // 驗證是否為 Gemini 輸入框
          const ariaLabel = element.getAttribute('aria-label') || '';
          const dataPlaceholder = element.getAttribute('data-placeholder') || '';
          const className = element.className || '';
          const parentClasses = element.parentElement?.className || '';

          const isGeminiInput =
            ariaLabel.includes('提示') ||
            ariaLabel.includes('輸入') ||
            dataPlaceholder.includes('Gemini') ||
            className.includes('ql-editor') ||
            parentClasses.includes('rich-textarea') ||
            selector.includes('rich-textarea');

          if (isGeminiInput || selector.includes('ql-editor')) {
            console.log('✅ 找到 Gemini 輸入框:', selector);
            return element;
          }
        }
      } catch (error) {
        console.warn('選擇器檢查失敗:', selector, error);
      }
    }

    console.log('❌ 未找到合適的 Gemini 輸入框');
    return null;
  }

  // ==================== 核心功能：發送按鈕檢測 ====================

  /**
   * 查找 Gemini 發送按鈕
   */
  function findGeminiSendButton() {
    console.log('🔍 開始搜索 Gemini 發送按鈕...');

    // 策略 1: 精確選擇器匹配
    for (const selector of CONFIG.SELECTORS.SEND_BUTTON) {
      try {
        const elements = document.querySelectorAll(selector);

        for (const button of elements) {
          if (!isElementVisible(button) || button.disabled) continue;

          const buttonText = button.textContent?.toLowerCase() || '';
          const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
          const title = button.getAttribute('title')?.toLowerCase() || '';
          const className = button.className || '';

          // 文字匹配檢測
          const isSendButton =
            buttonText.includes('send') || buttonText.includes('傳送') ||
            ariaLabel.includes('send') || ariaLabel.includes('傳送') || ariaLabel.includes('submit') ||
            title.includes('send') || title.includes('傳送') ||
            className.includes('send') || className.includes('submit');

          if (isSendButton) {
            console.log('✅ 找到發送按鈕 (文字匹配)');
            return button;
          }

          // 圖標特徵檢測
          const rect = button.getBoundingClientRect();
          const hasIcon = !!button.querySelector('svg, mat-icon, i[class*="icon"]');
          const isSmallButton = rect.width < 80 && rect.height < 80 && rect.width > 20 && rect.height > 20;

          if (hasIcon && isSmallButton && selector.includes('svg')) {
            console.log('✅ 找到發送按鈕 (圖標特徵)');
            return button;
          }
        }
      } catch (error) {
        console.warn('發送按鈕選擇器檢查失敗:', selector, error);
      }
    }

    // 策略 2: 位置關係檢測
    console.log('⏳ 嘗試通過位置關係查找發送按鈕...');
    const inputBox = findGeminiInputBox();
    if (inputBox) {
      const containers = [
        inputBox.closest('div[class*="text-input"]'),
        inputBox.closest('div[class*="input-field"]'),
        inputBox.closest('div[class*="chat"]'),
        inputBox.closest('form'),
        inputBox.parentElement,
        inputBox.parentElement?.parentElement,
        inputBox.parentElement?.parentElement?.parentElement
      ].filter(Boolean);

      for (const container of containers) {
        const buttons = container.querySelectorAll('button');

        for (const button of buttons) {
          if (!isElementVisible(button) || button.disabled) continue;

          const buttonRect = button.getBoundingClientRect();
          const inputRect = inputBox.getBoundingClientRect();

          // 檢查按鈕是否在輸入框附近（右側或下方）
          const isNearInput =
            (buttonRect.left >= inputRect.right - 100 &&
             buttonRect.top >= inputRect.top - 50 &&
             buttonRect.bottom <= inputRect.bottom + 50) ||
            (Math.abs(buttonRect.top - inputRect.bottom) < 60 &&
             buttonRect.left >= inputRect.left);

          const hasIcon = !!button.querySelector('svg, mat-icon');
          const isSmallButton = buttonRect.width < 100 && buttonRect.height < 100;

          if (isNearInput && (hasIcon || isSmallButton)) {
            console.log('✅ 找到發送按鈕 (位置關係)');
            return button;
          }
        }
      }
    }

    console.log('❌ 未找到 Gemini 發送按鈕');
    return null;
  }

  // ==================== 核心功能：頁面準備檢測 ====================

  /**
   * 等待 Gemini 頁面準備就緒
   */
  function waitForGeminiReady() {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = CONFIG.TIMEOUT.PAGE_READY_MAX_ATTEMPTS;

      const checkReady = () => {
        attempts++;
        console.log(`⏳ 檢查 Gemini 準備狀態 (${attempts}/${maxAttempts})`);

        const isPageReady = document.readyState === 'complete';
        const hasAngularElements = document.querySelectorAll('[_ngcontent], rich-textarea').length > 0;
        const inputBox = findGeminiInputBox();

        if (inputBox && isPageReady) {
          console.log('✅ Gemini 頁面已準備就緒');
          resolve();
        } else if (attempts < maxAttempts) {
          setTimeout(checkReady, CONFIG.TIMEOUT.PAGE_READY_CHECK);
        } else {
          console.log('⚠️ 等待超時，繼續嘗試操作');
          resolve();
        }
      };

      setTimeout(checkReady, CONFIG.TIMEOUT.INIT_DELAY);
    });
  }

  // ==================== 核心功能：文字輸入 ====================

  /**
   * 自動輸入 prompt
   */
  async function autoInputPrompt(promptText, actionType = 'default') {
    try {
      const inputBox = findGeminiInputBox();

      if (!inputBox) {
        console.error('❌ 找不到輸入框');
        return false;
      }

      console.log('📝 開始自動輸入 prompt，動作類型:', actionType);

      // 聚焦輸入框
      inputBox.focus();
      await sleep(CONFIG.TIMEOUT.INPUT_DELAY);

      // 清空現有內容
      if (inputBox.classList.contains('ql-editor')) {
        inputBox.innerHTML = '<p><br></p>';
      } else {
        inputBox.innerHTML = '';
      }
      inputBox.textContent = '';

      // 設置文本
      inputBox.textContent = promptText;
      inputBox.classList.remove('ql-blank');

      console.log('📝 文本已設置');

      // 嘗試使用剪貼簿方式（更可靠）
      try {
        await navigator.clipboard.writeText(promptText);
        document.execCommand('paste');

        console.log('📋 剪貼簿貼上完成');
      } catch (clipboardError) {
        console.warn('⚠️ 剪貼簿方法失敗，使用備用方法');

        document.execCommand('selectAll');
        document.execCommand('delete');
        document.execCommand('insertText', false, promptText);
      }

      // 移除空白樣式並觸發事件
      inputBox.classList.remove('ql-blank');

      const events = [
        new Event('input', { bubbles: true }),
        new Event('change', { bubbles: true }),
        new InputEvent('input', {
          bubbles: true,
          inputType: 'insertText',
          data: promptText
        })
      ];

      events.forEach(event => inputBox.dispatchEvent(event));

      // 觸發父級組件事件
      const richTextarea = inputBox.closest('rich-textarea');
      if (richTextarea) {
        richTextarea.dispatchEvent(new Event('input', { bubbles: true }));
      }

      console.log('✅ 輸入完成，最終內容:', inputBox.textContent.substring(0, 50) + '...');

      // 等待頁面反應
      await sleep(CONFIG.TIMEOUT.SEND_DELAY);

      // OCR 動作需要用戶先上傳圖片，不自動發送
      if (actionType === 'ocr') {
        console.log('📸 OCR 動作，不自動發送');
        setTimeout(() => {
          alert('OCR 提示已自動輸入！\n請上傳要識別的圖片，然後手動發送。');
        }, 500);
        return true;
      }

      // 其他動作自動發送
      await autoSendPrompt();

      return true;
    } catch (error) {
      console.error('❌ 自動輸入 prompt 失敗:', error);

      setTimeout(() => {
        alert(`自動輸入失敗，請手動輸入以下內容：\n\n${promptText}`);
      }, 500);

      return false;
    }
  }

  // ==================== 核心功能：自動發送 ====================

  /**
   * 自動發送 prompt
   */
  async function autoSendPrompt() {
    try {
      console.log('📤 開始嘗試自動發送...');

      await sleep(500);

      // 方法 1: 查找並點擊發送按鈕
      const sendButton = findGeminiSendButton();

      if (sendButton) {
        console.log('✅ 找到發送按鈕');

        sendButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(200);

        // 嘗試第一種點擊方法
        try {
          sendButton.focus();
          sendButton.click();
          console.log('✅ 方法1: 直接 click() 完成');

          // 等待一下檢查是否真的發送了
          await sleep(1000);

          // 檢查輸入框是否清空了（表示發送成功）
          const inputBox = findGeminiInputBox();
          if (inputBox && (!inputBox.textContent || inputBox.textContent.trim().length === 0)) {
            console.log('✅ 確認發送成功 - 輸入框已清空');
            return true;
          }

          console.log('⚠️ 直接click可能未成功，嘗試備用方法');
        } catch (error) {
          console.warn('⚠️ 發送按鈕點擊失敗:', error);
        }

        // 備用點擊方式
        try {
          const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
          });
          sendButton.dispatchEvent(clickEvent);
          console.log('✅ 方法1備用: MouseEvent click 完成');

          // 等待一下檢查是否真的發送了
          await sleep(1000);

          // 檢查輸入框是否清空了
          const inputBox = findGeminiInputBox();
          if (inputBox && (!inputBox.textContent || inputBox.textContent.trim().length === 0)) {
            console.log('✅ 確認備用發送成功 - 輸入框已清空');
            return true;
          }

          console.log('⚠️ 備用點擊可能也未成功');
        } catch (backupError) {
          console.warn('⚠️ 備用點擊方式也失敗:', backupError);
        }
      }

      // 方法 2: 鍵盤快捷鍵發送（只在按鈕方法失敗時嘗試）
      console.log('⏳ 嘗試鍵盤快捷鍵發送...');
      const inputBox = findGeminiInputBox();
      if (inputBox) {
        inputBox.focus();
        await sleep(CONFIG.TIMEOUT.EVENT_DELAY);

        // 只嘗試最可靠的 Enter 鍵
        try {
          const keydownEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            bubbles: true,
            cancelable: true
          });

          const keyupEvent = new KeyboardEvent('keyup', {
            key: 'Enter',
            code: 'Enter',
            bubbles: true,
            cancelable: true
          });

          inputBox.dispatchEvent(keydownEvent);
          await sleep(100);
          inputBox.dispatchEvent(keyupEvent);

          console.log('✅ 鍵盤 Enter 發送完成');

          // 等待檢查發送結果
          await sleep(1000);

          // 檢查輸入框是否清空了
          if (!inputBox.textContent || inputBox.textContent.trim().length === 0) {
            console.log('✅ 確認鍵盤發送成功 - 輸入框已清空');
            return true;
          }
        } catch (error) {
          console.warn('⚠️ 鍵盤方法失敗:', error);
        }
      }

      console.log('❌ 所有自動發送方法都已嘗試，但可能未成功');
      return false;

    } catch (error) {
      console.error('❌ 自動發送過程中發生錯誤:', error);
      return false;
    }
  }

  // ==================== 擴展功能：剪貼簿檢測 ====================

  /**
   * 檢查剪貼簿內容是否包含 AI prompt
   */
  async function checkClipboardForPrompt() {
    try {
      const clipboardText = await navigator.clipboard.readText();

      if (!clipboardText || clipboardText.length < CONFIG.MIN_CLIPBOARD_LENGTH) {
        console.log('ℹ️ 剪貼簿內容為空或過短');
        return;
      }

      console.log('📋 檢測到剪貼簿內容，長度:', clipboardText.length);

      // 檢查是否包含 AI 關鍵詞
      const containsAIPrompt = CONFIG.AI_KEYWORDS.some(keyword =>
        clipboardText.includes(keyword)
      );

      if (containsAIPrompt) {
        console.log('✅ 剪貼簿包含 AI 提示');

        // 判斷動作類型
        let detectedAction = 'summary';
        if (clipboardText.includes('翻譯') || clipboardText.includes('翻译')) {
          detectedAction = 'translate';
        } else if (clipboardText.includes('搜尋') || clipboardText.includes('搜索')) {
          detectedAction = 'search';
        } else if (clipboardText.includes('識別') || clipboardText.includes('OCR')) {
          detectedAction = 'ocr';
        }

        executeAutoAction(clipboardText, detectedAction);

        // 清空剪貼簿避免重複處理
        try {
          await navigator.clipboard.writeText('');
          console.log('✅ 已清空剪貼簿');
        } catch (clearError) {
          console.log('⚠️ 無法清空剪貼簿:', clearError);
        }
      } else {
        console.log('ℹ️ 剪貼簿內容不包含 AI 提示關鍵詞');
      }

    } catch (clipboardError) {
      console.log('ℹ️ 無法讀取剪貼簿或剪貼簿為空');
    }
  }

  // ==================== 擴展功能：localStorage 檢測 ====================

  /**
   * 檢查 localStorage 中的自動 prompt
   */
  async function checkLocalStoragePrompt() {
    try {
      const autoPrompt = localStorage.getItem('gemini-auto-prompt');
      const promptTime = localStorage.getItem('gemini-auto-prompt-time');
      const actionType = localStorage.getItem('gemini-auto-prompt-action');

      if (autoPrompt && promptTime) {
        const timeDiff = Date.now() - parseInt(promptTime);
        const FRESH_DATA_THRESHOLD = 30 * 1000; // ✅ FIX: 只接受 30 秒內的數據

        if (timeDiff < FRESH_DATA_THRESHOLD) {
          console.log('✅ 檢測到新鮮的 localStorage 自動提示');
          console.log('📋 動作類型:', actionType);
          console.log('⏰ 時間差:', Math.floor(timeDiff / 1000), '秒前');

          // ✅ FIX #2: 授予授權（因為數據很新鮮，來自用戶的擴展操作）
          userConsentGiven = true;

          // 清除 localStorage 避免重複處理
          localStorage.removeItem('gemini-auto-prompt');
          localStorage.removeItem('gemini-auto-prompt-time');
          localStorage.removeItem('gemini-auto-prompt-action');

          executeAutoAction(autoPrompt, actionType);

          // 執行後重置授權
          setTimeout(() => {
            userConsentGiven = false;
          }, 5000);

          return true;
        } else if (timeDiff < CONFIG.TIMEOUT.PROMPT_EXPIRY) {
          // 數據在 30 秒到 5 分鐘之間：可能是舊數據
          console.log('⚠️ localStorage 數據不夠新鮮 (' + Math.floor(timeDiff / 1000) + '秒前)，已忽略');
          console.log('💡 為安全起見，僅執行 30 秒內的請求');

          // 清除舊數據
          localStorage.removeItem('gemini-auto-prompt');
          localStorage.removeItem('gemini-auto-prompt-time');
          localStorage.removeItem('gemini-auto-prompt-action');
        } else {
          console.log('⏰ localStorage 自動提示已過期，清除緩存');
          localStorage.removeItem('gemini-auto-prompt');
          localStorage.removeItem('gemini-auto-prompt-time');
          localStorage.removeItem('gemini-auto-prompt-action');
        }
      }

      return false;
    } catch (error) {
      console.error('❌ localStorage 檢查失敗:', error);
      return false;
    }
  }

  /**
   * 執行自動動作
   */
  async function executeAutoAction(prompt, actionType) {
    // ✅ FIX #2: 檢查明確授權
    if (!userConsentGiven) {
      console.log('⏸️ 自動執行被阻止：需要用戶明確授權');
      console.log('💡 提示：此功能僅在您點擊擴展按鈕時才會執行');
      return;
    }

    // ✅ FIX #3: 持久化防重複檢查
    if (hasBeenProcessed(prompt)) {
      console.log('⏸️ 內容已處理過（持久化記錄），跳過重複執行');
      return;
    }

    // 防重複檢查（臨時狀態）
    if (isProcessing) {
      console.log('⏸️ 正在處理中，跳過重複執行');
      return;
    }

    if (prompt === lastProcessedContent) {
      console.log('⏸️ 內容已處理過（會話記錄），跳過重複執行');
      return;
    }

    isProcessing = true;
    lastProcessedContent = prompt;

    // ✅ FIX #3: 標記為已處理
    markAsProcessed(prompt);

    try {
      console.log(`🎯 開始執行自動動作: ${actionType}`);

      await waitForGeminiReady();

      const inputSuccess = await autoInputPrompt(prompt, actionType);

      if (!inputSuccess) {
        console.log('❌ 自動輸入失敗');
        setTimeout(() => {
          alert(`自動輸入失敗，請手動複製以下內容到 Gemini:\n\n${prompt}`);
        }, 1000);
      } else {
        console.log('✅ 自動動作執行成功');
      }
    } catch (error) {
      console.error('❌ 執行自動動作時發生錯誤:', error);
    } finally {
      // 重置處理狀態（延遲一下防止太快重複）
      setTimeout(() => {
        isProcessing = false;
      }, 3000);
    }
  }

  // ==================== SPA 頁面監聽 ====================

  /**
   * 監聽頁面變化，處理 SPA 路由變化
   */
  function observePageChanges() {
    let lastUrl = location.href;

    const observer = new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        console.log('🔄 Gemini 頁面 URL 變化:', url);

        // 重置臨時防重複機制（但保留持久化記錄）
        isProcessing = false;
        lastProcessedContent = '';

        // ✅ FIX #4: 移除 URL 變化時的自動檢查
        // setTimeout(() => {
        //   checkForAutoPrompt();
        // }, 2000);

        console.log('💡 頁面已更新，待命中。需要執行時請點擊擴展按鈕。');
      }
    });

    observer.observe(document, {
      subtree: true,
      childList: true
    });
  }

  // ==================== Chrome 消息監聽 ====================

  /**
   * 監聽來自擴展的消息
   */
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'autoInputPrompt') {
        console.log('📨 收到自動輸入 prompt 請求');

        // ✅ FIX #2: 授予明確授權（因為這是用戶主動點擊擴展按鈕）
        userConsentGiven = true;

        autoInputPrompt(request.prompt).then(success => {
          sendResponse({ success: success });

          // 執行完成後重置授權（單次授權模式）
          setTimeout(() => {
            userConsentGiven = false;
          }, 5000);
        });

        return true;
      }
    });
  }

  // ==================== 主要檢查函數 ====================

  /**
   * 檢查並執行自動 prompt
   */
  async function checkForAutoPrompt() {
    console.log('🔍 開始檢查自動 prompt...');

    // ✅ FIX #4: 僅檢查 localStorage，移除剪貼簿自動讀取
    await checkLocalStoragePrompt();

    // ❌ 已停用：剪貼簿自動讀取（隱私問題 + 非預期執行）
    // if (!hasLocalStorage) {
    //   await checkClipboardForPrompt();
    // }
  }

  // ==================== 調試工具 ====================

  /**
   * 設置調試工具
   */
  function setupDebugTools() {
    try {
      if (typeof window === 'undefined') {
        console.warn('⚠️ Window 對象不存在');
        return;
      }

      window.geminiDebug = {
        // 基本檢測
        findInput: findGeminiInputBox,
        findSendButton: findGeminiSendButton,

        // 測試功能
        testInput: async (text) => {
          const testText = text || '測試輸入';
          return await autoInputPrompt(testText, 'test');
        },

        testSend: async () => {
          return await autoSendPrompt();
        },

        fullTest: async (text) => {
          const testText = text || '完整測試內容';
          console.log('🧪 開始完整流程測試...');

          const inputBox = findGeminiInputBox();
          if (!inputBox) return '❌ 未找到輸入框';

          const inputSuccess = await autoInputPrompt(testText, 'test');
          if (!inputSuccess) return '❌ 輸入失敗';

          await sleep(1000);
          const sendSuccess = await autoSendPrompt();

          return sendSuccess ? '✅ 完整測試成功' : '⚠️ 輸入成功但發送失敗';
        },

        // 頁面狀態
        checkStatus: () => {
          const status = {
            readyState: document.readyState,
            hasAngular: document.querySelectorAll('[_ngcontent]').length > 0,
            hasRichTextarea: document.querySelectorAll('rich-textarea').length > 0,
            hasQuillEditor: document.querySelectorAll('.ql-editor').length > 0,
            inputBoxFound: !!findGeminiInputBox(),
            sendButtonFound: !!findGeminiSendButton()
          };
          console.table(status);
          return status;
        },

        // 清理測試數據
        cleanup: () => {
          localStorage.removeItem('gemini-auto-prompt');
          localStorage.removeItem('gemini-auto-prompt-time');
          localStorage.removeItem('gemini-auto-prompt-action');
          localStorage.removeItem(CONFIG.PROCESSED_PROMPTS_KEY); // ✅ FIX #3: 清理持久化記錄
          console.log('✅ 測試數據已清理（包含持久化記錄）');
        },

        // 模擬自動提示
        simulate: async (text, actionType) => {
          localStorage.setItem('gemini-auto-prompt', text || '模擬測試內容');
          localStorage.setItem('gemini-auto-prompt-time', Date.now().toString());
          localStorage.setItem('gemini-auto-prompt-action', actionType || 'test');
          await checkForAutoPrompt();
          return '✅ 模擬完成';
        }
      };

      console.log('🎯 調試工具已設置: window.geminiDebug');
      console.log('💡 使用方法:');
      console.log('  - window.geminiDebug.checkStatus()    // 檢查頁面狀態');
      console.log('  - window.geminiDebug.testInput("測試") // 測試輸入');
      console.log('  - window.geminiDebug.fullTest()       // 完整測試');

    } catch (error) {
      console.error('❌ 調試工具設置失敗:', error);
    }
  }

  // ==================== 初始化 ====================

  /**
   * 初始化處理器
   */
  function initGeminiHandler() {
    console.log('🎯 Gemini Handler 初始化開始');

    try {
      // ✅ FIX: 停用自動檢查，改為僅響應 Chrome 消息
      // checkForAutoPrompt(); // 已停用：現在使用 Chrome 消息傳遞
      observePageChanges();
      setupDebugTools();

      console.log('✅ Gemini Handler 初始化成功 (Chrome 消息模式)');
      console.log('💡 等待來自擴展的 Chrome 消息');
    } catch (error) {
      console.error('❌ Gemini Handler 初始化失敗:', error);
    }
  }

  /**
   * 安全初始化（帶重試）
   */
  function safeInit() {
    try {
      initGeminiHandler();
    } catch (error) {
      console.error('❌ 初始化過程中發生錯誤:', error);

      setTimeout(() => {
        console.log('🔄 重試初始化...');
        try {
          initGeminiHandler();
        } catch (retryError) {
          console.error('❌ 重試初始化失敗:', retryError);
        }
      }, CONFIG.TIMEOUT.RETRY_DELAY);
    }
  }

  // 啟動初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', safeInit);
  } else {
    setTimeout(safeInit, CONFIG.TIMEOUT.INIT_DELAY);
  }

  console.log('🎉 Gemini Handler 統一版本載入完成');

})();
