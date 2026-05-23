/**
 * CalcFlow Landing Page & Support Website
 * File: script.js
 * Purpose: Custom safe PEMDAS parser, mock calculator interface, theme syncing,
 *          collapsible FAQ accordion, and support ticket validation/toasts.
 */

// ============================================================================
// 1. CSP MATHEMATICAL PARSER (Lexical Tokenizer & AST Recursive Descent)
// ============================================================================
class MathParser {
  tokenize(expr) {
    let cleanExpr = expr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/minus/g, '-');
      
    const tokens = [];
    let i = 0;
    
    while (i < cleanExpr.length) {
      const char = cleanExpr[i];
      if (/\s/.test(char)) {
        i++;
        continue;
      }
      
      if (/[0-9.]/.test(char)) {
        let numStr = '';
        let hasDecimal = false;
        
        while (i < cleanExpr.length && /[0-9.]/.test(cleanExpr[i])) {
          if (cleanExpr[i] === '.') {
            if (hasDecimal) break;
            hasDecimal = true;
          }
          numStr += cleanExpr[i];
          i++;
        }
        tokens.push({ type: 'NUMBER', value: parseFloat(numStr) });
        continue;
      }
      
      if (['+', '-', '*', '/', '%', '(', ')'].includes(char)) {
        tokens.push({ type: 'OPERATOR', value: char });
        i++;
        continue;
      }
      i++;
    }
    return tokens;
  }

  parse(expr) {
    const tokens = this.tokenize(expr);
    if (tokens.length === 0) return null;
    
    let index = 0;
    const peek = () => tokens[index];
    const consume = () => tokens[index++];
    
    const parseExpression = () => {
      let node = parseTerm();
      while (peek() && peek().type === 'OPERATOR' && ['+', '-'].includes(peek().value)) {
        const op = consume().value;
        const right = parseTerm();
        node = { type: 'BINARY', op, left: node, right };
      }
      return node;
    };
    
    const parseTerm = () => {
      let node = parseFactor();
      while (peek() && peek().type === 'OPERATOR' && ['*', '/', '%'].includes(peek().value)) {
        const op = consume().value;
        const right = parseFactor();
        node = { type: 'BINARY', op, left: node, right };
      }
      return node;
    };
    
    const parseFactor = () => {
      if (peek() && peek().type === 'OPERATOR' && ['-', '+'].includes(peek().value)) {
        const op = consume().value;
        const operand = parseFactor();
        return { type: 'UNARY', op, operand };
      }
      return parseSuffix();
    };
    
    const parseSuffix = () => {
      let node = parsePrimary();
      while (peek() && peek().type === 'OPERATOR' && peek().value === '%') {
        const nextToken = tokens[index + 1];
        if (nextToken && (nextToken.type === 'NUMBER' || (nextToken.type === 'OPERATOR' && nextToken.value === '('))) {
          break;
        }
        const op = consume().value;
        node = { type: 'SUFFIX', op, operand: node };
      }
      return node;
    };
    
    const parsePrimary = () => {
      const token = peek();
      if (!token) throw new Error('Incomplete expression');
      
      if (token.type === 'NUMBER') {
        consume();
        return { type: 'LITERAL', value: token.value };
      }
      
      if (token.type === 'OPERATOR' && token.value === '(') {
        consume(); // '('
        const exprNode = parseExpression();
        const next = peek();
        if (next && next.type === 'OPERATOR' && next.value === ')') {
          consume(); // ')'
          return exprNode;
        } else {
          throw new Error('Unmatched parenthesis');
        }
      }
      throw new Error(`Unexpected symbol: ${token.value}`);
    };
    
    const ast = parseExpression();
    if (index < tokens.length) throw new Error('Malformed syntax');
    return ast;
  }
  
  evaluateAST(node) {
    if (!node) return 0;
    
    switch (node.type) {
      case 'LITERAL': return node.value;
      case 'UNARY': {
        const val = this.evaluateAST(node.operand);
        return node.op === '-' ? -val : val;
      }
      case 'SUFFIX': {
        const val = this.evaluateAST(node.operand);
        if (node.op === '%') return val / 100;
        return val;
      }
      case 'BINARY': {
        const left = this.evaluateAST(node.left);
        const right = this.evaluateAST(node.right);
        
        switch (node.op) {
          case '+': return left + right;
          case '-': return left - right;
          case '*': return left * right;
          case '/': 
            if (right === 0) throw new Error('Cannot divide by zero');
            return left / right;
          case '%': return left % right;
          default: throw new Error(`Unknown operator: ${node.op}`);
        }
      }
      default: throw new Error('Unknown node type');
    }
  }
  
  calculate(expressionStr) {
    const cleanExpr = expressionStr.trim();
    if (!cleanExpr) return 0;
    
    try {
      const ast = this.parse(cleanExpr);
      if (!ast) return 0;
      const res = this.evaluateAST(ast);
      if (typeof res === 'number' && !isNaN(res)) {
        return parseFloat(res.toFixed(10));
      }
      return res;
    } catch (error) {
      throw error;
    }
  }
}

