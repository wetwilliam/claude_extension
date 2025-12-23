// AI引擎配置
const AI_ENGINES = {
  claude: {
    name: 'Claude AI',
    baseUrl: 'https://claude.ai/new',
    supportsDirectPrompt: true
  },
  gemini: {
    name: 'Google Gemini',
    baseUrl: 'https://gemini.google.com/app',
    supportsDirectPrompt: false
  }
};

// 提取頁面內容的函數
function extractPageContent() {
  try {
    console.log('📄 開始提取頁面內容...');
    
    // 先嘗試移除不需要的元素
    const elementsToRemove = [
      'script', 'style', 'nav', 'header', 'footer', 
      '.ad', '.advertisement', '.sidebar', '.menu',
      '#comment', '.comment', '#social', '.social'
    ];
    
    // 創建頁面的副本以避免修改原頁面
    const pageClone = document.cloneNode(true);
    
    elementsToRemove.forEach(selector => {
      const elements = pageClone.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });
    
    // 優先提取主要內容
    let content = '';
    
    // 嘗試不同的內容選擇器
    const contentSelectors = [
      'article',
      'main', 
      '[role="main"]',
      '.content',
      '.post-content',
      '.article-content', 
      '#content',
      '.entry-content',
      '.post-body',
      'body'
    ];
    
    for (const selector of contentSelectors) {
      const element = pageClone.querySelector(selector);
      if (element) {
        content = element.innerText || element.textContent || '';
        if (content.trim().length > 100) {
          console.log('✅ 找到內容，使用選擇器：', selector);
          break;
        }
      }
    }
    
    // 如果還是沒有足夠內容，使用整個body
    if (content.trim().length < 100) {
      content = pageClone.body?.innerText || pageClone.body?.textContent || '';
      console.log('📝 使用body內容作為備選');
    }
    
    // 清理內容
    content = content
      .replace(/\s+/g, ' ') // 多個空白字符替換為單個空格
      .replace(/\n\s*\n/g, '\n') // 多個換行替換為單個換行
      .trim();
    
    // 限制內容長度 (避免過長)
    if (content.length > 8000) {
      content = content.substring(0, 8000) + '...\n\n[內容已截斷，如需完整內容請查看原網頁]';
    }
    
    console.log('📊 提取到內容長度：', content.length);
    return content;
    
  } catch (error) {
    console.error('提取頁面內容失敗：', error);
    return document.body?.innerText || document.body?.textContent || '';
  }
}

// 獲取當前選擇的AI引擎
function getCurrentAIEngine() {
  // 優先使用localStorage（向後兼容）
  let engine = localStorage.getItem('ai-engine');

  // 如果localStorage中沒有，嘗試從chrome.storage.local獲取緩存值
  if (!engine && window.aiEngineCache) {
    engine = window.aiEngineCache;
    console.log('🔍 從緩存讀取 AI 引擎:', engine);
  }

  // 默認值
  if (!engine) {
    engine = 'claude';
    console.log('🔧 使用預設 AI 引擎:', engine);
  }

  // 驗證引擎值是否有效
  if (!['claude', 'gemini'].includes(engine)) {
    console.warn('⚠️ 無效的 AI 引擎值，重置為 claude:', engine);
    engine = 'claude';
    localStorage.setItem('ai-engine', engine);
  }

  return engine;
}

// 異步獲取AI引擎設置
async function getCurrentAIEngineAsync() {
  try {
    const result = await chrome.storage.local.get(['ai-engine']);
    const engine = result['ai-engine'] || localStorage.getItem('ai-engine') || 'claude';
    
    // 更新緩存
    window.aiEngineCache = engine;
    
    return engine;
  } catch (error) {
    return getCurrentAIEngine();
  }
}

// ==================== 智能 Dock 系統 ====================

// 遷移舊的按鈕位置到 Dock
function migrateLegacyButtonPositions() {
  // 檢查是否需要遷移
  const hasDockPosition = localStorage.getItem('ai-dock-position');
  const hasLegacyPositions = localStorage.getItem('ai-summary-position') ||
                              localStorage.getItem('ai-translate-position') ||
                              localStorage.getItem('ai-ocr-position') ||
                              localStorage.getItem('ai-search-position');

  if (!hasDockPosition && hasLegacyPositions) {
    console.log('🔄 檢測到舊版按鈕位置，開始遷移...');

    // 使用第一個找到的位置作為 Dock 位置
    let migratedPosition = null;

    const positions = [
      'ai-summary-position',
      'ai-translate-position',
      'ai-ocr-position',
      'ai-search-position'
    ];

    for (const posKey of positions) {
      const pos = localStorage.getItem(posKey);
      if (pos) {
        migratedPosition = JSON.parse(pos);
        console.log(`✅ 使用 ${posKey} 作為 Dock 位置:`, migratedPosition);
        break;
      }
    }

    if (migratedPosition) {
      localStorage.setItem('ai-dock-position', JSON.stringify(migratedPosition));
    }

    // 清理舊位置
    positions.forEach(key => {
      localStorage.removeItem(key);
      console.log(`🗑️ 清除舊位置: ${key}`);
    });

    // 遷移隱藏狀態（如果全部隱藏，則隱藏 Dock）
    const hiddenKeys = ['ai-summary-hidden', 'ai-translate-hidden', 'ai-ocr-hidden', 'ai-search-hidden'];
    const allHidden = hiddenKeys.every(key => localStorage.getItem(key) === 'true');

    if (allHidden) {
      localStorage.setItem('ai-dock-hidden', 'true');
      console.log('🔒 所有舊按鈕都隱藏，Dock 也設為隱藏');
    }

    // 清理舊隱藏狀態
    hiddenKeys.forEach(key => {
      localStorage.removeItem(key);
      console.log(`🗑️ 清除舊隱藏狀態: ${key}`);
    });

    console.log('✅ 遷移完成！');
  }
}

