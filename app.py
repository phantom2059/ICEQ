from flask import Flask, render_template, request, jsonify
import os
from generation import QuestionsGenerator
import time
import json

app = Flask(__name__)
generator = QuestionsGenerator()

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

        # Generate questions - now returns already formatted questions
        formatted_questions = generator.generate(text_content, questions_num)

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

if __name__ == '__main__':
    app.run(debug=True, port=8080, host='127.0.0.1')
