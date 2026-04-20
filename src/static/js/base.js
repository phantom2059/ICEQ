/**
 * ICEQ (2025) - Базовые скрипты
 * 
 * Общая функциональность для всех страниц:
 * - Переключение темы
 * - Модальные окна
 * - Уведомления (toast)
 * - Общие утилиты
 */

class ICEQBase {
    constructor() {
        this.init();
    }

    init() {
        this.initTheme();
        this.initModal();
        this.initSupportBtn();
        this.initPremiumBtn();
        this.autoHideOverlays();
    }

    /**
     * Инициализация переключателя темы
     */
    initTheme() {
        const themeButton = document.getElementById('theme-switch');
        const savedTheme = localStorage.getItem('theme') || 'dark';
        
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        themeButton.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }

    /**
     * Инициализация модальных окон
     */
    initModal() {
        const modalOverlay = document.getElementById('modal-overlay');
        const modalClose = document.getElementById('modal-close');

        // Закрытие модального окна
        modalClose.addEventListener('click', () => {
            this.hideModal();
        });

        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                this.hideModal();
            }
        });

        // Закрытие по Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideModal();
            }
        });
    }

    /**
     * Показать модальное окно
     */
    showModal(content, title = '') {
        const modalBody = document.getElementById('modal-body');
        const modalOverlay = document.getElementById('modal-overlay');
        
        let modalContent = '';
        if (title) {
            modalContent += `<h3>${title}</h3>`;
        }
        modalContent += content;
        
        modalBody.innerHTML = modalContent;
        modalOverlay.style.display = 'block';
        
        // Анимация появления
        setTimeout(() => {
            modalOverlay.classList.add('show');
        }, 10);
        
        // Фокус на модальном окне для доступности
        setTimeout(() => {
            modalBody.focus();
        }, 100);
    }

    /**
     * Скрыть модальное окно
     */
    hideModal() {
        const modalOverlay = document.getElementById('modal-overlay');
        
        // Анимация исчезновения
        modalOverlay.classList.remove('show');
        
        setTimeout(() => {
            modalOverlay.style.display = 'none';
        }, 300);
    }

    /**
     * Инициализация кнопки поддержки
     */
    initSupportBtn() {
        const supportBtn = document.getElementById('support-btn');
        
        supportBtn.addEventListener('click', () => {
            const supportContent = `
                <div class="support-content">
                    <h4> Часто задаваемые вопросы (FAQ)</h4>
                    
                    <div class="faq-container">
                        <details class="faq-item">
                            <summary class="faq-question">Почему выбрать именно ICEQ?</summary>
                            <div class="faq-answer">
                                <p>ICEQ предлагает уникальное сочетание <strong>3 ИИ-моделей</strong> (включая собственную ICEQ), <strong>GPU-ускорение</strong> для быстрой обработки и поддержку <strong>множества форматов файлов</strong>. Мы не просто генерируем вопросы — мы создаем <strong>интеллектуальные тесты</strong> с объяснениями и адаптивной сложностью.</p>
                            </div>
                        </details>

                        <details class="faq-item">
                            <summary class="faq-question">Какие типы текстов лучше всего подходят?</summary>
                            <div class="faq-answer">
                                <p>Идеально работаем с <strong>учебными материалами</strong>, научными статьями, техническими документами, корпоративными руководствами. Оптимальный объем: <strong>от 500 символов</strong>. Чем структурированнее текст, тем качественнее вопросы.</p>
                            </div>
                        </details>

                        <details class="faq-item">
                            <summary class="faq-question">В чем разница между моделями ИИ?</summary>
                            <div class="faq-answer">
                                <p><strong>ICEQ</strong> — наша собственная модель, оптимизированная под русский язык и быстрая генерация. <strong>DeepSeek</strong> — универсальная модель для сложных текстов. <strong>Qwen</strong> — специализируется на аналитических и технических материалах.</p>
                            </div>
                        </details>

                        <details class="faq-item">
                            <summary class="faq-question">Насколько точны генерируемые вопросы?</summary>
                            <div class="faq-answer">
                                <p>Точность составляет <strong>98%</strong> благодаря семантическому анализу и постобработке. Каждый вопрос проверяется на <strong>логическую корректность</strong>, варианты ответов — на <strong>релевантность</strong>, а объяснения генерируются через <strong>поиск по контексту</strong>.</p>
                            </div>
                        </details>

                        <details class="faq-item">
                            <summary class="faq-question">Какие ограничения у бесплатной версии?</summary>
                            <div class="faq-answer">
                                <p>Бесплатно: <strong>5-10 вопросов</strong> за тест, <strong>10 000 символов</strong> текста, файлы до <strong>50 КБ</strong>, только модель ICEQ. Premium: <strong>до 100 вопросов</strong>, <strong>1 млн символов</strong>, файлы до <strong>50 МБ</strong>, все модели ИИ.</p>
                            </div>
                        </details>

                        <details class="faq-item">
                            <summary class="faq-question">Можно ли редактировать созданные тесты?</summary>
                            <div class="faq-answer">
                                <p>Да! После генерации вы можете <strong>скачать тест</strong> в форматах JSON, TXT или CSV, затем редактировать и загружать обратно для прохождения. Планируем добавить <strong>встроенный редактор</strong> в следующих обновлениях.</p>
                            </div>
                        </details>

                        <details class="faq-item">
                            <summary class="faq-question">Безопасны ли мои данные?</summary>
                            <div class="faq-answer">
                                <p>Абсолютно! Тексты обрабатываются <strong>локально на наших серверах</strong>, не передаются третьим лицам. Временное хранение только на время сессии. Никаких персональных данных не собираем, полная <strong>анонимность</strong>.</p>
                            </div>
                        </details>

                        <details class="faq-item">
                            <summary class="faq-question">Поддерживаете ли групповое прохождение?</summary>
                            <div class="faq-answer">
                                <p>Пока что каждый тест — индивидуальный. Но мы разрабатываем <strong>систему классов</strong> для учителей, <strong>аналитику результатов</strong> и <strong>совместное прохождение</strong>. Следите за обновлениями!</p>
                            </div>
                        </details>

                        <details class="faq-item">
                            <summary class="faq-question">Есть ли API для интеграции?</summary>
                            <div class="faq-answer">
                                <p>В планах! Разрабатываем <strong>REST API</strong> для интеграции с LMS-системами, корпоративными платформами обучения и мобильными приложениями. Хотите раннее участие в тестировании? Напишите нам!</p>
                            </div>
                        </details>
                    </div>

                    <hr>
                    <h5>Техническая поддержка</h5>
                    <p>Если у вас возникли проблемы с приложением, обращайтесь:</p>
                    <ul>
                        <li><strong>GitHub:</strong> <a href="https://github.com/phantom2059/ICEQ" target="_blank">phantom2059/ICEQ</a></li>
                        <li><strong>Email:</strong> support@iceq.com</li>
                    </ul>
                </div>
            `;
            this.showModal(supportContent, 'Поддержка');
        });
    }

    /**
     * Инициализация кнопки премиум
     */
    initPremiumBtn() {
        const premiumBtn = document.getElementById('premium-btn');
        this.loadPremiumStatus();
        
        premiumBtn.addEventListener('click', () => {
            this.togglePremium();
        });
    }

    /**
     * Загрузка статуса премиум режима
     */
    async loadPremiumStatus() {
        try {
            const response = await this.fetchAPI('/premium/status');
            this.updatePremiumUI(response.premium_active);
        } catch (error) {
            console.error('Ошибка загрузки статуса премиум:', error);
        }
    }

    /**
     * Переключение премиум режима
     */
    async togglePremium() {
        try {
            // Всегда показываем модальное окно с выбором тарифа
            this.showPremiumModal();
        } catch (error) {
            this.showToast('Ошибка премиум режима', 'error');
            console.error('Ошибка премиум:', error);
        }
    }

    /**
     * Показ модального окна премиум
     */
    async showPremiumModal() {
        // Получаем текущий статус
        let isPremium = false;
        try {
            const currentStatus = await this.fetchAPI('/premium/status');
            isPremium = currentStatus.premium_active;
        } catch (error) {
            console.warn('Не удалось получить статус премиум:', error);
        }

        // Всегда показываем оба тарифа, но меняем кнопки и статус
        const premiumContent = `
            <div class="pricing-modal">
                <div class="pricing-header">
                    <h3>Выберите тарифный план</h3>
                    <p>Расширьте возможности с Premium доступом</p>
                </div>
                <div class="pricing-plans">
                    <div class="plan free-plan ${!isPremium ? 'current-plan' : ''}">
                        <h4>Бесплатный</h4>
                        ${!isPremium ? '<div class="current-badge">Текущий тариф</div>' : ''}
                        <div class="price">0₽</div>
                        <ul>
                            <li>10 вопросов в тесте</li>
                            <li>5 тестов в день</li>
                            <li>Базовая модель ICEQ</li>
                            <li>Файлы до 50 КБ</li>
                            <li>Экспорт в TXT</li>
                        </ul>
                        <button class="select-plan-btn ${!isPremium ? 'current-plan-btn' : ''}" data-plan="free">
                            ${!isPremium ? 'Текущий тариф' : 'Переключиться'}
                        </button>
                    </div>
                    <div class="plan premium-plan ${isPremium ? 'current-plan' : ''}">
                        <h4>Premium</h4>
                        ${isPremium ? '<div class="current-badge">Текущий тариф</div>' : ''}
                        <div class="price">499₽<span>/месяц</span></div>
                        <ul>
                            <li>100 вопросов в тесте</li>
                            <li>50 тестов в день</li>
                            <li>Все ИИ модели</li>
                            <li>Файлы до 50 МБ</li>
                            <li>Экспорт в PDF/DOCX</li>
                            <li>Приоритетная обработка</li>
                        </ul>
                        <button class="select-plan-btn ${isPremium ? 'current-plan-btn' : ''}" data-plan="premium">
                            ${isPremium ? 'Текущий тариф' : 'Активировать'}
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        this.showModal(premiumContent);
        
        // Добавляем обработчики для кнопок выбора тарифа
        const planButtons = document.querySelectorAll('.select-plan-btn');
        planButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                const plan = e.target.dataset.plan;
                try {
                    if (plan === 'premium') {
                        await this.activatePremium();
                    } else {
                        await this.selectFreePlan();
                    }
                    this.hideModal();
                } catch (error) {
                    this.showToast('Ошибка при выборе тарифа: ' + error.message, 'error');
                }
            });
        });
    }

    /**
     * Активация премиум тарифа
     */
    async activatePremium() {
        try {
            // Проверяем текущий статус и переключаем только если не премиум
            const currentStatus = await this.fetchAPI('/premium/status');
            
            if (!currentStatus.premium_active) {
                const response = await this.fetchAPI('/premium/toggle', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.status === 'success') {
                    this.updatePremiumUI(true);
                    this.showToast('Premium активирован!', 'success');
                } else {
                    throw new Error(response.message || 'Не удалось активировать Premium');
                }
            } else {
                // Уже премиум, просто обновляем UI
                this.updatePremiumUI(true);
                this.showToast('Premium уже активирован!', 'info');
            }
        } catch (error) {
            throw new Error('Ошибка активации Premium: ' + error.message);
        }
    }

    /**
     * Выбор бесплатного тарифа
     */
    async selectFreePlan() {
        try {
            // Проверяем текущий статус и переключаем только если премиум
            const currentStatus = await this.fetchAPI('/premium/status');
            
            if (currentStatus.premium_active) {
                const response = await this.fetchAPI('/premium/toggle', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.status === 'success') {
                    this.updatePremiumUI(false);
                    this.showToast('Бесплатный тариф активирован', 'success');
                } else {
                    throw new Error(response.message || 'Не удалось активировать бесплатный тариф');
                }
            } else {
                // Уже бесплатный, просто обновляем UI
                this.updatePremiumUI(false);
                this.showToast('Бесплатный тариф уже активирован!', 'info');
            }
        } catch (error) {
            throw new Error('Ошибка активации бесплатного тарифа: ' + error.message);
        }
    }

    /**
     * Обновление UI для премиум статуса
     */
    updatePremiumUI(isPremium) {
        const premiumBtn = document.getElementById('premium-btn');
        if (isPremium) {
            premiumBtn.classList.add('active');
            premiumBtn.textContent = 'Premium ✨';
        } else {
            premiumBtn.classList.remove('active');
            premiumBtn.textContent = 'Премиум';
        }
        
        // Обновляем лимиты на главной странице если она активна
        this.updateMainPageLimits(isPremium);
    }

    /**
     * Обновление лимитов на главной странице
     */
    updateMainPageLimits(isPremium) {
        // Проверяем, находимся ли мы на главной странице
        if (window.homePage && window.homePage.updateLimitsAfterPremiumChange) {
            window.homePage.updateLimitsAfterPremiumChange(isPremium);
        }
        
        // Если есть глобальная статистика пользователя, обновляем её
        try {
            const stats = JSON.parse(localStorage.getItem('iceq_user_stats') || '{}');
            
            // Обновляем статус премиума
            stats.isPremium = isPremium;
            
            // При включении премиума: даем полный лимит 50/50
            // При отключении: возвращаем к базовому лимиту 5/5
            if (isPremium) {
                // Premium дает полный дневной лимит
                stats.maxTests = 50;
                stats.testsRemaining = 50;
            } else {
                // Free план дает базовый лимит
                stats.maxTests = 5;
                stats.testsRemaining = 5;
            }
            
            localStorage.setItem('iceq_user_stats', JSON.stringify(stats));
            console.log('📊 [PREMIUM] Обновлены лимиты тестов:', stats);
            
        } catch (error) {
            console.error('❌ [PREMIUM] Ошибка обновления лимитов:', error);
        }
    }

    /**
     * Показать уведомление (toast)
     */
    showToast(message, type = 'info', duration = 5000) {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                ${this.getToastIcon(type)} 
                <span>${message}</span>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        // Автоматическое удаление
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => {
                    toast.remove();
                }, 300);
            }
        }, duration);
        
        // Ручное закрытие по клику
        toast.addEventListener('click', () => {
            toast.remove();
        });
        
        return toast;
    }

    /**
     * Получить иконку для уведомления
     */
    getToastIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    /**
     * Улучшенная обработка API запросов
     */
    async fetchAPI(url, options = {}) {
        try {
            const defaultOptions = {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'same-origin'
            };

            const response = await fetch(url, { ...defaultOptions, ...options });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Ошибка сервера');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw new Error(error.message || 'Ошибка сети');
        }
    }

    /**
     * Утилита для форматирования размера файла
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Утилита для валидации email
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Утилита для дебаунса функций
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Утилита для анимации чисел
     */
    animateNumber(element, start, end, duration = 1000) {
        const startTime = performance.now();
        const range = end - start;
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = Math.floor(start + (range * progress));
            element.textContent = current;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    /**
     * Получить информацию о браузере
     */
    getBrowserInfo() {
        const ua = navigator.userAgent;
        const browser = {
            chrome: /Chrome/.test(ua) && /Google Inc/.test(navigator.vendor),
            firefox: /Firefox/.test(ua),
            safari: /Safari/.test(ua) && /Apple Computer/.test(navigator.vendor),
            edge: /Edg/.test(ua),
            opera: /OPR/.test(ua)
        };
        
        return Object.keys(browser).find(key => browser[key]) || 'unknown';
    }

    /**
     * Автоматически скрывает возможные оверлеи при загрузке страницы
     */
    autoHideOverlays() {
        const hide = () => {
            const ids = ['modal-overlay', 'loading-overlay'];
            ids.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.style.display = 'none';
                }
            });
            document.body.style.overflow = 'auto';
        };
        // При первичной загрузке
        hide();
        // На случай возврата из истории
        window.addEventListener('pageshow', hide);
        // Перед уходом со страницы тоже прячем, чтобы при возврате не оставалось
        window.addEventListener('beforeunload', hide);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.iceqBase = new ICEQBase();
});

// Добавляем стили для анимации исчезновения toast
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .toast-content {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .support-content ul {
        margin: 15px 0;
        padding-left: 20px;
    }
    
    .faq-container {
        margin: 20px 0;
    }
    
    .faq-item {
        margin: 12px 0;
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
        overflow: hidden;
        transition: all 0.3s ease;
        position: relative;
    }
    
    .faq-item:hover {
        border-color: rgba(74, 144, 226, 0.4);
        box-shadow: 0 2px 8px rgba(74, 144, 226, 0.1);
    }
    
    .faq-item[open] {
        background: linear-gradient(135deg, rgba(64, 120, 192, 0.03), rgba(64, 120, 192, 0.06));
        border-color: rgba(64, 120, 192, 0.6);
        box-shadow: 0 3px 12px rgba(64, 120, 192, 0.15);
    }
    
    .faq-question {
        cursor: pointer;
        font-weight: 600;
        color: var(--text-color);
        padding: 16px 50px 16px 18px;
        background: var(--card-bg);
        border: none;
        list-style: none;
        transition: all 0.3s ease;
        font-size: 15px;
        position: relative;
        user-select: none;
    }
    
    .faq-question::-webkit-details-marker {
        display: none;
    }
    
    .faq-question::after {
        content: '+';
        position: absolute;
        right: 18px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 18px;
        font-weight: 400;
        color: rgba(100, 140, 200, 0.8);
        transition: all 0.3s ease;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: rgba(100, 140, 200, 0.08);
    }
    
    .faq-item[open] .faq-question::after {
        transform: translateY(-50%) rotate(45deg);
        background: rgba(64, 120, 192, 0.9);
        color: white;
        box-shadow: 0 2px 6px rgba(64, 120, 192, 0.2);
    }
    
    .faq-question:hover {
        background: rgba(64, 120, 192, 0.04);
        color: rgba(64, 120, 192, 0.9);
    }
    
    .faq-answer {
        padding: 0 18px;
        background: var(--bg-color);
        max-height: 0;
        overflow: hidden;
        opacity: 0;
        transform: translateY(-3px);
        transition: max-height 0.3s ease, 
                    opacity 0.3s ease, 
                    transform 0.3s ease,
                    padding 0.3s ease;
    }
    
    .faq-item[open] .faq-answer {
        max-height: 200px;
        padding: 0 18px 16px 18px;
        opacity: 1;
        transform: translateY(0);
    }
    
    .faq-answer p {
        margin: 0;
        line-height: 1.6;
        color: var(--text-muted);
        font-size: 14px;
    }
    
    .faq-answer strong {
        color: var(--text-color);
        font-weight: 600;
    }
    
    .support-content details {
        margin: 10px 0;
        padding: 10px;
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
    }
    
    .support-content summary {
        cursor: pointer;
        font-weight: 500;
        color: var(--primary-color);
    }
    
    .premium-content .features-list ul {
        margin: 15px 0;
        padding-left: 20px;
    }
    
    .premium-content .pricing {
        background: var(--bg-color);
        padding: 15px;
        border-radius: var(--border-radius);
        margin: 15px 0;
        text-align: center;
    }
`;
document.head.appendChild(style); 