// 創建智能 Dock 容器
function createDockContainer() {
  console.log('🎨 開始創建智能 Dock...');

  // 檢查是否已存在
  if (document.getElementById('ai-dock-container')) {
    console.log('ℹ️ Dock 已存在，跳過創建');
    return;
  }

  // 不在 AI 網站顯示
  if (window.location.hostname === 'claude.ai' || window.location.hostname === 'gemini.google.com') {
    console.log('🚫 在 AI 網站上，不顯示 Dock');
    return;
  }

  // 創建 Dock 容器
  const dock = document.createElement('div');
  dock.id = 'ai-dock-container';
  dock.className = 'ai-dock-container';

  // 載入保存的位置
  const savedPositionStr = localStorage.getItem('ai-dock-position');
  if (savedPositionStr) {
    const savedPosition = JSON.parse(savedPositionStr);
    dock.style.right = 'auto';
    dock.style.left = savedPosition.x + 'px';
    dock.style.top = savedPosition.y + 'px';
    dock.style.transform = 'none';
    console.log('📍 載入保存的位置:', savedPosition);
  }

  // 檢查是否應該隱藏
  const savedHidden = localStorage.getItem('ai-dock-hidden') === 'true';
  if (savedHidden) {
    dock.classList.add('hidden');
    console.log('🔒 Dock 設為隱藏狀態');
  }

  // 獲取當前 AI 引擎
  const aiEngine = getCurrentAIEngine();
  const aiEngineName = AI_ENGINES[aiEngine].name;

  console.log(`🤖 當前 AI 引擎: ${aiEngineName} (${aiEngine})`);

  // 創建 Dock 內容
  dock.innerHTML = `
    <div id="ai-engine-toggle" class="ai-dock-button ai-engine-toggle"
         data-engine="${aiEngine}"
         title="當前 AI: ${aiEngineName} - 點擊切換">
      <span class="ai-engine-icon">${aiEngine === 'claude' ? '🟣' : '🔵'}</span>
      <span class="ai-engine-label">${aiEngine === 'claude' ? 'Claude' : 'Gemini'}</span>
    </div>

    <div class="ai-dock-separator"></div>

    <div id="ai-summary-btn" class="ai-dock-button ai-summary-btn"
         title="用 ${aiEngineName} 總結此頁面">
      <span class="button-icon">🧠</span>
      <span class="button-label">Summary</span>
    </div>

    <div id="ai-translate-btn" class="ai-dock-button ai-translate-btn"
         title="用 ${aiEngineName} 翻譯此頁面">
      <span class="button-icon">🌐</span>
      <span class="button-label">Translate</span>
    </div>

    <div id="ai-ocr-btn" class="ai-dock-button ai-ocr-btn"
         title="截圖並用 ${aiEngineName} 進行 OCR">
      <span class="button-icon">📷</span>
      <span class="button-label">OCR</span>
    </div>

    <div id="ai-search-btn" class="ai-dock-button ai-search-btn"
         title="用 AI 搜尋資訊">
      <span class="button-icon">🔍</span>
      <span class="button-label">Search</span>
    </div>

    <div class="ai-dock-handle">⋮⋮</div>
  `;

  document.body.appendChild(dock);
  console.log('✅ Dock 容器已添加到頁面');

  // 附加事件監聽器
  attachDockEventListeners(dock);

  console.log('🎉 智能 Dock 創建完成！');
}

