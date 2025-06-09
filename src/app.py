'''
ICEQ (2025) - Веб-интерфейс приложения

Основной функционал:
- Flask-приложение для взаимодействия с пользователем
- Многостраничная структура
- Визуализация процесса генерации вопросов
- Отображение результатов в удобном формате

Запуск:
    >>> python app.py
'''

import os
import json
import csv
import io
from datetime import datetime

from flask import Flask, render_template, request, jsonify, send_file

try:
    from generation import QuestionsGenerator
except ImportError:
    # Если запускаем из директории src
    import sys
    import os
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    from generation import QuestionsGenerator

# Отключаем автоматическую загрузку .env Flask-ом, чтобы избежать проблем с кодировкой
os.environ.setdefault('FLASK_SKIP_DOTENV', '1')

app = Flask(__name__)

# Инициализация генератора вопросов (поддержка DeepSeek и Qwen API)
question_generator = QuestionsGenerator(init_llms=['deepseek'])

# Статус премиум режима
premium_active = False
premium_features = {
    'max_questions': 100,  # обычные пользователи - до 10
    'max_file_size': 50 * 1024 * 1024,  # 50 МБ для премиум, 50 КБ для обычных
    'daily_tests_limit': 50,  # 50 тестов в день для премиум, 5 для обычных
    'models': ['deepseek', 'qwen', 'iceq'],  # обычные - только deepseek
    'export_formats': ['json', 'csv', 'txt', 'docx', 'pdf'],  # обычные - только json, txt
    'priority_processing': True,  # приоритетная обработка
    'advanced_analytics': True,  # расширенная аналитика
    'custom_prompts': True,  # пользовательские промпты
    'api_access': True  # доступ к API
}

@app.route('/')
def index():
    """
    Главная страница приложения
    
    Returns:
        str: HTML-страница с главным меню
    """
    return render_template('pages/home.html')

@app.route('/create')
def create_test():
    """
    Страница создания теста
    
    Returns:
        str: HTML-страница создания теста
    """
    return render_template('pages/create.html')

@app.route('/take')
def take_test():
    """
    Страница прохождения теста
    
    Returns:
        str: HTML-страница прохождения теста
    """
    return render_template('pages/take.html')

@app.route('/preview')
def preview_test():
    """
    Страница предпросмотра созданного теста
    
    Returns:
        str: HTML-страница предпросмотра теста
    """
    return render_template('pages/preview.html')

@app.route('/premium/toggle', methods=['POST'])
def toggle_premium():
    """
    Переключение премиум режима
    
    Returns:
        JSON: новый статус премиум режима
    """
    global premium_active
    premium_active = not premium_active
    
    return jsonify({
        'status': 'success',
        'premium_active': premium_active,
        'message': 'Премиум режим включен!' if premium_active else 'Премиум режим отключен!'
    })

@app.route('/premium/status', methods=['GET'])
def premium_status():
    """
    Получение статуса премиум режима
    
    Returns:
        JSON: статус и доступные функции
    """
    return jsonify({
        'premium_active': premium_active,
        'features': premium_features if premium_active else {
            'max_questions': 10,
            'max_file_size': 50 * 1024,  # 50 КБ
            'daily_tests_limit': 5,  # 5 тестов в день для бесплатных
            'models': ['deepseek'],
            'export_formats': ['txt'],
            'priority_processing': False,
            'advanced_analytics': False,
            'custom_prompts': False,
            'api_access': False
        }
    })

