from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load the local HTML file
        page.goto("file:///app/index.html")

        # Wait for the checkbox to be visible
        checkbox = page.locator("#create-2up")
        checkbox.wait_for(state="visible")

        # Check if it is checked
        is_checked = checkbox.is_checked()
        print(f"Checkbox checked: {is_checked}")

        if not is_checked:
            print("Error: Checkbox should be checked by default")

        # Take a screenshot of the controls area
        page.screenshot(path="verification/verification.png")

        browser.close()

if __name__ == "__main__":
    run()