// 附加 Dock 事件監聽器
function attachDockEventListeners(dock) {
  console.log('🔗 開始附加事件監聽器...');

  // 拖拽變數
  let isDragging = false;
  let dragStartX, dragStartY, dockStartX, dockStartY;
  let dragStartTime;

  const handle = dock.querySelector('.ai-dock-handle');

  // 拖拽開始 - 從 handle 或整個 dock（最小化時）
  dock.addEventListener('mousedown', function(e) {
    // 只有從 handle 或最小化狀態才能拖拽
    const isExpanded = dock.matches(':hover') || dock.classList.contains('expanded');
    const isHandleClick = e.target === handle || handle.contains(e.target);

    if (!isExpanded || isHandleClick) {
      startDragging(e);
    }
  });

  function startDragging(e) {
    if (e.button !== 0) return; // 只允許左鍵

    dragStartTime = Date.now();
    isDragging = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;

    const rect = dock.getBoundingClientRect();
    dockStartX = rect.left;
    dockStartY = rect.top;

    dock.classList.add('dragging');

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    e.preventDefault();
    e.stopPropagation();
  }

  function handleMouseMove(e) {
    const deltaX = e.clientX - dragStartX;
    const deltaY = e.clientY - dragStartY;

    // 移動超過 5px 才算拖拽
    if (!isDragging && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
      isDragging = true;
      console.log('🖱️ 開始拖拽');
    }

    if (isDragging) {
      // 計算新位置
      const newX = dockStartX + deltaX;
      const newY = dockStartY + deltaY;

      // 應用邊緣限制和吸附
      const edgePosition = applyEdgeConstraints(newX, newY);

      dock.style.left = edgePosition.x + 'px';
      dock.style.top = edgePosition.y + 'px';
      dock.style.right = 'auto';
      dock.style.transform = 'none';
    }
  }

  // 邊緣限制和吸附功能
  function applyEdgeConstraints(x, y) {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const dockWidth = 50; // 最小化狀態寬度估算
    const dockHeight = dock.offsetHeight || 200;

    // 定義邊緣閾值（距離邊緣多遠開始吸附）
    const SNAP_THRESHOLD = 30;
    const EDGE_MARGIN = 10;

    // 計算與各邊緣的距離
    const distToLeft = x;
    const distToRight = windowWidth - (x + dockWidth);
    const distToTop = y;
    const distToBottom = windowHeight - (y + dockHeight);

    // 決定最接近的邊緣
    let finalX = x;
    let finalY = y;
    let edge = '';

    // 水平方向：左邊或右邊
    if (distToLeft < distToRight) {
      // 更接近左邊
      if (distToLeft < SNAP_THRESHOLD) {
        finalX = EDGE_MARGIN;
        edge = 'left';
      }
    } else {
      // 更接近右邊
      if (distToRight < SNAP_THRESHOLD) {
        finalX = windowWidth - dockWidth - EDGE_MARGIN;
        edge = 'right';
      }
    }

    // 垂直方向：上邊或下邊
    if (distToTop < distToBottom) {
      // 更接近上邊
      if (distToTop < SNAP_THRESHOLD) {
        finalY = EDGE_MARGIN;
        edge = edge ? edge + '-top' : 'top';
      }
    } else {
      // 更接近下邊
      if (distToBottom < SNAP_THRESHOLD) {
        finalY = windowHeight - dockHeight - EDGE_MARGIN;
        edge = edge ? edge + '-bottom' : 'bottom';
      }
    }

    // 確保不超出視窗範圍
    finalX = Math.max(0, Math.min(finalX, windowWidth - dockWidth));
    finalY = Math.max(0, Math.min(finalY, windowHeight - dockHeight));

    console.log(`🎯 邊緣吸附: ${edge}, 位置: (${finalX}, ${finalY})`);

    return { x: finalX, y: finalY };
  }

  function handleMouseUp(e) {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);

    dock.classList.remove('dragging');

    if (isDragging) {
      // 獲取當前位置並應用邊緣限制
      const rect = dock.getBoundingClientRect();
      const edgePosition = applyEdgeConstraints(rect.left, rect.top);

      // 更新到邊緣位置
      dock.style.left = edgePosition.x + 'px';
      dock.style.top = edgePosition.y + 'px';
      dock.style.right = 'auto';
      dock.style.transform = 'none';

      // 保存邊緣對齊的位置
      const finalPosition = {
        x: edgePosition.x,
        y: edgePosition.y,
        edge: getEdgeInfo(edgePosition.x, edgePosition.y)
      };

      localStorage.setItem('ai-dock-position', JSON.stringify(finalPosition));
      console.log('💾 保存邊緣位置:', finalPosition);
    }

    isDragging = false;
  }

  // 獲取邊緣信息
  function getEdgeInfo(x, y) {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const dockWidth = 50;
    const dockHeight = dock.offsetHeight || 200;
    const EDGE_MARGIN = 10;

    const edges = [];
    if (Math.abs(x - EDGE_MARGIN) < 5) edges.push('left');
    if (Math.abs((x + dockWidth) - (windowWidth - EDGE_MARGIN)) < 5) edges.push('right');
    if (Math.abs(y - EDGE_MARGIN) < 5) edges.push('top');
    if (Math.abs((y + dockHeight) - (windowHeight - EDGE_MARGIN)) < 5) edges.push('bottom');

    return edges.join('-');
  }

  // 位置校正函數 - 確保舊位置也能貼合邊緣
  function correctSavedPosition() {
    // 從 localStorage 重新讀取位置，避免作用域問題
    const savedPositionStr = localStorage.getItem('ai-dock-position');
    if (savedPositionStr) {
      const savedPosition = JSON.parse(savedPositionStr);
      if (savedPosition && !savedPosition.edge) {
        console.log('🔄 檢測到舊位置格式，應用邊緣限制');

        // 等待 DOM 更新完成
        setTimeout(() => {
          const edgePosition = applyEdgeConstraints(savedPosition.x, savedPosition.y);

          dock.style.left = edgePosition.x + 'px';
          dock.style.top = edgePosition.y + 'px';
          dock.style.right = 'auto';
          dock.style.transform = 'none';

          // 更新保存的位置為邊緣對齊格式
          const updatedPosition = {
            x: edgePosition.x,
            y: edgePosition.y,
            edge: getEdgeInfo(edgePosition.x, edgePosition.y)
          };

          localStorage.setItem('ai-dock-position', JSON.stringify(updatedPosition));
          console.log('💾 位置已校正並保存:', updatedPosition);
        }, 100);
      }
    }
  }

  // 在創建完成後立即校正位置
  correctSavedPosition();

  // AI 引擎切換按鈕
  let engineToggle = dock.querySelector('#ai-engine-toggle');
  console.log('🔍 初始查找引擎按鈕:', engineToggle);

  if (engineToggle) {
    // 添加調試日誌
    console.log('📋 引擎按鈕 ID:', engineToggle.id);
    console.log('📋 引擎按鈕 類:', engineToggle.className);
    console.log('📋 引擎按鈕 data-engine:', engineToggle.getAttribute('data-engine'));

    // 直接綁定事件監聽器（不用 replaceWith，避免元素丟失）
    engineToggle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('🖱️ 點擊 AI 引擎切換按鈕');

      // 確保 toggleAIEngine 函數存在
      if (typeof toggleAIEngine === 'function') {
        toggleAIEngine();
      } else {
        console.error('❌ toggleAIEngine 函數不存在');
      }
    });

    console.log('✅ AI 引擎切換事件監聽器已綁定');

    // 添加雙重保護：檢查監聽器是否正確綁定
    setTimeout(() => {
      const testBtn = document.getElementById('ai-engine-toggle');
      if (testBtn) {
        console.log('🧪 延遲檢查 - 按鈕仍存在:', testBtn.id);
        // getEventListeners 僅在 DevTools Console 中可用，不在注入腳本中
        try {
          if (typeof getEventListeners !== 'undefined') {
            console.log('🧪 事件監聽器數量:', getEventListeners(testBtn).click?.length);
          } else {
            console.log('🧪 事件監聽器檢查：僅在 DevTools Console 中可用');
          }
        } catch (e) {
          console.log('🧪 事件監聽器檢查：不可用（這是正常的）');
        }
      }
    }, 100);

  } else {
    console.error('❌ 找不到 AI 引擎切換按鈕');

    // 調試查找所有可能的按鈕
    const allButtons = dock.querySelectorAll('.ai-dock-button');
    console.log('🔍 Dock 中所有按鈕:', Array.from(allButtons).map(btn => btn.id || btn.className));

    // 手動創建按鈕作為備用
    createBackupEngineToggle(dock);
  }

  // 按鈕點擊處理
  dock.querySelector('#ai-summary-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    handleSummaryAction();
  });

  dock.querySelector('#ai-translate-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    handleTranslateAction();
  });

  dock.querySelector('#ai-ocr-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    handleOCRCapture();
  });

  dock.querySelector('#ai-search-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    handleSearchAction();
  });

  // 右鍵點擊隱藏整個 Dock
  dock.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    dock.classList.toggle('hidden');
    const isHidden = dock.classList.contains('hidden');
    localStorage.setItem('ai-dock-hidden', isHidden);
    console.log(`👁️ Dock ${isHidden ? '隱藏' : '顯示'}`);
  });

  console.log('✅ 事件監聽器附加完成');
}

