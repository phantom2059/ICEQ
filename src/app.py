'''
ICEQ (2025) - Веб-интерфейс приложения

Основной функционал:
- Flask-приложение для взаимодействия с пользователем
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

from generation import QuestionsGenerator

# Отключаем автоматическую загрузку .env Flask-ом, чтобы избежать проблем с кодировкой
os.environ.setdefault('FLASK_SKIP_DOTENV', '1')

app = Flask(__name__)

# Инициализация генератора вопросов (поддержка DeepSeek и Qwen API)
question_generator = QuestionsGenerator(init_llms=['deepseek'])

@app.route('/')
def index():
    """
    Главная страница приложения
    
    Returns:
        str: HTML-страница с интерфейсом приложения
    """
    return render_template('index.html')

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
        model = data.get('model', 'deepseek')  # По умолчанию используем deepseek

        # Используем генератор вопросов
        formatted_questions = question_generator.generate(text_content, questions_num, llm=model)

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
                status = 'Верно'
            else:
                status = 'Неверно'

            writer.writerow(
                [q['question'], user_answer or 'Пропущен', correct_answer, status, q.get('explanation', '')])
    else:
        # Экспорт без ответов пользователя
        writer.writerow(['Вопрос', 'Правильный ответ', 'Варианты ответов', 'Объяснение'])
        for q in questions:
            correct_answer = next((a['answer'] for a in q['answers'] if a['is_correct']), '')
            all_answers = '; '.join([a['answer'] for a in q['answers']])
            writer.writerow([q['question'], correct_answer, all_answers, q.get('explanation', '')])

    output.seek(0)

    filename = f'ICEQ-Test_{datetime.now().strftime("%Y-%m-%d")}.csv'
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8')),
        as_attachment=True,
        download_name=filename,
        mimetype='text/csv'
    )


def export_txt(questions, user_answers=None):
    """
    Экспорт теста в текстовом формате
    
    Args:
        questions (list): список вопросов теста
        user_answers (list, optional): ответы пользователя
    
    Returns:
        Response: текстовый файл для скачивания
    """
    output = io.StringIO()

    output.write('ICEQ - Результаты теста\n')
    output.write(f'Дата: {datetime.now().strftime("%Y-%m-%d")}\n\n')

    if user_answers and len(user_answers) == len(questions):
        # Рассчитываем результат теста
        correct_count = sum(1 for i, q in enumerate(questions) if
                            user_answers[i] == next((a['answer'] for a in q['answers'] if a['is_correct']), ''))

        output.write(f'Результат: {correct_count} из {len(questions)} ')
        output.write(f'({round((correct_count / len(questions)) * 100)}%)\n\n')

        # Записываем вопросы с ответами пользователя
        for i, question in enumerate(questions):
            output.write(f'Вопрос {i + 1}: {question["question"]}\n')

            user_answer = user_answers[i] if i < len(user_answers) else None
            correct_answer = next((a['answer'] for a in question['answers'] if a['is_correct']), '')

            if user_answer is None:
                output.write('Ваш ответ: ПРОПУЩЕН\n')
                status = 'Пропущен'
            else:
                output.write(f'Ваш ответ: {user_answer}\n')
                status = 'Верно' if user_answer == correct_answer else 'Неверно'

            output.write(f'Правильный ответ: {correct_answer}\n')
            output.write(f'Статус: {status}\n')

            if question.get('explanation'):
                output.write(f'Объяснение: {question["explanation"]}\n')

            output.write('\n')
    else:
        # Экспорт только вопросов без ответов пользователя
        for i, question in enumerate(questions):
            output.write(f'Вопрос {i + 1}: {question["question"]}\n')

            for j, answer in enumerate(question['answers']):
                if answer.get('is_correct'):
                    output.write(f'✓ {answer["answer"]}\n')
                else:
                    output.write(f'- {answer["answer"]}\n')

            if question.get('explanation'):
                output.write(f'\nОбъяснение: {question["explanation"]}\n')

            output.write('\n')

    output.seek(0)

    filename = f'ICEQ-Test_{datetime.now().strftime("%Y-%m-%d")}.txt'
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8')),
        as_attachment=True,
        download_name=filename,
        mimetype='text/plain'
    )


if __name__ == '__main__':
    app.run(debug=True, port=8080, host='127.0.0.1')
