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
import random

app = Flask(__name__)

# Инициализация генератора вопросов
question_generator = QuestionsGenerator()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate_questions():
    try:
        # Get data from request
        data = request.get_json()
        text_content = data.get('text', '')
        questions_num = int(data.get('questionNumber', 10))

        # Get advanced settings if provided
        settings = data.get('settings', {})

        # Используем генератор вопросов
        formatted_questions = question_generator.generate(text_content, questions_num)

        # Return the questions to the frontend
        return jsonify({
            'status': 'success',
            'questions': formatted_questions
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/export', methods=['POST'])
def export_test():
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
        import traceback
        traceback.print_exc()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

def export_json(questions, user_answers=None):
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

    # Создаем имя файла
    filename = f'ICEQ-Test_{datetime.now().strftime("%Y-%m-%d")}.json'

    # Отправляем файл пользователю без сохранения на сервере
    return send_file(
        io.BytesIO(json_bytes),
        as_attachment=True,
        download_name=filename,
        mimetype='application/json'
    )


def export_csv(questions, user_answers=None):
    output = io.StringIO()
    writer = csv.writer(output)

    if user_answers and len(user_answers) == len(questions):
        # Export with user answers
        writer.writerow(['Вопрос', 'Ваш ответ', 'Правильный ответ', 'Статус', 'Объяснение'])

        for i, q in enumerate(questions):
            correct_answer = next((a['answer'] for a in q['answers'] if a['is_correct']), '')
            user_answer = user_answers[i] if i < len(user_answers) else ''

            # Determine status
            if user_answer is None:
                status = 'Пропущен'
            elif user_answer == correct_answer:
                status = 'Верно'
            else:
                status = 'Неверно'

            writer.writerow(
                [q['question'], user_answer or 'Пропущен', correct_answer, status, q.get('explanation', '')])
    else:
        # Export without user answers
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
    output = io.StringIO()

    output.write('ICEQ - Результаты теста\n')
    output.write(f'Дата: {datetime.now().strftime("%Y-%m-%d")}\n\n')

    if user_answers and len(user_answers) == len(questions):
        # Calculate score
        correct_count = sum(1 for i, q in enumerate(questions) if
                            user_answers[i] == next((a['answer'] for a in q['answers'] if a['is_correct']), ''))

        output.write(f'Результат: {correct_count} из {len(questions)} ')
        output.write(f'({round((correct_count / len(questions)) * 100)}%)\n\n')

        # Write questions with user answers
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
        # Just write questions and answers without user responses
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