// 備用引擎切換按鈕創建函數
function createBackupEngineToggle(dock) {
  console.log('🔧 創建備用引擎切換按鈕');

  const aiEngine = getCurrentAIEngine();
  const aiEngineName = AI_ENGINES[aiEngine].name;

  const backupBtn = document.createElement('div');
  backupBtn.id = 'ai-engine-toggle-backup';
  backupBtn.className = 'ai-dock-button ai-engine-toggle';
  backupBtn.setAttribute('data-engine', aiEngine);
  backupBtn.title = `當前 AI: ${aiEngineName} - 點擊切換`;
  backupBtn.style.cursor = 'pointer';

  backupBtn.innerHTML = `
    <span class="ai-engine-icon">${aiEngine === 'claude' ? '🟣' : '🔵'}</span>
    <span class="ai-engine-label">${aiEngine === 'claude' ? 'Claude' : 'Gemini'}</span>
  `;

  // 綁定事件監聽器
  backupBtn.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log('🖱️ 點擊備用 AI 引擎切換按鈕');

    if (typeof toggleAIEngine === 'function') {
      toggleAIEngine();
    } else {
      console.error('❌ toggleAIEngine 函數不存在');
    }
  });

  // 插入到 Dock 開頭
  if (dock.firstChild) {
    dock.insertBefore(backupBtn, dock.firstChild);
  } else {
    dock.appendChild(backupBtn);
  }

  console.log('✅ 備用引擎切換按鈕已創建');
}

// 手動測試函數 - 可以在控制台調用
function testEngineToggle() {
  console.log('🧪 開始手動測試引擎切換功能');

  const btn = document.getElementById('ai-engine-toggle') || document.getElementById('ai-engine-toggle-backup');

  if (btn) {
    console.log('📋 找到引擎按鈕:', btn.id);
    console.log('📋 按鈕類:', btn.className);
    console.log('📋 當前引擎:', getCurrentAIEngine());

    // 模擬點擊
    btn.click();

    console.log('📋 切換後引擎:', getCurrentAIEngine());
  } else {
    console.error('❌ 找不到任何引擎切換按鈕');

    // 列出 Dock 中的所有元素
    const dock = document.getElementById('ai-dock-container');
    if (dock) {
      console.log('🔍 Dock 中所有元素:', Array.from(dock.children).map(child => ({
        id: child.id,
        class: child.className,
        tag: child.tagName
      })));
    } else {
      console.error('❌ 找不到 Dock 容器');
    }
  }
}

// 將測試函數暴露到全局作用域，方便調試
window.testEngineToggle = testEngineToggle;
window.toggleAIEngine = toggleAIEngine;