const parser = new MathParser();

// ============================================================================
// 2. WEBSITE STATE & MOCK CALC STATE
// ============================================================================
const STATE = {
  websiteTheme: 'dark',   // 'dark' | 'light' | 'neon'
  calcTheme: 'dark',      // Calculator theme can cycle independently inside the mock
  currentInput: '',
  currentResult: 0,
  isResultFinal: false,
  activePanel: null,      // 'notes' | 'history' | 'stats' | null
  currentTab: 'all',      // 'all' | 'starred'
  history: [],
  notes: '',
  stats: {
    today: 0,
    lifetime: 0,
    streak: 1
  }
};

const DELIGHT_MESSAGES = [
  "Keep building 🚀",
  "Small projects become big skills.",
  "Ship first, improve later. 🛠️",
  "One extension today, ten products tomorrow.",
  "Clean code, clear mind. 💻",
  "Draft, calculate, design, repeat. ✨"
];

// ============================================================================
// 3. ELEMENT SELECTORS
// ============================================================================
const DOM = {
  // Navigation / Scroll
  header: document.getElementById('mainHeader'),
  globalThemeToggle: document.getElementById('globalThemeToggle'),
  
  // Mock Extension App
  appContainer: document.getElementById('appContainer'),
  calcInput: document.getElementById('calcInput'),
  calcPreview: document.getElementById('calcPreview'),
  calcResult: document.getElementById('calcResult'),
  previewIndicator: document.getElementById('previewIndicator'),
  
  // Header Actions
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  toggleHistoryBtn: document.getElementById('toggleHistoryBtn'),
  toggleNotesBtn: document.getElementById('toggleNotesBtn'),
  toggleStatsBtn: document.getElementById('toggleStatsBtn'),
  
  // Panels
  accessoryPanel: document.getElementById('accessoryPanel'),
  panelTitle: document.getElementById('panelTitle'),
  closePanelBtn: document.getElementById('closePanelBtn'),
  
  // Views
  viewNotes: document.getElementById('viewNotes'),
  viewHistory: document.getElementById('viewHistory'),
  viewStats: document.getElementById('viewStats'),
  
  // Notes UI
  notesArea: document.getElementById('notesArea'),
  notesStatusDot: document.getElementById('notesStatusDot'),
  notesStatusText: document.getElementById('notesStatusText'),
  
  // History UI
  tabAllHistory: document.getElementById('tabAllHistory'),
  tabStarred: document.getElementById('tabStarred'),
  clearAllHistoryBtn: document.getElementById('clearAllHistoryBtn'),
  historyList: document.getElementById('historyList'),
  historyCountText: document.getElementById('historyCountText'),
  historyEmptyState: document.getElementById('historyEmptyState'),
  
  // Stats UI
  statsToday: document.getElementById('statsToday'),
  statsLifetime: document.getElementById('statsLifetime'),
  statsStreak: document.getElementById('statsStreak'),
  
  // Actions
  favoriteBtn: document.getElementById('favoriteBtn'),
  copyResultBtn: document.getElementById('copyResultBtn'),
  keypad: document.querySelector('.keypad-container'),
  motivationalTicker: document.getElementById('motivationalTicker'),
  
  // Support Form
  supportForm: document.getElementById('supportForm'),
  formName: document.getElementById('formName'),
  formEmail: document.getElementById('formEmail'),
  formSubject: document.getElementById('formSubject'),
  formMessage: document.getElementById('formMessage'),
  
  // Toast overlay
  toastContainer: document.getElementById('toastContainer')
};