@app.route('/estimate-time', methods=['POST'])
def estimate_time():
    """
    Оценка времени генерации вопросов
    
    Принимает POST запрос с JSON содержащим:
        - text: текст для анализа
        - questionNumber: количество вопросов
    
    Returns:
        JSON: статус и оценка времени генерации
    """
    try:
        # Get data from request
        data = request.get_json()
        text_content = data.get('text', '')
        questions_num = int(data.get('questionNumber', 10))
        
        # Получаем оценку времени
        time_estimate = question_generator.estimate_generation_time(text_content, questions_num, 'iceq')
        
        return jsonify({
            'status': 'success',
            'estimate': time_estimate
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/generate', methods=['POST'])
def generate_questions():
    """
    Генерация вопросов по тексту
    
    Принимает POST запрос с JSON содержащим:
        - text: текст для генерации вопросов
        - questionNumber: количество вопросов
        - model: модель для генерации ('deepseek', 'qwen', 'iceq')
    
    Returns:
        JSON: статус и сгенерированные вопросы
    """
    try:
        # Получаем данные из запроса
        data = request.get_json()
        text_content = data.get('text', '')
        questions_num = int(data.get('questionNumber', 10))
        model = data.get('model', 'deepseek')

        # Проверяем ограничения
        max_questions = premium_features['max_questions'] if premium_active else 10
        available_models = premium_features['models'] if premium_active else ['deepseek']
        
        if questions_num > max_questions:
            return jsonify({
                'status': 'error',
                'message': f'Максимум {max_questions} вопросов. Включите Премиум для большего количества!'
            }), 400
            
        if model not in available_models:
            return jsonify({
                'status': 'error',
                'message': f'Модель {model} доступна только в Премиум режиме!'
            }), 400

        # Используем генератор вопросов
        formatted_questions = question_generator.generate(text_content, questions_num, llm=model)

        # КРИТИЧЕСКАЯ ОТЛАДКА: проверяем что получили от генератора
        print(f"🔍 === ОТЛАДКА В APP.PY ===")
        print(f"📊 Получено от генератора: {type(formatted_questions)}")
        print(f"📊 Количество вопросов: {len(formatted_questions) if formatted_questions else 0}")
        if formatted_questions:
            print(f"🔍 Первый вопрос: {formatted_questions[0]}")
        else:
            print("❌ КРИТИЧНО: Генератор вернул пустой список!")
        print("=== КОНЕЦ ОТЛАДКИ В APP.PY ===")

        # Возвращаем результат на фронтенд
        return jsonify({
            'status': 'success',
            'questions': formatted_questions
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/export', methods=['POST'])
def export_test():
    """
    Экспорт теста в различных форматах
    
    Принимает JSON с параметрами:
        - format: формат экспорта ('json', 'csv', 'txt')
        - questions: список вопросов
        - userAnswers: ответы пользователя (опционально)
    
    Returns:
        file: файл с тестом в выбранном формате
    """
    try:
        data = request.json
        export_format = data.get('format', 'json')
        questions = data.get('questions', [])
        user_answers = data.get('userAnswers', [])

        if export_format == 'json':
            return export_json(questions, user_answers)
        elif export_format == 'csv':
            return export_csv(questions, user_answers)
        elif export_format == 'txt':
            return export_txt(questions, user_answers)
        else:
            return jsonify({'status': 'error', 'message': 'Неподдерживаемый формат'}), 400
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/test/submit', methods=['POST'])
def submit_test():
    """
    Обработка отправки теста
    
    Принимает JSON с параметрами:
        - questions: список вопросов
        - answers: список ответов пользователя
    
    Returns:
        JSON: результаты теста
    """
    try:
        data = request.get_json()
        questions = data.get('questions', [])
        user_answers = data.get('answers', [])
        
        if not questions or not user_answers:
            return jsonify({
                'status': 'error',
                'message': 'Не предоставлены вопросы или ответы'
            }), 400
            
        # Подсчет результатов
        total_questions = len(questions)
        correct_answers = 0
        results = []
        
        for i, (question, answer) in enumerate(zip(questions, user_answers)):
            correct = next((a['answer'] for a in question['answers'] if a['is_correct']), None)
            is_correct = answer == correct
            
            if is_correct:
                correct_answers += 1
                
            results.append({
                'question_index': i,
                'is_correct': is_correct,
                'user_answer': answer,
                'correct_answer': correct,
                'explanation': question.get('explanation', '')
            })
        
        # Формируем ответ
        return jsonify({
            'status': 'success',
            'total_questions': total_questions,
            'correct_answers': correct_answers,
            'score_percentage': round((correct_answers / total_questions) * 100, 1),
            'results': results
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/test/save', methods=['POST'])
def save_test():
    """
    Сохранение теста для последующего использования
    
    Принимает JSON с параметрами:
        - title: название теста
        - questions: список вопросов
        - settings: настройки теста
    
    Returns:
        JSON: идентификатор сохраненного теста
    """
    try:
        data = request.get_json()
        title = data.get('title', 'Новый тест')
        questions = data.get('questions', [])
        settings = data.get('settings', {})
        
        if not questions:
            return jsonify({
                'status': 'error',
                'message': 'Не предоставлены вопросы для сохранения'
            }), 400
            
        # Генерируем уникальный идентификатор теста
        test_id = datetime.now().strftime('%Y%m%d%H%M%S')
        
        # Сохраняем тест (в реальном приложении здесь была бы работа с БД)
        test_data = {
            'id': test_id,
            'title': title,
            'questions': questions,
            'settings': settings,
            'created_at': datetime.now().isoformat()
        }
        
        return jsonify({
            'status': 'success',
            'test_id': test_id,
            'message': 'Тест успешно сохранен'
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/test/<test_id>', methods=['GET'])
def get_test(test_id):
    """
    Получение сохраненного теста по идентификатору
    
    Args:
        test_id (str): идентификатор теста
    
    Returns:
        JSON: данные теста
    """
    try:
        # В реальном приложении здесь была бы работа с БД
        # Сейчас возвращаем заглушку
        return jsonify({
            'status': 'error',
            'message': 'Тест не найден'
        }), 404
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

def export_json(questions, user_answers=None):
    """
    Экспорт теста в формате JSON
    
    Args:
        questions (list): список вопросов теста
        user_answers (list, optional): ответы пользователя
    
    Returns:
        Response: файл JSON для скачивания
    """
    test_data = {
        'title': 'ICEQ Тест',
        'dateCreated': datetime.now().isoformat(),
        'questions': questions
    }

    if user_answers:
        test_data['userAnswers'] = user_answers

    json_data = json.dumps(test_data, ensure_ascii=False, indent=2)

    # Создаем байтовый объект из строки JSON
    json_bytes = json_data.encode('utf-8')

    # Создаем имя файла с текущей датой
    filename = f'ICEQ-Test_{datetime.now().strftime("%Y-%m-%d")}.json'

    # Отправляем файл пользователю без сохранения на сервере
    return send_file(
        io.BytesIO(json_bytes),
        as_attachment=True,
        download_name=filename,
        mimetype='application/json'
    )


def export_csv(questions, user_answers=None):
    """
    Экспорт теста в формате CSV
    
    Args:
        questions (list): список вопросов теста
        user_answers (list, optional): ответы пользователя
    
    Returns:
        Response: файл CSV для скачивания
    """
    output = io.StringIO()
    writer = csv.writer(output)

    if user_answers and len(user_answers) == len(questions):
        # Экспорт с ответами пользователя
        writer.writerow(['Вопрос', 'Ваш ответ', 'Правильный ответ', 'Статус', 'Объяснение'])

        for i, q in enumerate(questions):
            correct_answer = next((a['answer'] for a in q['answers'] if a['is_correct']), '')
            user_answer = user_answers[i] if i < len(user_answers) else ''

            # Определяем статус ответа
            if user_answer is None:
                status = 'Пропущен'
            elif user_answer == correct_answer:
                status = 'Правильно'
            else:
                status = 'Неправильно'

            writer.writerow([
                q['question'],
                user_answer or 'Не отвечен',
                correct_answer,
                status,
                q.get('explanation', '')
            ])
    else:
        # Экспорт только вопросов
        writer.writerow(['Вопрос', 'Вариант 1', 'Вариант 2', 'Вариант 3', 'Вариант 4', 'Правильный ответ', 'Объяснение'])

        for q in questions:
            answers = q.get('answers', [])
            correct_answer = next((a['answer'] for a in answers if a['is_correct']), '')

            row = [q['question']]
            for i in range(4):
                if i < len(answers):
                    row.append(answers[i]['answer'])
                else:
                    row.append('')

            row.extend([correct_answer, q.get('explanation', '')])
            writer.writerow(row)

    csv_content = output.getvalue()
    output.close()

    # Создаем имя файла с текущей датой
    filename = f'ICEQ-Test_{datetime.now().strftime("%Y-%m-%d")}.csv'

    # Отправляем файл пользователю без сохранения на сервере
    return send_file(
        io.BytesIO(csv_content.encode('utf-8-sig')),  # BOM для корректного отображения в Excel
        as_attachment=True,
        download_name=filename,
        mimetype='text/csv'
    )


def export_txt(questions, user_answers=None):
    """
    Экспорт теста в текстовый формат
    
    Args:
        questions (list): список вопросов теста
        user_answers (list, optional): ответы пользователя
    
    Returns:
        Response: файл TXT для скачивания
    """
    content = f"ICEQ Тест - {datetime.now().strftime('%d.%m.%Y')}\n"
    content += "=" * 50 + "\n\n"

    for i, q in enumerate(questions, 1):
        content += f"Вопрос {i}: {q['question']}\n"

        # Добавляем варианты ответов
        for j, answer in enumerate(q.get('answers', []), 1):
            marker = "✓" if answer['is_correct'] else " "
            content += f"  {j}) [{marker}] {answer['answer']}\n"

        # Добавляем ответ пользователя, если есть
        if user_answers and i-1 < len(user_answers):
            user_answer = user_answers[i-1]
            content += f"\nВаш ответ: {user_answer or 'Не отвечен'}\n"

        # Добавляем объяснение
        if q.get('explanation'):
            content += f"\nОбъяснение: {q['explanation']}\n"

        content += "\n" + "-" * 40 + "\n\n"

    # Создаем имя файла с текущей датой
    filename = f'ICEQ-Test_{datetime.now().strftime("%Y-%m-%d")}.txt'

    # Отправляем файл пользователю без сохранения на сервере
    return send_file(
        io.BytesIO(content.encode('utf-8')),
        as_attachment=True,
        download_name=filename,
        mimetype='text/plain'
    )


if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=8080)