// AI 引擎切換函數 - 修復版本
async function toggleAIEngine() {
  try {
    const currentEngine = getCurrentAIEngine();
    const newEngine = currentEngine === 'claude' ? 'gemini' : 'claude';
    const engineName = AI_ENGINES[newEngine].name;

    console.log(`🔄 切換 AI 引擎: ${currentEngine} → ${newEngine}`);

    // 檢查是否已經是目標引擎（避免重複切換）
    if (currentEngine === newEngine) {
      console.log(`⚠️ 已經是 ${engineName}，無需切換`);
      return;
    }

    // 原子性地更新狀態
    localStorage.setItem('ai-engine', newEngine);
    window.aiEngineCache = newEngine; // 更新緩存

    // 異步更新 chrome.storage（不等待完成）
    chrome.storage.local.set({'ai-engine': newEngine}).catch(error => {
      console.warn('chrome.storage.local 設置失敗:', error);
    });

    // 立即更新視覺指示器
    updateEngineUI(newEngine, engineName);

    // 延遲更新其他元素，避免競爭條件
    setTimeout(() => {
      updateDockButtonTitles();
    }, 50);

    // 異步通知其他標籤頁
    notifyOtherTabs(newEngine, engineName);

    // 顯示確認通知
    showTemporaryNotification(`已切換到 ${engineName}`);
    console.log(`✅ AI 引擎已切換到: ${engineName}`);

  } catch (error) {
    console.error('❌ AI 引擎切換失敗:', error);
    showTemporaryNotification('切換失敗，請重試');
  }
}

// 更新引擎 UI 的輔助函數
function updateEngineUI(newEngine, engineName) {
  const engineToggle = document.getElementById('ai-engine-toggle');
  if (engineToggle) {
    engineToggle.setAttribute('data-engine', newEngine);
    engineToggle.title = `當前 AI: ${engineName} - 點擊切換`;

    const icon = engineToggle.querySelector('.ai-engine-icon');
    const label = engineToggle.querySelector('.ai-engine-label');

    if (icon) {
      const iconText = newEngine === 'claude' ? '🟣' : '🔵';
      icon.textContent = iconText;
      console.log(`🎨 更新圖標: ${iconText}`);
    }

    if (label) {
      const labelText = newEngine === 'claude' ? 'Claude' : 'Gemini';
      label.textContent = labelText;
      console.log(`🏷️ 更新標籤: ${labelText}`);
    }
  } else {
    console.warn('⚠️ 找不到 AI 引擎切換按鈕');
  }
}

// 通知其他標籤頁的輔助函數
function notifyOtherTabs(newEngine, engineName) {
  try {
    chrome.tabs.query({}, function(tabs) {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'aiEngineChanged',
          engine: newEngine,
          engineName: engineName
        }, function(response) {
          // 忽略無 content script 的標籤頁錯誤
          if (chrome.runtime.lastError) {
            // 靜默處理
          }
        });
      });
    });
  } catch (error) {
    console.warn('通知其他標籤頁失敗:', error);
  }
}

// 更新 Dock 按鈕標題
function updateDockButtonTitles() {
  const aiName = getCurrentAIEngineName();

  const summaryBtn = document.getElementById('ai-summary-btn');
  const translateBtn = document.getElementById('ai-translate-btn');
  const ocrBtn = document.getElementById('ai-ocr-btn');

  if (summaryBtn) summaryBtn.title = `用 ${aiName} 總結此頁面`;
  if (translateBtn) translateBtn.title = `用 ${aiName} 翻譯此頁面`;
  if (ocrBtn) ocrBtn.title = `截圖並用 ${aiName} 進行 OCR`;

  console.log(`📝 已更新按鈕標題為: ${aiName}`);
}

// 顯示臨時通知
function showTemporaryNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'ai-dock-notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 80px;
    background: rgba(0, 0, 0, 0.85);
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    z-index: 10001;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    animation: slideInRight 0.3s ease, fadeOut 0.3s ease 2.7s;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);

  console.log(`💬 顯示通知: ${message}`);
}

// 生成AI URL並處理不同引擎
async function generateAIUrl(actionType, prompt, currentUrl = '', imageData = null) {
  const engine = getCurrentAIEngine();
  const engineConfig = AI_ENGINES[engine];
  
  if (engineConfig.supportsDirectPrompt) {
    // Claude AI - 直接使用URL參數
    if (actionType === 'ocr') {
      // OCR特殊處理
      return `${engineConfig.baseUrl}?ocr=true&t=${Date.now()}`;
    } else {
      let fullPrompt = prompt;
      if (currentUrl && actionType !== 'search') {
        fullPrompt += `網頁連結：${currentUrl}`;
      }
      return `${engineConfig.baseUrl}?q=${encodeURIComponent(fullPrompt)}`;
    }
  } else {
    // Google Gemini - ✅ FIX: 使用 Chrome 消息傳遞而非 localStorage
    let fullPrompt = prompt;
    let shouldAlert = true;

    if (actionType === 'ocr') {
      fullPrompt = '請幫我識別這張圖片中的文字內容，並將其轉換為可編輯的文本格式。請保持原有的排版結構。';
      shouldAlert = false; // OCR的alert在別處處理
    } else if (currentUrl && actionType !== 'search') {
      fullPrompt += `\n\n網頁連結：${currentUrl}`;
    }

    try {
      // ✅ FIX: OCR 時不要覆蓋剪貼簿中的圖片
      if (actionType !== 'ocr') {
        // 複製到剪貼簿作為備用（非 OCR 動作）
        await navigator.clipboard.writeText(fullPrompt);
        console.log('📋 Prompt已複製到剪貼簿:', fullPrompt.substring(0, 50) + '...');
      } else {
        console.log('📸 OCR 模式：保留剪貼簿中的圖片，不覆蓋為文字');
      }

      // ✅ FIX: 通過 background script 發送消息到 Gemini
      console.log('📤 發送消息到 background script...');

      chrome.runtime.sendMessage({
        action: 'openGeminiWithPrompt',
        url: engineConfig.baseUrl,
        prompt: fullPrompt,
        actionType: actionType,
        imageData: imageData  // ✅ FIX: 傳遞圖片數據
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('❌ 發送失敗:', chrome.runtime.lastError);
          alert('無法打開Gemini，請手動複製內容:\n\n' + fullPrompt);
        } else {
          console.log('✅ 消息已發送到 background script:', response);
        }
      });

      if (shouldAlert) {
        // 顯示提示訊息
        setTimeout(() => {
          alert('內容將自動輸入到Gemini並發送！\n\n✅ 使用 Chrome 消息系統自動處理');
        }, 300);
      }

    } catch (error) {
      console.error('❌ 處理prompt失敗:', error);
      if (shouldAlert) {
        alert('無法處理prompt，請手動複製以下內容：\n\n' + fullPrompt);
      }
    }

    // ✅ FIX: 返回 null 因為 background script 會處理打開 Gemini
    return null;
  }
}