// ============================================================================
// 4. STORAGEfallback SYSTEM (Persistent across refreshes)
// ============================================================================
const StorageSystem = {
  load() {
    try {
      const savedTheme = localStorage.getItem('cf_website_theme');
      if (savedTheme) {
        STATE.websiteTheme = savedTheme;
        STATE.calcTheme = savedTheme;
      }
      
      const savedNotes = localStorage.getItem('cf_notes');
      if (savedNotes) {
        STATE.notes = savedNotes;
        DOM.notesArea.value = savedNotes;
      }
      
      const savedHistory = localStorage.getItem('cf_history');
      if (savedHistory) STATE.history = JSON.parse(savedHistory);
      
      const savedStats = localStorage.getItem('cf_stats');
      if (savedStats) {
        STATE.stats = JSON.parse(savedStats);
      } else {
        // Initial Mock Stats
        STATE.stats = { today: 4, lifetime: 28, streak: 3 };
        localStorage.setItem('cf_stats', JSON.stringify(STATE.stats));
      }
    } catch (e) {
      console.warn("Storage fallback warning", e);
    }
  },
  
  save(key, val) {
    try {
      localStorage.setItem('cf_' + key, typeof val === 'string' ? val : JSON.stringify(val));
    } catch (e) {
      console.error(e);
    }
  }
};

