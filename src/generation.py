import re
import os
import numpy as np
import faiss
from dotenv import load_dotenv
from openai import OpenAI
from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans
import torch
from torch.onnx.symbolic_opset11 import chunk

load_dotenv()

# Часть данных для кластеризации
DATA_PART = 0.01
# Минимальное количество кластеров
MIN_CLUSTERS_NUM = 5
# Максимальное количество кластеров
MAX_CLUSTERS_NUM = 500

QUESTIONS_NUM_PROMPT_TAG = '[QUESTIONS_NUM]'
CHUNKS_PROMPT_TAG = '[CHUNKS]'


def parse_questions(text_questions: str) -> list[dict]:
    '''
    Парсит текст с вопросами и ответами и возвращает список словарей.
    '''
    print("Начало парсинга вопросов...")
    question_header_re = re.compile(r'^\s*\d+\.\s*(.+)')
    answer_re = re.compile(r'^\s*([+-])\s*(.+)')

    questions = []
    current_question = None

    for line in text_questions.splitlines():
        line = line.strip()
        if not line:
            continue

        question_match = question_header_re.match(line)
        if question_match:
            if current_question:
                questions.append(current_question)
            current_question = {
                'question': question_match.group(1).strip(),
                'answers': []
            }
            continue

        answer_match = answer_re.match(line)
        if answer_match and current_question is not None:
            sign, answer_text = answer_match.groups()
            is_correct = (sign == '+')
            current_question['answers'].append({
                'answer': answer_text.strip(),
                'is_correct': is_correct
            })

    if current_question:
        questions.append(current_question)

    print(f"Парсинг завершен. Найдено {len(questions)} вопросов.")
    return questions


def clean_text(text: str) -> str:
    print("Очистка текста...")
    lines = text.split('\n')
    cleaned_lines = []
    paragraph = []

    for line in lines:
        stripped_line = line.strip()
        if stripped_line:
            paragraph.append(stripped_line)
        elif paragraph:
            cleaned_lines.append(' '.join(paragraph))
            paragraph = []

    if paragraph:
        cleaned_lines.append(' '.join(paragraph))

    print("Текст очищен.")
    return '\n\n'.join(cleaned_lines)


