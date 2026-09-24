"""Browser interaction and responsive-render checks. Requires Python Playwright + Chromium."""
import json
from pathlib import Path
import sys
import tempfile

from playwright.sync_api import sync_playwright

url = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:59437/"
output = Path(tempfile.mkdtemp(prefix="mantiq-qpe-ui-"))
errors = []
with sync_playwright() as playwright:
    browser = playwright.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(url)
    page.wait_for_function("referenceEvidence.status !== 'not-loaded'")
    assert page.evaluate("referenceEvidence.status") == "passed"
    assert page.locator("#prev").is_hidden()
    page.keyboard.press("ArrowRight")
    assert page.locator("#counter").inner_text() == "2 / 8"
    page.keyboard.press("Space")
    assert page.locator("#counter").inner_text() == "3 / 8"
    page.get_by_role("link", name="Open live lab").click()
    page.wait_for_timeout(550)
    assert page.locator("#counter").inner_text() == "5 / 8"
    assert page.locator("#peak-bits").inner_text() == "011"
    assert "PASS" in page.locator("#verdict").inner_text()
    page.locator('[data-preset="third"]').click()
    assert page.locator("#peak-prob").inner_text() == "68.78%"
    page.screenshot(path=output / "lab-third.png")
    page.locator("#phase").fill("0.2")
    assert page.locator("#export").is_disabled()
    assert "Inputs changed" in page.locator("#verdict").inner_text()
    page.locator("#phase").press("ArrowLeft")
    assert page.locator("#counter").inner_text() == "5 / 8"
    page.locator("#controls button[type=submit]").click()
    assert "PASS" in page.locator("#verdict").inner_text()
    page.locator('[data-preset="mixture"]').click()
    assert page.locator("#mixture-fields").is_visible()
    assert page.locator("#peak-bits").inner_text() == "101"
    assert page.locator("#peak-prob").inner_text() == "75.00%"
    page.screenshot(path=output / "lab-mixture.png")
    with page.expect_download() as download_info:
        page.locator("#export").click()
    run = json.loads(Path(download_info.value.path()).read_text())
    assert run["passed"] and not run["physicalMeasurement"]
    assert sum(run["counts"]) == run["shots"]
    assert run["options"]["weight"] == 0.25
    assert len(run["engineSHA256"]) == 64
    # Hidden superposition values must not prevent a single-eigenstate run.
    page.locator("#phase-b").fill("1")
    page.locator("#weight").fill("2")
    page.locator("#input-state").select_option("single")
    assert page.locator("#phase-b").is_disabled()
    assert page.locator("#weight").is_disabled()
    page.locator("#controls button[type=submit]").click()
    assert "PASS" in page.locator("#verdict").inner_text()
    page.locator("#input-state").select_option("mixture")
    assert page.locator("#phase-b").is_enabled()
    assert not page.locator("#controls").evaluate("el=>el.checkValidity()")
    for fault, peak in [("sign", "101"), ("reverse", "110"), ("power", None)]:
        page.evaluate("showSlide(5)")
        page.wait_for_timeout(500)
        page.locator(f'[data-fault-demo="{fault}"]').click()
        page.wait_for_timeout(500)
        assert "FAIL" in page.locator("#verdict").inner_text()
        assert not page.evaluate("lastRun.passed")
        if peak:
            assert page.locator("#peak-bits").inner_text() == peak
        if fault == "sign":
            page.screenshot(path=output / "lab-fault.png")
    page.locator('[data-preset="exact"]').click()
    page.locator("#phase").fill("1")
    page.locator("#controls button[type=submit]").click()
    assert page.locator("#export").is_disabled()
    page.locator('[data-preset="wrap"]').click()
    assert page.locator("#peak-bits").inner_text() == "00000"
    page.locator("#qubits").select_option("6")
    page.locator("#controls button[type=submit]").click()
    assert page.locator("#outcomes tr").count() == 64
    assert page.locator("#histogram").evaluate("el=>el.scrollWidth>el.clientWidth")
    page.locator('[data-preset="exact"]').click()
    for index in range(8):
        page.evaluate("i=>showSlide(i)", index)
        page.wait_for_timeout(500)
        assert page.locator(".slide").nth(index).evaluate("el=>el.scrollWidth<=el.clientWidth+1"), f"desktop overflow on {index}"
        page.screenshot(path=output / f"slide-{index + 1}.png")
    assert page.locator("#next").is_hidden()
    # Mouse drag advances one slide, without hijacking controls.
    page.evaluate("showSlide(0)")
    page.wait_for_timeout(500)
    page.mouse.move(800, 820)
    page.mouse.down()
    page.mouse.move(650, 820)
    page.mouse.up()
    assert page.locator("#counter").inner_text() == "2 / 8"
    # Verify every local artifact link is present on the running site.
    links = page.locator("a[href]").evaluate_all("els=>els.map(e=>e.getAttribute('href')).filter(h=>!h.startsWith('#')&&!h.startsWith('http'))")
    for link in links:
        assert page.request.get(url + link).status == 200, link
    mobile = browser.new_page(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    mobile.on("pageerror", lambda error: errors.append(str(error)))
    mobile.goto(url)
    for index in range(8):
        mobile.evaluate("i=>showSlide(i)", index)
        mobile.wait_for_timeout(500)
        assert mobile.locator(".slide").nth(index).evaluate("el=>el.scrollWidth<=el.clientWidth+1"), f"mobile overflow on {index}"
    mobile.evaluate("showSlide(0)")
    mobile.wait_for_timeout(500)
    mobile.screenshot(path=output / "mobile-intro.png")
    mobile.evaluate("""() => {
      const el=document.getElementById('intro');
      const start=new Touch({identifier:1,target:el,clientX:320,clientY:300});
      const end=new Touch({identifier:1,target:el,clientX:100,clientY:303});
      el.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,changedTouches:[start]}));
      el.dispatchEvent(new TouchEvent('touchend',{bubbles:true,changedTouches:[end]}));
    }""")
    assert mobile.locator("#counter").inner_text() == "2 / 8"
    mobile.get_by_role("link", name="Open live lab").click()
    mobile.wait_for_timeout(500)
    mobile.locator('[data-preset="mixture"]').click()
    mobile.screenshot(path=output / "mobile-lab-controls.png")
    mobile.locator("#verdict").scroll_into_view_if_needed()
    mobile.screenshot(path=output / "mobile-lab-verdict.png")
    assert "PASS" in mobile.locator("#verdict").inner_text()
    assert not errors, errors
    browser.close()
print("PASS: desktop/mobile navigation, input states, 3 fault gates, sampling export, artifact links, and overflow checks.")
print(f"Screenshots: {output}")
