// Claude AI 自動發送按鈕點擊函數
// 專門針對你提供的按鈕HTML結構設計

/**
 * 自動尋找並點擊Claude AI的發送按鈕
 * @param {Object} options - 配置選項
 * @param {number} options.maxRetries - 最大重試次數 (預設: 10)
 * @param {number} options.retryDelay - 重試間隔毫秒 (預設: 500)
 * @param {boolean} options.debug - 是否開啟除錯日誌 (預設: false)
 * @returns {Promise<boolean>} 是否成功點擊發送按鈕
 */
async function autoClickSendButton(options = {}) {
  const config = {
    maxRetries: 10,
    retryDelay: 500,
    debug: false,
    ...options
  };
  
  const log = (...args) => {
    if (config.debug) {
      console.log('[AutoSend]', ...args);
    }
  };
  
  log('開始自動發送，配置:', config);
  
  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    log(`嘗試 ${attempt}/${config.maxRetries}`);
    
    const success = findAndClickSendButton(log);
    if (success) {
      log('自動發送成功！');
      return true;
    }
    
    if (attempt < config.maxRetries) {
      log(`等待 ${config.retryDelay}ms 後重試...`);
      await sleep(config.retryDelay);
    }
  }
  
  log('自動發送失敗，已達最大重試次數');
  return false;
}

/**
 * 尋找並點擊發送按鈕的核心函數
 * @param {Function} log - 日誌函數
 * @returns {boolean} 是否成功找到並點擊按鈕
 */
