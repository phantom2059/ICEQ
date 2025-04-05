import json
import os
import random
from datetime import datetime
from flask import render_template, request, jsonify


# Path to books data
BOOKS_DATA_FILE = os.path.join(os.path.dirname(__file__), 'static/data/books.json')
USER_RATINGS_FILE = os.path.join(os.path.dirname(__file__), 'static/data/user_ratings.json')


def load_books_data():
    """Load books data from JSON file."""
    try:
        with open(BOOKS_DATA_FILE, 'r', encoding='utf-8') as file:
            return json.load(file)
    except (FileNotFoundError, json.JSONDecodeError):
        # Return default empty structure if file doesn't exist or is invalid
        return {"books": [], "genres": []}


def load_user_ratings():
    """Load user ratings data from JSON file."""
    try:
        with open(USER_RATINGS_FILE, 'r', encoding='utf-8') as file:
            return json.load(file)
    except (FileNotFoundError, json.JSONDecodeError):
        # Return default empty structure
        return {"ratings": {}, "lastUpdated": datetime.now().isoformat()}


def save_user_ratings(ratings_data):
    """Save user ratings data to JSON file."""
    # Create directory if it doesn't exist
    os.makedirs(os.path.dirname(USER_RATINGS_FILE), exist_ok=True)

    # Update timestamp
    ratings_data["lastUpdated"] = datetime.now().isoformat()

    with open(USER_RATINGS_FILE, 'w', encoding='utf-8') as file:
        json.dump(ratings_data, file, ensure_ascii=False, indent=2)


def update_user_rating(book_id, rating):
    """Update a single user rating for a book."""
    ratings_data = load_user_ratings()
    ratings_data["ratings"][str(book_id)] = rating
    save_user_ratings(ratings_data)
    return {"success": True, "message": "Rating updated successfully"}


def refresh_recommendations(favorite_books=None, user_ratings=None):
    """
    Refresh book recommendations based on user preferences.
    This is a simple implementation that would be replaced with actual recommendation algorithm.
    """
    data = load_books_data()
    books = data["books"]

    # Reset recommendations
    for book in books:
        book["recommended"] = False

    # Simple logic - mark some books as recommended
    # In a real implementation, this would use ML/collaborative filtering
    if favorite_books and len(favorite_books) > 0:
        # Find the genres of favorite books
        favorite_genres = set()
        for book in books:
            if book["id"] in favorite_books:
                favorite_genres.add(book["genre"])

        # Mark some books in those genres as recommended
        for book in books:
            if book["genre"] in favorite_genres and book["id"] not in favorite_books:
                # 70% chance to recommend a book from favorite genre
                if random.random() < 0.7:
                    book["recommended"] = True

    # If no favorites or not enough recommendations, add some random popular books
    recommended_count = sum(1 for book in books if book["recommended"])
    if recommended_count < 5:
        # Get popular books not already recommended
        popular_books = [book for book in books if book["popular"] and not book["recommended"]
                         and book["id"] not in (favorite_books or [])]

        # Randomly select some to recommend
        random.shuffle(popular_books)
        for book in popular_books[:5 - recommended_count]:
            book["recommended"] = True

    # Save updated data
    with open(BOOKS_DATA_FILE, 'w', encoding='utf-8') as file:
        json.dump(data, file, ensure_ascii=False, indent=2)

    return {"success": True, "message": "Recommendations refreshed successfully"}


