from transformers import AutoTokenizer, AutoModelForCausalLM
import os
from huggingface_hub import snapshot_download
import torch

def download_iceq_model():
    print("=== Скачивание модели ICEQ ===")
    
    # Проверяем, есть ли модель в кэше
    cache_dir = os.path.expanduser("~/.cache/huggingface/hub")
    print(f"Кэш HuggingFace: {cache_dir}")
    
    try:
        print("\n1. Скачивание токенизатора...")
        tokenizer = AutoTokenizer.from_pretrained('t-tech/T-lite-it-1.0')
        print("✅ Токенизатор скачан")
        
        print("\n2. Скачивание модели ICEQ...")
        print("⚠️  Это может занять много времени (модель ~7GB)")
        print("Прогресс скачивания:")
        
        # Скачиваем модель с прогрессом
        model_path = snapshot_download(
            repo_id="droyti/ICEQ",
            cache_dir=cache_dir,
            resume_download=True
        )
        
        print(f"✅ Модель скачана в: {model_path}")
        
        print("\n3. Проверка загрузки модели...")
        # Пробуем загрузить только метаданные (без весов)
        model = AutoModelForCausalLM.from_pretrained(
            'droyti/ICEQ',
            torch_dtype=torch.float32,
            device_map='cpu',
            low_cpu_mem_usage=True
        )
        
        print("✅ Модель успешно загружена!")
        print(f"Размер модели: {sum(p.numel() for p in model.parameters())/1e6:.1f}M параметров")
        
        # Освобождаем память
        del model
        torch.cuda.empty_cache() if torch.cuda.is_available() else None
        
        print("\n✅ Скачивание завершено успешно!")
        
    except Exception as e:
        print(f"\n❌ Ошибка при скачивании: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    download_iceq_model() 