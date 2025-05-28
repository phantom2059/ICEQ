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
        
        print('Загрузка модели с ЖЁСТКИМ квантованием...')
        # Максимально агрессивное квантование для скорости
        quantization_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_use_double_quant=True,
            bnb_4bit_quant_type="nf4",
            llm_int8_enable_fp32_cpu_offload=True
        )
        
        self.model = AutoModelForCausalLM.from_pretrained(
            'droyti/ICEQ',
            quantization_config=quantization_config,
            device_map='auto',
            torch_dtype=torch.float16,
            low_cpu_mem_usage=True,
            max_memory={0: "6GiB", "cpu": "8GiB"}  # Ограничиваем память
        )
        
        print('Модель загружена с квантованием')

    def generate(self, text: str, num_questions: int) -> List[Dict]:
        print(f'Генерация {num_questions} вопросов...')
        start_time = time.time()
        
        # Улучшенный промпт для реальных вопросов
        prompt = f"""По тексту создай {num_questions} вопроса с ответами:

{text}

Пример:
1. Какая температура Солнца?
+ 5500 градусов
- 4000 градусов  
- 6000 градусов
- 7000 градусов

Твои вопросы:"""

        print("Начинаю генерацию...")
        
        # Токенизация
        inputs = self.tokenizer(prompt, return_tensors="pt", max_length=256, truncation=True)
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        
        # Быстрая генерация
        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=300,  # Увеличиваем для полных ответов
                do_sample=False,
                num_beams=1,
                pad_token_id=self.tokenizer.eos_token_id,
                use_cache=True
            )
        
        # Декодирование
        response = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        generated_text = response[len(prompt):].strip()
        
        print(f"Сгенерированный текст: {generated_text}")
        
        # Парсинг
        questions = self._simple_parse(generated_text)
        
        generation_time = time.time() - start_time
        print(f'Генерация завершена за {generation_time:.1f} секунд')
        print(f'Найдено вопросов: {len(questions)}')
        
        return questions

    def _simple_parse(self, text: str) -> List[Dict]:
        questions = []
        lines = text.split('\n')
        current_question = None
        current_answers = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Вопрос
            if line and line[0].isdigit() and '. ' in line:
                if current_question and current_answers:
                    questions.append({
                        'question': current_question,
                        'answers': current_answers
                    })
                
                current_question = line.split('. ', 1)[1] if '. ' in line else line
                current_answers = []
            
            # Ответ
            elif line.startswith(('+', '-')):
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
                'answers': current_answers
            })
            
        return questions

if __name__ == "__main__":
    generator = SimpleQuestionsGenerator()
    text = "Солнце - это звезда в центре Солнечной системы. Оно является источником света и тепла для Земли. Температура поверхности Солнца составляет около 5500 градусов Цельсия."
    questions = generator.generate(text, 2)
    
    for i, q in enumerate(questions, 1):
        print(f"\nВопрос {i}: {q['question']}")
        for j, answer in enumerate(q['answers'], 1):
            mark = "✓" if answer['is_correct'] else "✗"
            print(f"  {j}. {answer['answer']} {mark}") 