// ============================================================================
// 5. TOAST NOTIFICATION ENGINE
// ============================================================================
const Toast = {
  show(message, emoji = '✅') {
    if (!DOM.toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${emoji}</span><span>${message}</span>`;
    
    DOM.toastContainer.appendChild(toast);
    
    // Auto-remove after 2.5 seconds with animation
    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, 2200);
  }
};

// ============================================================================
// 6. WEBSITE DYNAMIC THEME SYSTEM
// ============================================================================
const ThemeController = {
  applyGlobalTheme(themeName) {
    // 1. Remove all old styles from body
    document.body.classList.remove('theme-dark', 'theme-light', 'theme-neon');
    document.body.classList.add(`theme-${themeName}`);
    STATE.websiteTheme = themeName;
    StorageSystem.save('website_theme', themeName);
    
    // 2. Synchronously update calculator's mockup appearance
    this.applyCalcTheme(themeName);
  },
  
  applyCalcTheme(themeName) {
    DOM.appContainer.classList.remove('theme-dark', 'theme-light', 'theme-neon');
    DOM.appContainer.classList.add(`theme-${themeName}`);
    STATE.calcTheme = themeName;
    
    // Toggle active status representing icons inside calculator
    const darkIcons = DOM.appContainer.querySelectorAll('.theme-icon-dark');
    const lightIcons = DOM.appContainer.querySelectorAll('.theme-icon-light');
    const neonIcons = DOM.appContainer.querySelectorAll('.theme-icon-neon');
    
    const hide = (el) => el.forEach(i => i.classList.add('hidden'));
    const show = (el) => el.forEach(i => i.classList.remove('hidden'));
    
    hide(darkIcons);
    hide(lightIcons);
    hide(neonIcons);
    
    if (themeName === 'dark') {
      show(darkIcons);
    } else if (themeName === 'light') {
      show(lightIcons);
    } else if (themeName === 'neon') {
      show(neonIcons);
    }
  },
  
  cycleGlobal() {
    const nextTheme = STATE.websiteTheme === 'dark' 
      ? 'light' 
      : STATE.websiteTheme === 'light' 
        ? 'neon' 
        : 'dark';
        
    this.applyGlobalTheme(nextTheme);
    Toast.show(`Website Theme: ${nextTheme.toUpperCase()}`, '🎨');
  },
  
  cycleCalcOnly() {
    const nextTheme = STATE.calcTheme === 'dark' 
      ? 'light' 
      : STATE.calcTheme === 'light' 
        ? 'neon' 
        : 'dark';
        
    this.applyCalcTheme(nextTheme);
    Toast.show(`Calculator Demo Theme: ${nextTheme.toUpperCase()}`, '📱');
  }
};

// ============================================================================
// 7. CALCULATOR HANDLERS
// ============================================================================
const Calculator = {
  updateDisplay() {
    let visualInput = STATE.currentInput
      .replace(/\*/g, '×')
      .replace(/\//g, '÷')
      .replace(/-/g, '−');
      
    if (DOM.calcInput.value !== visualInput) {
      DOM.calcInput.value = visualInput;
    }
    
    if (STATE.currentInput.trim().length > 0 && !STATE.isResultFinal) {
      try {
        let exprToEval = STATE.currentInput;
        
        // Auto-balance parentheses temporarily
        const openCount = (exprToEval.match(/\(/g) || []).length;
        const closeCount = (exprToEval.match(/\)/g) || []).length;
        if (openCount > closeCount) {
          exprToEval += ')'.repeat(openCount - closeCount);
        }
        
        const previewVal = parser.calculate(exprToEval);
        
        if (previewVal !== undefined && !isNaN(previewVal)) {
          STATE.currentResult = previewVal;
          DOM.calcPreview.textContent = visualInput;
          DOM.calcResult.textContent = previewVal;
          DOM.previewIndicator.classList.remove('hidden');
          DOM.favoriteBtn.disabled = false;
        }
      } catch (e) {
        DOM.previewIndicator.classList.add('hidden');
      }
    } else if (STATE.currentInput.trim().length === 0) {
      DOM.calcPreview.textContent = '';
      DOM.calcResult.textContent = '0';
      DOM.previewIndicator.classList.add('hidden');
      DOM.favoriteBtn.disabled = true;
      DOM.favoriteBtn.classList.remove('starred');
    }
    
    DOM.calcInput.scrollLeft = DOM.calcInput.scrollWidth;
  },

  handleInput(val) {
    const operators = ['+', '-', '*', '/', '%'];
    
    if (STATE.isResultFinal) {
      if (operators.includes(val)) {
        STATE.currentInput = STATE.currentResult.toString() + val;
      } else {
        STATE.currentInput = val;
      }
      STATE.isResultFinal = false;
      DOM.favoriteBtn.classList.remove('starred');
    } else {
      if (operators.includes(val)) {
        const lastChar = STATE.currentInput.trim().slice(-1);
        const visualOperators = ['+', '−', '×', '÷', '%'];
        
        if (visualOperators.includes(lastChar) || operators.includes(lastChar)) {
          STATE.currentInput = STATE.currentInput.trim().slice(0, -1) + val;
          this.updateDisplay();
          return;
        }
      }
      
      if (val === '.') {
        const parts = STATE.currentInput.split(/[\+\-\*\/%\(\)]/);
        const lastPart = parts[parts.length - 1];
        if (lastPart.includes('.')) {
          return;
        }
      }
      STATE.currentInput += val;
    }
    this.updateDisplay();
  },

  clear() {
    STATE.currentInput = '';
    STATE.currentResult = 0;
    STATE.isResultFinal = false;
    this.updateDisplay();
  },

  backspace() {
    if (STATE.isResultFinal) {
      this.clear();
      return;
    }
    STATE.currentInput = STATE.currentInput.slice(0, -1);
    this.updateDisplay();
  },

  evaluate() {
    if (!STATE.currentInput.trim()) return;
    
    try {
      let exprToEvaluate = STATE.currentInput;
      
      // Auto-balance opening parenthesis
      const openCount = (exprToEvaluate.match(/\(/g) || []).length;
      const closeCount = (exprToEvaluate.match(/\)/g) || []).length;
      if (openCount > closeCount) {
        exprToEvaluate += ')'.repeat(openCount - closeCount);
      }
      
      const finalResult = parser.calculate(exprToEvaluate);
      
      if (finalResult === undefined || isNaN(finalResult)) {
        throw new Error("Invalid Output");
      }

      const isDuplicate = STATE.history.length > 0 && 
                          STATE.history[0].expr === exprToEvaluate && 
                          STATE.history[0].result === finalResult;
      
      let visualInput = exprToEvaluate
        .replace(/\*/g, '×')
        .replace(/\//g, '÷')
        .replace(/-/g, '−');
        
      DOM.calcPreview.textContent = `${visualInput}`;
      DOM.calcResult.textContent = finalResult;
      STATE.currentResult = finalResult;
      STATE.currentInput = finalResult.toString();
      STATE.isResultFinal = true;
      DOM.previewIndicator.classList.remove('hidden');

      if (!isDuplicate) {
        this.addHistoryItem(visualInput, finalResult);
        this.incrementMockStats();
      }

    } catch (error) {
      DOM.calcResult.textContent = 'Error';
      DOM.calcPreview.textContent = error.message || 'Syntax Error';
      STATE.isResultFinal = true;
      DOM.favoriteBtn.disabled = true;
      DOM.previewIndicator.classList.add('hidden');
    }
  },

  addHistoryItem(expression, result) {
    const item = {
      id: 'mock_' + Date.now(),
      expr: expression,
      result: result,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isStarred: false
    };

    STATE.history.unshift(item);
    if (STATE.history.length > 20) STATE.history.pop();

    StorageSystem.save('history', STATE.history);
    HistoryUI.render();
  },

  incrementMockStats() {
    STATE.stats.today += 1;
    STATE.stats.lifetime += 1;
    
    StorageSystem.save('stats', STATE.stats);
    StatsUI.update();
  },

  toggleFavoriteCurrent() {
    if (STATE.history.length === 0) return;
    
    const latestItem = STATE.history[0];
    latestItem.isStarred = !latestItem.isStarred;
    
    StorageSystem.save('history', STATE.history);
    HistoryUI.render();
    
    if (latestItem.isStarred) {
      DOM.favoriteBtn.classList.add('starred');
      Toast.show("Starred Sandbox Calculation", "⭐");
    } else {
      DOM.favoriteBtn.classList.remove('starred');
      Toast.show("Unstarred Sandbox Calculation", "🗑️");
    }
  }
};

// ============================================================================
// 8. SANDBOX PANELS ENGAGEMENT
// ============================================================================
const PanelController = {
  open(panelName) {
    if (!DOM.accessoryPanel) return;
    
    DOM.toggleHistoryBtn.classList.remove('active');
    DOM.toggleNotesBtn.classList.remove('active');
    DOM.toggleStatsBtn.classList.remove('active');

    DOM.viewNotes.classList.add('hidden');
    DOM.viewHistory.classList.add('hidden');
    DOM.viewStats.classList.add('hidden');

    STATE.activePanel = panelName;

    if (panelName === 'notes') {
      DOM.toggleNotesBtn.classList.add('active');
      DOM.panelTitle.textContent = "Quick Notes";
      DOM.viewNotes.classList.remove('hidden');
      setTimeout(() => DOM.notesArea.focus(), 150);
    } else if (panelName === 'history') {
      DOM.toggleHistoryBtn.classList.add('active');
      DOM.panelTitle.textContent = "History Logs";
      DOM.viewHistory.classList.remove('hidden');
      HistoryUI.render();
    } else if (panelName === 'stats') {
      DOM.toggleStatsBtn.classList.add('active');
      DOM.panelTitle.textContent = "Productivity Stats";
      DOM.viewStats.classList.remove('hidden');
      StatsUI.update();
    }

    DOM.accessoryPanel.classList.remove('hidden');
    DOM.appContainer.classList.add('panel-open');
  },

  close() {
    if (!DOM.accessoryPanel) return;
    
    STATE.activePanel = null;
    DOM.toggleHistoryBtn.classList.remove('active');
    DOM.toggleNotesBtn.classList.remove('active');
    DOM.toggleStatsBtn.classList.remove('active');
    
    DOM.accessoryPanel.classList.add('hidden');
    DOM.appContainer.classList.remove('panel-open');
  },

  toggle(panelName) {
    if (STATE.activePanel === panelName) {
      this.close();
    } else {
      this.open(panelName);
    }
  }
};

// ============================================================================
// 9. PANEL SUB-CONTROLLERS
// ============================================================================
const NotesController = {
  init() {
    let saveTimeout = null;
    
    DOM.notesArea.addEventListener('input', (e) => {
      STATE.notes = e.target.value;
      
      // Visual feedback reflecting automatic MV3 saving
      DOM.notesStatusDot.className = 'status-dot saving';
      DOM.notesStatusText.textContent = "Saving changes...";
      
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        StorageSystem.save('notes', STATE.notes);
        DOM.notesStatusDot.className = 'status-dot';
        DOM.notesStatusText.textContent = "All changes saved";
      }, 500);
    });
  }
};

const HistoryUI = {
  render() {
    DOM.historyList.innerHTML = '';
    
    // Filter history based on tab active
    const filtered = STATE.history.filter(item => {
      if (STATE.currentTab === 'starred') return item.isStarred;
      return true;
    });
    
    DOM.historyCountText.textContent = `${filtered.length} entries`;
    
    if (filtered.length === 0) {
      DOM.historyEmptyState.style.display = 'flex';
      DOM.historyList.appendChild(DOM.historyEmptyState);
      return;
    }
    
    DOM.historyEmptyState.style.display = 'none';
    
    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = 'history-item';
      
      // Clicking on card loads it back into standard equation input box
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-hist-action')) return; // Avoid triggering on action buttons
        STATE.currentInput = item.expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
        STATE.isResultFinal = false;
        Calculator.updateDisplay();
        Toast.show("Equation reloaded to screen", "🔁");
      });
      
      card.innerHTML = `
        <div class="history-item-expr">${item.expr}</div>
        <div class="history-item-res-row">
          <div class="history-item-res">= ${item.result}</div>
          <div class="history-item-time">${item.timestamp}</div>
        </div>
        <div class="history-item-actions">
          <button class="btn-hist-action star ${item.isStarred ? 'starred' : ''}" title="Star calculation">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </button>
          <button class="btn-hist-action delete" title="Delete entry">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      `;
      
      // Star action
      const starBtn = card.querySelector('.star');
      starBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        item.isStarred = !item.isStarred;
        StorageSystem.save('history', STATE.history);
        HistoryUI.render();
        Toast.show(item.isStarred ? "Starred item" : "Unstarred item", "⭐");
      });
      
      // Delete action
      const deleteBtn = card.querySelector('.delete');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        STATE.history = STATE.history.filter(i => i.id !== item.id);
        StorageSystem.save('history', STATE.history);
        HistoryUI.render();
        Toast.show("Calculation cleared", "🗑️");
      });
      
      DOM.historyList.appendChild(card);
    });
  },
  
  init() {
    DOM.tabAllHistory.addEventListener('click', () => {
      DOM.tabStarred.classList.remove('active');
      DOM.tabAllHistory.classList.add('active');
      STATE.currentTab = 'all';
      this.render();
    });
    
    DOM.tabStarred.addEventListener('click', () => {
      DOM.tabAllHistory.classList.remove('active');
      DOM.tabStarred.classList.add('active');
      STATE.currentTab = 'starred';
      this.render();
    });
    
    DOM.clearAllHistoryBtn.addEventListener('click', () => {
      if (STATE.history.length === 0) return;
      STATE.history = [];
      StorageSystem.save('history', STATE.history);
      this.render();
      Toast.show("Cleared all Sandbox history", "🧹");
    });
  }
};

const StatsUI = {
  update() {
    DOM.statsToday.textContent = STATE.stats.today;
    DOM.statsLifetime.textContent = STATE.stats.lifetime;
    DOM.statsStreak.textContent = `${STATE.stats.streak} ${STATE.stats.streak === 1 ? 'Day' : 'Days'}`;
  }
};

// ============================================================================
// 10. MOTIVATION FOOTER DELIGHT TICKER
// ============================================================================
const DelightTicker = {
  init() {
    if (!DOM.motivationalTicker) return;
    let index = 0;
    
    setInterval(() => {
      DOM.motivationalTicker.classList.add('slide-fade-out');
      
      setTimeout(() => {
        index = (index + 1) % DELIGHT_MESSAGES.length;
        DOM.motivationalTicker.textContent = DELIGHT_MESSAGES[index];
        DOM.motivationalTicker.classList.remove('slide-fade-out');
        DOM.motivationalTicker.classList.add('slide-fade-in');
        
        setTimeout(() => {
          DOM.motivationalTicker.classList.remove('slide-fade-in');
        }, 300);
      }, 300);
    }, 6000);
  }
};

// ============================================================================
// 11. FAQ ACCORDION ENGINE
// ============================================================================
const FAQAccordion = {
  init() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
      const header = item.querySelector('.faq-header');
      const body = item.querySelector('.faq-body');
      
      header.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        
        // Collapse all other items for a clean single-open flow
        faqItems.forEach(otherItem => {
          otherItem.classList.remove('active');
          otherItem.querySelector('.faq-body').style.maxHeight = '0';
        });
        
        if (!isActive) {
          item.classList.add('active');
          body.style.maxHeight = body.scrollHeight + 'px';
        }
      });
    });
  }
};

// ============================================================================
// 12. TICKET SUPPORT FORM VALIDATOR
// ============================================================================
const SupportFormHandler = {
  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  },
  
  init() {
    DOM.supportForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const name = DOM.formName.value.trim();
      const email = DOM.formEmail.value.trim();
      const subject = DOM.formSubject.value.trim();
      const message = DOM.formMessage.value.trim();
      
      // Real-time Field Validations
      if (!name || !email || !subject || !message) {
        Toast.show("All fields are required!", "⚠️");
        
        // Highlight empty input fields
        [DOM.formName, DOM.formEmail, DOM.formSubject, DOM.formMessage].forEach(input => {
          if (!input.value.trim()) {
            input.style.borderColor = '#ef4444';
            setTimeout(() => input.style.borderColor = '', 2000);
          }
        });
        return;
      }
      
      if (!this.validateEmail(email)) {
        Toast.show("Please enter a valid email!", "📧");
        DOM.formEmail.style.borderColor = '#ef4444';
        setTimeout(() => DOM.formEmail.style.borderColor = '', 2000);
        return;
      }
      
      // Simulation of submission success
      Toast.show("Motivation ticket received! We will reply within 24 hours.", "🚀");
      
      // Clear forms
      DOM.supportForm.reset();
    });
  }
};

// ============================================================================
// 13. GLOBAL KEYBOARD BINDINGS FOR DEMO
// ============================================================================
const KeypadBindings = {
  init() {
    // 1. Mouse Click Keypad Bindings
    DOM.keypad.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn');
      if (!btn) return;
      
      const val = btn.dataset.val;
      const action = btn.dataset.action;
      
      if (val) {
        Calculator.handleInput(val);
      } else if (action === 'clear') {
        Calculator.clear();
      } else if (action === 'backspace') {
        Calculator.backspace();
      } else if (action === 'evaluate') {
        Calculator.evaluate();
      }
    });
    
    // 2. Direct Typable Keyboard Input Bindings
    DOM.calcInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        Calculator.evaluate();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        Calculator.clear();
      }
    });

    DOM.calcInput.addEventListener('input', (e) => {
      // Map visual standard inputs
      let expr = e.target.value
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-');
        
      STATE.currentInput = expr;
      Calculator.updateDisplay();
    });

    // Copy action
    DOM.copyResultBtn.addEventListener('click', () => {
      const res = DOM.calcResult.textContent;
      if (res && res !== 'Error') {
        navigator.clipboard.writeText(res)
          .then(() => Toast.show("Copied result to clipboard!", "📋"))
          .catch(() => Toast.show("Copy failed", "❌"));
      }
    });

    // Star current action
    DOM.favoriteBtn.addEventListener('click', () => {
      Calculator.toggleFavoriteCurrent();
    });
  }
};

// ============================================================================
// 14. INITIALIZATION HOOK
// ============================================================================
window.addEventListener('DOMContentLoaded', () => {
  // 1. Fetch Local Data
  StorageSystem.load();
  ThemeController.applyGlobalTheme(STATE.websiteTheme);
  
  // 2. Start Sub-components
  NotesController.init();
  HistoryUI.init();
  StatsUI.update();
  DelightTicker.init();
  FAQAccordion.init();
  SupportFormHandler.init();
  KeypadBindings.init();
  
  // 3. Panel Controllers Triggers
  DOM.toggleNotesBtn.addEventListener('click', () => PanelController.toggle('notes'));
  DOM.toggleHistoryBtn.addEventListener('click', () => PanelController.toggle('history'));
  DOM.toggleStatsBtn.addEventListener('click', () => PanelController.toggle('stats'));
  DOM.closePanelBtn.addEventListener('click', () => PanelController.close());
  
  // 4. Isolated Theme cycling inside Calculator Mock
  DOM.themeToggleBtn.addEventListener('click', () => ThemeController.cycleCalcOnly());
  
  // 5. Global Theme cycle inside Header Nav
  DOM.globalThemeToggle.addEventListener('click', () => ThemeController.cycleGlobal());
  
  // 6. Navigation Bar Blur Effects on Scroll
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      DOM.header.classList.add('scrolled');
    } else {
      DOM.header.classList.remove('scrolled');
    }
  });

  // 7. Focus on calculator input initial hook
  DOM.calcInput.focus();
});
