'''
ICEQ (2025) - Модуль генерации вопросов

Основной функционал:
- Класс QuestionsGenerator для создания вопросов по тексту
- Постобработка и форматирование результатов

Пример использования:
    >>> generator = QuestionsGenerator()
    >>> questions = generator.generate(text, 10)
'''

from typing import Literal

import re
import os

import torch
import faiss
import numpy as np
from dotenv import load_dotenv
from openai import OpenAI
from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

load_dotenv()

# Часть данных для кластеризации
DATA_PART = 0.01
# Минимальное количество кластеров
MIN_CLUSTERS_NUM = 5
# Максимальное количество кластеров
MAX_CLUSTERS_NUM = 500

# Тег в тексте промпта, который нужно заменить на количество вопросов
QUESTIONS_NUM_PROMPT_TAG = '[QUESTIONS_NUM]'
# Тег в тексте промпта, который нужно заменить на извлечённые чанки
CHUNKS_PROMPT_TAG = '[CHUNKS]'

ICEQ_MODEL_NAME = 'iceq_model'


def parse_questions(text_questions: str) -> list[dict]:

    '''
    Парсит текст с вопросами и ответами и возвращает список словарей.

    Параметры:
        text_questions (str): текст, из которого надо извлечь вопросы
            Формат:
                1. Текст вопроса?
                + Правильный вариант ответа
                - Неправильный вариант ответа 1
                - Неправильный вариант ответа 2
                - Неправильный вариант ответа 3

                2. Текст следующего вопроса?
                + Правильный вариант ответа
                - Неправильный вариант ответа 1
                - Неправильный вариант ответа 2
                - Неправильный вариант ответа 3

    Возвращаемое значение:
        questions (list[dict]): вопросы в удобном JSON формате
            Пример возвращаемого значения:
                {
                'question': 'Кто является автором романа «Евгений Онегин»?',
                'answers': [
                    {
                        'answer': 'Александр Пушкин',
                        'is_correct': true
                    },
                    {
                        'answer': 'Лев Толстой',
                        'is_correct': false
                    },
                    {
                        'answer': 'Фёдор Достоевский',
                        'is_correct': false
                    },
                    {
                        'answer': 'Николай Гоголь',
                        'is_correct': false
                    }
                ],
                'explanation': 'Роман в стихах «Евгений Онегин» написан Александром Сергеевичем Пушкиным и является одним из ключевых произведений русской литературы.'
                }
    '''

    print('Начало парсинга вопросов...')
    # Шаблон для блока: от заголовка вопроса до следующего заголовка или конца текста.
    # (?ms) позволяет искать многострочно и включать символы новой строки в точку.
    question_block_pattern = re.compile(r'(?ms)^\s*(\d+)\.\s*(.+?)(?=^\s*\d+\.\s|\Z)')
    # Шаблон для вариантов ответов (строки, начинающиеся с '+' или '-').
    answer_line_pattern = re.compile(r'^\s*([+-])\s*(.+)')

    questions = []
    blocks = question_block_pattern.findall(text_questions)
    for number, block in blocks:
        lines = block.splitlines()
        if not lines:
            continue

        # Первая строка блока считается текстом вопроса
        question_text = lines[0].strip()
        answers = []
        # Остальные строки блока ищем как варианты ответа
        for line in lines[1:]:
            line = line.strip()
            if not line:
                continue
            answer_match = answer_line_pattern.match(line)
            if answer_match:
                sign, answer_text = answer_match.groups()
                answers.append({
                    'answer': answer_text.strip(),
                    'is_correct': (sign == '+')
                })
        # Добавляем вопрос, если нашлись варианты ответа
        if answers:
            questions.append({
                'question': question_text,
                'answers': answers
            })

    print(f'Парсинг завершен. Извлечено {len(questions)} вопросов.')
    return questions