def init_books_data():
    """Initialize books data if it doesn't exist."""
    # Create data directory if it doesn't exist
    os.makedirs(os.path.dirname(BOOKS_DATA_FILE), exist_ok=True)

    # Create a sample books.json file if it doesn't exist
    if not os.path.exists(BOOKS_DATA_FILE):
        sample_data = {
            "books": [
                {
                    "id": 1,
                    "title": "Преступление и наказание",
                    "author": "Фёдор Достоевский",
                    "cover": "https://via.placeholder.com/200x300/00BCD4/FFFFFF?text=1",
                    "rating": 4.7,
                    "genre": "fiction",
                    "genreName": "Художественная литература",
                    "year": 1866,
                    "pages": 576,
                    "description": "Роман повествует о нравственных и психологических терзаниях Родиона Раскольникова, бедного студента, решившегося на убийство.",
                    "popular": True,
                    "recommended": True
                },
                {
                    "id": 2,
                    "title": "Гарри Поттер и философский камень",
                    "author": "Дж. К. Роулинг",
                    "cover": "https://via.placeholder.com/200x300/4CAF50/FFFFFF?text=2",
                    "rating": 4.9,
                    "genre": "fantasy",
                    "genreName": "Фэнтези",
                    "year": 1997,
                    "pages": 332,
                    "description": "Первая книга из серии о Гарри Поттере. Рассказывает о начале приключений молодого волшебника.",
                    "popular": True,
                    "recommended": True
                },
                {
                    "id": 3,
                    "title": "Сапиенс. Краткая история человечества",
                    "author": "Юваль Ной Харари",
                    "cover": "https://via.placeholder.com/200x300/FFC107/FFFFFF?text=3",
                    "rating": 4.5,
                    "genre": "nonfiction",
                    "genreName": "Нон-фикшн",
                    "year": 2011,
                    "pages": 464,
                    "description": "Книга рассказывает о развитии человеческого общества, начиная от появления людей и заканчивая настоящим временем.",
                    "popular": False,
                    "recommended": True
                },
                {
                    "id": 4,
                    "title": "Шерлок Холмс",
                    "author": "Артур Конан Дойл",
                    "cover": "https://via.placeholder.com/200x300/F44336/FFFFFF?text=4",
                    "rating": 4.6,
                    "genre": "mystery",
                    "genreName": "Детективы",
                    "year": 1887,
                    "pages": 320,
                    "description": "Цикл произведений о знаменитом лондонском частном сыщике Шерлоке Холмсе.",
                    "popular": True,
                    "recommended": True
                },
                {
                    "id": 5,
                    "title": "Краткая история времени",
                    "author": "Стивен Хокинг",
                    "cover": "https://via.placeholder.com/200x300/9C27B0/FFFFFF?text=5",
                    "rating": 4.4,
                    "genre": "science",
                    "genreName": "Наука",
                    "year": 1988,
                    "pages": 256,
                    "description": "Книга о космологии - науке о Вселенной в целом. Стивен Хокинг пытается ответить на вопросы о том, как возникла Вселенная.",
                    "popular": False,
                    "recommended": True
                },
                {
                    "id": 6,
                    "title": "Война и мир",
                    "author": "Лев Толстой",
                    "cover": "https://via.placeholder.com/200x300/3F51B5/FFFFFF?text=6",
                    "rating": 4.8,
                    "genre": "fiction",
                    "genreName": "Художественная литература",
                    "year": 1869,
                    "pages": 1225,
                    "description": "Роман-эпопея, описывающий русское общество в эпоху войн против Наполеона в 1805—1812 годах.",
                    "popular": False,
                    "recommended": False
                },
                {
                    "id": 7,
                    "title": "Властелин колец",
                    "author": "Дж. Р. Р. Толкин",
                    "cover": "https://via.placeholder.com/200x300/795548/FFFFFF?text=7",
                    "rating": 4.9,
                    "genre": "fantasy",
                    "genreName": "Фэнтези",
                    "year": 1954,
                    "pages": 1178,
                    "description": "Эпическое повествование о Кольце Всевластия и о противостоянии добра и зла в Средиземье.",
                    "popular": True,
                    "recommended": False
                },
                {
                    "id": 8,
                    "title": "Думай медленно... решай быстро",
                    "author": "Даниэль Канеман",
                    "cover": "https://via.placeholder.com/200x300/607D8B/FFFFFF?text=8",
                    "rating": 4.5,
                    "genre": "nonfiction",
                    "genreName": "Нон-фикшн",
                    "year": 2011,
                    "pages": 352,
                    "description": "Книга Даниэля Канемана, лауреата Нобелевской премии по экономике, о том, как работает мышление и как возникают когнитивные искажения.",
                    "popular": True,
                    "recommended": False
                },
                {
                    "id": 9,
                    "title": "1984",
                    "author": "Джордж Оруэлл",
                    "cover": "https://via.placeholder.com/200x300/E91E63/FFFFFF?text=9",
                    "rating": 4.8,
                    "genre": "fiction",
                    "genreName": "Художественная литература",
                    "year": 1949,
                    "pages": 328,
                    "description": "Антиутопический роман о тоталитарном обществе, где личная жизнь находится под полным контролем государства.",
                    "popular": True,
                    "recommended": True
                },
                {
                    "id": 10,
                    "title": "Мастер и Маргарита",
                    "author": "Михаил Булгаков",
                    "cover": "https://via.placeholder.com/200x300/9E9E9E/FFFFFF?text=10",
                    "rating": 4.9,
                    "genre": "fiction",
                    "genreName": "Художественная литература",
                    "year": 1967,
                    "pages": 480,
                    "description": "Роман о дьяволе, явившемся в Москву 1930-х годов, и о судьбе Мастера и его возлюбленной Маргариты.",
                    "popular": True,
                    "recommended": True
                }
            ],
            "genres": [
                {"id": "fiction", "name": "Художественная литература"},
                {"id": "nonfiction", "name": "Нон-фикшн"},
                {"id": "science", "name": "Наука"},
                {"id": "fantasy", "name": "Фэнтези"},
                {"id": "mystery", "name": "Детективы"}
            ]
        }

        with open(BOOKS_DATA_FILE, 'w', encoding='utf-8') as file:
            json.dump(sample_data, file, ensure_ascii=False, indent=2)


def register_book_routes(app):
    """Register book-related routes with the Flask app."""

    @app.route('/api/books')
    def get_books():
        """API endpoint to get books data."""
        return jsonify(load_books_data())

    @app.route('/api/books/<int:book_id>')
    def get_book(book_id):
        """API endpoint to get a specific book by ID."""
        data = load_books_data()
        book = next((b for b in data['books'] if b['id'] == book_id), None)

        if book:
            return jsonify({"success": True, "book": book})
        else:
            return jsonify({"success": False, "message": "Book not found"}), 404

    @app.route('/api/genres/<string:genre_id>/books')
    def get_books_by_genre(genre_id):
        """API endpoint to get books by genre."""
        data = load_books_data()
        genre_books = [b for b in data['books'] if b['genre'] == genre_id]

        return jsonify({
            "success": True,
            "genre": genre_id,
            "books": genre_books
        })

    @app.route('/api/update_rating', methods=['POST'])
    def update_rating():
        """API endpoint to update a book rating."""
        data = request.json
        book_id = data.get('bookId')
        rating = data.get('rating')

        if book_id is not None and rating is not None:
            result = update_user_rating(book_id, rating)
            return jsonify(result)
        else:
            return jsonify({"success": False, "message": "Missing bookId or rating"}), 400

    @app.route('/api/refresh_recommendations', methods=['POST'])
    def refresh():
        """API endpoint to refresh book recommendations."""
        data = request.json
        favorite_books = data.get('favoriteBooks', [])
        user_ratings = data.get('userRatings', {})

        result = refresh_recommendations(favorite_books, user_ratings)
        return jsonify(result)

    @app.route('/books')
    def books_page():
        """Render the books recommendation page."""
        return render_template('books.html')

    # Initialize books data when the module is imported
    init_books_data()
