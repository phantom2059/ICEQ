/**
 * ICEQ (2025) - Скрипты главной страницы
 * 
 * Функциональность:
 * - Навигация по страницам
 * - Анимация статистики
 * - Обработка кликов по карточкам
 */

class HomePage {
    constructor() {
        this.init();
    }

    init() {
        console.log('🏗️ [HOME] Инициализация главной страницы...');
        
        this.initNavigation();
        this.initStatsAnimation();
        this.initCardHoverEffects();
        
        // Показываем начальное состояние
        this.showInitialState();
        
        // Загружаем данные
        this.loadUserStats();
        
        console.log('✅ [HOME] Инициализация завершена');
    }

    /**
     * Показать начальное состояние во время загрузки
     */
    showInitialState() {
        const limitNotice = document.getElementById('free-tests-limit');
        const limitText = limitNotice?.querySelector('.limit-text');
        const limitIcon = limitNotice?.querySelector('.limit-icon');
        
        if (limitText) {
            limitText.innerHTML = 'Загружаем статистику...';
        }
        if (limitIcon) {
            limitIcon.textContent = '⏳';
        }
        if (limitNotice) {
            limitNotice.style.background = 'linear-gradient(135deg, #6c757d, #495057)';
        }
    }

    /**
     * Инициализация навигации
     */
    initNavigation() {
        const createTestBtn = document.getElementById('create-test-btn');
        const takeTestBtn = document.getElementById('take-test-btn');

        // Удаляем обработчики - теперь работает напрямую через HTML ссылки
        // Это устраняет любые JS задержки
    }

    /**
     * Навигация на другую страницу (удалена - используем прямые ссылки)
     */
    // navigateTo() больше не нужна

