import os
import asyncio
from playwright.async_api import async_playwright

async def run_local_mock_test():
    print("🚀 Iniciando teste local do Playwright (Sandbox)...")
    
    # Resolvendo o caminho absoluto para o arquivo HTML mockado
    current_dir = os.path.dirname(os.path.abspath(__file__))
    html_path = os.path.join(current_dir, "mock_form.html")
    file_url = f"file:///{html_path.replace(os.sep, '/')}"
    
    screenshot_path = os.path.join(current_dir, "mock_result.png")
    
    print(f"📖 Carregando HTML de teste: {file_url}")
    
    async with async_playwright() as p:
        # Lançando headless=True, que é o padrão usado no Github Actions / Docker
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        try:
            # 1. Navegar até o arquivo local
            await page.goto(file_url, timeout=10000)
            
            # 2. Preencher inputs
            print("✏️ Preenchendo campos com dados fictícios...")
            await page.fill('input[id="full_name"]', "Fulano de Tal Beneficiario")
            await page.fill('input[id="document"]', "123.456.789-00")
            
            # 3. Clicar no botão de envio
            print("Submit...")
            await page.click('button[id="submit-btn"]')
            
            # 4. Aguardar a mensagem de sucesso aparecer
            await page.wait_for_selector('#status-message', state="visible", timeout=2000)
            
            # 5. Tirar print do resultado final
            await page.screenshot(path=screenshot_path)
            print(f"📸 Screenshot do sucesso salva em: {screenshot_path}")
            print("✅ TESTE LOCAL REALIZADO COM SUCESSO!")
            return True
            
        except Exception as e:
            print(f"❌ Falha durante a automação de teste local: {e}")
            return False
            
        finally:
            await browser.close()

if __name__ == "__main__":
    success = asyncio.run(run_local_mock_test())
    if not success:
        exit(1)