// 獲取當前AI引擎的顯示名稱
function getCurrentAIEngineName() {
  const engine = getCurrentAIEngine();
  return AI_ENGINES[engine].name;
}

// 更新所有按鈕的標題以反映當前AI引擎
function updateButtonTitlesForCurrentEngine() {
  const aiName = getCurrentAIEngineName();
  
  // 更新總結按鈕
  const summaryBtn = document.getElementById('ai-summary-btn');
  if (summaryBtn && !summaryBtn.classList.contains('hidden')) {
    summaryBtn.title = `用 ${aiName} 總結此頁面 | 右鍵隱藏/顯示`;
  }
  
  // 更新翻譯按鈕
  const translateBtn = document.getElementById('ai-translate-btn');
  if (translateBtn && !translateBtn.classList.contains('hidden')) {
    translateBtn.title = `用 ${aiName} 翻譯此頁面為中文 | 右鍵隱藏/顯示`;
  }
  
  // 更新OCR按鈕
  const ocrBtn = document.getElementById('ai-ocr-btn');
  if (ocrBtn && !ocrBtn.classList.contains('hidden')) {
    ocrBtn.title = `截圖並用 ${aiName} 進行OCR文字識別 | 右鍵隱藏/顯示`;
  }
}

// 全域函數用於手動刷新按鈕標題
window.refreshAIButtonTitles = function() {
  updateButtonTitlesForCurrentEngine();
};

// ==================== 處理動作函數 ====================

// 處理總結動作
async function handleSummaryAction() {
  try {
    console.log('📋 開始處理總結動作...');

    // 獲取頁面內容
    const pageContent = extractPageContent();
    const currentUrl = window.location.href;
    const pageTitle = document.title;

    if (!pageContent || pageContent.trim().length < 50) {
      alert('無法獲取足夠的頁面內容進行總結');
      return;
    }

    // 組合完整prompt
    const promptTemplate = '我希望你扮演一個摘要助手。我將向你提供文章、報告、會議記錄、學術論文或其他長篇文本內容，你需要提取關鍵資訊並產生簡潔明了的摘要。請確保摘要文章原文的核心觀點、重要數據、主要結論和關鍵細節，同時保持邏輯清晰和結構合理。摘要應探究中性，不添加個人觀點或解釋。請根據內容的複雜程度和重要性調整摘要的長度，通常會控制在原文的10-30%。如果是技術性或專業性的內容，請保留必要的專業術語。';

    const fullPrompt = `${promptTemplate}

請總結以下內容：

標題：${pageTitle}
來源：${currentUrl}

內容：
${pageContent}`;

    console.log('📝 總結prompt已準備，內容長度：', pageContent.length);

    // 複製到剪貼簿
    await navigator.clipboard.writeText(fullPrompt);
    console.log('📋 總結內容已複製到剪貼簿');

    const aiUrl = await generateAIUrl('summary', fullPrompt, currentUrl);

    // ✅ FIX: 如果是 Gemini，background script 會處理打開標籤頁
    if (aiUrl) {
      // Claude AI - 直接打開 URL
      const rightPosition = window.screen.width - 800 - 100;
      const topPosition = window.screenY + 50;

      window.open(aiUrl, '_blank', `width=800,height=1200,left=${rightPosition},top=${topPosition},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`);
    } else {
      // Gemini - background script 已經處理
      console.log('✅ Gemini 由 background script 處理');
    }

  } catch (error) {
    console.error('總結功能錯誤：', error);
    alert('總結功能出現錯誤，請稍後再試');
  }
}

