from playwright.sync_api import sync_playwright
import os
import sys

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        cwd = os.getcwd()
        file_path = f"file://{cwd}/index.html"
        print(f"Loading {file_path}")

        # Capture console errors
        page.on("console", lambda msg: print(f"Console: {msg.text}"))

        try:
            page.goto(file_path)

            # Check if ImpositionLogic is defined
            is_defined = page.evaluate("typeof ImpositionLogic !== 'undefined'")
            print(f"ImpositionLogic defined: {is_defined}")

            if not is_defined:
                print("Error: ImpositionLogic is not defined!")
                sys.exit(1)

            page.screenshot(path="verification/verification.png")

        except Exception as e:
            print(f"Error: {e}")
            sys.exit(1)

        finally:
            browser.close()

if __name__ == "__main__":
    run()
