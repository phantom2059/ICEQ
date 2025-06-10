"""
ICEQ (2025) - Система логирования статистики создания тестов
Скрытый модуль для сбора данных о генерации тестов
"""

import json
import time
from datetime import datetime
from pathlib import Path
import os

class TestStatsLogger:
    def __init__(self):
        self.stats_file = Path("data") / "test_stats.json"
        self.ensure_data_dir()
        
    def ensure_data_dir(self):
        """Создает директорию data если её нет"""
        data_dir = Path("data")
        if not data_dir.exists():
            data_dir.mkdir(exist_ok=True)
    
    def log_test_creation(self, 
                         text_chars_count: int, 
                         model_used: str, 
                         questions_generated: int,
                         generation_time: float,
                         file_size_bytes: int = 0,
                         text_type: str = "text"):
        """
        Логирует создание теста
        
        Args:
            text_chars_count: Количество символов в исходном тексте
            model_used: Используемая модель (deepseek, qwen, iceq)
            questions_generated: Количество сгенерированных вопросов
            generation_time: Время генерации в секундах
            file_size_bytes: Размер загруженного файла (если был файл)
            text_type: Тип источника (text, pdf, docx, txt)
        """
        
        try:
            # Читаем существующую статистику
            stats = self._load_existing_stats()
            
            # Создаем запись о новом тесте
            test_record = {
                "timestamp": datetime.now().isoformat(),
                "unix_timestamp": int(time.time()),
                "text_chars_count": text_chars_count,
                "model_used": model_used,
                "questions_generated": questions_generated,
                "generation_time_seconds": round(generation_time, 2),
                "file_size_bytes": file_size_bytes,
                "text_type": text_type,
                "chars_per_second": round(text_chars_count / generation_time if generation_time > 0 else 0, 2),
                "questions_per_minute": round((questions_generated / generation_time) * 60 if generation_time > 0 else 0, 2)
            }
            
            # Добавляем запись
            stats["test_records"].append(test_record)
            stats["total_tests"] += 1
            stats["last_updated"] = datetime.now().isoformat()
            
            # Обновляем статистику по моделям
            if model_used not in stats["model_stats"]:
                stats["model_stats"][model_used] = {
                    "usage_count": 0,
                    "total_chars": 0,
                    "total_questions": 0,
                    "total_time": 0,
                    "avg_time_per_char": 0,
                    "avg_questions_per_test": 0
                }
            
            model_stats = stats["model_stats"][model_used]
            model_stats["usage_count"] += 1
            model_stats["total_chars"] += text_chars_count
            model_stats["total_questions"] += questions_generated
            model_stats["total_time"] += generation_time
            model_stats["avg_time_per_char"] = round(model_stats["total_time"] / model_stats["total_chars"], 6)
            model_stats["avg_questions_per_test"] = round(model_stats["total_questions"] / model_stats["usage_count"], 2)
            
            # Сохраняем статистику
            self._save_stats(stats)
            
        except Exception as e:
            # Молча игнорируем ошибки логирования, чтобы не ломать основной функционал
            pass
    
    def get_estimated_generation_time(self, text_chars_count: int, model: str) -> int:
        """
        Возвращает оценочное время генерации в секундах
        На основе накопленной статистики
        """
        try:
            stats = self._load_existing_stats()
            
            if model in stats["model_stats"] and stats["model_stats"][model]["usage_count"] >= 3:
                # Если есть достаточно данных по модели
                avg_time_per_char = stats["model_stats"][model]["avg_time_per_char"]
                estimated_time = text_chars_count * avg_time_per_char
                
                # Добавляем небольшой буфер (20%)
                return max(int(estimated_time * 1.2), 10)
            else:
                # Используем базовые оценки
                base_estimates = {
                    "deepseek": 0.0008,  # секунд на символ
                    "qwen": 0.0006,
                    "iceq": 0.0010
                }
                
                rate = base_estimates.get(model, 0.0008)
                estimated_time = text_chars_count * rate
                return max(int(estimated_time), 10)
                
        except Exception:
            # В случае ошибки возвращаем базовую оценку
            return max(text_chars_count // 100, 10)
    
    def _load_existing_stats(self) -> dict:
        """Загружает существующую статистику или создает новую"""
        try:
            if self.stats_file.exists():
                with open(self.stats_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            else:
                return self._create_empty_stats()
        except Exception:
            return self._create_empty_stats()
    
    def _create_empty_stats(self) -> dict:
        """Создает пустую структуру статистики"""
        return {
            "version": "1.0",
            "created_at": datetime.now().isoformat(),
            "last_updated": datetime.now().isoformat(),
            "total_tests": 0,
            "test_records": [],
            "model_stats": {}
        }
    
    def _save_stats(self, stats: dict):
        """Сохраняет статистику в файл"""
        try:
            with open(self.stats_file, 'w', encoding='utf-8') as f:
                json.dump(stats, f, ensure_ascii=False, indent=2)
        except Exception:
            # Молча игнорируем ошибки сохранения
            pass

# Глобальный экземпляр логгера
stats_logger = TestStatsLogger() 