// 處理翻譯動作
async function handleTranslateAction() {
  try {
    console.log('🌐 開始處理翻譯動作...');

    // 獲取頁面內容
    const pageContent = extractPageContent();
    const currentUrl = window.location.href;
    const pageTitle = document.title;

    if (!pageContent || pageContent.trim().length < 10) {
      alert('無法獲取足夠的頁面內容進行翻譯');
      return;
    }

    // 組合完整prompt
    const promptTemplate = '我希望您選擇一個專業的翻譯助理。我將向您提供需要翻譯的文字內容或網頁，請您提供準確、流暢且符合目標語言表達習慣的翻譯。請保持原文的語調、風格和內涵，確保翻譯的專業性和準確性。對於專業術語、慣用語或文化特定的表達，請選擇最適合的對應翻譯。如果遇到模糊或有多種理解的情況，請提供最合理的內容翻譯版本。請只提供翻譯結果，無需額外的解釋或說明。';

    const fullPrompt = `${promptTemplate}

請翻譯以下內容為中文：

標題：${pageTitle}
來源：${currentUrl}

內容：
${pageContent}`;

    console.log('🌐 翻譯prompt已準備，內容長度：', pageContent.length);

    // 複製到剪貼簿
    await navigator.clipboard.writeText(fullPrompt);
    console.log('📋 翻譯內容已複製到剪貼簿');

    const aiUrl = await generateAIUrl('translate', fullPrompt, currentUrl);

    // ✅ FIX: 如果是 Gemini，background script 會處理打開標籤頁
    if (aiUrl) {
      // Claude AI - 直接打開 URL
      const rightPosition = window.screen.width - 800 - 100;
      const topPosition = window.screenY + 50;

      window.open(aiUrl, '_blank', `width=800,height=1200,left=${rightPosition},top=${topPosition},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`);
    } else {
      // Gemini - background script 已經處理
      console.log('✅ Gemini 由 background script 處理');
    }

  } catch (error) {
    console.error('翻譯功能錯誤：', error);
    alert('翻譯功能出現錯誤，請稍後再試');
  }
}

// 處理搜尋動作
async function handleSearchAction() {
  const keyword = prompt('請輸入搜尋關鍵字：');
  if (keyword && keyword.trim()) {
    const searchPrompt = `請收集「${keyword.trim()}」的最新相關資訊，並遵守以下指引：只根據你實際使用搜尋工具檢索到的公開數據回答，不得依賴內建知識或推測內容。所有重要數據與事實，務必標明明確資料來源（如新聞、官方公告、專業網站），並於每點附上來源說明。若某項資訊未於檢索工具或外部資料中獲得，請明確回覆「查無此資料」或「資訊不足」，嚴禁自行假設或補足內容。`;
    const aiUrl = await generateAIUrl('search', searchPrompt);

    // ✅ FIX: 如果是 Gemini，background script 會處理打開標籤頁
    if (aiUrl) {
      // Claude AI - 直接打開 URL
      const rightPosition = window.screen.width - 800 - 100;
      const topPosition = window.screenY + 50;

      window.open(aiUrl, '_blank', `width=800,height=1200,left=${rightPosition},top=${topPosition},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`);
    } else {
      // Gemini - background script 已經處理
      console.log('✅ Gemini 由 background script 處理');
    }
  }
}

// OCR截圖處理函數
async function handleOCRCapture() {
  const dock = document.getElementById('ai-dock-container');
  const ocrBtn = dock ? dock.querySelector('#ai-ocr-btn') : null;

  if (ocrBtn) {
    // 顯示載入狀態
    ocrBtn.classList.add('capturing');
  }

  try {
    // 使用Chrome API截圖並獲取圖片數據
    const screenshotData = await captureTabScreenshot();

    if (screenshotData) {
      console.log('截圖成功，準備開啟AI');

      // 設置本地標記
      localStorage.setItem('claude-ocr-task', 'true');
      console.log('本地OCR任務標記已設置');

      // 獲取AI URL並傳遞圖片數據
      const aiUrl = await generateAIUrl('ocr', '', '', screenshotData);

      // 對於Gemini，OCR提示會自動輸入，無需額外提示
      if (getCurrentAIEngine() === 'gemini') {
        console.log('Gemini OCR: 圖片數據已傳遞，提示將自動輸入');
      }

      // ✅ FIX: 如果是 Gemini，background script 會處理打開標籤頁
      if (aiUrl) {
        // Claude AI - 直接打開 URL
        const rightPosition = window.screen.width - 800 - 100;
        const topPosition = window.screenY + 50;

        window.open(aiUrl, '_blank', `width=800,height=1200,left=${rightPosition},top=${topPosition},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`);

        console.log('OCR任務已啟動，URL參數已設置');
      } else {
        // Gemini - background script 已經處理
        console.log('✅ Gemini OCR 由 background script 處理');
      }

    } else {
      alert('截圖失敗，請檢查權限設定');
    }
  } catch (error) {
    console.error('OCR處理失敗:', error);
    alert('OCR功能出現錯誤，請重試');
  } finally {
    // 移除載入狀態
    if (ocrBtn) {
      setTimeout(() => {
        ocrBtn.classList.remove('capturing');
      }, 2000);
    }
  }
}

// 截圖函數 - 返回圖片dataUrl
async function captureTabScreenshot() {
  return new Promise((resolve) => {
    // 發送消息給background script要求截圖
    chrome.runtime.sendMessage({action: 'captureTab'}, async (response) => {
      if (response && response.success) {
        try {
          // 將base64圖片複製到剪貼簿
          const success = await copyImageToClipboard(response.dataUrl);
          if (success) {
            // ✅ FIX: 返回 dataUrl 而不只是 true/false
            resolve(response.dataUrl);
          } else {
            resolve(null);
          }
        } catch (error) {
          console.error('複製圖片失敗:', error);
          resolve(null);
        }
      } else {
        console.error('截圖失敗:', response?.error);
        resolve(null);
      }
    });
  });
}