    /**
     * Инициализация анимированных счетчиков
     */
    initStatsAnimation() {
        // Ждем загрузки Counter.js
        if (!window.AnimatedCounter) {
            setTimeout(() => this.initStatsAnimation(), 100);
            return;
        }
        
        // Создаем анимированные счетчики
        this.counters = {
            tests: window.createCounter('#tests-counter', {
                value: 0,
                size: 'large',
                theme: 'primary',
                duration: 800,
                fontSize: 48
            }),
            questions: window.createCounter('#questions-counter', {
                value: 0,
                size: 'large',
                theme: 'success',
                duration: 1000,
                fontSize: 48
            }),
            accuracy: window.createCounter('#accuracy-counter', {
                value: 0,
                size: 'large',
                theme: 'info',
                duration: 1200,
                fontSize: 48
            })
        };
        
        console.log('✅ [STATS] Анимированные счетчики созданы:', this.counters);
        
        // Создаем наблюдатель для анимации при появлении в области видимости
        const statsSection = document.getElementById('stats-section');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateStats();
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.5
        });

        observer.observe(statsSection);
    }

    /**
     * Анимация счетчиков статистики
     */
    animateStats() {
        console.log('🎬 [STATS] Запускаем анимацию счетчиков...');
        
        // Анимируем счетчики с задержкой
        setTimeout(() => {
            if (this.counters.tests) {
                const target = parseInt(document.getElementById('tests-counter').getAttribute('data-target')) || 150;
                this.counters.tests.setValue(target);
            }
        }, 200);
        
        setTimeout(() => {
            if (this.counters.questions) {
                const target = parseInt(document.getElementById('questions-counter').getAttribute('data-target')) || 2340;
                this.counters.questions.setValue(target);
            }
        }, 400);
        
        setTimeout(() => {
            if (this.counters.accuracy) {
                const target = parseInt(document.getElementById('accuracy-counter').getAttribute('data-target')) || 98;
                this.counters.accuracy.setValue(target);
            }
        }, 600);
    }

    /**
     * Инициализация эффектов при наведении на карточки
     */
    initCardHoverEffects() {
        const actionCards = document.querySelectorAll('.action-card');
        
        actionCards.forEach(card => {
            card.addEventListener('mouseenter', (e) => {
                this.addCardRipple(e);
            });
        });
    }

    /**
     * Добавление эффекта ripple к карточке
     */
    addCardRipple(event) {
        const card = event.currentTarget;
        const rect = card.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const ripple = document.createElement('div');
        ripple.className = 'ripple-effect';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';

        card.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    /**
     * Загрузка пользовательской статистики
     */
    async loadUserStats() {
        console.log('📊 [STATS] Начинаем загрузку статистики...');
        
        try {
            // Проверяем доступность API
            if (!window.iceqBase || !window.iceqBase.fetchAPI) {
                throw new Error('API недоступен');
            }
            
            console.log('📡 [STATS] Запрашиваем статус премиума...');
            // Загружаем статус премиума с сервера
            const premiumResponse = await window.iceqBase.fetchAPI('/premium/status');
            console.log('📥 [STATS] Ответ от сервера:', premiumResponse);
            
            const localStats = this.getUserStatsFromLocalStorage();
            console.log('💾 [STATS] Локальная статистика:', localStats);
            
            // Объединяем локальные данные с данными сервера
            const stats = {
                ...localStats,
                isPremium: premiumResponse.premium_active,
                maxTests: premiumResponse.features.daily_tests_limit,
                testsRemaining: premiumResponse.premium_active ? 
                    (localStats.testsRemaining >= 0 ? localStats.testsRemaining : 50) : 
                    (localStats.testsRemaining >= 0 ? localStats.testsRemaining : 5)
            };
            
            console.log('✅ [STATS] Объединенная статистика:', stats);
            
            this.updateStatsDisplay(stats);
            this.updateLimitsDisplay(stats);
            this.saveUserStats(stats);
            
        } catch (error) {
            console.error('❌ [STATS] Ошибка загрузки статистики:', error);
            console.error('❌ [STATS] Stack trace:', error.stack);
            
            // Fallback на локальные данные
            const stats = this.getUserStatsFromLocalStorage();
            console.log('🔄 [STATS] Используем локальные данные как fallback:', stats);
            
            this.updateStatsDisplay(stats);
            this.updateLimitsDisplay(stats);
            
            // Показываем уведомление об ошибке
            if (window.iceqBase && window.iceqBase.showToast) {
                window.iceqBase.showToast('Не удалось загрузить статистику с сервера', 'warning');
            }
        }
    }

    /**
     * Получение статистики из локального хранилища
     */
    getUserStatsFromLocalStorage() {
        const defaultStats = {
            testsCreated: 0,
            questionsGenerated: 0,
            testsRemaining: 5,
            isPremium: false,
            maxTests: 5
        };

        try {
            const saved = localStorage.getItem('iceq_user_stats');
            if (saved) {
                const parsedStats = JSON.parse(saved);
                return { ...defaultStats, ...parsedStats };
            }
        } catch (error) {
            console.error('❌ [STATS] Ошибка парсинга localStorage:', error);
        }
        
        return defaultStats;
    }

    /**
     * Обновление отображения статистики
     */
    updateStatsDisplay(stats) {
        console.log('📊 [STATS] Обновляем счетчики:', stats);
        
        // Обновляем значения счетчиков
        if (this.counters) {
            if (this.counters.tests && stats.testsCreated !== undefined) {
                this.counters.tests.setValue(stats.testsCreated);
                document.getElementById('tests-counter').setAttribute('data-target', stats.testsCreated);
            }
            
            if (this.counters.questions && stats.questionsGenerated !== undefined) {
                this.counters.questions.setValue(stats.questionsGenerated);
                document.getElementById('questions-counter').setAttribute('data-target', stats.questionsGenerated);
            }
            
            // Процент точности остается константой (98%)
            if (this.counters.accuracy) {
                this.counters.accuracy.setValue(98);
                document.getElementById('accuracy-counter').setAttribute('data-target', 98);
            }
        } else {
            // Если счетчики еще не созданы, просто обновляем data-target
            document.getElementById('tests-counter')?.setAttribute('data-target', stats.testsCreated || 0);
            document.getElementById('questions-counter')?.setAttribute('data-target', stats.questionsGenerated || 0);
            document.getElementById('accuracy-counter')?.setAttribute('data-target', 98);
        }
    }

    /**
     * Обновление отображения лимитов
     */
    updateLimitsDisplay(stats) {
        console.log('🎯 [LIMITS] Обновляем отображение лимитов:', stats);
        
        const limitNotice = document.getElementById('free-tests-limit');
        if (!limitNotice) {
            console.error('❌ [LIMITS] Элемент free-tests-limit не найден!');
            return;
        }
        
        const limitText = limitNotice.querySelector('.limit-text');
        const limitIcon = limitNotice.querySelector('.limit-icon');
        
        if (!limitText || !limitIcon) {
            console.error('❌ [LIMITS] Дочерние элементы не найдены!', {
                limitText: !!limitText,
                limitIcon: !!limitIcon
            });
            return;
        }
        
        const maxTests = stats.maxTests || (stats.isPremium ? 50 : 5);
        const remaining = stats.testsRemaining >= 0 ? stats.testsRemaining : maxTests;
        
        if (stats.isPremium) {
            limitNotice.style.display = 'block';
            limitNotice.style.background = 'linear-gradient(135deg, #2d5aa0, #1e3c72)';
            limitNotice.classList.add('premium-status');
            limitIcon.textContent = '⭐';
            limitText.innerHTML = `<span style="color: #ffd700;">Premium:</span> Сегодня осталось тестов: <strong>${remaining}</strong>/${maxTests}`;
        } else {
            limitNotice.style.display = 'block';
            limitNotice.style.background = 'linear-gradient(135deg, var(--info-color), var(--primary-dark))';
            limitNotice.classList.remove('premium-status');
            limitIcon.textContent = '⚡';
            limitText.innerHTML = `Сегодня осталось тестов: <strong>${remaining}</strong>/${maxTests}`;
            
            if (remaining === 0) {
                limitNotice.style.background = 'linear-gradient(135deg, var(--danger-color), #d32f2f)';
                limitIcon.textContent = '⛔';
                limitText.innerHTML = '<strong>Лимит тестов исчерпан!</strong> Получите Premium для 50 тестов в день';
                
                // Отключаем кнопку создания теста
                const createBtn = document.getElementById('create-test-btn');
                createBtn.style.opacity = '0.6';
                createBtn.style.cursor = 'not-allowed';
                createBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showLimitModal();
                    return false;
                };
            } else {
                // Восстанавливаем кнопку если лимит не исчерпан
                const createBtn = document.getElementById('create-test-btn');
                createBtn.style.opacity = '1';
                createBtn.style.cursor = 'pointer';
                createBtn.onclick = null;
            }
        }
    }

    /**
     * Показ модального окна о превышении лимита
     */
    showLimitModal() {
        const content = `
            <div class="limit-modal">
                <h3>⚠️ Лимит исчерпан</h3>
                <p>Вы достигли дневного лимита в 5 тестов для бесплатной версии.</p>
                <div class="limit-options">
                    <h4>Что можно сделать:</h4>
                    <ul>
                        <li>🕒 Подождать до завтра для обновления лимита</li>
                        <li>⭐ Перейти на премиум для безлимитного доступа</li>
                        <li>📋 Попробовать пройти готовые тесты</li>
                    </ul>
                </div>
                <div class="limit-actions">
                    <button class="btn secondary-btn" onclick="window.iceqBase.hideModal()">
                        Понятно
                    </button>
                    <button class="btn primary-btn" onclick="document.getElementById('premium-btn').click()">
                        Получить Премиум
                    </button>
                </div>
            </div>
        `;
        
        window.iceqBase.showModal(content);
    }

    /**
     * Сохранение статистики в локальное хранилище
     */
    saveUserStats(stats) {
        localStorage.setItem('iceq_user_stats', JSON.stringify(stats));
    }

    /**
     * Проверка доступности создания тестов
     */
    canCreateTest() {
        const stats = this.getUserStatsFromLocalStorage();
        return stats.isPremium || stats.testsRemaining > 0;
    }

    /**
     * Декремент счетчика оставшихся тестов
     */
    decrementTestLimit() {
        const stats = this.getUserStatsFromLocalStorage();
        if (!stats.isPremium && stats.testsRemaining > 0) {
            stats.testsRemaining--;
            this.saveUserStats(stats);
            this.updateLimitsDisplay(stats);
        }
    }

    /**
     * Инкремент статистики созданных тестов
     */
    incrementTestsCreated() {
        const stats = this.getUserStatsFromLocalStorage();
        stats.testsCreated++;
        this.saveUserStats(stats);
    }

    /**
     * Инкремент статистики сгенерированных вопросов
     */
    incrementQuestionsGenerated(count) {
        const stats = this.getUserStatsFromLocalStorage();
        stats.questionsGenerated += count;
        this.saveUserStats(stats);
    }

    /**
     * Обновление лимитов после изменения премиум статуса
     */
    updateLimitsAfterPremiumChange(isPremium) {
        console.log('🔄 [PREMIUM] Обновляем лимиты после изменения премиум статуса:', isPremium);
        
        // Перезагружаем статистику из localStorage (уже обновленную в base.js)
        const stats = this.getUserStatsFromLocalStorage();
        
        // Обновляем отображение
        this.updateLimitsDisplay(stats);
        
        // Показываем уведомление
        const message = isPremium ? 
            `🎉 Premium активирован! Получили полный лимит: 50/50 тестов в день` :
            `📱 Переключились на бесплатный план: 5/5 тестов в день`;
            
        if (window.iceqBase && window.iceqBase.showToast) {
            window.iceqBase.showToast(message, isPremium ? 'success' : 'info');
        }
    }


}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌟 [GLOBAL] DOM загружен, начинаем инициализацию HomePage...');
    
    const initHomePage = () => {
        if (window.iceqBase) {
            console.log('✅ [GLOBAL] iceqBase найден, создаем HomePage...');
            window.homePage = new HomePage();
        } else {
            console.log('⏳ [GLOBAL] iceqBase еще не готов, ждем...');
            setTimeout(initHomePage, 100);
        }
    };
    
    // Даем немного времени на загрузку base.js
    setTimeout(initHomePage, 50);
});

// Добавляем CSS для эффектов (оптимизированный)
const homePageStyle = document.createElement('style');
homePageStyle.textContent = `
    .ripple-effect {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: scale(0);
        animation: ripple 0.3s linear;
        pointer-events: none;
        width: 20px;
        height: 20px;
        margin-left: -10px;
        margin-top: -10px;
    }
    
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    .limit-modal h3 {
        color: var(--danger-color);
        margin-bottom: 15px;
    }
    
    .limit-options {
        margin: 20px 0;
    }
    
    .limit-options ul {
        margin: 10px 0;
        padding-left: 20px;
    }
    
    .limit-options li {
        margin: 8px 0;
        color: var(--text-muted);
    }
    
    .limit-actions {
        display: flex;
        gap: 15px;
        justify-content: center;
        margin-top: 20px;
    }
    
    .limit-actions .btn {
        min-width: 120px;
    }
`;
document.head.appendChild(homePageStyle); 