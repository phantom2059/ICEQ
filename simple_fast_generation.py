import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
import time
from typing import List, Dict

class SimpleQuestionsGenerator:
    def __init__(self):
        print('Инициализация SimpleQuestionsGenerator...')
        
        if not torch.cuda.is_available():
            raise RuntimeError('CUDA недоступна!')
        
        self.device = 'cuda'
        torch.cuda.empty_cache()
        
        print('Загрузка токенизатора...')
        self.tokenizer = AutoTokenizer.from_pretrained('t-tech/T-lite-it-1.0')
        
        print('Загрузка модели с 8-битным квантованием...')
        # 8-битное квантование вместо 4-битного
        quantization_config = BitsAndBytesConfig(
            load_in_8bit=True,
            llm_int8_enable_fp32_cpu_offload=True
        )
        
        self.model = AutoModelForCausalLM.from_pretrained(
            'droyti/ICEQ',
            quantization_config=quantization_config,
            device_map='auto',
            torch_dtype=torch.float16,
            low_cpu_mem_usage=True,
            max_memory={0: "14GiB", "cpu": "16GiB"}  # Увеличиваем доступную память
        )
        
        print('Модель загружена с 8-битным квантованием')

    def generate(self, text: str, num_questions: int) -> List[Dict]:
        print(f'Генерация {num_questions} вопросов...')
        start_time = time.time()
        
        # Усложненный промпт для более детальных вопросов
        prompt = f"""По тексту создай {num_questions} сложных вопроса с 4 вариантами ответов. 
Каждый вопрос должен быть разного типа: на понимание фактов, на анализ причинно-следственных связей, 
и на применение знаний. К каждому вопросу добавь краткое объяснение правильного ответа.

Текст:
{text}

Формат:
1. [Вопрос]
+ [Правильный ответ]
- [Неправильный ответ 1]  
- [Неправильный ответ 2]
- [Неправильный ответ 3]
Объяснение: [Краткое объяснение, почему данный ответ правильный]

Твои вопросы:"""

        print("Начинаю генерацию с усложненным промптом...")
        
        # Токенизация
        inputs = self.tokenizer(prompt, return_tensors="pt", max_length=512, truncation=True)
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        
        # Улучшенные параметры генерации
        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=800,  # Увеличиваем для более подробных ответов
                do_sample=True,      # Включаем семплирование для более разнообразных ответов
                temperature=0.7,     # Умеренная температура
                top_p=0.9,           # Высокий top_p для большего разнообразия
                top_k=50,            # Умеренный top_k
                num_beams=2,         # Небольшое количество лучей для улучшения качества
                pad_token_id=self.tokenizer.eos_token_id,
                use_cache=True
            )
        
        # Декодирование
        response = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        generated_text = response[len(prompt):].strip()
        
        print(f"Сгенерированный текст: {generated_text}")
        
        # Парсинг с учетом объяснений
        questions = self._parse_with_explanations(generated_text)
        
        generation_time = time.time() - start_time
        print(f'Генерация завершена за {generation_time:.1f} секунд')
        print(f'Найдено вопросов: {len(questions)}')
        
        return questions

    def _parse_with_explanations(self, text: str) -> List[Dict]:
        questions = []
        lines = text.split('\n')
        current_question = None
        current_answers = []
        current_explanation = None
        explanation_mode = False
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Вопрос
            if line and line[0].isdigit() and '. ' in line:
                # Сохраняем предыдущий вопрос
                if current_question and current_answers:
                    questions.append({
                        'question': current_question,
                        'answers': current_answers,
                        'explanation': current_explanation
                    })
                
                current_question = line.split('. ', 1)[1] if '. ' in line else line
                current_answers = []
                current_explanation = None
                explanation_mode = False
            
            # Объяснение
            elif line.lower().startswith('объяснение:'):
                explanation_mode = True
                current_explanation = line.split(':', 1)[1].strip() if ':' in line else line
            elif explanation_mode:
                if current_explanation:
                    current_explanation += ' ' + line
                else:
                    current_explanation = line
            
            # Ответ
            elif line.startswith(('+', '-')):
                explanation_mode = False
                is_correct = line.startswith('+')
                answer_text = line[1:].strip()
                current_answers.append({
                    'answer': answer_text,
                    'is_correct': is_correct
                })
        
        # Последний вопрос
        if current_question and current_answers:
            questions.append({
                'question': current_question,
                'answers': current_answers,
                'explanation': current_explanation
            })
            
        return questions

if __name__ == "__main__":
    generator = SimpleQuestionsGenerator()
    text = """Солнце - это звезда в центре Солнечной системы. Оно является источником света и тепла для Земли. 
Температура поверхности Солнца составляет около 5500 градусов Цельсия. Солнце состоит преимущественно из 
водорода (около 73% массы) и гелия (около 25%). Остальные элементы, включая кислород, углерод, неон и железо, 
составляют менее 2%. В ядре Солнца происходят термоядерные реакции, при которых водород превращается в гелий, 
выделяя огромное количество энергии. Солнце существует уже около 4,6 миллиарда лет и будет продолжать светить 
еще примерно 5 миллиардов лет, прежде чем превратится в красный гигант."""
    questions = generator.generate(text, 3)
    
    for i, q in enumerate(questions, 1):
        print(f"\nВопрос {i}: {q['question']}")
        for j, answer in enumerate(q['answers'], 1):
            mark = "✓" if answer['is_correct'] else "✗"
            print(f"  {j}. {answer['answer']} {mark}")
        if q.get('explanation'):
            print(f"  Объяснение: {q['explanation']}") 