class QuestionsGenerator:

    '''
    Класс для представления генератора вопросов

    Методы:
        generate(text: str, questions_num: int) -> list[dict]
            Генерирует вопросы по текста


    Примеры:
        >>> from generation import QuestionsGenerator

        >>> with open('text.txt', 'r', encoding='utf8') as f:
        >>>    text = f.read()

        >>> # Генерация 10 вопросов по тексту
        >>> generator = QuestionsGenerator()
        >>> questions = generator.generate(text, 10)
    '''

    _instance = None
    _initialized = False

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)

        return cls._instance

    def __init__(self, init_llms: list = []):
        # Обёртка Singleton Pattern
        if QuestionsGenerator._initialized:
            return None
        
        QuestionsGenerator._initialized = True

        print('Инициализация QuestionsGenerator...')
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        print(f'Используемое устройство: {self.device}')

        # Инициализация моделей
        self.deepseek_client = self.__init_deepseek() if 'deepseek' in init_llms else None
        self.iceq_model = self.__init_iceq() if 'iceq' in init_llms else None

        # Загрузка моделей с указанием устройства
        print('Загрузка моделей...')
        self.__clustering_model = SentenceTransformer(
            'intfloat/multilingual-e5-large-instruct',
            device=self.device
        )
        self.__search_model = SentenceTransformer(
            'ai-forever/FRIDA',
            device=self.device
        )
        print('Модели загружены.')

        # Загрузка промптов один раз при инициализации
        print('Загрузка промптов...')
        self.__user_prompt_template = self.__load_prompt('user_prompt.txt')
        self.__system_prompt = self.__load_prompt('system_prompt.txt')
        print('Промпты загружены.')
        print('Инициализация завершена.')

    def __init_deepseek(self) -> OpenAI:
        api_key = os.getenv('DEEPSEEK_API_KEY')
        self.deepseek_client = OpenAI(
            api_key=api_key, base_url='https://api.deepseek.com'
        )
        print('Deepseek клиент инициализирован.')

    def __init_iceq(self) -> None:
        tokenizer = AutoTokenizer.from_pretrained('t-tech/T-lite-it-1.0')
        model = AutoModelForCausalLM.from_pretrained(
            'droyti/ICEQ', 
            torch_dtype='auto',
            device_map='auto'
        )

        return {
            'tokenizer': tokenizer,
            'model': model
        }

    def __load_prompt(self, filename: str) -> str:
        
        '''
        Метод для загрузки промпта

        Параметры:
            filename (str): название файла

        Возвращаемое занчение:
            prompt (str): прочитанный промпт
        '''

        with open(filename, 'r', encoding='utf8') as f:
            return f.read()

    def __filter_chunks(self, chunk: str, min_words_in_chunk: int) -> bool:
        result = chunk and len(chunk.split()) > min_words_in_chunk
        return result

    def __get_central_objects(
            self,
            kmeans: KMeans,
            embeddings: np.ndarray,
            objects: np.ndarray
    ) -> np.ndarray:
        
        '''
        Находит самые центральные объекты в каждом кластере

        Параметры:
            kmeans (sklearn.KMeans): обученный объект типа sklearn.KMeans
            embeddings (np.ndarray): векторное представление объектов
            objects (np.ndarray): сами объекты

        Возвращаемое значение:
            central_objects: центральные объекты из objects в каждом кластере
        '''
        
        print('Поиск центральных объектов для кластеров...')
        centroids = kmeans.cluster_centers_
        labels = kmeans.labels_
        distances = np.linalg.norm(embeddings - centroids[labels], axis=1)

        central_indices = [
            np.where(labels == i)[0][np.argmin(distances[labels == i])]
            for i in range(kmeans.n_clusters)
        ]

        return objects[central_indices]

    def __get_questions(self, llm: str, user_prompt: str) -> list[dict]:

        '''
        Отправляет запрос LLM и возвращает вопросы

        Параметры:
            llm (str): LLM для генерация вопросов
            user_prompt (str): пользовательский запрос

        Возвращаемое значение (list[dict]): извлечённые вопросы
        '''

        match llm:
            case 'deepseek':
                print('Генерация вопросов с помощью Deepseek API...')
                response = self.deepseek_client.chat.completions.create(
                    model='deepseek-chat',
                    messages=[
                        {'role': 'system', 'content': self.__system_prompt},
                        {'role': 'user', 'content': user_prompt},
                    ],
                    stream=False
                )
                print('Ответ от API получен.')

                return parse_questions(response.choices[0].message.content)
            
            case 'iceq':
                print('Генерация вопросов с помощью ICEQ Model...')
                prompt = self.__system_prompt + '\n' + user_prompt
                messages = [
                    {'role': 'user', 'content': prompt}
                ]

                # Использование Chat Template
                text = self.iceq_model['tokenizer'].apply_chat_template(
                    messages,
                    tokenize=False,
                    add_generation_prompt=True
                )
                model_inputs = self.iceq_model['tokenizer']([text], return_tensors='pt').to(self.device)

                # Генерация вопросов
                generated_ids = self.iceq_model['model'].generate(
                    **model_inputs,
                    max_new_tokens=32_000
                )
                generated_ids = [
                    output_ids[len(input_ids):] for input_ids, output_ids in zip(model_inputs.input_ids, generated_ids)
                ]

                response = self.iceq_model['tokenizer'].batch_decode(generated_ids, skip_special_tokens=True)[0]
                print('Ответ от ICEQ Model получен.')

                return parse_questions(response)

    def generate(
            self, 
            text: str, 
            questions_num: int,
            llm: Literal['deepseek', 'iceq'] = 'deepseek'
    ) -> list[dict]:

        '''
        Генерирует и возвращает вопросы по тексту

        Параметры:
            text (str): текст, по которому надо задать вопросы
            questions_num (int): количество вопросов
            llm (Literal['deepseek', 'iceq']), optional:
                языковая модель, используемая для генерации вопросов
                    - deepseek: использование DeepSeek API
                    - iceq: использование локальной предобученной модели

        Возвращаемое значение:
            questions (list[dict]): список вопросов
        '''

        if llm == 'deepseek' and self.deepseek_client is None:
            self.deepseek_client = self.__init_deepseek()
        
        if llm == 'iceq' and self.iceq_model is None:
            self.iceq_model = self.__init_iceq()

        print(f'Начало генерации {questions_num} вопросов...')

        # Деление на чанки
        chunks = text.split('\n')
        # Средняя длина текста в чанках
        mean_chunk_len = np.array([len(chunk) for chunk in chunks]).mean()
        min_words_in_chunk = mean_chunk_len * 0.15

        chunks = list(filter(lambda chunk: self.__filter_chunks(chunk, min_words_in_chunk), chunks))
        chunks = np.array(chunks)
        print(f'Получено {len(chunks)} чанков после фильтрации.')

        # Вычисление эмбеддингов
        print('Вычисление эмбеддингов для кластеризации...')
        clustering_embeddings = self.__clustering_model.encode(
            chunks,
            convert_to_tensor=True,
            normalize_embeddings=True,
            device=self.device
        ).cpu().numpy()
        print('Эмбеддинги для кластеризации вычислены.')

        paragraph_num = len(text.split('\n'))
        clusters_num = min(
            MAX_CLUSTERS_NUM,
            max(MIN_CLUSTERS_NUM, int(paragraph_num * DATA_PART))
        )
        print(f'Количество кластеров: {clusters_num}')

        print('Запуск K-means кластеризации...')
        kmeans = KMeans(n_clusters=clusters_num, random_state=42)
        kmeans.fit(clustering_embeddings)
        print('Кластеризация завершена.')

        target_chunks = self.__get_central_objects(kmeans, clustering_embeddings, chunks)
        print('Формирование промпта...')
        prompt = self.__user_prompt_template \
            .replace(QUESTIONS_NUM_PROMPT_TAG, str(questions_num)) \
            .replace(CHUNKS_PROMPT_TAG, '\n\n'.join(target_chunks))

        questions = self.__get_questions(llm, prompt)
        print(f'Сгенерировано {len(questions)} вопросов.')

        # Поиск эмбеддингов
        print('Вычисление эмбеддингов для поиска...')
        doc_embeddings = self.__search_model.encode(
            target_chunks,
            prompt_name='search_document',
            device=self.device
        )
        query_embeddings = self.__search_model.encode(
            [q['question'] for q in questions],
            prompt_name='search_query',
            device=self.device
        )
        print('Эмбеддинги для поиска вычислены.')

        print('Настройка FAISS индекса...')
        # Создаем FAISS-индекс по косинусному расстоянию (через скалярное произведение)
        index = faiss.IndexFlatIP(doc_embeddings.shape[1])
        # Добавляем эмбеддинги в индекс
        index.add(doc_embeddings)
        print('FAISS индекс готов.')

        print('Поиск соответствий вопросов и чанков...')
        _, indices = index.search(query_embeddings, 1)

        for question, explanation in zip(questions, target_chunks[indices]):
            question['explanation'] = str(explanation[0])

        print('Генерация вопросов завершена.\n')
        return questions


if __name__ == '__main__':
    print('Запуск тестового сценария...')
    with open('test_data/markdown.md', 'r', encoding='utf8') as f:
        text = f.read()

    generator = QuestionsGenerator()
    questions = generator.generate(text, 10)

    print('Результат:')
    for i, q in enumerate(questions, 1):
        print(f'\nВопрос {i}: {q['question']}')
        print('Варианты ответов:')
        for ans in q['answers']:
            print(f'  {'[+]' if ans['is_correct'] else '[ ]'} {ans['answer']}')
        print(f'Объяснение: {q['explanation']}')
