document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const booksScreen = document.getElementById('books-screen');
    const bookDetailScreen = document.getElementById('book-detail-screen');

    // Books Containers
    const favoritesContainer = document.getElementById('favorites-books');
    const personalBooksContainer = document.getElementById('personal-books');
    const popularBooksContainer = document.getElementById('popular-books');
    const genreBooksContainer = document.getElementById('genre-books');
    const genreTabsContainer = document.getElementById('genre-tabs');

    // Navigation Buttons
    const favoritesPrevBtn = document.getElementById('favorites-prev');
    const favoritesNextBtn = document.getElementById('favorites-next');
    const personalPrevBtn = document.getElementById('personal-prev');
    const personalNextBtn = document.getElementById('personal-next');
    const popularPrevBtn = document.getElementById('popular-prev');
    const popularNextBtn = document.getElementById('popular-next');

    // Book Detail Elements
    const bookDetailContent = document.getElementById('book-detail-content');
    const backToBooks = document.getElementById('back-to-books');
    const backBtn = document.getElementById('back-btn');
    const readBtn = document.getElementById('read-btn');

    // Premium Modal
    const premiumBtn = document.getElementById('premium-btn');
    const premiumModal = document.getElementById('premium-modal');
    const closeModal = document.querySelector('.close-modal');
    const freePlanBtn = document.getElementById('free-plan-btn');
    const premiumPlanBtn = document.getElementById('premium-plan-btn');

    // Theme Toggle
    const themeSwitch = document.getElementById('theme-switch');

    // Support Button
    const supportBtn = document.getElementById('support-btn');

    // Logo for navigation
    const logoHome = document.getElementById('logo-home');

    // Home navigation
    const homeBtn = document.getElementById('home-btn');
    const homeDetailBtn = document.getElementById('home-detail-btn');

    // Refresh recommendations button
    const refreshBtn = document.getElementById('refresh-recommendations');

    // State variables
    let currentBook = null;
    let favoriteBooks = JSON.parse(localStorage.getItem('favoriteBooks') || '[]');
    let userRatings = JSON.parse(localStorage.getItem('userRatings') || '{}');
    let isPremiumMode = localStorage.getItem('premiumMode') === 'true';
    let currentGenre = null;
    let allBooks = [];
    let genres = [];
    let visibleBooksCount = {
        favorites: 0,
        personal: 0,
        popular: 0,
        genre: 0
    };
    let displayedCardsCount = 5; // Number of cards displayed at once

    // Apply premium mode if stored
    if (isPremiumMode) {
        document.body.classList.add('premium-mode');
        premiumBtn.textContent = 'Премиум активен';
    }

    // Load theme from localStorage
    const savedTheme = localStorage.getItem('quizTheme');
    if (savedTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        themeSwitch.checked = true;
    }

    // Theme toggle
    themeSwitch.addEventListener('change', function() {
        if (this.checked) {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('quizTheme', 'light');
        } else {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('quizTheme', 'dark');
        }
    });

    // Logo navigation to ICEQ home
    logoHome.addEventListener('click', function() {
        window.location.href = '/';
    });

    // Home navigation to ICEQ home
    homeBtn.addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = '/';
    });

    homeDetailBtn.addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = '/';
    });

    // Support button
    supportBtn.addEventListener('click', function() {
        window.open('https://t.me/phantom2059', '_blank');
    });

    // Premium modal events
    premiumBtn.addEventListener('click', function() {
        premiumModal.classList.add('active');
    });

    closeModal.addEventListener('click', function() {
        premiumModal.classList.remove('active');
    });

    freePlanBtn.addEventListener('click', function() {
        isPremiumMode = false;
        localStorage.setItem('premiumMode', 'false');
        document.body.classList.remove('premium-mode');
        premiumBtn.textContent = 'Премиум';
        premiumModal.classList.remove('active');
        loadBooks(); // Reload books for free mode
    });

    premiumPlanBtn.addEventListener('click', function() {
        isPremiumMode = true;
        localStorage.setItem('premiumMode', 'true');
        document.body.classList.add('premium-mode');
        premiumBtn.textContent = 'Премиум активен';
        premiumModal.classList.remove('active');
        loadBooks(); // Reload books for premium mode
    });

    // Book detail navigation
    backToBooks.addEventListener('click', function(e) {
        e.preventDefault();
        showScreen(booksScreen);
    });

    backBtn.addEventListener('click', function() {
        showScreen(booksScreen);
    });

    readBtn.addEventListener('click', function() {
        if (!isPremiumMode) {
            premiumModal.classList.add('active');
        } else if (currentBook) {
            alert(`Открывается книга: ${currentBook.title}`);
            // Here would be code to open the book reader
        }
    });

    // Refresh recommendations button
    refreshBtn.addEventListener('click', function() {
        const button = this;
        const buttonText = button.innerHTML;

        // Add loading state
        button.disabled = true;
        button.innerHTML = `
            <svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" stroke-linecap="round" stroke-dasharray="30 60"></circle>
            </svg>
            Обновляем...
        `;

        // Call the backend to refresh recommendations
        fetch('/api/refresh_recommendations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                favoriteBooks: favoriteBooks,
                userRatings: userRatings
            })
        })
        .then(response => response.json())
        .then(data => {
            loadBooks();

            // Reset button state
            setTimeout(() => {
                button.disabled = false;
                button.innerHTML = buttonText;
            }, 500);
        })
        .catch(error => {
            console.error('Error refreshing recommendations:', error);

            // For demonstration just reload books after slight delay
            setTimeout(() => {
                loadBooks();
                button.disabled = false;
                button.innerHTML = buttonText;
            }, 1000);
        });
    });

    // Navigation buttons for book containers
    favoritesPrevBtn.addEventListener('click', () => navigateBooks(favoritesContainer, 'prev'));
    favoritesNextBtn.addEventListener('click', () => navigateBooks(favoritesContainer, 'next'));
    personalPrevBtn.addEventListener('click', () => navigateBooks(personalBooksContainer, 'prev'));
    personalNextBtn.addEventListener('click', () => navigateBooks(personalBooksContainer, 'next'));
    popularPrevBtn.addEventListener('click', () => navigateBooks(popularBooksContainer, 'prev'));
    popularNextBtn.addEventListener('click', () => navigateBooks(popularBooksContainer, 'next'));

    // Function to navigate books with pagination
    function navigateBooks(container, direction) {
        const bookCards = container.querySelectorAll('.book-card');
        const containerWidth = container.clientWidth;
        const cardWidth = bookCards.length > 0 ? bookCards[0].offsetWidth : 200;
        const cardMargin = 20; // gap between cards
        const cardFullWidth = cardWidth + cardMargin;

        // Calculate how many cards fit in the container
        const visibleCards = Math.floor(containerWidth / cardFullWidth);

        // Calculate the current scroll position in terms of cards
        const currentScrollPosition = container.scrollLeft / cardFullWidth;

        // Calculate new scroll position
        let newScrollPosition;
        if (direction === 'next') {
            newScrollPosition = Math.ceil(currentScrollPosition) + 1;
        } else {
            newScrollPosition = Math.floor(currentScrollPosition) - 1;
        }

        // Constrain to valid range
        newScrollPosition = Math.max(0, Math.min(newScrollPosition, bookCards.length - visibleCards));

        // Scroll to the new position
        container.scrollTo({
            left: newScrollPosition * cardFullWidth,
            behavior: 'smooth'
        });
    }

    // Update navigation buttons based on scroll position
    function updateNavButtons() {
        const containers = [
            { container: favoritesContainer, prevBtn: favoritesPrevBtn, nextBtn: favoritesNextBtn },
            { container: personalBooksContainer, prevBtn: personalPrevBtn, nextBtn: personalNextBtn },
            { container: popularBooksContainer, prevBtn: popularPrevBtn, nextBtn: popularNextBtn }
        ];

        containers.forEach(({ container, prevBtn, nextBtn }) => {
            const isAtStart = container.scrollLeft < 10;
            const isAtEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 10;

            prevBtn.disabled = isAtStart;
            prevBtn.style.opacity = isAtStart ? '0.5' : '1';

            nextBtn.disabled = isAtEnd;
            nextBtn.style.opacity = isAtEnd ? '0.5' : '1';
        });
    }

    // Add scroll event listeners to containers
    [favoritesContainer, personalBooksContainer, popularBooksContainer].forEach(container => {
        container.addEventListener('scroll', updateNavButtons);
    });

    // Load books from the server
    function loadBooks() {
        fetch('/api/books')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                allBooks = data.books || [];
                genres = data.genres || [];

                // Display books
                displayFavoriteBooks();
                displayPersonalRecommendations();
                displayPopularBooks();
                setupGenreTabs();
                updateNavButtons();
            })
            .catch(error => {
                console.error('Error loading books:', error);
                // Use mock data for demonstration
                useMockData();
            });
    }

    // Mock data for demonstration
    function useMockData() {
        // Sample genres
        genres = [
            { id: 'fiction', name: 'Художественная литература' },
            { id: 'nonfiction', name: 'Нон-фикшн' },
            { id: 'science', name: 'Наука' },
            { id: 'fantasy', name: 'Фэнтези' },
            { id: 'mystery', name: 'Детективы' }
        ];

        // Sample books
        allBooks = [
            {
                id: 1,
                title: 'Преступление и наказание',
                author: 'Фёдор Достоевский',
                cover: 'https://via.placeholder.com/200x300/00BCD4/FFFFFF?text=1',
                rating: 4.7,
                genre: 'fiction',
                genreName: 'Художественная литература',
                year: 1866,
                pages: 576,
                description: 'Роман повествует о нравственных и психологических терзаниях Родиона Раскольникова, бедного студента, решившегося на убийство.',
                popular: true,
                recommended: true
            },
            {
                id: 2,
                title: 'Гарри Поттер и философский камень',
                author: 'Дж. К. Роулинг',
                cover: 'https://via.placeholder.com/200x300/4CAF50/FFFFFF?text=2',
                rating: 4.9,
                genre: 'fantasy',
                genreName: 'Фэнтези',
                year: 1997,
                pages: 332,
                description: 'Первая книга из серии о Гарри Поттере. Рассказывает о начале приключений молодого волшебника.',
                popular: true,
                recommended: true
            },
            {
                id: 3,
                title: 'Сапиенс. Краткая история человечества',
                author: 'Юваль Ной Харари',
                cover: 'https://via.placeholder.com/200x300/FFC107/FFFFFF?text=3',
                rating: 4.5,
                genre: 'nonfiction',
                genreName: 'Нон-фикшн',
                year: 2011,
                pages: 464,
                description: 'Книга рассказывает о развитии человеческого общества, начиная от появления людей и заканчивая настоящим временем.',
                popular: false,
                recommended: true
            },
            {
                id: 4,
                title: 'Шерлок Холмс',
                author: 'Артур Конан Дойл',
                cover: 'https://via.placeholder.com/200x300/F44336/FFFFFF?text=4',
                rating: 4.6,
                genre: 'mystery',
                genreName: 'Детективы',
                year: 1887,
                pages: 320,
                description: 'Цикл произведений о знаменитом лондонском частном сыщике Шерлоке Холмсе.',
                popular: true,
                recommended: true
            },
            {
                id: 5,
                title: 'Краткая история времени',
                author: 'Стивен Хокинг',
                cover: 'https://via.placeholder.com/200x300/9C27B0/FFFFFF?text=5',
                rating: 4.4,
                genre: 'science',
                genreName: 'Наука',
                year: 1988,
                pages: 256,
                description: 'Книга о космологии - науке о Вселенной в целом. Стивен Хокинг пытается ответить на вопросы о том, как возникла Вселенная.',
                popular: false,
                recommended: true
            },
            {
                id: 6,
                title: 'Война и мир',
                author: 'Лев Толстой',
                cover: 'https://via.placeholder.com/200x300/3F51B5/FFFFFF?text=6',
                rating: 4.8,
                genre: 'fiction',
                genreName: 'Художественная литература',
                year: 1869,
                pages: 1225,
                description: 'Роман-эпопея, описывающий русское общество в эпоху войн против Наполеона в 1805—1812 годах.',
                popular: false,
                recommended: false
            },
            {
                id: 7,
                title: 'Властелин колец',
                author: 'Дж. Р. Р. Толкин',
                cover: 'https://via.placeholder.com/200x300/795548/FFFFFF?text=7',
                rating: 4.9,
                genre: 'fantasy',
                genreName: 'Фэнтези',
                year: 1954,
                pages: 1178,
                description: 'Эпическое повествование о Кольце Всевластия и о противостоянии добра и зла в Средиземье.',
                popular: true,
                recommended: false
            },
            {
                id: 8,
                title: 'Думай медленно... решай быстро',
                author: 'Даниэль Канеман',
                cover: 'https://via.placeholder.com/200x300/607D8B/FFFFFF?text=8',
                rating: 4.5,
                genre: 'nonfiction',
                genreName: 'Нон-фикшн',
                year: 2011,
                pages: 352,
                description: 'Книга Даниэля Канемана, лауреата Нобелевской премии по экономике, о том, как работает мышление и как возникают когнитивные искажения.',
                popular: true,
                recommended: false
            },
            {
                id: 9,
                title: '1984',
                author: 'Джордж Оруэлл',
                cover: 'https://via.placeholder.com/200x300/E91E63/FFFFFF?text=9',
                rating: 4.8,
                genre: 'fiction',
                genreName: 'Художественная литература',
                year: 1949,
                pages: 328,
                description: 'Антиутопический роман о тоталитарном обществе, где личная жизнь находится под полным контролем государства.',
                popular: true,
                recommended: true
            },
            {
                id: 10,
                title: 'Мастер и Маргарита',
                author: 'Михаил Булгаков',
                cover: 'https://via.placeholder.com/200x300/9E9E9E/FFFFFF?text=10',
                rating: 4.9,
                genre: 'fiction',
                genreName: 'Художественная литература',
                year: 1967,
                pages: 480,
                description: 'Роман о дьяволе, явившемся в Москву 1930-х годов, и о судьбе Мастера и его возлюбленной Маргариты.',
                popular: true,
                recommended: true
            },
            {
                id: 11,
                title: 'Алхимик',
                author: 'Пауло Коэльо',
                cover: 'https://via.placeholder.com/200x300/CDDC39/FFFFFF?text=11',
                rating: 4.3,
                genre: 'fiction',
                genreName: 'Художественная литература',
                year: 1988,
                pages: 208,
                description: 'Философская притча о поиске своего пути, следовании своей судьбе и поиске сокровищ.',
                popular: false,
                recommended: true
            },
            {
                id: 12,
                title: 'Великий Гэтсби',
                author: 'Ф. Скотт Фицджеральд',
                cover: 'https://via.placeholder.com/200x300/FF5722/FFFFFF?text=12',
                rating: 4.2,
                genre: 'fiction',
                genreName: 'Художественная литература',
                year: 1925,
                pages: 180,
                description: 'История американской мечты, богатства и любви, разворачивающаяся в "век джаза".',
                popular: false,
                recommended: false
            }
        ];

        // Display books
        displayFavoriteBooks();
        displayPersonalRecommendations();
        displayPopularBooks();
        setupGenreTabs();
        updateNavButtons();
    }

    // Display favorite books
    function displayFavoriteBooks() {
        favoritesContainer.innerHTML = '';

        if (favoriteBooks.length === 0) {
            // Show empty state
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-favorites';
            emptyState.innerHTML = `
                <p>У вас пока нет избранных книг</p>
                <p>Добавляйте книги, нажимая на значок ♥</p>
            `;
            favoritesContainer.appendChild(emptyState);
            return;
        }

        // Get books that are in favorites
        const favoriteBookObjects = allBooks.filter(book => favoriteBooks.includes(book.id));

        // Create book cards
        favoriteBookObjects.forEach(book => {
            favoritesContainer.appendChild(createBookCard(book));
        });
    }

    // Display personal recommendations
    function displayPersonalRecommendations() {
        personalBooksContainer.innerHTML = '';

        // Filter books that are recommended
        const recommendedBooks = allBooks.filter(book => book.recommended);

        // Create book cards
        recommendedBooks.forEach(book => {
            personalBooksContainer.appendChild(createBookCard(book));
        });

        // If no recommended books and free mode, add upgrade prompt
        if (recommendedBooks.length === 0) {
            const upgradePrompt = document.createElement('div');
            upgradePrompt.className = 'book-card upgrade-card';
            upgradePrompt.innerHTML = `
                <div class="upgrade-content">
                    <p>Перейдите на премиум, чтобы получать персональные рекомендации</p>
                    <button class="btn primary-btn">Премиум</button>
                </div>
            `;
            upgradePrompt.querySelector('button').addEventListener('click', () => {
                premiumModal.classList.add('active');
            });
            personalBooksContainer.appendChild(upgradePrompt);
        }
    }

    // Display popular books
    function displayPopularBooks() {
        popularBooksContainer.innerHTML = '';

        // Filter books that are popular
        const popularBooks = allBooks.filter(book => book.popular);

        // No limit for popular books
        popularBooks.forEach(book => {
            popularBooksContainer.appendChild(createBookCard(book));
        });
    }

    // Setup genre tabs
    function setupGenreTabs() {
        genreTabsContainer.innerHTML = '';

        // Create tabs for each genre
        genres.forEach((genre, index) => {
            const tab = document.createElement('div');
            tab.className = 'genre-tab';
            if (index === 0) tab.classList.add('active');
            tab.textContent = genre.name;
            tab.setAttribute('data-genre', genre.id);

            tab.addEventListener('click', () => {
                // Update active tab
                document.querySelectorAll('.genre-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Display books for this genre
                displayGenreBooks(genre.id);
            });

            genreTabsContainer.appendChild(tab);
        });

        // Display books for first genre by default
        if (genres.length > 0) {
            displayGenreBooks(genres[0].id);
        }
    }

    // Display books by genre
    function displayGenreBooks(genreId) {
        genreBooksContainer.innerHTML = '';
        currentGenre = genreId;

        // Filter books by genre
        const genreBooks = allBooks.filter(book => book.genre === genreId);

        // Limit to 5 books for free mode
        const booksToDisplay = isPremiumMode ? genreBooks : genreBooks.slice(0, 5);

        // Create book cards
        booksToDisplay.forEach(book => {
            genreBooksContainer.appendChild(createBookCard(book));
        });

        // If free mode and more books available, add upgrade prompt
        if (!isPremiumMode && genreBooks.length > 5) {
            const upgradePrompt = document.createElement('div');
            upgradePrompt.className = 'book-card upgrade-card';
            upgradePrompt.innerHTML = `
                <div class="upgrade-content">
                    <p>Ещё ${genreBooks.length - 5} книг доступно с Премиум</p>
                    <button class="btn primary-btn">Активировать</button>
                </div>
            `;
            upgradePrompt.querySelector('button').addEventListener('click', () => {
                premiumModal.classList.add('active');
            });
            genreBooksContainer.appendChild(upgradePrompt);
        }
    }

    // Create a book card
    function createBookCard(book) {
        const card = document.createElement('div');
        card.className = 'book-card';
        card.setAttribute('data-book-id', book.id);

        const isFavorite = favoriteBooks.includes(book.id);

        card.innerHTML = `
            <div class="book-cover">
                <img src="${book.cover}" alt="${book.title}">
                <div class="book-favorite ${isFavorite ? 'active' : ''}">
                    <svg width="18" height="18" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                </div>
            </div>
            <div class="book-info">
                <div class="book-title">${book.title}</div>
                <div class="book-author">${book.author}</div>
                <div class="book-meta">
                    <div class="book-rating">
                        <svg width="12" height="12" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                        </svg>
                        <span>${book.rating}</span>
                    </div>
                    <div class="book-genre">${book.genreName}</div>
                </div>
            </div>
        `;

        // Add event listeners
        card.addEventListener('click', (e) => {
            // Exclude clicks on the favorite button
            if (!e.target.closest('.book-favorite')) {
                showBookDetails(book);
            }
        });

        // Favorite button
        const favoriteBtn = card.querySelector('.book-favorite');
        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(book.id, favoriteBtn);
        });

        return card;
    }

    // Toggle favorite status
    function toggleFavorite(bookId, button) {
        const index = favoriteBooks.indexOf(bookId);

        // Check if we need to add or remove
        if (index === -1) {
            // Check free mode limits
            if (!isPremiumMode && favoriteBooks.length >= 5) {
                alert('В бесплатном режиме можно добавить максимум 5 книг в избранное');
                premiumModal.classList.add('active');
                return;
            }

            // Add to favorites
            favoriteBooks.push(bookId);
            button.classList.add('active');
        } else {
            // Remove from favorites
            favoriteBooks.splice(index, 1);
            button.classList.remove('active');
        }

        // Save to local storage
        localStorage.setItem('favoriteBooks', JSON.stringify(favoriteBooks));

        // Update favorite books display
        displayFavoriteBooks();

        // If on book detail page, update the button there too
        if (currentBook && currentBook.id === bookId) {
            const detailFavoriteBtn = document.querySelector('.favorite-btn');
            if (detailFavoriteBtn) {
                const isFavorite = favoriteBooks.includes(bookId);
                detailFavoriteBtn.classList.toggle('active', isFavorite);
                detailFavoriteBtn.querySelector('span').textContent = isFavorite ? 'В избранном' : 'В избранное';
            }
        }

        // Update user ratings in JSON
        updateUserRatings(bookId, isFavorite ? 1 : 0);
    }

    // Update user ratings and save to storage/server
    function updateUserRatings(bookId, rating) {
        // Update local storage
        userRatings[bookId] = rating;
        localStorage.setItem('userRatings', JSON.stringify(userRatings));

        // Send to server
        fetch('/api/update_rating', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                bookId: bookId,
                rating: rating
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Rating updated:', data);
        })
        .catch(error => {
            console.error('Error updating rating:', error);
        });
    }

    // Show book details
    function showBookDetails(book) {
        currentBook = book;

        // Check if we need to populate the book detail screen
        const isFavorite = favoriteBooks.includes(book.id);

        bookDetailContent.innerHTML = `
            <div class="book-detail-header">
                <div class="book-detail-cover">
                    <img src="${book.cover}" alt="${book.title}">
                </div>
                <div class="book-detail-info">
                    <h2 class="book-detail-title">${book.title}</h2>
                    <div class="book-detail-author">${book.author}</div>
                    
                    <div class="book-detail-meta">
                        <div class="meta-item">
                            <span class="meta-label">Рейтинг:</span>
                            <span class="meta-value">
                                <svg width="12" height="12" viewBox="0 0 24 24">
                                    <path fill="#FFC107" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                                </svg>
                                ${book.rating}
                            </span>
                        </div>
                        
                        <div class="meta-item">
                            <span class="meta-label">Жанр:</span>
                            <span class="meta-value">${book.genreName}</span>
                        </div>
                        
                        <div class="meta-item">
                            <span class="meta-label">Год:</span>
                            <span class="meta-value">${book.year}</span>
                        </div>
                        
                        <div class="meta-item">
                            <span class="meta-label">Страниц:</span>
                            <span class="meta-value">${book.pages}</span>
                        </div>
                    </div>
                    
                    <div class="book-detail-actions">
                        <div class="action-btn read-btn">
                            <svg width="16" height="16" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M21 5v14h-18v-14h18m0-2h-18c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2v-14c0-1.1-.9-2-2-2z"/>
                                <path fill="currentColor" d="M8 13.5l2.5 3 3.5-4.5 4.5 6H5z"/>
                            </svg>
                            <span>Читать</span>
                        </div>
                        
                        <div class="action-btn favorite-btn ${isFavorite ? 'active' : ''}">
                            <svg width="16" height="16" viewBox="0 0 24 24">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                            </svg>
                            <span>${isFavorite ? 'В избранном' : 'В избранное'}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="book-detail-description">
                <h3>Описание</h3>
                <p>${book.description}</p>
            </div>
        `;

        // Add event listeners
        const detailFavoriteBtn = bookDetailContent.querySelector('.favorite-btn');
        detailFavoriteBtn.addEventListener('click', () => {
            const button = document.querySelector(`.book-card[data-book-id="${book.id}"] .book-favorite`);
            toggleFavorite(book.id, button || detailFavoriteBtn);

            // Update the button state
            const isFav = favoriteBooks.includes(book.id);
            detailFavoriteBtn.classList.toggle('active', isFav);
            detailFavoriteBtn.querySelector('span').textContent = isFav ? 'В избранном' : 'В избранное';
        });

        const detailReadBtn = bookDetailContent.querySelector('.read-btn');
        detailReadBtn.addEventListener('click', () => {
            if (!isPremiumMode) {
                premiumModal.classList.add('active');
            } else {
                alert(`Открывается книга: ${book.title}`);
                // Here would be code to open the book reader
            }
        });

        // Show detail screen
        showScreen(bookDetailScreen);
    }

    // Show specific screen
    function showScreen(screen) {
        // Hide all screens
        [booksScreen, bookDetailScreen].forEach(s => {
            s.classList.remove('active');
        });

        // Show selected screen
        screen.classList.add('active');
    }

    // Initialize the app
    loadBooks();

    // Initialize container scroll listeners
    window.addEventListener('resize', updateNavButtons);
});