// 將base64圖片複製到剪貼簿
async function copyImageToClipboard(dataUrl) {
  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blob
      })
    ]);

    console.log('✅ 截圖已複製到剪貼簿');
    console.log('📊 圖片大小:', Math.round(blob.size / 1024), 'KB');

    // ✅ FIX: 驗證剪貼簿確實有圖片
    try {
      const clipboardItems = await navigator.clipboard.read();
      console.log('🔍 剪貼簿驗證:', clipboardItems.length, '個項目');
      console.log('🔍 項目類型:', clipboardItems[0]?.types);
    } catch (e) {
      console.warn('⚠️ 無法驗證剪貼簿（權限限制）');
    }

    return true;
  } catch (error) {
    console.error('❌ 複製圖片到剪貼簿失敗:', error);
    return false;
  }
}

// 切換所有懸浮按鈕的顯示/隱藏狀態
function toggleAllFloatingButtons() {
  // 更新為支援 Dock 系統
  const dock = document.getElementById('ai-dock-container');
  if (!dock) {
    console.warn('找不到 AI Dock 元素');
    return false;
  }

  // 檢查目前狀態並切換
  const isHidden = dock.classList.contains('hidden');

  if (isHidden) {
    // 顯示 Dock
    dock.classList.remove('hidden');
    localStorage.setItem('ai-dock-hidden', 'false');
    console.log('顯示 AI Dock');
  } else {
    // 隱藏 Dock
    dock.classList.add('hidden');
    localStorage.setItem('ai-dock-hidden', 'true');
    console.log('隱藏 AI Dock');
  }

  return !isHidden; // 返回操作後是否為隱藏狀態
}

// 獲取懸浮按鈕的顯示狀態
function getFloatingButtonsState() {
  // 更新為支援 Dock 系統
  const dock = document.getElementById('ai-dock-container');
  if (!dock) {
    console.warn('找不到 AI Dock 元素');
    return false;
  }

  // 返回 Dock 是否隱藏
  return dock.classList.contains('hidden');
}

// 初始化AI引擎設置
async function initializeAIEngineSettings() {
  try {
    await getCurrentAIEngineAsync();
  } catch (error) {
    // 靜默處理錯誤
  }
}

// 等待頁面載入完成後創建智能 Dock
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    migrateLegacyButtonPositions();
    createDockContainer();

    // 初始化AI引擎設置並更新按鈕標題
    setTimeout(async () => {
      await initializeAIEngineSettings();
      updateDockButtonTitles();
    }, 100);
  });
} else {
  migrateLegacyButtonPositions();
  createDockContainer();

  // 初始化AI引擎設置並更新按鈕標題
  setTimeout(async () => {
    await initializeAIEngineSettings();
    updateDockButtonTitles();
  }, 100);
}

// 監聽頁面變化（適用於單頁應用）
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    // 頁面URL改變時，確保 Dock 存在並更新標題
    setTimeout(() => {
      createDockContainer();
      updateDockButtonTitles();
    }, 1000);
  }
}).observe(document, { subtree: true, childList: true });

// 監聽localStorage變化以檢測AI引擎切換
window.addEventListener('storage', function(e) {
  if (e.key === 'ai-engine') {
    setTimeout(() => {
      updateButtonTitlesForCurrentEngine();
    }, 100);
  }
});

// 定期檢查AI引擎設置並更新按鈕標題（備用方案）
let lastEngine = getCurrentAIEngine();
setInterval(() => {
  const currentEngine = getCurrentAIEngine();
  if (currentEngine !== lastEngine) {
    lastEngine = currentEngine;
    updateButtonTitlesForCurrentEngine();
  }
}, 500);

// 監聽來自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'performOCR') {
    const ocrType = request.type || 'fullPage';
    console.log('收到OCR請求，類型:', ocrType);
    
    if (ocrType === 'selectArea') {
      handleSelectAreaOCR().then(() => {
        sendResponse({success: true});
      }).catch((error) => {
        console.error('手動框選OCR失敗:', error);
        sendResponse({success: false, error: error.message});
      });
    } else {
      handleOCRCapture().then(() => {
        sendResponse({success: true});
      }).catch((error) => {
        console.error('整頁OCR執行失敗:', error);
        sendResponse({success: false, error: error.message});
      });
    }
    return true; // 保持消息通道開放
  }
  
  // 處理顯示/隱藏懸浮視窗請求
  if (request.action === 'toggleFloatingButtons') {
    const allHidden = toggleAllFloatingButtons();
    sendResponse({success: true, hidden: allHidden});
    return true;
  }
  
  // 獲取懸浮視窗狀態
  if (request.action === 'getFloatingButtonsState') {
    const hidden = getFloatingButtonsState();
    sendResponse({success: true, hidden: hidden});
    return true;
  }
  
  // 處理AI引擎變更通知
  if (request.action === 'aiEngineChanged') {
    // 更新本地緩存
    lastEngine = request.engine;
    window.aiEngineCache = request.engine;
    
    // 同時更新localStorage作為備份
    localStorage.setItem('ai-engine', request.engine);
    
    // 更新按鈕標題
    updateButtonTitlesForCurrentEngine();
    
    sendResponse({success: true, updated: true});
    return true;
  }
});