class QuestionsGenerator:
    def __init__(self):
        print("Инициализация QuestionsGenerator...")
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        print(f"Используемое устройство: {self.device}")

        api_key = os.getenv('DEEPSEEK_API_KEY')
        self.deepseek_client = OpenAI(
            api_key=api_key, base_url='https://api.deepseek.com'
        )
        print("Deepseek клиент инициализирован.")

        # Загрузка моделей с указанием устройства
        print("Загрузка моделей...")
        self.__clustering_model = SentenceTransformer(
            'intfloat/multilingual-e5-large-instruct',
            device=self.device
        )
        self.__search_model = SentenceTransformer(
            'ai-forever/FRIDA',
            device=self.device
        )
        print("Модели загружены.")

        # Загрузка промптов один раз при инициализации
        print("Загрузка промптов...")
        self.__user_prompt_template = self._load_prompt('user_prompt.txt')
        self.__system_prompt = self._load_prompt('system_prompt.txt')
        print("Промпты загружены.")
        print("Инициализация завершена.")

    def _load_prompt(self, filename: str) -> str:
        print(f"Загрузка промпта из файла: {filename}")
        with open(filename, 'r', encoding='utf8') as f:
            return f.read()

    def __filter_chunks(self, chunk: str, min_words_in_chunk: int) -> bool:
        result = chunk and len(chunk.split()) > min_words_in_chunk
        if not result:
            print(f"Чанк отфильтрован: {chunk[:50]}...")
        return result

    def __get_central_objects(
            self,
            kmeans: KMeans,
            embeddings: np.ndarray,
            objects: np.ndarray
    ) -> np.ndarray:
        print("Поиск центральных объектов для кластеров...")
        centroids = kmeans.cluster_centers_
        labels = kmeans.labels_
        distances = np.linalg.norm(embeddings - centroids[labels], axis=1)

        central_indices = [
            np.where(labels == i)[0][np.argmin(distances[labels == i])]
            for i in range(kmeans.n_clusters)
        ]
        print(f"Найдено {len(central_indices)} центральных объектов.")
        return objects[central_indices]

    def __get_questions(self, user_prompt: str) -> list[dict]:
        print("Генерация вопросов с помощью Deepseek API...")
        response = self.deepseek_client.chat.completions.create(
            model='deepseek-chat',
            messages=[
                {"role": "system", "content": self.__system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            stream=False
        )
        print("Ответ от API получен.")
        return parse_questions(response.choices[0].message.content)

    def generate(self, text: str, questions_num: int) -> list[dict]:
        print(f"\nНачало генерации {questions_num} вопросов...")
        text = clean_text(text)

        # Деление на чанки
        chunks = text.split('\n')
        # Средняя длина текста в чанках
        mean_chunk_len = np.array([len(chunk) for chunk in chunks]).mean()
        min_words_in_chunk = mean_chunk_len * 0.15

        chunks = list(filter(lambda chunk: self.__filter_chunks(chunk, min_words_in_chunk), chunks))
        chunks = np.array(chunks)
        print(f"Получено {len(chunks)} чанков после фильтрации.")

        # Используем GPU для вычисления эмбеддингов
        print("Вычисление эмбеддингов для кластеризации...")
        clustering_embeddings = self.__clustering_model.encode(
            chunks,
            convert_to_tensor=True,
            normalize_embeddings=True,
            device=self.device
        ).cpu().numpy()
        print("Эмбеддинги для кластеризации вычислены.")

        paragraph_num = len(text.split('\n'))
        clusters_num = min(
            MAX_CLUSTERS_NUM,
            max(MIN_CLUSTERS_NUM, int(paragraph_num * DATA_PART))
        )
        print(f"Количество кластеров: {clusters_num}")

        print("Запуск K-means кластеризации...")
        kmeans = KMeans(n_clusters=clusters_num, random_state=42)
        kmeans.fit(clustering_embeddings)
        print("Кластеризация завершена.")

        target_chunks = self.__get_central_objects(kmeans, clustering_embeddings, chunks)
        print("Формирование промпта...")
        prompt = self.__user_prompt_template \
            .replace(QUESTIONS_NUM_PROMPT_TAG, str(questions_num)) \
            .replace(CHUNKS_PROMPT_TAG, '\n\n'.join(target_chunks))

        questions = self.__get_questions(prompt)
        print(f"Сгенерировано {len(questions)} вопросов.")

        # Используем GPU для поисковых эмбеддингов
        print("Вычисление эмбеддингов для поиска...")
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
        print("Эмбеддинги для поиска вычислены.")

        # Используем GPU для FAISS, если доступно
        print("Настройка FAISS индекса...")
        # Создаем FAISS-индекс по косинусному расстоянию (через скалярное произведение)
        index = faiss.IndexFlatIP(doc_embeddings.shape[1])
        # Добавляем эмбеддинги в индекс
        index.add(doc_embeddings)
        print("FAISS индекс готов.")

        print("Поиск соответствий вопросов и чанков...")
        _, indices = index.search(query_embeddings, 1)

        for question, explanation in zip(questions, target_chunks[indices]):
            question['explanation'] = str(explanation[0])

        print("Генерация вопросов завершена.\n")
        return questions


if __name__ == '__main__':
    print("Запуск тестового сценария...")
    with open('test_data/markdown.md', 'r', encoding='utf8') as f:
        text = f.read()

    generator = QuestionsGenerator()
    questions = generator.generate(text, 10)

    print("Результат:")
    for i, q in enumerate(questions, 1):
        print(f"\nВопрос {i}: {q['question']}")
        print("Варианты ответов:")
        for ans in q['answers']:
            print(f"  {'[+]' if ans['is_correct'] else '[ ]'} {ans['answer']}")
        print(f"Объяснение: {q['explanation']}")
