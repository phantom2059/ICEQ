/**
 * Простой анимированный счетчик
 */
class AnimatedCounter {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            value: 0,
            duration: 1000,
            ...options
        };
        
        this.currentValue = 0;
        this.init();
    }
    
    init() {
        this.element.innerHTML = '';
        this.element.style.fontSize = '48px';
        this.element.style.fontWeight = '900';
        this.element.style.color = 'white';
        this.element.style.textAlign = 'center';
        this.element.textContent = '0';
        
        this.setValue(this.options.value, false);
    }

    setValue(targetValue, animate = true) {
        if (!animate) {
            this.currentValue = targetValue;
            this.element.textContent = Math.floor(targetValue);
            return;
        }

        const startValue = this.currentValue;
        const duration = this.options.duration;
        const startTime = performance.now();

        const animateStep = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            
            this.currentValue = startValue + (targetValue - startValue) * easedProgress;
            this.element.textContent = Math.floor(this.currentValue);

            if (progress < 1) {
                requestAnimationFrame(animateStep);
            } else {
                this.currentValue = targetValue;
                this.element.textContent = Math.floor(targetValue);
            }
        };

        requestAnimationFrame(animateStep);
    }
}

window.createCounter = (selector, options) => {
    const element = document.querySelector(selector);
    if (element) {
        return new AnimatedCounter(element, options);
    }
    return null;
};

window.AnimatedCounter = AnimatedCounter; 