function findAndClickSendButton(log = console.log) {
  log('=== 開始尋找發送按鈕 ===');
  
  // 先收集頁面上所有按鈕的診斷信息
  const allButtons = document.querySelectorAll('button');
  log(`頁面總共有 ${allButtons.length} 個按鈕`);
  
  // 策略1: 精確匹配aria-label
  log('策略1: 查找aria-label="Send message"的按鈕');
  let sendButton = document.querySelector('button[aria-label="Send message"]');
  if (sendButton) {
    const isDisabled = sendButton.disabled;
    const isVisible = sendButton.offsetParent !== null;
    log(`找到aria-label按鈕 - 禁用:${isDisabled}, 可見:${isVisible}`, sendButton);
    
    if (!isDisabled && isVisible) {
      log('✅ 策略1成功: 點擊aria-label按鈕');
      try {
        sendButton.click();
        return true;
      } catch (error) {
        log('❌ 點擊失敗:', error);
      }
    }
  } else {
    log('策略1失敗: 沒有找到aria-label="Send message"的按鈕');
  }
  
  // 策略2: 根據精確的SVG路徑查找
  log('策略2: 查找精確SVG路徑');
  const specificPath = 'M208.49,120.49a12,12,0,0,1-17,0L140,69V216a12,12,0,0,1-24,0V69L64.49,120.49a12,12,0,0,1-17-17l72-72a12,12,0,0,1,17,0l72,72A12,12,0,0,1,208.49,120.49Z';
  try {
    sendButton = document.querySelector(`button svg path[d="${specificPath}"]`);
    if (sendButton) {
      sendButton = sendButton.closest('button');
      const isDisabled = sendButton.disabled;
      const isVisible = sendButton.offsetParent !== null;
      log(`找到精確SVG路徑按鈕 - 禁用:${isDisabled}, 可見:${isVisible}`, sendButton);
      
      if (!isDisabled && isVisible) {
        log('✅ 策略2成功: 點擊精確SVG路徑按鈕');
        try {
          sendButton.click();
          return true;
        } catch (error) {
          log('❌ 點擊失敗:', error);
        }
      }
    } else {
      log('策略2失敗: 沒有找到精確SVG路徑');
    }
  } catch (error) {
    log('策略2錯誤:', error);
  }
  
  // 策略3: 根據CSS class組合查找
  log('策略3: 查找CSS class組合');
  const classSelectors = [
    'button.inline-flex.items-center.justify-center.relative.shrink-0.can-focus.select-none.bg-accent-main-000.text-oncolor-100.font-base-bold.transition-colors.h-8.w-8.rounded-md',
    'button.bg-accent-main-000.text-oncolor-100.h-8.w-8.rounded-md',
    'button[class*="bg-accent-main-000"][class*="h-8"][class*="w-8"]',
    'button.bg-accent-main-000[class*="rounded"]'
  ];
  
  for (let i = 0; i < classSelectors.length; i++) {
    const selector = classSelectors[i];
    log(`嘗試選擇器 ${i + 1}: ${selector}`);
    
    try {
      sendButton = document.querySelector(selector);
      if (sendButton) {
        const isDisabled = sendButton.disabled;
        const isVisible = sendButton.offsetParent !== null;
        log(`找到CSS class按鈕 - 禁用:${isDisabled}, 可見:${isVisible}`, sendButton);
        
        if (!isDisabled && isVisible) {
          log(`✅ 策略3成功: 點擊CSS class按鈕 (選擇器 ${i + 1})`);
          try {
            sendButton.click();
            return true;
          } catch (error) {
            log('❌ 點擊失敗:', error);
          }
        }
      } else {
        log(`選擇器 ${i + 1} 沒有找到按鈕`);
      }
    } catch (error) {
      log(`選擇器 ${i + 1} 錯誤:`, error);
    }
  }
  
  // 策略4: 查找8x8的圓角按鈕並檢查SVG
  log('策略4: 查找8x8圓角按鈕+SVG');
  const candidateButtons = document.querySelectorAll('button.h-8.w-8.rounded-md, button.h-8.w-8, button[style*="width: 32px"][style*="height: 32px"]');
  log(`找到 ${candidateButtons.length} 個候選按鈕`);
  
  for (let i = 0; i < candidateButtons.length; i++) {
    const button = candidateButtons[i];
    const isDisabled = button.disabled;
    const isVisible = button.offsetParent !== null;
    
    log(`檢查候選按鈕 ${i + 1} - 禁用:${isDisabled}, 可見:${isVisible}`);
    
    if (isDisabled || !isVisible) continue;
    
    const svg = button.querySelector('svg');
    if (svg) {
      const paths = svg.querySelectorAll('path');
      log(`候選按鈕 ${i + 1} 有SVG，包含 ${paths.length} 個path`);
      
      for (let j = 0; j < paths.length; j++) {
        const path = paths[j];
        const d = path.getAttribute('d');
        log(`Path ${j + 1}: ${d}`);
        
        // 檢查向上箭頭的特徵路徑
        if (d && (d.includes('208.49,120.49') || d.includes('L140,69V216') || d.includes('120.49'))) {
          log(`✅ 策略4成功: 找到匹配的SVG路徑 (候選按鈕 ${i + 1}, path ${j + 1})`);
          try {
            button.click();
            return true;
          } catch (error) {
            log('❌ 點擊失敗:', error);
          }
        }
      }
    } else {
      log(`候選按鈕 ${i + 1} 沒有SVG`);
    }
  }
  
  // 策略5: 查找可能的發送按鈕 (有SVG的小按鈕)
  log('策略5: 查找小型圓角SVG按鈕');
  let potentialButtons = [];
  
  for (let i = 0; i < allButtons.length; i++) {
    const button = allButtons[i];
    const isDisabled = button.disabled;
    const isVisible = button.offsetParent !== null;
    
    if (isDisabled || !isVisible) continue;
    
    const svg = button.querySelector('svg');
    if (svg) {
      // 檢查按鈕尺寸和樣式
      const rect = button.getBoundingClientRect();
      const isSmallButton = rect.width <= 40 && rect.height <= 40 && rect.width >= 28 && rect.height >= 28;
      
      potentialButtons.push({
        index: i,
        button: button,
        width: rect.width,
        height: rect.height,
        isSmallButton: isSmallButton,
        hasRounded: button.classList.contains('rounded') || button.classList.contains('rounded-md'),
        classes: button.className,
        ariaLabel: button.getAttribute('aria-label')
      });
    }
  }
  
  log(`找到 ${potentialButtons.length} 個有SVG的按鈕:`, potentialButtons);
  
  for (const buttonInfo of potentialButtons) {
    if (buttonInfo.isSmallButton && buttonInfo.hasRounded) {
      log(`✅ 策略5成功: 點擊小型圓角SVG按鈕 (索引 ${buttonInfo.index})`);
      try {
        buttonInfo.button.click();
        return true;
      } catch (error) {
        log('❌ 點擊失敗:', error);
      }
    }
  }
  
  // 最終診斷: 列出所有按鈕信息
  log('=== 最終診斷: 所有按鈕信息 ===');
  const buttonDiagnostics = Array.from(allButtons).map((btn, index) => {
    const rect = btn.getBoundingClientRect();
    const svg = btn.querySelector('svg');
    let svgPaths = [];
    
    if (svg) {
      const paths = svg.querySelectorAll('path');
      svgPaths = Array.from(paths).map(p => p.getAttribute('d'));
    }
    
    return {
      index,
      text: btn.textContent.trim(),
      ariaLabel: btn.getAttribute('aria-label'),
      classes: btn.className,
      disabled: btn.disabled,
      visible: btn.offsetParent !== null,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      hasSvg: !!svg,
      svgPaths: svgPaths
    };
  });
  
  log('所有按鈕詳細信息:', buttonDiagnostics);
  
  // 尋找最可能的發送按鈕
  const likelyButtons = buttonDiagnostics.filter(btn => 
    !btn.disabled && 
    btn.visible && 
    btn.hasSvg && 
    (btn.width >= 28 && btn.width <= 40) &&
    (btn.height >= 28 && btn.height <= 40)
  );
  
  log('最可能的發送按鈕候選:', likelyButtons);
  
  if (likelyButtons.length > 0) {
    log('❓ 嘗試點擊最可能的按鈕');
    try {
      allButtons[likelyButtons[0].index].click();
      log('✅ 已點擊最可能的按鈕');
      return true;
    } catch (error) {
      log('❌ 點擊最可能按鈕失敗:', error);
    }
  }
  
  log('❌ 所有策略都失敗');
  return false;
}

/**
 * 延遲函數
 * @param {number} ms - 延遲毫秒數
 * @returns {Promise}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 等待發送按鈕出現並自動點擊
 * @param {Object} options - 配置選項
 * @param {number} options.timeout - 等待超時毫秒數 (預設: 10000)
 * @param {number} options.checkInterval - 檢查間隔毫秒數 (預設: 200)
 * @param {boolean} options.debug - 是否開啟除錯日誌 (預設: false)
 * @returns {Promise<boolean>} 是否成功點擊發送按鈕
 */
async function waitForSendButtonAndClick(options = {}) {
  const config = {
    timeout: 10000,
    checkInterval: 200,
    debug: false,
    ...options
  };
  
  const log = (...args) => {
    if (config.debug) {
      console.log('[WaitForSend]', ...args);
    }
  };
  
  log('開始等待發送按鈕出現...');
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < config.timeout) {
    const success = findAndClickSendButton(log);
    if (success) {
      log('成功點擊發送按鈕');
      return true;
    }
    
    await sleep(config.checkInterval);
  }
  
  log('等待超時');
  return false;
}

/**
 * 在Claude AI頁面載入後自動執行發送
 * 這是主要的入口函數
 */
async function autoSendOnClaudeAI() {
  // 檢查是否在Claude AI頁面
  if (window.location.hostname !== 'claude.ai') {
    console.log('[AutoSend] 不在Claude AI頁面，跳過自動發送');
    return false;
  }
  
  console.log('[AutoSend] 檢測到Claude AI頁面，準備自動發送');
  
  // 等待頁面完全載入
  if (document.readyState !== 'complete') {
    await new Promise(resolve => {
      window.addEventListener('load', resolve);
    });
  }
  
  // 額外等待確保UI完全渲染
  await sleep(2000);
  
  // 嘗試自動點擊發送按鈕
  const success = await waitForSendButtonAndClick({
    timeout: 15000,
    debug: true
  });
  
  if (success) {
    console.log('[AutoSend] 自動發送成功');
  } else {
    console.log('[AutoSend] 自動發送失敗，可能需要手動操作');
  }
  
  return success;
}

// 導出函數供其他腳本使用
if (typeof window !== 'undefined') {
  window.autoClickSendButton = autoClickSendButton;
  window.waitForSendButtonAndClick = waitForSendButtonAndClick;
  window.autoSendOnClaudeAI = autoSendOnClaudeAI;
}

// 如果是在Node.js環境中，導出模組
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    autoClickSendButton,
    waitForSendButtonAndClick,
    autoSendOnClaudeAI
  };
}